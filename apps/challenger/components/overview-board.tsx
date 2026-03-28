// apps/challenger/components/overview-board.tsx

import { loadOverviewBoard } from '@/lib/overview-loader';
import { CategoryCard } from './category-card';
import type { ProbeCacheMode } from '@/lib/cache-mode';

export async function OverviewBoard({
  cacheMode,
}: {
  cacheMode: ProbeCacheMode;
}) {
  const startMs = performance.now();
  const { categories: results, stats } = await loadOverviewBoard(cacheMode);
  const durationMs = performance.now() - startMs;

  const telemetry = {
    overviewDurationMs: Math.round(durationMs * 100) / 100,
    overviewActualQueryCount: stats.actualCallCount,
    overviewTotalExecutionMs: stats.totalExecutionMs,
  };

  return (
    <div id="overview-data" data-loaded="true">
      <h2>Overview — Bookings by Category</h2>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {results.map((result) => (
          <CategoryCard key={result.category} result={result} />
        ))}
      </div>
      <script
        id="overview-telemetry"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(telemetry) }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.__CHALLENGER_TELEMETRY__ = {
              ...window.__CHALLENGER_TELEMETRY__,
              ...JSON.parse(document.getElementById('overview-telemetry').textContent),
            };
          `,
        }}
      />
    </div>
  );
}