// apps/challenger/lib/overview-loader.ts

import { unstable_cache } from 'next/cache';
import {
  executeMetricQuery,
  createCallTracker,
  type CallTracker,
  type QueryInstrumentation,
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
import type { WaterfallCollector } from './waterfall-types';

export type OverviewBoardResult = {
  categories: CategoryResult[];
  stats: { actualCallCount: number; totalExecutionMs: number };
};

async function fetchOverviewBoard(
  tracker: CallTracker,
  collector?: WaterfallCollector,
): Promise<CategoryResult[]> {
  const dateRange = defaultDateRange();
  const previousDateRange = defaultPreviousDateRange();

  return Promise.all(
    CATEGORIES.map(async (category): Promise<CategoryResult> => {
      const mkInstrumentation = (
        suffix: string,
      ): QueryInstrumentation | undefined =>
        collector
          ? { collector, id: `overview/${category}/${suffix}`, section: 'overview', priority: 1 }
          : undefined;

      const [current, previous] = await Promise.all([
        tracker.track(
          executeMetricQuery(
            buildCategoryQuery(category, dateRange),
            undefined,
            mkInstrumentation('current'),
          ),
        ),
        tracker.track(
          executeMetricQuery(
            buildCategoryQuery(category, previousDateRange),
            undefined,
            mkInstrumentation('previous'),
          ),
        ),
      ]);
      return { category, current, previous };
    }),
  );
}

export async function loadOverviewBoard(
  cacheMode: ProbeCacheMode = 'auto',
  collector?: WaterfallCollector,
): Promise<OverviewBoardResult> {
  const tracker = createCallTracker();

  if (cacheMode === 'off') {
    const categories = await fetchOverviewBoard(tracker, collector);
    return { categories, stats: tracker.getStats() };
  }

  const categories = await unstable_cache(
    () => fetchOverviewBoard(tracker, collector),
    ['challenger-overview-board'],
    { revalidate: 60, tags: ['challenger-overview-board'] },
  )();

  return { categories, stats: tracker.getStats() };
}