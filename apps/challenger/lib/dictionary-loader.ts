// apps/challenger/lib/dictionary-loader.ts

import { unstable_cache } from 'next/cache';
import { executeMetricQuery } from './lightdash-v2-client';
import {
  GLOBAL_FILTER_KEYS,
  buildDictionaryQuery,
  type GlobalFilterKey,
} from './query-builder';
import type { DictionaryResult, ResultRow } from './types';
import type { ProbeCacheMode } from './cache-mode';

function extractDistinctValues(rows: ResultRow[]): string[] {
  return rows
    .map((row) => {
      const firstField = Object.values(row)[0];
      return firstField?.value?.formatted ?? '';
    })
    .filter((v) => v.trim().length > 0);
}

async function fetchFilterDictionaries(): Promise<DictionaryResult[]> {
  return Promise.all(
    GLOBAL_FILTER_KEYS.map(
      async (key: GlobalFilterKey): Promise<DictionaryResult> => {
        const result = await executeMetricQuery(buildDictionaryQuery(key));
        return { key, options: extractDistinctValues(result.rows) };
      },
    ),
  );
}

export async function loadFilterDictionaries(
  cacheMode: ProbeCacheMode = 'auto',
): Promise<DictionaryResult[]> {
  if (cacheMode === 'off') {
    return fetchFilterDictionaries();
  }

  return unstable_cache(
    fetchFilterDictionaries,
    ['challenger-filter-dictionaries'],
    {
      revalidate: 900,
      tags: ['challenger-filter-dictionaries'],
    },
  )();
}