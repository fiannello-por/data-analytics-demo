// apps/challenger/lib/single-filter-loader.ts
// Loads a single filter dictionary. Each filter gets its own Suspense boundary
// so they stream in individually as their queries complete.

import { unstable_cache } from 'next/cache';
import {
  executeMetricQuery,
  type QueryInstrumentation,
} from './lightdash-v2-client';
import { buildDictionaryQuery, type GlobalFilterKey } from './query-builder';
import type { ResultRow } from './types';
import type { ProbeCacheMode } from './cache-mode';
import type { WaterfallCollector } from './waterfall-types';

export type SingleFilterResult = {
  key: GlobalFilterKey;
  options: string[];
};

function extractDistinctValues(rows: ResultRow[]): string[] {
  return rows
    .map((row) => {
      const firstField = Object.values(row)[0];
      return firstField?.value?.formatted ?? '';
    })
    .filter((v) => v.trim().length > 0);
}

async function fetchSingleFilter(
  key: GlobalFilterKey,
  collector?: WaterfallCollector,
  filterPriority = 4,
): Promise<SingleFilterResult> {
  const instrumentation: QueryInstrumentation | undefined = collector
    ? { collector, id: `filters/${key}`, section: 'filters', priority: filterPriority }
    : undefined;

  const result = await executeMetricQuery(
    buildDictionaryQuery(key),
    undefined,
    instrumentation,
  );

  return { key, options: extractDistinctValues(result.rows) };
}

export function loadSingleFilter(
  key: GlobalFilterKey,
  cacheMode: ProbeCacheMode = 'auto',
  collector?: WaterfallCollector,
  filterPriority = 4,
): Promise<SingleFilterResult> {
  if (cacheMode === 'off') {
    return fetchSingleFilter(key, collector, filterPriority);
  }

  return unstable_cache(
    () => fetchSingleFilter(key, collector, filterPriority),
    [`challenger-filter-${key}`],
    { revalidate: 900, tags: [`challenger-filter-${key}`] },
  )();
}
