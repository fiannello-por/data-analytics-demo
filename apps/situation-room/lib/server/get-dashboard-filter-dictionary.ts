import 'server-only';

import { unstable_cache } from 'next/cache';
import { buildFilterDictionaryQuery } from '@/lib/bigquery/dashboard-sql';
import type { GlobalFilterKey } from '@/lib/dashboard/catalog';
import type { FilterDictionaryPayload } from '@/lib/dashboard/contracts';
import type { ProbeExecutionOptions } from '@/lib/probe-cache-mode';
import {
  defaultDashboardQueryClient,
  normalizeDashboardExecutionOptions,
  requireNumberField,
  requireStringField,
  type DashboardLoaderResult,
  type DashboardQueryClient,
} from '@/lib/server/dashboard-query-runtime';

export async function getDashboardFilterDictionary(
  key: GlobalFilterKey,
  client: DashboardQueryClient = defaultDashboardQueryClient,
  options: ProbeExecutionOptions = {},
): Promise<DashboardLoaderResult<FilterDictionaryPayload>> {
  const execution = normalizeDashboardExecutionOptions(options);

  const loadDictionary = async () => {
    const result = await client.queryRows(buildFilterDictionaryQuery(key), execution);

    return {
      data: {
        filterKey: key,
        options: result.rows
          .map((row) => ({
            value: requireStringField(
              row,
              'value',
              'dashboard filter dictionary row',
            ),
            label: requireStringField(
              row,
              'label',
              'dashboard filter dictionary row',
            ),
            sortOrder: requireNumberField(
              row,
              'sort_order',
              'dashboard filter dictionary row',
            ),
          }))
          .sort((left, right) => left.sortOrder - right.sortOrder),
      },
      meta: {
        source: 'bigquery' as const,
        queryCount: 1,
        bytesProcessed: result.bytesProcessed,
        cacheMode: execution.cacheMode,
      },
    };
  };

  if (execution.cacheMode === 'off') {
    return loadDictionary();
  }

  return unstable_cache(loadDictionary, ['dashboard-filter-dictionary', key], {
    revalidate: 900,
    tags: ['dashboard-filter-dictionary'],
  })();
}
