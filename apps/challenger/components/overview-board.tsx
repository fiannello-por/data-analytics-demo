// apps/challenger/components/overview-board.tsx

import { CategoryCard } from './category-card';
import type { OverviewBoardResult } from '@/lib/overview-loader';

export async function OverviewBoard({
  data,
}: {
  data: Promise<OverviewBoardResult>;
}) {
  const startMs = performance.now();
  const { categories: results, stats } = await data;
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