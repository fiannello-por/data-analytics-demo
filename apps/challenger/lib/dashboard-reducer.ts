// apps/challenger/lib/dashboard-reducer.ts

import {
  CATEGORY_ORDER,
  getDefaultTileId,
  type Category,
  type DashboardFilters,
  type DateRange,
} from '@por/dashboard-constants';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DashboardTab = 'Overview' | Category;

export type ClosedWonSort = {
  field: string;
  direction: 'asc' | 'desc';
};

export type DashboardState = {
  activeTab: DashboardTab;
  committedFilters: DashboardFilters;
  committedDateRange: DateRange;
  draftFilters: DashboardFilters;
  draftDateRange: DateRange;
  selectedTileByCategory: Partial<Record<Category, string>>;
  cwSortByCategory: Partial<Record<Category, ClosedWonSort>>;
  cwPage: number;
};

export type DashboardAction =
  | { type: 'SWITCH_TAB'; tab: DashboardTab }
  | { type: 'SET_DRAFT_FILTERS'; filters: DashboardFilters }
  | { type: 'SET_DRAFT_DATE_RANGE'; dateRange: DateRange }
  | { type: 'APPLY_FILTERS' }
  | { type: 'DISCARD_DRAFTS' }
  | { type: 'SELECT_TILE'; category: Category; tileId: string }
  | { type: 'SET_CW_SORT'; category: Category; field: string }
  | { type: 'SET_CW_PAGE'; page: number }
  | { type: 'RESTORE_URL_STATE'; state: DashboardState };

// ─── Derived helpers ──────────────────────────────────────────────────────────

export function derivePreviousDateRange(dateRange: DateRange): DateRange {
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

export function isCategory(tab: DashboardTab): tab is Category {
  return (CATEGORY_ORDER as readonly string[]).includes(tab);
}

export function getActiveSelectedTileId(state: DashboardState): string {
  if (!isCategory(state.activeTab)) {
    return '';
  }
  return (
    state.selectedTileByCategory[state.activeTab] ??
    getDefaultTileId(state.activeTab)
  );
}

export function getActiveCwSort(state: DashboardState): ClosedWonSort {
  const defaultSort: ClosedWonSort = { field: 'close_date', direction: 'desc' };
  if (!isCategory(state.activeTab)) {
    return defaultSort;
  }
  return state.cwSortByCategory[state.activeTab] ?? defaultSort;
}

export function hasPendingDraftChanges(state: DashboardState): boolean {
  const filtersChanged =
    JSON.stringify(state.draftFilters) !==
    JSON.stringify(state.committedFilters);
  const dateRangeChanged =
    state.draftDateRange.startDate !== state.committedDateRange.startDate ||
    state.draftDateRange.endDate !== state.committedDateRange.endDate;
  return filtersChanged || dateRangeChanged;
}

// ─── Initial state ────────────────────────────────────────────────────────────

function defaultDateRange(): DateRange {
  const now = new Date();
  const year = now.getFullYear();
  return {
    startDate: `${year}-01-01`,
    endDate: now.toISOString().slice(0, 10),
  };
}

export function createInitialState(
  overrides?: Partial<DashboardState>,
): DashboardState {
  const dateRange = overrides?.committedDateRange ?? defaultDateRange();
  const filters = overrides?.committedFilters ?? {};

  return {
    activeTab: 'Overview',
    committedFilters: filters,
    committedDateRange: dateRange,
    draftFilters: filters,
    draftDateRange: dateRange,
    selectedTileByCategory: {},
    cwSortByCategory: {},
    cwPage: 1,
    ...overrides,
  };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function dashboardReducer(
  state: DashboardState,
  action: DashboardAction,
): DashboardState {
  switch (action.type) {
    case 'SWITCH_TAB': {
      return {
        ...state,
        activeTab: action.tab,
        // Discard any pending drafts — reset to committed
        draftFilters: state.committedFilters,
        draftDateRange: state.committedDateRange,
        cwPage: 1,
      };
    }

    case 'SET_DRAFT_FILTERS': {
      return {
        ...state,
        draftFilters: action.filters,
      };
    }

    case 'SET_DRAFT_DATE_RANGE': {
      return {
        ...state,
        draftDateRange: action.dateRange,
      };
    }

    case 'APPLY_FILTERS': {
      return {
        ...state,
        committedFilters: state.draftFilters,
        committedDateRange: state.draftDateRange,
        cwPage: 1,
      };
    }

    case 'DISCARD_DRAFTS': {
      return {
        ...state,
        draftFilters: state.committedFilters,
        draftDateRange: state.committedDateRange,
      };
    }

    case 'SELECT_TILE': {
      return {
        ...state,
        selectedTileByCategory: {
          ...state.selectedTileByCategory,
          [action.category]: action.tileId,
        },
      };
    }

    case 'SET_CW_SORT': {
      const currentSort =
        state.cwSortByCategory[action.category] ?? {
          field: 'close_date',
          direction: 'desc' as const,
        };
      const sameField = currentSort.field === action.field;
      const newDirection: 'asc' | 'desc' =
        sameField && currentSort.direction === 'desc' ? 'asc' : 'desc';

      return {
        ...state,
        cwSortByCategory: {
          ...state.cwSortByCategory,
          [action.category]: { field: action.field, direction: newDirection },
        },
        cwPage: 1,
      };
    }

    case 'SET_CW_PAGE': {
      return {
        ...state,
        cwPage: action.page,
      };
    }

    case 'RESTORE_URL_STATE': {
      return action.state;
    }

    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
