// apps/perf-sandbox/lib/sandbox-runtime.ts
//
// NOTE on span hierarchy: lightdash_compile and bigquery_execute spans are
// emitted at the root level (no parentId) because the instrumented provider
// and executor are created once at runtime construction time and have no
// knowledge of the per-query parent spans (query_current/query_previous)
// created by the loaders. The timing data is accurate; only the parent-child
// nesting in the span tree is flat. This is a known Phase 1 limitation.
// The spec's hierarchical span tree can be reconstructed by correlating
// timestamps if needed.

import {
  createLightdashProvider,
  createSemanticRuntime,
  type QueryExecutionResult,
  type SemanticQueryRequest,
  type SemanticQueryResult,
} from '@por/semantic-runtime';
import { BigQuery } from '@google-cloud/bigquery';
import { SpanCollector } from './telemetry';

type SandboxEnv = {
  lightdashUrl: string;
  lightdashProjectUuid: string;
  lightdashApiKey: string;
  bigqueryProjectId: string;
  bigqueryDataset: string;
  bigqueryLocation: string;
  bigqueryCredentials: Record<string, unknown>;
};

function must(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function getSandboxEnv(): SandboxEnv {
  const saJson =
    process.env.BIGQUERY_SERVICE_ACCOUNT_JSON ??
    (process.env.BIGQUERY_SERVICE_ACCOUNT_PATH
      ? require('node:fs').readFileSync(
          process.env.BIGQUERY_SERVICE_ACCOUNT_PATH,
          'utf8',
        )
      : undefined);
  if (!saJson) throw new Error('Missing BigQuery service account credentials');

  return {
    lightdashUrl: must('LIGHTDASH_URL'),
    lightdashProjectUuid: must('LIGHTDASH_PROJECT_UUID'),
    lightdashApiKey: must('LIGHTDASH_API_KEY'),
    bigqueryProjectId: must('BIGQUERY_PROJECT_ID'),
    bigqueryDataset: process.env.BIGQUERY_DATASET ?? 'scorecard_test',
    bigqueryLocation: process.env.BIGQUERY_LOCATION ?? 'US',
    bigqueryCredentials: JSON.parse(saJson),
  };
}

export type InstrumentedRuntime = {
  runQuery(request: SemanticQueryRequest): Promise<SemanticQueryResult>;
  collector: SpanCollector;
};

export function createSandboxRuntime(
  collector: SpanCollector,
): InstrumentedRuntime {
  const env = getSandboxEnv();

  const provider = createLightdashProvider({
    baseUrl: env.lightdashUrl,
    projectUuid: env.lightdashProjectUuid,
    apiKey: env.lightdashApiKey,
  });

  const instrumentedProvider = {
    compileQuery: async (
      request: Parameters<typeof provider.compileQuery>[0],
    ) => {
      const spanId = collector.startSpan('lightdash_compile', undefined, {
        model: request.model,
      });
      try {
        const result = await provider.compileQuery(request);
        collector.setMetadata(spanId, { sqlLength: result.sql.length });
        return result;
      } finally {
        collector.endSpan(spanId);
      }
    },
  };

  const bigquery = new BigQuery({
    projectId: env.bigqueryProjectId,
    credentials: env.bigqueryCredentials,
    location: env.bigqueryLocation,
  });

  const runtime = createSemanticRuntime({
    provider: instrumentedProvider,
    executeQuery: async ({ sql }) => {
      const spanId = collector.startSpan('bigquery_execute');
      try {
        const [job] = await bigquery.createQueryJob({
          query: sql,
          location: env.bigqueryLocation,
          useQueryCache: true,
        });
        const [rows] = await job.getQueryResults();
        const [metadata] = await job.getMetadata();
        const bytesProcessed = Number(
          metadata.statistics?.query?.totalBytesProcessed ?? 0,
        );
        collector.setMetadata(spanId, {
          bytesProcessed,
          cacheHit: metadata.statistics?.query?.cacheHit ?? false,
          slotMs: Number(metadata.statistics?.query?.totalSlotMs ?? 0),
        });
        return { rows: rows as Record<string, unknown>[], bytesProcessed };
      } finally {
        collector.endSpan(spanId);
      }
    },
  });

  return { runQuery: runtime.runQuery.bind(runtime), collector };
}