// apps/challenger/lib/fetch-orchestrator.ts
//
// Coordinates prefetching of dashboard data in priority order.
//
// For category tabs, fetches are staged so higher-priority data is
// fetched first:
//   1. Scorecard (priority 1)  — awaited
//   2. Trend    (priority 2)  — awaited after scorecard completes
//   3. Closed-won (priority 3) — fire-and-forget
//
// For the Overview tab the overview board is prefetched.

import type { QueryClient } from '@tanstack/react-query';
import { getDefaultTileId } from '@por/dashboard-constants';
import type { Category } from '@por/dashboard-constants';

import type { DashboardState } from './dashboard-reducer';
import {
  getActiveSelectedTileId,
  getActiveCwSort,
  isCategory,
} from './dashboard-reducer';
import {
  prefetchOverview,
  prefetchScorecard,
  prefetchTrend,
  prefetchClosedWon,
} from './query-hooks';

// ─── Main orchestrator ────────────────────────────────────────────────────────

/**
 * Orchestrates all prefetches for the current dashboard state.
 *
 * All fetches for the active tab start immediately to maximize parallelism.
 * The server-side concurrency limiter (MAX_CONCURRENT=10) handles batching.
 * Submission order ensures scorecard queries enter the limiter first, but
 * all queries run concurrently on the server.
 *
 * Returns a promise that resolves when ALL active-tab queries are populated
 * in the TanStack Query cache (used by the shell to flip `orchestrated`).
 */
export async function orchestratePrefetch(
  queryClient: QueryClient,
  state: DashboardState,
): Promise<void> {
  const { committedFilters, committedDateRange, activeTab, cwPage } = state;

  if (!isCategory(activeTab)) {
    // Overview tab — single fetch
    await prefetchOverview(queryClient, committedFilters, committedDateRange);
    return;
  }

  const category = activeTab;
  const tileId = getActiveSelectedTileId(state);
  const sort = getActiveCwSort(state);

  // Start all three in submission order (scorecard first into the limiter
  // queue) but don't await sequentially — run in parallel for speed.
  const scorecardPromise = prefetchScorecard(
    queryClient,
    category,
    committedFilters,
    committedDateRange,
  );

  const trendPromise = prefetchTrend(
    queryClient,
    category,
    tileId,
    committedFilters,
    committedDateRange,
  );

  const closedWonPromise = prefetchClosedWon(
    queryClient,
    category,
    committedFilters,
    committedDateRange,
    cwPage,
    sort,
  );

  // Wait for all to complete before signaling `orchestrated = true`
  await Promise.all([scorecardPromise, trendPromise, closedWonPromise]);
}

// ─── Hover prefetch ───────────────────────────────────────────────────────────

/**
 * Prefetches scorecard and trend (using the default tile) for a target tab.
 * Used for hover-based prefetching to warm the cache before the user clicks.
 * Does NOT prefetch closed-won.
 */
export async function prefetchAdjacentTab(
  queryClient: QueryClient,
  targetTab: Category,
  state: DashboardState,
): Promise<void> {
  const { committedFilters, committedDateRange } = state;
  const tileId = getDefaultTileId(targetTab);

  // Scorecard and trend can start in parallel since both are high priority
  // for the adjacent-tab hover case (no ordering requirement between them).
  await Promise.all([
    prefetchScorecard(
      queryClient,
      targetTab,
      committedFilters,
      committedDateRange,
    ),
    prefetchTrend(
      queryClient,
      targetTab,
      tileId,
      committedFilters,
      committedDateRange,
    ),
  ]);
}
