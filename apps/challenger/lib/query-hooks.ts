// apps/challenger/lib/query-hooks.ts
//
// TanStack Query hooks for each dashboard surface.
//
// Active-tab hooks (overview, scorecard, trend, closedWon) accept an
// `enabled` option and mount dormant (`enabled: false`). The shell's
// fetch orchestrator stages data via `prefetchQuery`, then flips
// `enabled: true` so hooks read from the already-populated cache.
//
// Exception: `useFilterDictionaries()` is always enabled — it runs on
// mount independently of priority ordering.

import { useEffect, useRef } from 'react';
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import type { DashboardFilters, DateRange } from '@por/dashboard-constants';

import type { ClosedWonSort } from './dashboard-reducer';
import type { OverviewBoardResult } from './overview-loader';
import type { ScorecardResult } from './scorecard-loader';
import type { TrendResult } from './trend-loader';
import type { ClosedWonResult } from './closed-won-loader';
import type { DictionaryLoaderResult } from './dictionary-loader';
import { queryKeys } from './query-keys';
import { queryFns } from './query-fns';

// ─── Stale-time constants ────────────────────────────────────────────────────

const STALE_1_MIN = 60_000;
const STALE_15_MIN = 900_000;

// ─── Active-tab hooks ────────────────────────────────────────────────────────

export function useOverviewBoard(
  filters: DashboardFilters,
  dateRange: DateRange,
  opts: { enabled: boolean },
) {
  return useQuery<OverviewBoardResult>({
    queryKey: queryKeys.overview(filters, dateRange),
    queryFn: queryFns.overview(filters, dateRange),
    staleTime: STALE_1_MIN,
    enabled: opts.enabled,
  });
}

export function useScorecard(
  category: string,
  filters: DashboardFilters,
  dateRange: DateRange,
  opts: { enabled: boolean },
) {
  return useQuery<ScorecardResult>({
    queryKey: queryKeys.scorecard(category, filters, dateRange),
    queryFn: queryFns.scorecard(category, filters, dateRange),
    staleTime: STALE_1_MIN,
    enabled: opts.enabled,
  });
}

export function useTrend(
  category: string,
  tileId: string,
  filters: DashboardFilters,
  dateRange: DateRange,
  opts: { enabled: boolean },
) {
  return useQuery<TrendResult>({
    queryKey: queryKeys.trend(category, tileId, filters, dateRange),
    queryFn: queryFns.trend(category, tileId, filters, dateRange),
    staleTime: STALE_1_MIN,
    enabled: opts.enabled,
  });
}

export function useClosedWon(
  category: string,
  filters: DashboardFilters,
  dateRange: DateRange,
  page: number,
  sort: ClosedWonSort,
  opts: { enabled: boolean },
) {
  // Track previous category so we only use keepPreviousData for
  // same-category page changes, not cross-category tab switches.
  const prevCategoryRef = useRef(category);
  const isSameCategory = prevCategoryRef.current === category;

  // Update ref after the comparison
  useEffect(() => {
    prevCategoryRef.current = category;
  }, [category]);

  return useQuery<ClosedWonResult>({
    queryKey: queryKeys.closedWon(category, filters, dateRange, page, sort),
    queryFn: queryFns.closedWon(category, filters, dateRange, page, sort),
    staleTime: STALE_1_MIN,
    enabled: opts.enabled,
    // Keep previous page data visible only for same-category page changes.
    // Cross-category switches should show a loading state, not stale data
    // from the wrong category.
    placeholderData: isSameCategory ? keepPreviousData : undefined,
  });
}

// ─── Always-enabled hook ─────────────────────────────────────────────────────

export function useFilterDictionaries() {
  return useQuery<DictionaryLoaderResult>({
    queryKey: queryKeys.filters(),
    queryFn: queryFns.filters(),
    staleTime: STALE_15_MIN,
  });
}

// ─── Prefetch helper (for use by the fetch orchestrator) ─────────────────────

/**
 * Prefetch all queries for the Overview tab.
 * Returns a promise that resolves when the prefetch completes.
 */
export function prefetchOverview(
  queryClient: QueryClient,
  filters: DashboardFilters,
  dateRange: DateRange,
) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.overview(filters, dateRange),
    queryFn: queryFns.overview(filters, dateRange),
    staleTime: STALE_1_MIN,
  });
}

/**
 * Prefetch scorecard data for a category tab.
 */
export function prefetchScorecard(
  queryClient: QueryClient,
  category: string,
  filters: DashboardFilters,
  dateRange: DateRange,
) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.scorecard(category, filters, dateRange),
    queryFn: queryFns.scorecard(category, filters, dateRange),
    staleTime: STALE_1_MIN,
  });
}

/**
 * Prefetch trend data for a specific tile.
 */
export function prefetchTrend(
  queryClient: QueryClient,
  category: string,
  tileId: string,
  filters: DashboardFilters,
  dateRange: DateRange,
) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.trend(category, tileId, filters, dateRange),
    queryFn: queryFns.trend(category, tileId, filters, dateRange),
    staleTime: STALE_1_MIN,
  });
}

/**
 * Prefetch closed-won table data for a category tab.
 */
export function prefetchClosedWon(
  queryClient: QueryClient,
  category: string,
  filters: DashboardFilters,
  dateRange: DateRange,
  page: number,
  sort: ClosedWonSort,
) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.closedWon(category, filters, dateRange, page, sort),
    queryFn: queryFns.closedWon(category, filters, dateRange, page, sort),
    staleTime: STALE_1_MIN,
  });
}

/**
 * Convenience: prefetch all surfaces for a category tab in parallel.
 */
export function prefetchCategoryTab(
  queryClient: QueryClient,
  category: string,
  tileId: string,
  filters: DashboardFilters,
  dateRange: DateRange,
  page: number,
  sort: ClosedWonSort,
) {
  return Promise.all([
    prefetchScorecard(queryClient, category, filters, dateRange),
    prefetchTrend(queryClient, category, tileId, filters, dateRange),
    prefetchClosedWon(queryClient, category, filters, dateRange, page, sort),
  ]);
}

/**
 * Hook to get the query client for imperative prefetching.
 */
export function useDashboardQueryClient() {
  return useQueryClient();
}
