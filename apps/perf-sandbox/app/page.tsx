import { SpanCollector } from '@/lib/telemetry';
import { createSandboxRuntime } from '@/lib/sandbox-runtime';
import {
  loadOverviewBoard,
  loadFilterDictionaries,
} from '@/lib/sandbox-loaders';

export const dynamic = 'force-dynamic';

type SearchParamsInput = Promise<
  Record<string, string | string[] | undefined> | undefined
>;

export default async function SandboxPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const resolvedParams = await searchParams;
  const runId = (resolvedParams?.runId as string) ?? 'default';
  const cacheMode = (resolvedParams?.cacheMode as string) ?? 'auto';

  const collector = new SpanCollector();
  const runtime = createSandboxRuntime(collector);

  const ssrSpanId = collector.startSpan('ssr_data_fetch');

  const [overviewResults, dictionaryResults] = await Promise.all([
    loadOverviewBoard(runtime, collector),
    loadFilterDictionaries(runtime, collector),
  ]);

  collector.endSpan(ssrSpanId);

  const serverMetrics = collector.aggregateServerMetrics();
  const spans = collector.getSpans();

  const telemetryPayload = JSON.stringify({
    runId,
    cacheMode,
    serverMetrics,
    spans,
    tileCount: overviewResults.length,
    dictionaryCount: dictionaryResults.length,
  });

  return (
    <div>
      <h1>Perf Sandbox</h1>
      <pre id="sandbox-summary">
        {JSON.stringify(
          {
            runId,
            cacheMode,
            tiles: overviewResults.length,
            dictionaries: dictionaryResults.length,
            queryCount: serverMetrics.totalQueryCount,
            ssrDataFetchMs: Math.round(serverMetrics.ssrDataFetchMs * 100) / 100,
            totalCompileMs: Math.round(serverMetrics.totalCompileMs * 100) / 100,
            totalExecuteMs: Math.round(serverMetrics.totalExecuteMs * 100) / 100,
            totalBytesProcessed: serverMetrics.totalBytesProcessed,
          },
          null,
          2,
        )}
      </pre>
      <script
        id="sandbox-telemetry"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: telemetryPayload }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__SANDBOX_TELEMETRY__ = JSON.parse(document.getElementById('sandbox-telemetry').textContent);`,
        }}
      />
    </div>
  );
}