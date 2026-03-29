// apps/challenger/lib/lightdash-v2-client.ts

import type {
  ExecuteMetricQueryPayload,
  SubmitResponse,
  PollResponse,
  QueryResultPage,
  MetricQueryRequest,
} from './types';
import type { WaterfallCollector, QuerySpan } from './waterfall-types';

export type QueryInstrumentation = {
  collector: WaterfallCollector;
  id: string;
  section: string;
  priority: number;
};

// Concurrency limiter — required for performance, not just stability.
// Tested with Infinity: 26 parallel calls take ~20s (server contention).
// Tested with 10: same 26 queries take ~8.2s (less contention per wave).
// The Lightdash Render instance (1 CPU) degrades under high concurrency:
// per-query compile time goes from ~400ms (sequential) to ~2.6s (26 parallel).
// Batching into waves of 10 reduces contention and improves total throughput.
const MAX_CONCURRENT = 10;
let activeCount = 0;
const waitQueue: Array<() => void> = [];

async function withConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  if (activeCount >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waitQueue.push(resolve));
  }
  activeCount++;
  try {
    return await fn();
  } finally {
    activeCount--;
    const next = waitQueue.shift();
    if (next) next();
  }
}

function getLightdashEnv() {
  const url = process.env.LIGHTDASH_URL;
  const apiKey = process.env.LIGHTDASH_API_KEY;
  const projectUuid = process.env.LIGHTDASH_PROJECT_UUID;
  if (!url || !apiKey || !projectUuid) {
    throw new Error(
      'Missing LIGHTDASH_URL, LIGHTDASH_API_KEY, or LIGHTDASH_PROJECT_UUID',
    );
  }
  return { url: url.replace(/\/+$/, ''), apiKey, projectUuid };
}

function headers(apiKey: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `ApiKey ${apiKey}`,
  };
}

async function pollForResults(
  baseUrl: string,
  projectUuid: string,
  apiKey: string,
  queryUuid: string,
  pageSize = 500,
  page = 1,
  backoffMs = 200,
): Promise<QueryResultPage> {
  // Each poll must be a unique request — Next.js deduplicates concurrent
  // fetch calls to the same URL even with cache:'no-store'. Adding a
  // timestamp param ensures each poll is treated as a distinct request.
  const bustParam = `&_t=${Date.now()}`;
  const response = await fetch(
    `${baseUrl}/api/v2/projects/${projectUuid}/query/${queryUuid}?pageSize=${pageSize}&page=${page}${bustParam}`,
    { method: 'GET', headers: headers(apiKey), cache: 'no-store' },
  );

  if (!response.ok) {
    throw new Error(`Poll failed with status ${response.status}`);
  }

  const data = (await response.json()) as PollResponse;
  const result = data.results;

  if (
    result.status === 'pending' ||
    result.status === 'queued' ||
    result.status === 'executing'
  ) {
    const nextBackoff = Math.min(backoffMs * 1.5, 800);
    await new Promise((r) => setTimeout(r, backoffMs));
    return pollForResults(baseUrl, projectUuid, apiKey, queryUuid, pageSize, page, nextBackoff);
  }

  if (result.status === 'error' || result.status === 'expired') {
    throw new Error(result.error ?? `Query ${result.status}`);
  }

  return result;
}

export async function executeMetricQuery(
  request: MetricQueryRequest,
  options?: { pageSize?: number; page?: number },
  instrumentation?: QueryInstrumentation,
): Promise<QueryResultPage> {
  const entryTime = performance.now();

  return withConcurrencyLimit(async () => {
    const limiterWaitMs = performance.now() - entryTime;
    const env = getLightdashEnv();
    const pageSize = options?.pageSize ?? 500;
    const page = options?.page ?? 1;

    const payload: ExecuteMetricQueryPayload = {
      query: request,
      context: 'api',
    };

    const submitStart = performance.now();
    const submitResponse = await fetch(
      `${env.url}/api/v2/projects/${env.projectUuid}/query/metric-query`,
      {
        method: 'POST',
        headers: headers(env.apiKey),
        body: JSON.stringify(payload),
        cache: 'no-store',
      },
    );

    if (!submitResponse.ok) {
      throw new Error(`executeMetricQuery submit failed: ${submitResponse.status}`);
    }

    const submitData = (await submitResponse.json()) as SubmitResponse;
    const submitMs = performance.now() - submitStart;
    const queryUuid = submitData.results.queryUuid;
    const cacheHit = submitData.results.cacheMetadata.cacheHit;

    const pollStart = performance.now();
    const result = await pollForResults(env.url, env.projectUuid, env.apiKey, queryUuid, pageSize, page);
    const pollMs = performance.now() - pollStart;

    if (instrumentation) {
      const { collector, id, section, priority } = instrumentation;
      const span: QuerySpan = {
        id,
        section,
        priority,
        limiterWaitMs,
        submitMs,
        pollMs,
        lightdashExecMs: result.initialQueryExecutionMs ?? 0,
        lightdashPageMs: result.resultsPageExecutionMs ?? 0,
        cacheHit,
        startMs: entryTime - collector.getEpoch(),
        endMs: performance.now() - collector.getEpoch(),
      };
      collector.record(span);
    }

    return result;
  });
}

// Per-surface call tracker. Each loader creates its own instance so
// concurrent Suspense boundaries don't interfere with each other's counts.
export type CallTracker = {
  track<T extends QueryResultPage>(promise: Promise<T>): Promise<T>;
  getStats(): { actualCallCount: number; totalExecutionMs: number };
};

export function createCallTracker(): CallTracker {
  let actualCallCount = 0;
  let totalExecutionMs = 0;

  return {
    async track<T extends QueryResultPage>(promise: Promise<T>): Promise<T> {
      actualCallCount += 1;
      const result = await promise;
      totalExecutionMs += result.initialQueryExecutionMs ?? 0;
      return result;
    },
    getStats() {
      return { actualCallCount, totalExecutionMs };
    },
  };
}