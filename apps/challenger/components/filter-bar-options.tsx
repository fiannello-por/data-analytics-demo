// apps/challenger/components/filter-bar-options.tsx
// Async server component. Awaits the dictionary data then renders interactive
// FilterDropdown instances for each filter key.

import type { DictionaryLoaderResult } from '@/lib/dictionary-loader';
import type { DashboardUrlState, DashboardFilters } from '@/lib/url-state';
import { buildFilterApplyUrl } from '@/lib/url-state';
import type { GlobalFilterKey } from '@por/dashboard-constants';
import { GLOBAL_FILTER_KEYS } from '@por/dashboard-constants';
import { FilterDropdown } from './filter-dropdown';

export async function FilterBarOptions({
  data,
  state,
}: {
  data: Promise<DictionaryLoaderResult>;
  state: DashboardUrlState;
}) {
  const startMs = performance.now();
  const { dictionaries, stats } = await data;
  const durationMs = performance.now() - startMs;

  // Build a lookup for quick access
  const optionsByKey = new Map<string, string[]>(
    dictionaries.map((d) => [d.key, d.options]),
  );

  const telemetry = {
    filterDurationMs: Math.round(durationMs * 100) / 100,
    filterActualQueryCount: stats.actualCallCount,
    filterTotalExecutionMs: stats.totalExecutionMs,
  };

  return (
    <>
      <div
        id="filter-bar-options"
        data-loaded="true"
        style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
      >
        {GLOBAL_FILTER_KEYS.map((key: GlobalFilterKey) => {
          const options = optionsByKey.get(key) ?? [];
          const selected = state.filters[key] ?? [];

          /**
           * Build the apply URL for a given filter key and its new values.
           * Merges with all other currently-active filters so no context is lost.
           */
          function buildApplyUrl(
            _filterKey: string,
            values: string[],
          ): string {
            const newFilters: DashboardFilters = {
              ...state.filters,
            };
            if (values.length === 0) {
              delete newFilters[key as GlobalFilterKey];
            } else {
              newFilters[key as GlobalFilterKey] = values;
            }
            return buildFilterApplyUrl(state, newFilters);
          }

          return (
            <FilterDropdown
              key={key}
              filterKey={key}
              options={options}
              selected={selected}
              buildApplyUrl={buildApplyUrl}
            />
          );
        })}
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
    </>
  );
}
