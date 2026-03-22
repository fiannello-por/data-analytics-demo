import {
  CATEGORY_ORDER,
  findTileDefinition,
  getDefaultTileId,
  isCategory,
  type Category,
} from '@/lib/dashboard/catalog';
import type {
  DashboardFilters,
  DashboardState,
  DateRange,
} from '@/lib/dashboard/contracts';
import { isGlobalFilterKey } from '@/lib/dashboard/filter-config';
import {
  derivePreviousYearRange,
  getCurrentYearRange,
  isValidDateRange,
} from '@/lib/dashboard/date-range';

export type DashboardStateKeyInput = {
  activeCategory: Category;
  filters?: DashboardFilters;
  dateRange?: DateRange;
  selectedTileId?: string;
};

function normalizeFilterValues(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

export function normalizeDashboardFilters(
  filters: DashboardFilters,
): DashboardFilters {
  const normalizedEntries = Object.entries(filters)
    .map(([key, values]) => [key, normalizeFilterValues(values ?? [])] as const)
    .filter(([, values]) => values.length > 0)
    .sort(([left], [right]) => left.localeCompare(right));

  return Object.fromEntries(normalizedEntries) as DashboardFilters;
}

function parseDateRange(searchParams: URLSearchParams): DateRange {
  const startDate = searchParams.get('startDate')?.trim();
  const endDate = searchParams.get('endDate')?.trim();

  if (startDate && endDate) {
    const range = { startDate, endDate };
    if (isValidDateRange(range)) {
      return range;
    }
  }

  return getCurrentYearRange();
}

function parseFilters(searchParams: URLSearchParams): DashboardFilters {
  const filters: DashboardFilters = {};

  for (const [key, value] of searchParams.entries()) {
    if (!isGlobalFilterKey(key)) continue;
    const current = filters[key] ?? [];
    filters[key] = [...current, value];
  }

  return normalizeDashboardFilters(filters);
}

export function parseDashboardSearchParams(
  searchParams: URLSearchParams,
): DashboardState {
  const activeCategoryParam = searchParams.get('category');
  const activeCategory = activeCategoryParam && isCategory(activeCategoryParam)
    ? activeCategoryParam
    : CATEGORY_ORDER[0];
  const dateRange = parseDateRange(searchParams);
  const requestedTileId = searchParams.get('tileId')?.trim();
  const selectedTileId =
    requestedTileId && findTileDefinition(activeCategory, requestedTileId)
      ? requestedTileId
      : getDefaultTileId(activeCategory);

  return {
    activeCategory,
    selectedTileId,
    filters: parseFilters(searchParams),
    dateRange,
    previousDateRange: derivePreviousYearRange(dateRange),
    trendGrain: 'weekly',
  };
}

export function serializeDashboardStateKey(
  input: DashboardStateKeyInput,
): string {
  const dateRange = input.dateRange ?? getCurrentYearRange();
  return JSON.stringify({
    activeCategory: input.activeCategory,
    selectedTileId: input.selectedTileId ?? getDefaultTileId(input.activeCategory),
    dateRange,
    filters: normalizeDashboardFilters(input.filters ?? {}),
  });
}
