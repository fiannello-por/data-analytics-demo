// apps/challenger/lib/closed-won-loader.ts

import { unstable_cache } from 'next/cache';
import {
  executeMetricQuery,
  createCallTracker,
  type CallTracker,
  type QueryInstrumentation,
} from './lightdash-v2-client';
import {
  buildV2ClosedWonQuery,
  DASHBOARD_V2_CLOSED_WON_MODEL,
  CLOSED_WON_DIMENSIONS,
  type Category,
  type DateRange,
  type DashboardFilters,
} from './v2-query-builder';
import { cacheFingerprint } from './cache-utils';
import type { ProbeCacheMode } from './cache-mode';
import type { WaterfallCollector } from './waterfall-types';

export type ClosedWonRow = Record<string, string>;

export type ClosedWonResult = {
  category: Category;
  rows: ClosedWonRow[];
  totalResults: number;
  totalPageCount: number;
  page: number;
  pageSize: number;
  durationMs: number;
  queryCount: number;
};

type FetchClosedWonResult = {
  rows: ClosedWonRow[];
  totalResults: number;
  totalPageCount: number;
  page: number;
  pageSize: number;
};

async function fetchClosedWon(
  tracker: CallTracker,
  category: Category,
  filters: DashboardFilters,
  dateRange: DateRange,
  page: number = 1,
  pageSize: number = 50,
  sortField: string = 'close_date',
  sortDescending: boolean = true,
  collector?: WaterfallCollector,
): Promise<FetchClosedWonResult> {
  const instrumentation: QueryInstrumentation | undefined = collector
    ? { collector, id: `closedWon/${category}`, section: 'closedWon', priority: 3 }
    : undefined;

  const result = await tracker.track(
    executeMetricQuery(
      buildV2ClosedWonQuery(category, filters, dateRange, sortField, sortDescending),
      { pageSize, page },
      instrumentation,
    ),
  );

  const rows = result.rows.map((row): ClosedWonRow => {
    const out: ClosedWonRow = {};
    for (const dim of CLOSED_WON_DIMENSIONS) {
      const fieldId = `${DASHBOARD_V2_CLOSED_WON_MODEL}_${dim}`;
      out[dim] = row[fieldId]?.value?.formatted ?? '';
    }
    return out;
  });

  return {
    rows,
    totalResults: result.totalResults,
    totalPageCount: result.totalPageCount,
    page: result.page,
    pageSize: result.pageSize,
  };
}

export async function loadClosedWon(
  category: Category,
  filters: DashboardFilters,
  dateRange: DateRange,
  page: number = 1,
  pageSize: number = 50,
  sortField: string = 'close_date',
  sortDescending: boolean = true,
  cacheMode: ProbeCacheMode = 'auto',
  collector?: WaterfallCollector,
): Promise<ClosedWonResult> {
  const tracker = createCallTracker();
  const start = performance.now();

  if (cacheMode === 'off') {
    const fetched = await fetchClosedWon(
      tracker, category, filters, dateRange, page, pageSize, sortField, sortDescending, collector,
    );
    const durationMs = performance.now() - start;
    const { actualCallCount } = tracker.getStats();
    return { category, ...fetched, durationMs, queryCount: actualCallCount };
  }

  const fetched = await unstable_cache(
    () => fetchClosedWon(
      tracker, category, filters, dateRange, page, pageSize, sortField, sortDescending, collector,
    ),
    [`challenger-closed-won-${category}-p${page}-ps${pageSize}-s${sortField}-${sortDescending}-${cacheFingerprint(filters, dateRange)}`],
    {
      revalidate: 60,
      tags: [`challenger-closed-won-${category}`],
    },
  )();

  const durationMs = performance.now() - start;
  const { actualCallCount } = tracker.getStats();
  return { category, ...fetched, durationMs, queryCount: actualCallCount };
}
