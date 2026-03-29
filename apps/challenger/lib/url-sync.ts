// apps/challenger/lib/url-sync.ts
//
// Serializes DashboardState to URL search params and calls
// history.pushState / history.replaceState.

import { GLOBAL_FILTER_KEYS } from '@por/dashboard-constants';
import type { DashboardState } from './dashboard-reducer';
import { getActiveCwSort, isCategory } from './dashboard-reducer';

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_TAB = 'Overview';
const DEFAULT_CW_SORT_FIELD = 'close_date';
const DEFAULT_CW_SORT_DIR = 'desc';
const DEFAULT_CW_PAGE = 1;

/**
 * Returns the YTD start date for the given year, formatted as YYYY-01-01.
 */
function ytdStartDate(): string {
  return `${new Date().getFullYear()}-01-01`;
}

/**
 * Returns today's date formatted as YYYY-MM-DD.
 */
function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Serializer ───────────────────────────────────────────────────────────────

/**
 * Converts a DashboardState to URLSearchParams.
 *
 * Omission rules:
 * - `tab`      — omitted if 'Overview'
 * - filters    — repeated params per key (Division=East&Division=West)
 * - `startDate`/`endDate` — omitted if they match the default YTD range
 * - `tile`     — only for category tabs; omitted if undefined
 * - `cwPage`   — omitted if 1
 * - `cwSort`/`cwDir` — omitted if default (close_date / desc)
 */
function serializeState(state: DashboardState): URLSearchParams {
  const params = new URLSearchParams();

  // tab
  if (state.activeTab !== DEFAULT_TAB) {
    params.set('tab', state.activeTab);
  }

  // committed filters — repeated params per key
  for (const key of GLOBAL_FILTER_KEYS) {
    const values = state.committedFilters[key];
    if (values && values.length > 0) {
      for (const v of values) {
        params.append(key, v);
      }
    }
  }

  // date range — omit if default YTD
  const defaultStart = ytdStartDate();
  const defaultEnd = todayDate();
  if (state.committedDateRange.startDate !== defaultStart) {
    params.set('startDate', state.committedDateRange.startDate);
  }
  if (state.committedDateRange.endDate !== defaultEnd) {
    params.set('endDate', state.committedDateRange.endDate);
  }

  // tile — only for category tabs
  if (isCategory(state.activeTab)) {
    const tileId = state.selectedTileByCategory[state.activeTab];
    if (tileId !== undefined) {
      params.set('tile', tileId);
    }
  }

  // cwPage — omit if 1
  if (state.cwPage !== DEFAULT_CW_PAGE) {
    params.set('cwPage', String(state.cwPage));
  }

  // cwSort / cwDir — omit if default
  const cwSort = getActiveCwSort(state);
  if (cwSort.field !== DEFAULT_CW_SORT_FIELD) {
    params.set('cwSort', cwSort.field);
  }
  if (cwSort.direction !== DEFAULT_CW_SORT_DIR) {
    params.set('cwDir', cwSort.direction);
  }

  return params;
}

/**
 * Builds the URL string from search params, preserving the current pathname
 * and hash.
 */
function buildUrl(params: URLSearchParams): string {
  const search = params.toString();
  const { pathname, hash } = window.location;
  return search ? `${pathname}?${search}${hash}` : `${pathname}${hash}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Serializes committed state to URL params and pushes a new history entry.
 */
export function pushDashboardState(state: DashboardState): void {
  const params = serializeState(state);
  history.pushState(null, '', buildUrl(params));
}

/**
 * Serializes committed state to URL params and replaces the current history
 * entry (no new entry in the back-stack).
 */
export function replaceDashboardState(state: DashboardState): void {
  const params = serializeState(state);
  history.replaceState(null, '', buildUrl(params));
}
