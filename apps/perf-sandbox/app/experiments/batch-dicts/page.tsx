import { Suspense } from 'react';
import { BigQuery } from '@google-cloud/bigquery';
import { SpanCollector } from '@/lib/telemetry';
import { createSandboxRuntime } from '@/lib/sandbox-runtime';
import { loadOverviewBoard } from '@/lib/sandbox-loaders';
import { loadBatchDictionaries } from '@/lib/batch-dictionaries';
import { parseCacheMode } from '@/lib/cache-mode';

export const dynamic = 'force-dynamic';

type SearchParamsInput = Promise<
  Record<string, string | string[] | undefined> | undefined
>;

function getBigQueryClient() {
  const saJson =
    process.env.BIGQUERY_SERVICE_ACCOUNT_JSON ??
    (process.env.BIGQUERY_SERVICE_ACCOUNT_PATH
      ? require('node:fs').readFileSync(
          process.env.BIGQUERY_SERVICE_ACCOUNT_PATH,
          'utf8',
        )
      : '');
  return new BigQuery({
    projectId: process.env.BIGQUERY_PROJECT_ID,
    credentials: JSON.parse(saJson),
    location: process.env.BIGQUERY_LOCATION ?? 'US',
  });
}

// Streaming: overview board resolves independently
async function OverviewBoard({
  collector,
  cacheMode,
}: {
  collector: SpanCollector;
  cacheMode: 'auto' | 'off';
}) {
  const runtime = createSandboxRuntime(collector);
  const results = await loadOverviewBoard(runtime, collector, { cacheMode });
  const metrics = collector.aggregateServerMetrics();

  return (
    <div id="overview-data" data-loaded="true">
      <h2>Overview Board</h2>
      <pre>
        {JSON.stringify(
          {
            tiles: results.length,
            queryCount: metrics.totalQueryCount,
            ssrDataFetchMs: Math.round(metrics.ssrDataFetchMs * 100) / 100,
            totalCompileMs: Math.round(metrics.totalCompileMs * 100) / 100,
            totalExecuteMs: Math.round(metrics.totalExecuteMs * 100) / 100,
          },
          null,
          2,
        )}
      </pre>
    </div>
  );
}

// Streaming: batch dictionaries resolve independently
async function BatchDictionaries({
  collector,
  cacheMode,
}: {
  collector: SpanCollector;
  cacheMode: 'auto' | 'off';
}) {
  const bigquery = getBigQueryClient();
  const location = process.env.BIGQUERY_LOCATION ?? 'US';
  const results = await loadBatchDictionaries(bigquery, collector, location);

  return (
    <div id="dictionaries-data" data-loaded="true">
      <h2>Filter Dictionaries (batch)</h2>
      <pre>
        {JSON.stringify({ dictionaries: results.length, strategy: 'single-query' }, null, 2)}
      </pre>
    </div>
  );
}

export default async function BatchDictsPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const resolvedParams = await searchParams;
  const runId = (resolvedParams?.runId as string) ?? 'default';
  const cacheMode = parseCacheMode(resolvedParams?.cacheMode as string);
  const collector = new SpanCollector();

  return (
    <div>
      <h1 id="sandbox-shell">
        Perf Sandbox — Streaming + Batch Dictionaries (E1+E4)
      </h1>
      <p>
        Run: {runId} | Cache: {cacheMode}
      </p>

      <Suspense fallback={<div id="overview-loading">Loading overview...</div>}>
        <OverviewBoard collector={collector} cacheMode={cacheMode} />
      </Suspense>

      <Suspense
        fallback={
          <div id="dictionaries-loading">Loading dictionaries...</div>
        }
      >
        <BatchDictionaries collector={collector} cacheMode={cacheMode} />
      </Suspense>

      <script
        dangerouslySetInnerHTML={{
          __html: `window.__SANDBOX_STREAMING__ = true;`,
        }}
      />
    </div>
  );
}
