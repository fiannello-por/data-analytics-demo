// apps/challenger/lib/closed-won-loader.ts

import { unstable_cache } from 'next/cache';
import {
  executeMetricQuery,
  createCallTracker,
  type CallTracker,
} from './lightdash-v2-client';
import {
  buildV2ClosedWonQuery,
  DASHBOARD_V2_CLOSED_WON_MODEL,
  CLOSED_WON_DIMENSIONS,
  type Category,
  type DateRange,
  type DashboardFilters,
} from './v2-query-builder';
import type { ProbeCacheMode } from './cache-mode';

export type ClosedWonRow = Record<string, string>;

export type ClosedWonResult = {
  category: Category;
  rows: ClosedWonRow[];
  durationMs: number;
  queryCount: number;
};

async function fetchClosedWon(
  tracker: CallTracker,
  category: Category,
  filters: DashboardFilters,
  dateRange: DateRange,
): Promise<ClosedWonRow[]> {
  const result = await tracker.track(
    executeMetricQuery(buildV2ClosedWonQuery(category, filters, dateRange)),
  );

  return result.rows.map((row): ClosedWonRow => {
    const out: ClosedWonRow = {};
    for (const dim of CLOSED_WON_DIMENSIONS) {
      const fieldId = `${DASHBOARD_V2_CLOSED_WON_MODEL}_${dim}`;
      out[dim] = row[fieldId]?.value?.formatted ?? '';
    }
    return out;
  });
}

export async function loadClosedWon(
  category: Category,
  filters: DashboardFilters,
  dateRange: DateRange,
  cacheMode: ProbeCacheMode = 'auto',
): Promise<ClosedWonResult> {
  const tracker = createCallTracker();
  const start = performance.now();

  if (cacheMode === 'off') {
    const rows = await fetchClosedWon(tracker, category, filters, dateRange);
    const durationMs = performance.now() - start;
    const { actualCallCount } = tracker.getStats();
    return { category, rows, durationMs, queryCount: actualCallCount };
  }

  const rows = await unstable_cache(
    () => fetchClosedWon(tracker, category, filters, dateRange),
    [`challenger-closed-won-${category}`],
    {
      revalidate: 60,
      tags: [`challenger-closed-won-${category}`],
    },
  )();

  const durationMs = performance.now() - start;
  const { actualCallCount } = tracker.getStats();
  return { category, rows, durationMs, queryCount: actualCallCount };
}
