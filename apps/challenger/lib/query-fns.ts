// apps/challenger/lib/query-fns.ts
//
// Shared fetch functions used by both query hooks (useQuery) and the
// fetch orchestrator (prefetchQuery). Keeping them here guarantees
// identical queryKey + queryFn pairs so TanStack Query deduplicates.

import type { DashboardFilters, DateRange } from '@por/dashboard-constants';
import type { ClosedWonSort } from './dashboard-reducer';
import type { OverviewBoardResult } from './overview-loader';
import type { ScorecardResult } from './scorecard-loader';
import type { TrendResult } from './trend-loader';
import type { ClosedWonResult } from './closed-won-loader';
import type { DictionaryLoaderResult } from './dictionary-loader';

// ─── Helpers ─────────────────────────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(
      `${res.status} ${res.statusText}: ${body}`.trim(),
      res.status,
    );
  }
  return res.json() as Promise<T>;
}

const enc = encodeURIComponent;

/**
 * Serializes dashboard filters and date range into URLSearchParams.
 * Filters are added as repeated params (e.g. Division=East&Division=West).
 */
export function buildApiParams(
  filters: DashboardFilters,
  dateRange: DateRange,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set('startDate', dateRange.startDate);
  params.set('endDate', dateRange.endDate);

  for (const [key, values] of Object.entries(filters)) {
    if (!values?.length) continue;
    for (const v of values) {
      params.append(key, v);
    }
  }

  return params;
}

// ─── Query functions ─────────────────────────────────────────────────────────
//
// Each entry returns a zero-argument closure suitable for TanStack Query's
// `queryFn`. The orchestrator calls `queryClient.prefetchQuery({ queryKey,
// queryFn })`, and hooks pass the same `queryFn` to `useQuery`.

export const queryFns = {
  overview:
    (filters: DashboardFilters, dateRange: DateRange) => (): Promise<OverviewBoardResult> =>
      fetchJson<OverviewBoardResult>(`/api/overview?${buildApiParams(filters, dateRange)}`),

  scorecard:
    (category: string, filters: DashboardFilters, dateRange: DateRange) =>
    (): Promise<ScorecardResult> =>
      fetchJson<ScorecardResult>(
        `/api/scorecard/${enc(category)}?${buildApiParams(filters, dateRange)}`,
      ),

  trend:
    (category: string, tileId: string, filters: DashboardFilters, dateRange: DateRange) =>
    (): Promise<TrendResult> =>
      fetchJson<TrendResult>(
        `/api/trend/${enc(category)}/${enc(tileId)}?${buildApiParams(filters, dateRange)}`,
      ),

  closedWon:
    (
      category: string,
      filters: DashboardFilters,
      dateRange: DateRange,
      page: number,
      sort: ClosedWonSort,
    ) =>
    (): Promise<ClosedWonResult> =>
      fetchJson<ClosedWonResult>(
        `/api/closed-won/${enc(category)}?${buildApiParams(filters, dateRange)}&page=${page}&pageSize=50&sortField=${enc(sort.field)}&sortDir=${enc(sort.direction)}`,
      ),

  filters:
    () => (): Promise<DictionaryLoaderResult> =>
      fetchJson<DictionaryLoaderResult>('/api/filters'),
};
