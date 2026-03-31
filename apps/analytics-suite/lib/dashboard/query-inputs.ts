import {
  CATEGORY_ORDER,
  findTileDefinition,
  findCategoryForTileId,
  getDefaultTileId,
  isCategory,
  isDashboardTab,
  OVERVIEW_TAB,
  type Category,
  type DashboardTab,
  type GlobalFilterKey,
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
  activeCategory: DashboardTab;
  filters?: DashboardFilters;
  dateRange?: DateRange;
  selectedTileId?: string;
};

export type DashboardUrlFactory = {
  buildCategoryUrl: (
    input: DashboardStateKeyInput & { activeCategory: Category },
  ) => string;
  buildCategoryGroupUrl: (
    input: DashboardStateKeyInput & {
      activeCategory: Category;
      groupId: string;
    },
  ) => string;
  buildOverviewUrl: (
    input: Pick<DashboardStateKeyInput, 'filters' | 'dateRange'>,
  ) => string;
  buildTrendUrl: (
    input: DashboardStateKeyInput & { activeCategory: Category },
  ) => string;
  buildClosedWonUrl: (
    input: DashboardStateKeyInput & { activeCategory: Category },
  ) => string;
  buildFilterDictionaryUrl: (key: GlobalFilterKey) => string;
};

function normalizeFilterValues(values: string[]): string[] {
  return [
    ...new Set(values.map((value) => value.trim()).filter(Boolean)),
  ].sort();
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

function updateDashboardFilterValues(
  filters: DashboardFilters,
  key: keyof DashboardFilters,
  nextValues: string[],
): DashboardFilters {
  const normalizedFilters = normalizeDashboardFilters(filters);
  const normalizedValues = normalizeFilterValues(nextValues);

  if (normalizedValues.length === 0) {
    const { [key]: _removed, ...rest } = normalizedFilters;
    return rest;
  }

  return {
    ...normalizedFilters,
    [key]: normalizedValues,
  };
}

export function addDashboardFilterValue(
  filters: DashboardFilters,
  key: keyof DashboardFilters,
  value: string,
): DashboardFilters {
  return updateDashboardFilterValues(filters, key, [
    ...(filters[key] ?? []),
    value,
  ]);
}

export function removeDashboardFilterValue(
  filters: DashboardFilters,
  key: keyof DashboardFilters,
  value: string,
): DashboardFilters {
  return updateDashboardFilterValues(
    filters,
    key,
    (filters[key] ?? []).filter((item) => item !== value),
  );
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

export function serializeDashboardSnapshotSearchParams(
  input: Pick<
    DashboardStateKeyInput,
    'activeCategory' | 'dateRange' | 'filters'
  >,
): URLSearchParams {
  const state = {
    activeCategory: input.activeCategory,
    dateRange: input.dateRange ?? getCurrentYearRange(),
    filters: normalizeDashboardFilters(input.filters ?? {}),
  };
  const searchParams = new URLSearchParams();

  searchParams.set('category', state.activeCategory);
  searchParams.set('startDate', state.dateRange.startDate);
  searchParams.set('endDate', state.dateRange.endDate);

  for (const [key, values] of Object.entries(state.filters)) {
    for (const value of values) {
      searchParams.append(key, value);
    }
  }

  return searchParams;
}

export function serializeDashboardStateSearchParams(
  input: DashboardStateKeyInput,
): URLSearchParams {
  const searchParams = serializeDashboardSnapshotSearchParams(input);
  const selectedTileId =
    input.selectedTileId ??
    (isCategory(input.activeCategory)
      ? getDefaultTileId(input.activeCategory)
      : getDefaultTileId(CATEGORY_ORDER[0]));

  if (selectedTileId) {
    searchParams.set('tileId', selectedTileId);
  }

  return searchParams;
}

export function buildDashboardUrlFactory(
  basePath = '/api/dashboard',
): DashboardUrlFactory {
  return {
    buildCategoryUrl(
      input: DashboardStateKeyInput & { activeCategory: Category },
    ): string {
      const searchParams = serializeDashboardSnapshotSearchParams(input);
      return `${basePath}/category/${encodeURIComponent(input.activeCategory)}?${searchParams.toString()}`;
    },

    buildCategoryGroupUrl(
      input: DashboardStateKeyInput & {
        activeCategory: Category;
        groupId: string;
      },
    ): string {
      const searchParams = serializeDashboardSnapshotSearchParams(input);
      return `${basePath}/category/${encodeURIComponent(input.activeCategory)}/groups/${encodeURIComponent(input.groupId)}?${searchParams.toString()}`;
    },

    buildOverviewUrl(
      input: Pick<DashboardStateKeyInput, 'filters' | 'dateRange'>,
    ): string {
      const searchParams = new URLSearchParams();
      const dateRange = input.dateRange ?? getCurrentYearRange();

      searchParams.set('category', OVERVIEW_TAB);
      searchParams.set('startDate', dateRange.startDate);
      searchParams.set('endDate', dateRange.endDate);

      for (const [key, values] of Object.entries(
        normalizeDashboardFilters(input.filters ?? {}),
      )) {
        for (const value of values) {
          searchParams.append(key, value);
        }
      }

      return `${basePath}/overview?${searchParams.toString()}`;
    },

    buildTrendUrl(
      input: DashboardStateKeyInput & { activeCategory: Category },
    ): string {
      const selectedTileId =
        input.selectedTileId ?? getDefaultTileId(input.activeCategory);
      const searchParams = serializeDashboardSnapshotSearchParams({
        ...input,
      });
      searchParams.set('tileId', selectedTileId);
      return `${basePath}/trend/${encodeURIComponent(selectedTileId)}?${searchParams.toString()}`;
    },

    buildClosedWonUrl(
      input: DashboardStateKeyInput & { activeCategory: Category },
    ): string {
      const searchParams = serializeDashboardSnapshotSearchParams(input);
      return `${basePath}/closed-won/${encodeURIComponent(input.activeCategory)}?${searchParams.toString()}`;
    },

    buildFilterDictionaryUrl(key: GlobalFilterKey): string {
      return `${basePath}/filter-dictionaries/${encodeURIComponent(key)}`;
    },
  };
}

export function buildDashboardCategoryUrl(
  input: DashboardStateKeyInput & { activeCategory: Category },
): string {
  return buildDashboardUrlFactory().buildCategoryUrl(input);
}

export function buildDashboardOverviewUrl(
  input: Pick<DashboardStateKeyInput, 'filters' | 'dateRange'>,
): string {
  return buildDashboardUrlFactory().buildOverviewUrl(input);
}

export function buildDashboardTrendUrl(
  input: DashboardStateKeyInput & { activeCategory: Category },
): string {
  return buildDashboardUrlFactory().buildTrendUrl(input);
}

export function buildDashboardClosedWonUrl(
  input: DashboardStateKeyInput & { activeCategory: Category },
): string {
  return buildDashboardUrlFactory().buildClosedWonUrl(input);
}

export function setDashboardActiveCategory(
  state: DashboardState,
  activeCategory: DashboardTab,
): DashboardState {
  return {
    ...state,
    activeCategory,
    selectedTileId: isCategory(activeCategory)
      ? getDefaultTileId(activeCategory)
      : state.selectedTileId,
  };
}

export function setDashboardSelectedTile(
  state: DashboardState,
  selectedTileId: string,
): DashboardState {
  return {
    ...state,
    selectedTileId,
  };
}

export function parseDashboardSearchParams(
  searchParams: URLSearchParams,
): DashboardState {
  const activeCategoryParam = searchParams.get('category');
  const activeCategory =
    activeCategoryParam && isDashboardTab(activeCategoryParam)
      ? activeCategoryParam
      : OVERVIEW_TAB;
  const dateRange = parseDateRange(searchParams);
  const requestedTileId = searchParams.get('tileId')?.trim();
  const selectedTileId = isCategory(activeCategory)
    ? requestedTileId && findTileDefinition(activeCategory, requestedTileId)
      ? requestedTileId
      : getDefaultTileId(activeCategory)
    : requestedTileId && findCategoryForTileId(requestedTileId)
      ? requestedTileId
      : getDefaultTileId(CATEGORY_ORDER[0]);

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
    selectedTileId:
      input.selectedTileId ??
      (isCategory(input.activeCategory)
        ? getDefaultTileId(input.activeCategory)
        : getDefaultTileId(CATEGORY_ORDER[0])),
    dateRange,
    filters: normalizeDashboardFilters(input.filters ?? {}),
  });
}
