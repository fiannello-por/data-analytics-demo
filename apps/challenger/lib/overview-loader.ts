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
  type DateRange,
  type DashboardFilters,
} from './query-builder';
import { cacheFingerprint } from './cache-utils';
import type { CategoryResult } from './types';
import type { ProbeCacheMode } from './cache-mode';
import type { WaterfallCollector } from './waterfall-types';

export type OverviewBoardResult = {
  categories: CategoryResult[];
  stats: { actualCallCount: number; totalExecutionMs: number };
};

async function fetchOverviewBoard(
  tracker: CallTracker,
  filters: DashboardFilters,
  dateRange: DateRange,
  previousDateRange: DateRange,
  collector?: WaterfallCollector,
): Promise<CategoryResult[]> {
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
            buildCategoryQuery(category, dateRange, filters),
            undefined,
            mkInstrumentation('current'),
          ),
        ),
        tracker.track(
          executeMetricQuery(
            buildCategoryQuery(category, previousDateRange, filters),
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
  filters: DashboardFilters = {},
  dateRange?: DateRange,
  previousDateRange?: DateRange,
  cacheMode: ProbeCacheMode = 'auto',
  collector?: WaterfallCollector,
): Promise<OverviewBoardResult> {
  const tracker = createCallTracker();
  const effectiveDateRange = dateRange ?? defaultDateRange();
  const effectivePreviousDateRange = previousDateRange ?? defaultPreviousDateRange();

  const fp = cacheFingerprint(filters, effectiveDateRange, effectivePreviousDateRange);

  if (cacheMode === 'off') {
    const categories = await fetchOverviewBoard(
      tracker, filters, effectiveDateRange, effectivePreviousDateRange, collector,
    );
    return { categories, stats: tracker.getStats() };
  }

  const categories = await unstable_cache(
    () => fetchOverviewBoard(
      tracker, filters, effectiveDateRange, effectivePreviousDateRange, collector,
    ),
    [`challenger-overview-board-${fp}`],
    { revalidate: 60, tags: ['challenger-overview-board'] },
  )();

  return { categories, stats: tracker.getStats() };
}