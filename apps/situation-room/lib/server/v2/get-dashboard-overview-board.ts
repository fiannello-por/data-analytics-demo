import 'server-only';

import { unstable_cache } from 'next/cache';
import { CATEGORY_ORDER } from '@/lib/dashboard/catalog';
import { formatDateRange } from '@/lib/dashboard/date-range';
import { serializeDashboardStateKey } from '@/lib/dashboard/query-inputs';
import type {
  DashboardState,
  OverviewBoardPayload,
} from '@/lib/dashboard/contracts';
import type { ProbeExecutionOptions } from '@/lib/probe-cache-mode';
import {
  nowIsoString,
  type DashboardLoaderResult,
} from '@/lib/server/dashboard-query-runtime';
import { getDashboardV2CategorySnapshot } from '@/lib/server/v2/get-dashboard-category-snapshot';

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

export async function getDashboardV2OverviewBoard(
  input: OverviewBoardState,
  runtime?: Parameters<typeof getDashboardV2CategorySnapshot>[1],
  options: ProbeExecutionOptions = {},
): Promise<DashboardLoaderResult<OverviewBoardPayload>> {
  const loadBoard = async () => {
    const snapshots = await Promise.all(
      CATEGORY_ORDER.map((category) =>
        getDashboardV2CategorySnapshot(
          {
            activeCategory: category,
            filters: input.filters,
            dateRange: input.dateRange,
            previousDateRange: input.previousDateRange,
          },
          runtime,
          options,
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
        source: 'lightdash' as const,
        queryCount: snapshots.reduce(
          (sum, snapshot) => sum + snapshot.meta.queryCount,
          0,
        ),
        bytesProcessed: snapshots.reduce(
          (sum, snapshot) => sum + (snapshot.meta.bytesProcessed ?? 0),
          0,
        ),
        cacheMode: options.cacheMode ?? 'auto',
      },
    } satisfies DashboardLoaderResult<OverviewBoardPayload>;
  };

  if (options.cacheMode === 'off') {
    return loadBoard();
  }

  return unstable_cache(
    loadBoard,
    ['dashboard-v2-overview-board', buildCacheKey(input)],
    {
      revalidate: 60,
      tags: ['dashboard-v2-overview-board'],
    },
  )();
}
