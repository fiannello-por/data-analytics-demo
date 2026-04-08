import { Suspense } from 'react';
import { SpanCollector } from '@/lib/telemetry';
import { createSandboxRuntime } from '@/lib/sandbox-runtime';
import {
  loadOverviewBoard,
  loadFilterDictionaries,
} from '@/lib/sandbox-loaders';
import { parseCacheMode } from '@/lib/cache-mode';

export const dynamic = 'force-dynamic';

type SearchParamsInput = Promise<
  Record<string, string | string[] | undefined> | undefined
>;

// Each async component loads its own data and streams when ready.
// The shell renders immediately with Suspense fallbacks.

async function OverviewBoard({
  collector,
  cacheMode,
}: {
  collector: SpanCollector;
  cacheMode: 'auto' | 'off';
}) {
  const runtime = createSandboxRuntime(collector);
  const results = await loadOverviewBoard(runtime, collector, { cacheMode });
  const serverMetrics = collector.aggregateServerMetrics();

  return (
    <div id="overview-data" data-loaded="true">
      <h2>Overview Board</h2>
      <pre>
        {JSON.stringify(
          {
            tiles: results.length,
            queryCount: serverMetrics.totalQueryCount,
            ssrDataFetchMs:
              Math.round(serverMetrics.ssrDataFetchMs * 100) / 100,
            totalCompileMs:
              Math.round(serverMetrics.totalCompileMs * 100) / 100,
            totalExecuteMs:
              Math.round(serverMetrics.totalExecuteMs * 100) / 100,
          },
          null,
          2,
        )}
      </pre>
    </div>
  );
}

async function FilterDictionaries({
  collector,
  cacheMode,
}: {
  collector: SpanCollector;
  cacheMode: 'auto' | 'off';
}) {
  const runtime = createSandboxRuntime(collector);
  const results = await loadFilterDictionaries(runtime, collector, {
    cacheMode,
  });

  return (
    <div id="dictionaries-data" data-loaded="true">
      <h2>Filter Dictionaries</h2>
      <pre>
        {JSON.stringify({ dictionaries: results.length }, null, 2)}
      </pre>
    </div>
  );
}

export default async function StreamingPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const resolvedParams = await searchParams;
  const runId = (resolvedParams?.runId as string) ?? 'default';
  const cacheMode = parseCacheMode(resolvedParams?.cacheMode as string);

  // The collector is created per-request. Each Suspense boundary gets its own
  // runtime instance but shares the collector for aggregated telemetry.
  const collector = new SpanCollector();

  return (
    <div>
      <h1 id="sandbox-shell">Perf Sandbox — Streaming SSR (E1)</h1>
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
        <FilterDictionaries collector={collector} cacheMode={cacheMode} />
      </Suspense>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.__SANDBOX_STREAMING__ = true;
            window.__SANDBOX_SHELL_TIME__ = performance.now();
          `,
        }}
      />
    </div>
  );
}
