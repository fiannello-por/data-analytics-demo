import 'server-only';

import { unstable_cache } from 'next/cache';
import { findTileDefinition, type Category } from '@/lib/dashboard/catalog';
import { formatDateRange } from '@/lib/dashboard/date-range';
import { serializeDashboardStateKey } from '@/lib/dashboard/query-inputs';
import type { DashboardState, TileTrendPayload } from '@/lib/dashboard/contracts';
import type { ProbeExecutionOptions } from '@/lib/probe-cache-mode';
import {
  type DashboardLoaderResult,
} from '@/lib/server/dashboard-query-runtime';
import { buildTrendQuery } from '@/lib/dashboard-v2/semantic-registry';
import {
  getDashboardV2Runtime,
  normalizeDashboardV2ExecutionOptions,
} from '@/lib/server/v2/semantic-runtime';
import { getSemanticNumber, getSemanticString } from '@/lib/server/v2/semantic-values';

type TileTrendState = Pick<
  DashboardState,
  'selectedTileId' | 'filters' | 'dateRange' | 'previousDateRange' | 'trendGrain'
>;
type TileTrendInput = TileTrendState & { activeCategory: Category };

export async function getDashboardV2TileTrend(
  input: TileTrendInput,
  runtime = getDashboardV2Runtime(),
  options: ProbeExecutionOptions = {},
): Promise<DashboardLoaderResult<TileTrendPayload>> {
  const tile = findTileDefinition(input.activeCategory, input.selectedTileId);
  const execution = normalizeDashboardV2ExecutionOptions(options);

  if (!tile) {
    throw new Error(
      `Unknown tile "${input.selectedTileId}" for category "${input.activeCategory}".`,
    );
  }

  const loadTrend = async () => {
    const [current, previous] = await Promise.all([
      runtime.runQuery(
        buildTrendQuery(
          input.activeCategory,
          input.selectedTileId,
          input.filters,
          input.dateRange,
        ),
      ),
      runtime.runQuery(
        buildTrendQuery(
          input.activeCategory,
          input.selectedTileId,
          input.filters,
          input.previousDateRange,
        ),
      ),
    ]);
    const bucketField = Object.keys(current.rows[0] ?? {}).find((field) =>
      field.endsWith('_week'),
    ) ?? Object.keys(previous.rows[0] ?? {}).find((field) => field.endsWith('_week'));
    const measureField = Object.keys(current.rows[0] ?? {}).find((field) => field !== bucketField)
      ?? Object.keys(previous.rows[0] ?? {}).find((field) => field !== bucketField);

    if (!bucketField || !measureField) {
      throw new Error(`Trend query for "${input.selectedTileId}" did not return the expected fields.`);
    }

    const currentRows = current.rows;
    const previousRows = previous.rows;
    const length = Math.max(currentRows.length, previousRows.length);

    return {
      data: {
        category: input.activeCategory,
        tileId: tile.tileId,
        label: tile.label,
        grain: input.trendGrain,
        currentWindowLabel: formatDateRange(input.dateRange),
        previousWindowLabel: formatDateRange(input.previousDateRange),
        points: Array.from({ length }).map((_, index) => {
          const currentRow = currentRows[index];
          const previousRow = previousRows[index];

          return {
            bucketKey: String(index),
            bucketLabel: getSemanticString(currentRow ?? previousRow, bucketField),
            currentValue: getSemanticNumber(currentRow, measureField),
            previousValue: getSemanticNumber(previousRow, measureField),
          };
        }),
      },
      meta: {
        source: 'lightdash' as const,
        queryCount: 2,
        bytesProcessed:
          (current.meta.bytesProcessed ?? 0) + (previous.meta.bytesProcessed ?? 0),
        cacheMode: execution.cacheMode,
      },
    } satisfies DashboardLoaderResult<TileTrendPayload>;
  };

  if (execution.cacheMode === 'off') {
    return loadTrend();
  }

  return unstable_cache(
    loadTrend,
    [
      'dashboard-v2-tile-trend',
      serializeDashboardStateKey({
        activeCategory: input.activeCategory,
        filters: input.filters,
        dateRange: input.dateRange,
        selectedTileId: input.selectedTileId,
      }),
    ],
    {
      revalidate: 60,
      tags: ['dashboard-v2-tile-trend'],
    },
  )();
}
