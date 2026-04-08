import type { DashboardFilters, DateRange } from '@por/dashboard-constants';
import type { ClosedWonSort } from './dashboard-reducer';

function normalizeFilters(filters: DashboardFilters): string {
  const entries = Object.entries(filters)
    .filter(([, v]) => v && v.length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${[...v!].sort().join('+')}`)
    .join('|');
  return entries || '_none_';
}

function normalizeDateRange(dateRange: DateRange): string {
  return `${dateRange.startDate}:${dateRange.endDate}`;
}

export const queryKeys = {
  overview: (filters: DashboardFilters, dateRange: DateRange) =>
    ['overview', normalizeFilters(filters), normalizeDateRange(dateRange)] as const,

  scorecard: (category: string, filters: DashboardFilters, dateRange: DateRange) =>
    ['scorecard', category, normalizeFilters(filters), normalizeDateRange(dateRange)] as const,

  trend: (category: string, tileId: string, filters: DashboardFilters, dateRange: DateRange) =>
    ['trend', category, tileId, normalizeFilters(filters), normalizeDateRange(dateRange)] as const,

  closedWon: (
    category: string,
    filters: DashboardFilters,
    dateRange: DateRange,
    page: number,
    sort: ClosedWonSort,
  ) =>
    [
      'closed-won',
      category,
      normalizeFilters(filters),
      normalizeDateRange(dateRange),
      page,
      sort.field,
      sort.direction,
    ] as const,

  filters: () => ['filters'] as const,
};
