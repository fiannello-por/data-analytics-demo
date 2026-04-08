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
import type { QuerySpan } from './waterfall-types';

// ─── Client-side timing store ────────────────────────────────────────────────

/** Accumulated timing spans for the current page load. Cleared on reset. */
const timingSpans: QuerySpan[] = [];

/** Epoch used to compute relative start/end times. */
let timingEpoch = typeof performance !== 'undefined' ? performance.now() : 0;

/**
 * Generation counter — incremented on every reset so that in-flight fetches
 * from a previous state can detect they are stale and skip recording spans.
 */
let timingGeneration = 0;

/** Reset the timing store (called when orchestration starts). */
export function resetTimingStore(): void {
  timingGeneration++;
  timingSpans.length = 0;
  timingEpoch = typeof performance !== 'undefined' ? performance.now() : 0;
}

/** Return a snapshot of accumulated timing spans. */
export function getTimingSpans(): QuerySpan[] {
  return [...timingSpans];
}

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

/** Wraps a fetchJson call, recording a QuerySpan with client-side timing.
 *  Captures the timing generation at start so that spans from stale
 *  (pre-reset) fetches are silently dropped instead of polluting the store. */
async function timedFetch<T>(
  label: string,
  section: string,
  priority: number,
  url: string,
): Promise<T> {
  const gen = timingGeneration;
  const start = performance.now() - timingEpoch;
  const result = await fetchJson<T>(url);
  const end = performance.now() - timingEpoch;

  // Only record if the store hasn't been reset since we started
  if (gen === timingGeneration) {
    timingSpans.push({
      id: label,
      section,
      priority,
      startMs: start,
      endMs: end,
      limiterWaitMs: 0,
      submitMs: 0,
      pollMs: end - start,
      lightdashExecMs: 0,
      lightdashPageMs: 0,
      cacheHit: false,
    });
  }
  return result;
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
      timedFetch<OverviewBoardResult>(
        'overview',
        'overview',
        1,
        `/api/overview?${buildApiParams(filters, dateRange)}`,
      ),

  scorecard:
    (category: string, filters: DashboardFilters, dateRange: DateRange) =>
    (): Promise<ScorecardResult> =>
      timedFetch<ScorecardResult>(
        `scorecard/${category}`,
        'scorecard',
        1,
        `/api/scorecard/${enc(category)}?${buildApiParams(filters, dateRange)}`,
      ),

  trend:
    (category: string, tileId: string, filters: DashboardFilters, dateRange: DateRange) =>
    (): Promise<TrendResult> =>
      timedFetch<TrendResult>(
        `trend/${category}/${tileId}`,
        'trend',
        2,
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
      timedFetch<ClosedWonResult>(
        `closedWon/${category}/page${page}`,
        'closedWon',
        3,
        `/api/closed-won/${enc(category)}?${buildApiParams(filters, dateRange)}&page=${page}&pageSize=50&sortField=${enc(sort.field)}&sortDir=${enc(sort.direction)}`,
      ),

  filters:
    () => (): Promise<DictionaryLoaderResult> =>
      timedFetch<DictionaryLoaderResult>('filters', 'filters', 0, '/api/filters'),
};
