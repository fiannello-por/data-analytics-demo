import 'server-only';

import { unstable_cache } from 'next/cache';
import { buildTileSnapshotQuery } from '@/lib/bigquery/dashboard-sql';
import { getCategoryTiles } from '@/lib/dashboard/catalog';
import { formatDateRange } from '@/lib/dashboard/date-range';
import { serializeDashboardStateKey } from '@/lib/dashboard/query-inputs';
import type { ProbeExecutionOptions } from '@/lib/probe-cache-mode';
import type {
  CategorySnapshotPayload,
  DashboardState,
  TileTiming,
} from '@/lib/dashboard/contracts';
import {
  defaultDashboardQueryClient,
  formatMetricValue,
  formatPctChange,
  normalizeDashboardExecutionOptions,
  nowIsoString,
  requireNumberField,
  requireOptionalNumberField,
  requireStringField,
  type DashboardLoaderResult,
  type DashboardQueryClient,
} from '@/lib/server/dashboard-query-runtime';

type CategorySnapshotState = Pick<
  DashboardState,
  'activeCategory' | 'filters' | 'dateRange' | 'previousDateRange'
> & {
  selectedTileId?: string;
};

type TimedSnapshotRow = CategorySnapshotPayload['rows'][number] & {
  durationMs: number;
};

function buildCacheKey(input: CategorySnapshotState): string {
  return serializeDashboardStateKey({
    activeCategory: input.activeCategory,
    filters: input.filters,
    dateRange: input.dateRange,
  });
}

export async function getDashboardCategorySnapshot(
  input: CategorySnapshotState,
  client: DashboardQueryClient = defaultDashboardQueryClient,
  options: ProbeExecutionOptions = {},
): Promise<DashboardLoaderResult<CategorySnapshotPayload>> {
  const execution = normalizeDashboardExecutionOptions(options);

  const loadSnapshot = async () => {
    const rows = await Promise.all(
      getCategoryTiles(input.activeCategory).map(async (tile) => {
        const startedAt = performance.now();
        const result = await client.queryRows(
          buildTileSnapshotQuery({
            category: input.activeCategory,
            tileId: tile.tileId,
            dateRange: input.dateRange,
            previousDateRange: input.previousDateRange,
            filters: input.filters,
          }),
          execution,
        );
        const row = result.rows[0] ?? {};
        const currentValue = requireOptionalNumberField(
          row,
          'current_value',
          'dashboard category snapshot row',
        );
        const previousValue = requireOptionalNumberField(
          row,
          'previous_value',
          'dashboard category snapshot row',
        );

        return {
          row: {
            tileId: requireStringField(
              row,
              'tile_id',
              'dashboard category snapshot row',
            ),
            label: requireStringField(
              row,
              'label',
              'dashboard category snapshot row',
            ),
            sortOrder: requireNumberField(
              row,
              'sort_order',
              'dashboard category snapshot row',
            ),
            formatType: tile.formatType,
            currentValue: formatMetricValue(currentValue, tile.formatType),
            previousValue: formatMetricValue(previousValue, tile.formatType),
            pctChange: formatPctChange(currentValue, previousValue),
            durationMs: performance.now() - startedAt,
          } satisfies TimedSnapshotRow,
          bytesProcessed: result.bytesProcessed ?? 0,
        };
      }),
    );

    const tileTimings: TileTiming[] = rows.map((entry) => ({
      tileId: entry.row.tileId,
      durationMs: entry.row.durationMs,
    }));

    return {
      data: {
        category: input.activeCategory,
        currentWindowLabel: formatDateRange(input.dateRange),
        previousWindowLabel: formatDateRange(input.previousDateRange),
        lastRefreshedAt: nowIsoString(),
        rows: rows
          .map((entry) => {
            const { durationMs, ...row } = entry.row;
            return row;
          })
          .sort((left, right) => left.sortOrder - right.sortOrder),
        tileTimings,
      },
      meta: {
        source: 'bigquery' as const,
        queryCount: rows.length,
        bytesProcessed: rows.reduce(
          (sum, entry) => sum + (entry.bytesProcessed ?? 0),
          0,
        ),
        cacheMode: execution.cacheMode,
      },
    };
  };

  if (execution.cacheMode === 'off') {
    return loadSnapshot();
  }

  return unstable_cache(loadSnapshot, ['dashboard-category-snapshot', buildCacheKey(input)], {
    revalidate: 60,
    tags: ['dashboard-category-snapshot'],
  })();
}
