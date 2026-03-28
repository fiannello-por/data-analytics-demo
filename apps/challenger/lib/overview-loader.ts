// apps/challenger/lib/overview-loader.ts

import { unstable_cache } from 'next/cache';
import {
  executeMetricQuery,
  createCallTracker,
  type CallTracker,
} from './lightdash-v2-client';
import {
  CATEGORIES,
  buildCategoryQuery,
  defaultDateRange,
  defaultPreviousDateRange,
  type Category,
} from './query-builder';
import type { CategoryResult } from './types';
import type { ProbeCacheMode } from './cache-mode';

export type OverviewBoardResult = {
  categories: CategoryResult[];
  stats: { actualCallCount: number; totalExecutionMs: number };
};

async function fetchOverviewBoard(
  tracker: CallTracker,
): Promise<CategoryResult[]> {
  const dateRange = defaultDateRange();
  const previousDateRange = defaultPreviousDateRange();

  return Promise.all(
    CATEGORIES.map(async (category): Promise<CategoryResult> => {
      const [current, previous] = await Promise.all([
        tracker.track(
          executeMetricQuery(buildCategoryQuery(category, dateRange)),
        ),
        tracker.track(
          executeMetricQuery(buildCategoryQuery(category, previousDateRange)),
        ),
      ]);
      return { category, current, previous };
    }),
  );
}

export async function loadOverviewBoard(
  cacheMode: ProbeCacheMode = 'auto',
): Promise<OverviewBoardResult> {
  const tracker = createCallTracker();

  if (cacheMode === 'off') {
    const categories = await fetchOverviewBoard(tracker);
    return { categories, stats: tracker.getStats() };
  }

  const categories = await unstable_cache(
    () => fetchOverviewBoard(tracker),
    ['challenger-overview-board'],
    { revalidate: 60, tags: ['challenger-overview-board'] },
  )();

  return { categories, stats: tracker.getStats() };
}