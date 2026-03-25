import 'server-only';

import { unstable_cache } from 'next/cache';
import { CATEGORY_ORDER } from '@/lib/dashboard/catalog';
import { formatDateRange } from '@/lib/dashboard/date-range';
import { serializeDashboardStateKey } from '@/lib/dashboard/query-inputs';
import type { ProbeExecutionOptions } from '@/lib/probe-cache-mode';
import type { DashboardState, OverviewBoardPayload } from '@/lib/dashboard/contracts';
import {
  normalizeDashboardExecutionOptions,
  nowIsoString,
  type DashboardLoaderResult,
  type DashboardQueryClient,
} from '@/lib/server/dashboard-query-runtime';
import { getDashboardCategorySnapshot } from '@/lib/server/get-dashboard-category-snapshot';

type OverviewBoardState = Pick<
  DashboardState,
  'filters' | 'dateRange' | 'previousDateRange'
>;

function buildCacheKey(input: OverviewBoardState): string {
  return serializeDashboardStateKey({
    activeCategory: 'Overview',
    filters: input.filters,
    dateRange: input.dateRange,
  });
}

export async function getDashboardOverviewBoard(
  input: OverviewBoardState,
  client?: DashboardQueryClient,
  options: ProbeExecutionOptions = {},
): Promise<DashboardLoaderResult<OverviewBoardPayload>> {
  const execution = normalizeDashboardExecutionOptions(options);

  const loadBoard = async () => {
    const snapshots = await Promise.all(
      CATEGORY_ORDER.map((category) =>
        getDashboardCategorySnapshot(
          {
            activeCategory: category,
            filters: input.filters,
            dateRange: input.dateRange,
            previousDateRange: input.previousDateRange,
          },
          client,
          execution,
        ),
      ),
    );

    return {
      data: {
        currentWindowLabel: formatDateRange(input.dateRange),
        previousWindowLabel: formatDateRange(input.previousDateRange),
        lastRefreshedAt: nowIsoString(),
        snapshots: snapshots.map((snapshot) => snapshot.data),
      },
      meta: {
        source: 'bigquery' as const,
        queryCount: snapshots.reduce((sum, snapshot) => sum + snapshot.meta.queryCount, 0),
        bytesProcessed: snapshots.reduce(
          (sum, snapshot) => sum + (snapshot.meta.bytesProcessed ?? 0),
          0,
        ),
        cacheMode: execution.cacheMode,
      },
    };
  };

  if (execution.cacheMode === 'off') {
    return loadBoard();
  }

  return unstable_cache(loadBoard, ['dashboard-overview-board', buildCacheKey(input)], {
    revalidate: 60,
    tags: ['dashboard-overview-board'],
  })();
}
