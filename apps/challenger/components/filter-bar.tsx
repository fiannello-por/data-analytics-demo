// apps/challenger/components/filter-bar.tsx

import type { DictionaryLoaderResult } from '@/lib/dictionary-loader';

export async function FilterBar({
  data,
}: {
  data: Promise<DictionaryLoaderResult>;
}) {
  const startMs = performance.now();
  const { dictionaries, stats } = await data;
  const durationMs = performance.now() - startMs;

  const telemetry = {
    filterDurationMs: Math.round(durationMs * 100) / 100,
    filterActualQueryCount: stats.actualCallCount,
    filterTotalExecutionMs: stats.totalExecutionMs,
  };

  return (
    <div id="filter-bar" data-loaded="true">
      <h2>Filters</h2>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {dictionaries.map((dict) => (
          <span
            key={dict.key}
            style={{
              padding: '0.25rem 0.5rem',
              background: '#f0f0f0',
              borderRadius: '4px',
              fontSize: '0.8rem',
            }}
          >
            {dict.key} ({dict.options.length})
          </span>
        ))}
      </div>
      <script
        id="filter-telemetry"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(telemetry) }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.__CHALLENGER_TELEMETRY__ = {
              ...window.__CHALLENGER_TELEMETRY__,
              ...JSON.parse(document.getElementById('filter-telemetry').textContent),
            };
          `,
        }}
      />
    </div>
  );
}
