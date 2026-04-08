import { Suspense } from 'react';
import { BigQuery } from '@google-cloud/bigquery';
import { SpanCollector } from '@/lib/telemetry';
import { loadDirectOverviewBoard } from '@/lib/direct-overview';
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

async function DirectOverviewBoard({
  collector,
}: {
  collector: SpanCollector;
}) {
  const bigquery = getBigQueryClient();
  const location = process.env.BIGQUERY_LOCATION ?? 'US';
  const results = await loadDirectOverviewBoard(bigquery, collector, location);

  return (
    <div id="overview-data" data-loaded="true">
      <h2>Overview Board (direct SQL)</h2>
      <pre>
        {JSON.stringify(
          { tiles: results.length, strategy: 'direct-sql-no-lightdash' },
          null,
          2,
        )}
      </pre>
    </div>
  );
}

async function BatchDictionaries({
  collector,
}: {
  collector: SpanCollector;
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

export default async function DirectSqlPage({
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
        Perf Sandbox — Streaming + Direct SQL (E1+bypass Lightdash)
      </h1>
      <p>
        Run: {runId} | Cache: {cacheMode}
      </p>

      <Suspense fallback={<div id="overview-loading">Loading overview...</div>}>
        <DirectOverviewBoard collector={collector} />
      </Suspense>

      <Suspense
        fallback={<div id="dictionaries-loading">Loading dictionaries...</div>}
      >
        <BatchDictionaries collector={collector} />
      </Suspense>

      <script
        dangerouslySetInnerHTML={{
          __html: `window.__SANDBOX_STREAMING__ = true;`,
        }}
      />
    </div>
  );
}
