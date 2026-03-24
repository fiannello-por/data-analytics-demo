import 'server-only';

import { unstable_cache } from 'next/cache';
import type { SemanticQueryResult } from '@por/analytics-adapter';
import { getSnapshotGroups, buildSnapshotGroupQuery } from '@/lib/dashboard-v2/semantic-registry';
import type { Category } from '@/lib/dashboard/catalog';
import { formatDateRange } from '@/lib/dashboard/date-range';
import { serializeDashboardStateKey } from '@/lib/dashboard/query-inputs';
import type { CategorySnapshotPayload, DashboardState, TileTiming } from '@/lib/dashboard/contracts';
import type { ProbeExecutionOptions } from '@/lib/probe-cache-mode';
import {
  formatMetricValue,
  formatPctChange,
  nowIsoString,
  type DashboardLoaderResult,
} from '@/lib/server/dashboard-query-runtime';
import {
  getDashboardV2Runtime,
  normalizeDashboardV2ExecutionOptions,
} from '@/lib/server/v2/semantic-runtime';
import { getSemanticNumber } from '@/lib/server/v2/semantic-values';

type CategorySnapshotState = Pick<
  DashboardState,
  'filters' | 'dateRange' | 'previousDateRange'
> & {
  activeCategory: Category;
  selectedTileId?: string;
};

type Runtime = ReturnType<typeof getDashboardV2Runtime>;

function buildCacheKey(input: CategorySnapshotState): string {
  return serializeDashboardStateKey({
    activeCategory: input.activeCategory,
    filters: input.filters,
    dateRange: input.dateRange,
  });
}

async function runTimedQuery(
  runtime: Runtime,
  query: Parameters<Runtime['runQuery']>[0],
): Promise<SemanticQueryResult & { totalDurationMs: number }> {
  const startedAt = performance.now();
  const result = await runtime.runQuery(query);

  return {
    ...result,
    totalDurationMs: performance.now() - startedAt,
  };
}

export async function getDashboardV2CategorySnapshot(
  input: CategorySnapshotState,
  runtime: Runtime = getDashboardV2Runtime(),
  options: ProbeExecutionOptions = {},
): Promise<DashboardLoaderResult<CategorySnapshotPayload>> {
  const execution = normalizeDashboardV2ExecutionOptions(options);

  const loadSnapshot = async () => {
    const groups = getSnapshotGroups(input.activeCategory);
    const groupResults = await Promise.all(
      groups.map(async (group) => {
        const [current, previous] = await Promise.all([
          runTimedQuery(
            runtime,
            buildSnapshotGroupQuery(
              input.activeCategory,
              input.filters,
              input.dateRange,
              group,
            ),
          ),
          runTimedQuery(
            runtime,
            buildSnapshotGroupQuery(
              input.activeCategory,
              input.filters,
              input.previousDateRange,
              group,
            ),
          ),
        ]);

        return { group, current, previous };
      }),
    );

    const rows = groupResults.flatMap(({ group, current, previous }) =>
      group.tiles.map((tile) => {
        const currentRow = current.rows[0];
        const previousRow = previous.rows[0];
        const currentValue = getSemanticNumber(currentRow, tile.measure);
        const previousValue = getSemanticNumber(previousRow, tile.measure);

        return {
          tileId: tile.tileId,
          label: tile.label,
          sortOrder: tile.sortOrder,
          formatType: tile.formatType,
          currentValue: formatMetricValue(currentValue, tile.formatType),
          previousValue: formatMetricValue(previousValue, tile.formatType),
          pctChange: formatPctChange(currentValue, previousValue),
          durationMs: current.totalDurationMs + previous.totalDurationMs,
        };
      }),
    );

    const tileTimings: TileTiming[] = rows.map((row) => ({
      tileId: row.tileId,
      durationMs: row.durationMs,
    }));

    return {
      data: {
        category: input.activeCategory,
        currentWindowLabel: formatDateRange(input.dateRange),
        previousWindowLabel: formatDateRange(input.previousDateRange),
        lastRefreshedAt: nowIsoString(),
        rows: rows
          .map(({ durationMs: _durationMs, ...row }) => row)
          .sort((left, right) => left.sortOrder - right.sortOrder),
        tileTimings,
      },
      meta: {
        source: 'lightdash' as const,
        queryCount: groupResults.length * 2,
        bytesProcessed: groupResults.reduce(
          (sum, result) =>
            sum +
            (result.current.meta.bytesProcessed ?? 0) +
            (result.previous.meta.bytesProcessed ?? 0),
          0,
        ),
        cacheMode: execution.cacheMode,
      },
    } satisfies DashboardLoaderResult<CategorySnapshotPayload>;
  };

  if (execution.cacheMode === 'off') {
    return loadSnapshot();
  }

  return unstable_cache(
    loadSnapshot,
    ['dashboard-v2-category-snapshot', buildCacheKey(input)],
    {
      revalidate: 60,
      tags: ['dashboard-v2-category-snapshot'],
    },
  )();
}
