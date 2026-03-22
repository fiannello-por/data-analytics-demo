import 'server-only';

import { unstable_cache } from 'next/cache';
import { buildTileTrendQuery } from '@/lib/bigquery/dashboard-sql';
import { findTileDefinition } from '@/lib/dashboard/catalog';
import { formatDateRange } from '@/lib/dashboard/date-range';
import { serializeDashboardStateKey } from '@/lib/dashboard/query-inputs';
import type { ProbeExecutionOptions } from '@/lib/probe-cache-mode';
import type {
  DashboardState,
  TileTrendPayload,
} from '@/lib/dashboard/contracts';
import {
  defaultDashboardQueryClient,
  normalizeDashboardExecutionOptions,
  requireNumberField,
  requireOptionalNumberField,
  requireStringField,
  type DashboardLoaderResult,
  type DashboardQueryClient,
} from '@/lib/server/dashboard-query-runtime';

type TileTrendState = Pick<
  DashboardState,
  'activeCategory' | 'selectedTileId' | 'filters' | 'dateRange' | 'previousDateRange' | 'trendGrain'
>;

export async function getDashboardTileTrend(
  input: TileTrendState,
  client: DashboardQueryClient = defaultDashboardQueryClient,
  options: ProbeExecutionOptions = {},
): Promise<DashboardLoaderResult<TileTrendPayload>> {
  const tile = findTileDefinition(input.activeCategory, input.selectedTileId);
  const execution = normalizeDashboardExecutionOptions(options);

  if (!tile) {
    throw new Error(
      `Unknown tile "${input.selectedTileId}" for category "${input.activeCategory}".`,
    );
  }

  const loadTrend = async () => {
    const result = await client.queryRows(
      buildTileTrendQuery({
        category: input.activeCategory,
        tileId: input.selectedTileId,
        dateRange: input.dateRange,
        previousDateRange: input.previousDateRange,
        filters: input.filters,
      }),
      execution,
    );

    return {
      data: {
        category: input.activeCategory,
        tileId: tile.tileId,
        label: tile.label,
        grain: input.trendGrain,
        currentWindowLabel: formatDateRange(input.dateRange),
        previousWindowLabel: formatDateRange(input.previousDateRange),
        points: result.rows.map((row) => ({
          bucketKey: String(
            requireNumberField(row, 'bucket_index', 'dashboard tile trend row'),
          ),
          bucketLabel: requireStringField(
            row,
            'bucket_label',
            'dashboard tile trend row',
          ),
          currentValue: requireOptionalNumberField(
            row,
            'current_value',
            'dashboard tile trend row',
          ),
          previousValue: requireOptionalNumberField(
            row,
            'previous_value',
            'dashboard tile trend row',
          ),
        })),
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
    return loadTrend();
  }

  return unstable_cache(
    loadTrend,
    [
      'dashboard-tile-trend',
      serializeDashboardStateKey({
        activeCategory: input.activeCategory,
        filters: input.filters,
        dateRange: input.dateRange,
        selectedTileId: input.selectedTileId,
      }),
    ],
    {
      revalidate: 60,
      tags: ['dashboard-tile-trend'],
    },
  )();
}
