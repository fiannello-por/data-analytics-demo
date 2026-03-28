// apps/challenger/lib/lightdash-v2-client.ts

import type {
  ExecuteMetricQueryPayload,
  SubmitResponse,
  PollResponse,
  QueryResultPage,
  MetricQueryRequest,
} from './types';

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
  backoffMs = 250,
): Promise<QueryResultPage> {
  const response = await fetch(
    `${baseUrl}/api/v2/projects/${projectUuid}/query/${queryUuid}?pageSize=500`,
    { method: 'GET', headers: headers(apiKey) },
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
    const nextBackoff = Math.min(backoffMs * 2, 1000);
    await new Promise((r) => setTimeout(r, backoffMs));
    return pollForResults(baseUrl, projectUuid, apiKey, queryUuid, nextBackoff);
  }

  if (result.status === 'error' || result.status === 'expired') {
    throw new Error(result.error ?? `Query ${result.status}`);
  }

  return result;
}

export async function executeMetricQuery(
  request: MetricQueryRequest,
): Promise<QueryResultPage> {
  const env = getLightdashEnv();

  const payload: ExecuteMetricQueryPayload = {
    query: request,
    context: 'api',
  };

  const submitResponse = await fetch(
    `${env.url}/api/v2/projects/${env.projectUuid}/query/metric-query`,
    {
      method: 'POST',
      headers: headers(env.apiKey),
      body: JSON.stringify(payload),
    },
  );

  if (!submitResponse.ok) {
    throw new Error(`executeMetricQuery submit failed: ${submitResponse.status}`);
  }

  const submitData = (await submitResponse.json()) as SubmitResponse;
  const queryUuid = submitData.results.queryUuid;

  return pollForResults(env.url, env.projectUuid, env.apiKey, queryUuid);
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