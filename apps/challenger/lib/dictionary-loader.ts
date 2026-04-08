// apps/challenger/lib/dictionary-loader.ts

import { unstable_cache } from 'next/cache';
import {
  executeMetricQuery,
  createCallTracker,
  type CallTracker,
  type QueryInstrumentation,
} from './lightdash-v2-client';
import {
  GLOBAL_FILTER_KEYS,
  buildDictionaryQuery,
  type GlobalFilterKey,
} from './query-builder';
import type { DictionaryResult, ResultRow } from './types';
import type { ProbeCacheMode } from './cache-mode';
import type { WaterfallCollector } from './waterfall-types';

function extractDistinctValues(rows: ResultRow[]): string[] {
  return rows
    .map((row) => {
      const firstField = Object.values(row)[0];
      return firstField?.value?.formatted ?? '';
    })
    .filter((v) => v.trim().length > 0);
}

export type DictionaryLoaderResult = {
  dictionaries: DictionaryResult[];
  stats: { actualCallCount: number; totalExecutionMs: number };
};

async function fetchFilterDictionaries(
  tracker: CallTracker,
  collector?: WaterfallCollector,
  filterPriority = 4,
): Promise<DictionaryResult[]> {
  return Promise.all(
    GLOBAL_FILTER_KEYS.map(
      async (key: GlobalFilterKey): Promise<DictionaryResult> => {
        const instrumentation: QueryInstrumentation | undefined = collector
          ? { collector, id: `filters/${key}`, section: 'filters', priority: filterPriority }
          : undefined;

        const result = await tracker.track(
          executeMetricQuery(buildDictionaryQuery(key), undefined, instrumentation),
        );
        return { key, options: extractDistinctValues(result.rows) };
      },
    ),
  );
}

export async function loadFilterDictionaries(
  cacheMode: ProbeCacheMode = 'auto',
  collector?: WaterfallCollector,
  filterPriority = 4,
): Promise<DictionaryLoaderResult> {
  const tracker = createCallTracker();

  if (cacheMode === 'off') {
    const dictionaries = await fetchFilterDictionaries(tracker, collector, filterPriority);
    return { dictionaries, stats: tracker.getStats() };
  }

  const dictionaries = await unstable_cache(
    () => fetchFilterDictionaries(tracker, collector, filterPriority),
    ['challenger-filter-dictionaries'],
    {
      revalidate: 900,
      tags: ['challenger-filter-dictionaries'],
    },
  )();

  return { dictionaries, stats: tracker.getStats() };
}
