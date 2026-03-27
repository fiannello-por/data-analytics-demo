import 'server-only';

import { unstable_cache } from 'next/cache';
import type { GlobalFilterKey } from '@/lib/dashboard/catalog';
import type { FilterDictionaryPayload } from '@/lib/dashboard/contracts';
import type { ProbeExecutionOptions } from '@/lib/probe-cache-mode';
import { type DashboardLoaderResult } from '@/lib/server/dashboard-query-runtime';
import { buildFilterDictionaryQuery } from '@/lib/dashboard-v2/semantic-registry';
import {
  getDashboardV2Runtime,
  normalizeDashboardV2ExecutionOptions,
} from '@/lib/server/v2/semantic-runtime';
import { getSemanticString } from '@/lib/server/v2/semantic-values';

export async function getDashboardV2FilterDictionary(
  key: GlobalFilterKey,
  runtime = getDashboardV2Runtime(),
  options: ProbeExecutionOptions = {},
): Promise<DashboardLoaderResult<FilterDictionaryPayload>> {
  const execution = normalizeDashboardV2ExecutionOptions(options);

  const loadDictionary = async () => {
    const result = await runtime.runQuery(buildFilterDictionaryQuery(key));

    return {
      data: {
        filterKey: key,
        options: result.rows
          .map((row, index) => ({
            value: getSemanticString(row, Object.keys(row)[0] ?? ''),
            label: getSemanticString(row, Object.keys(row)[0] ?? ''),
            sortOrder: index + 1,
          }))
          .filter((option) => option.value.trim().length > 0),
      },
      meta: {
        source: 'lightdash' as const,
        queryCount: result.meta.queryCount,
        bytesProcessed: result.meta.bytesProcessed,
        cacheMode: execution.cacheMode,
      },
    } satisfies DashboardLoaderResult<FilterDictionaryPayload>;
  };

  if (execution.cacheMode === 'off') {
    return loadDictionary();
  }

  return unstable_cache(
    loadDictionary,
    ['dashboard-v2-filter-dictionary', key],
    {
      revalidate: 900,
      tags: ['dashboard-v2-filter-dictionary'],
    },
  )();
}
