// apps/challenger/lib/url-state.ts

import {
  CATEGORY_ORDER,
  GLOBAL_FILTER_KEYS,
  type Category,
  type DashboardFilters,
  type DateRange,
  type GlobalFilterKey,
} from '@por/dashboard-constants';

// ─── Types ────────────────────────────────────────────────────────────────────

export type { DashboardFilters };

export type DashboardTab = 'Overview' | Category;

export type ClosedWonSort = {
  field: string;
  direction: 'asc' | 'desc';
};

export type DashboardUrlState = {
  tab: DashboardTab;
  filters: DashboardFilters;
  dateRange: DateRange;
  previousDateRange: DateRange;
  tile?: string;
  cwPage: number;
  cwPageSize: number;
  cwSort: ClosedWonSort;
};

// ─── Default date range helpers ───────────────────────────────────────────────

function defaultDateRange(): DateRange {
  const now = new Date();
  const year = now.getFullYear();
  return {
    startDate: `${year}-01-01`,
    endDate: now.toISOString().slice(0, 10),
  };
}

function derivePreviousDateRange(dateRange: DateRange): DateRange {
  const start = new Date(dateRange.startDate);
  const end = new Date(dateRange.endDate);
  const prevStart = new Date(start);
  prevStart.setFullYear(prevStart.getFullYear() - 1);
  const prevEnd = new Date(end);
  prevEnd.setFullYear(prevEnd.getFullYear() - 1);
  return {
    startDate: prevStart.toISOString().slice(0, 10),
    endDate: prevEnd.toISOString().slice(0, 10),
  };
}

// ─── Parser ───────────────────────────────────────────────────────────────────

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(params: SearchParams, key: string): string | undefined {
  const val = params[key];
  if (Array.isArray(val)) return val[0];
  return val;
}

function getParamArray(params: SearchParams, key: string): string[] {
  const val = params[key];
  if (val === undefined) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

export function parseDashboardUrl(params: SearchParams): DashboardUrlState {
  // tab
  const rawTab = getParam(params, 'tab');
  let tab: DashboardTab = 'Overview';
  if (rawTab === 'Overview') {
    tab = 'Overview';
  } else if (
    rawTab !== undefined &&
    (CATEGORY_ORDER as readonly string[]).includes(rawTab)
  ) {
    tab = rawTab as Category;
  }

  // filters — repeated query params, one value per param occurrence
  const filters: DashboardFilters = {};
  for (const key of GLOBAL_FILTER_KEYS) {
    const values = getParamArray(params, key);
    if (values.length > 0) {
      filters[key as GlobalFilterKey] = values;
    }
  }

  // dateRange
  const startDate = getParam(params, 'startDate');
  const endDate = getParam(params, 'endDate');
  const fallback = defaultDateRange();
  const dateRange: DateRange =
    startDate && endDate ? { startDate, endDate } : fallback;

  // previousDateRange — always derived from dateRange
  const previousDateRange = derivePreviousDateRange(dateRange);

  // cwPage
  const rawCwPage = getParam(params, 'cwPage');
  const cwPage =
    rawCwPage !== undefined && /^\d+$/.test(rawCwPage)
      ? Math.max(1, parseInt(rawCwPage, 10))
      : 1;

  // cwPageSize — fixed
  const cwPageSize = 50;

  // cwSort
  const cwSortField = getParam(params, 'cwSort') ?? 'close_date';
  const rawCwDir = getParam(params, 'cwDir');
  const cwDir: 'asc' | 'desc' =
    rawCwDir === 'asc' || rawCwDir === 'desc' ? rawCwDir : 'desc';
  const cwSort: ClosedWonSort = { field: cwSortField, direction: cwDir };

  // tile — optional selected tile ID
  const tile = getParam(params, 'tile');

  return {
    tab,
    filters,
    dateRange,
    previousDateRange,
    tile,
    cwPage,
    cwPageSize,
    cwSort,
  };
}

// ─── URL builder helpers ──────────────────────────────────────────────────────

/**
 * Appends tab, dateRange (only when non-default), and filters to the given
 * URLSearchParams. Filters use repeated params — one append per value — so
 * values containing commas are preserved without ambiguity.
 */
export function appendBaseState(
  params: URLSearchParams,
  state: DashboardUrlState,
  tab?: DashboardTab,
): void {
  const activeTab = tab ?? state.tab;
  if (activeTab !== 'Overview') {
    params.set('tab', activeTab);
  }

  const fallback = defaultDateRange();
  if (
    state.dateRange.startDate !== fallback.startDate ||
    state.dateRange.endDate !== fallback.endDate
  ) {
    params.set('startDate', state.dateRange.startDate);
    params.set('endDate', state.dateRange.endDate);
  }

  for (const key of GLOBAL_FILTER_KEYS) {
    const values = state.filters[key as GlobalFilterKey];
    if (values && values.length > 0) {
      for (const v of values) {
        params.append(key, v);
      }
    }
  }
}

// ─── URL builders ─────────────────────────────────────────────────────────────

export function buildTabUrl(tab: DashboardTab, current: DashboardUrlState): string {
  const params = new URLSearchParams();
  appendBaseState(params, current, tab);
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

export function buildFilterApplyUrl(
  current: DashboardUrlState,
  newFilters: DashboardFilters,
): string {
  return buildTabUrl(current.tab, { ...current, filters: newFilters });
}

export function buildCwPageUrl(current: DashboardUrlState, page: number): string {
  const params = new URLSearchParams();
  appendBaseState(params, current);
  if (page !== 1) {
    params.set('cwPage', String(page));
  }
  params.set('cwSort', current.cwSort.field);
  if (current.cwSort.direction !== 'desc') {
    params.set('cwDir', current.cwSort.direction);
  }
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

export function buildCwSortUrl(current: DashboardUrlState, field: string): string {
  // Toggle direction if already sorting by this field; otherwise default to desc
  const sameField = current.cwSort.field === field;
  const direction: 'asc' | 'desc' = sameField && current.cwSort.direction === 'desc'
    ? 'asc'
    : 'desc';

  const params = new URLSearchParams();
  appendBaseState(params, current);
  // Reset to page 1 on sort change (omit cwPage)
  params.set('cwSort', field);
  if (direction !== 'desc') {
    params.set('cwDir', direction);
  }
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}
