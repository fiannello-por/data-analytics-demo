// apps/challenger/lib/trend-loader.ts

import { unstable_cache } from 'next/cache';
import {
  executeMetricQuery,
  createCallTracker,
  type CallTracker,
} from './lightdash-v2-client';
import {
  buildV2TrendQuery,
  getSemanticTileSpec,
  DASHBOARD_V2_BASE_MODEL,
  type Category,
  type DateRange,
  type DashboardFilters,
} from './v2-query-builder';
import type { ProbeCacheMode } from './cache-mode';
import type { ResultRow } from './types';

export type TrendPoint = { week: string; value: string };

export type TrendResult = {
  category: Category;
  tileId: string;
  currentPoints: TrendPoint[];
  previousPoints: TrendPoint[];
  durationMs: number;
  queryCount: number;
};

function extractTrendPoints(
  rows: ResultRow[],
  weekFieldId: string,
  measureFieldId: string,
): TrendPoint[] {
  return rows.map((row): TrendPoint => ({
    week: row[weekFieldId]?.value?.formatted ?? '',
    value: row[measureFieldId]?.value?.formatted ?? '',
  }));
}

async function fetchTrend(
  tracker: CallTracker,
  category: Category,
  tileId: string,
  filters: DashboardFilters,
  dateRange: DateRange,
  previousDateRange: DateRange,
): Promise<{ currentPoints: TrendPoint[]; previousPoints: TrendPoint[] }> {
  const spec = getSemanticTileSpec(tileId);
  const weekFieldId = `${DASHBOARD_V2_BASE_MODEL}_${spec.dateDimension}_week`;
  const measureFieldId = `${DASHBOARD_V2_BASE_MODEL}_${spec.measure}`;

  const [current, previous] = await Promise.all([
    tracker.track(
      executeMetricQuery(
        buildV2TrendQuery(category, tileId, filters, dateRange),
      ),
    ),
    tracker.track(
      executeMetricQuery(
        buildV2TrendQuery(category, tileId, filters, previousDateRange),
      ),
    ),
  ]);

  return {
    currentPoints: extractTrendPoints(current.rows, weekFieldId, measureFieldId),
    previousPoints: extractTrendPoints(previous.rows, weekFieldId, measureFieldId),
  };
}

export async function loadTrend(
  category: Category,
  tileId: string,
  filters: DashboardFilters,
  dateRange: DateRange,
  previousDateRange: DateRange,
  cacheMode: ProbeCacheMode = 'auto',
): Promise<TrendResult> {
  const tracker = createCallTracker();
  const start = performance.now();

  if (cacheMode === 'off') {
    const { currentPoints, previousPoints } = await fetchTrend(
      tracker,
      category,
      tileId,
      filters,
      dateRange,
      previousDateRange,
    );
    const durationMs = performance.now() - start;
    const { actualCallCount } = tracker.getStats();
    return {
      category,
      tileId,
      currentPoints,
      previousPoints,
      durationMs,
      queryCount: actualCallCount,
    };
  }

  const { currentPoints, previousPoints } = await unstable_cache(
    () =>
      fetchTrend(
        tracker,
        category,
        tileId,
        filters,
        dateRange,
        previousDateRange,
      ),
    [`challenger-trend-${category}`],
    {
      revalidate: 60,
      tags: [`challenger-trend-${category}`],
    },
  )();

  const durationMs = performance.now() - start;
  const { actualCallCount } = tracker.getStats();
  return {
    category,
    tileId,
    currentPoints,
    previousPoints,
    durationMs,
    queryCount: actualCallCount,
  };
}
