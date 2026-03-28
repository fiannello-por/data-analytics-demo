// apps/challenger/lib/query-builder.ts

import type { MetricQueryRequest, MetricQueryFilters } from './types';
import {
  DASHBOARD_V2_BASE_MODEL,
  CATEGORY_ORDER,
  GLOBAL_FILTER_KEYS,
  FILTER_DIMENSIONS,
  type Category,
  type GlobalFilterKey,
} from '@por/dashboard-constants';

// Re-export for convenience within the challenger app
export {
  DASHBOARD_V2_BASE_MODEL,
  CATEGORY_ORDER as CATEGORIES,
  GLOBAL_FILTER_KEYS,
  FILTER_DIMENSIONS,
  type Category,
  type GlobalFilterKey,
};

export type DateRange = {
  startDate: string;
  endDate: string;
};

function buildFieldId(model: string, field: string): string {
  return `${model}_${field}`;
}

function emptyFilters(): MetricQueryFilters {
  return { dimensions: { id: 'root', and: [] } };
}

// Per-category extra filters matching production semantic-registry.ts.
// Expansion and Total bookings_amount require CLOSED_WON_POSITIVE_ACV_FILTERS.
type LightdashFilterRule = {
  id: string;
  target: { fieldId: string };
  operator: string;
  values?: Array<string | number | boolean | null>;
};

function closedWonPositiveAcvFilters(): LightdashFilterRule[] {
  return [
    {
      id: 'extra_won',
      target: { fieldId: buildFieldId(DASHBOARD_V2_BASE_MODEL, 'won') },
      operator: 'equals',
      values: [true],
    },
    {
      id: 'extra_stage',
      target: { fieldId: buildFieldId(DASHBOARD_V2_BASE_MODEL, 'stage_name') },
      operator: 'equals',
      values: ['Closed Won'],
    },
    {
      id: 'extra_acv',
      target: { fieldId: buildFieldId(DASHBOARD_V2_BASE_MODEL, 'acv') },
      operator: 'greaterThan',
      values: [0],
    },
  ];
}

function getExtraFiltersForCategory(category: Category): LightdashFilterRule[] {
  // Matches production semantic-registry.ts:
  // expansion_bookings_amount (line 103): CLOSED_WON_POSITIVE_ACV_FILTERS
  // total_bookings_amount (line 213): CLOSED_WON_POSITIVE_ACV_FILTERS
  // All others: no extra filters
  if (category === 'Expansion' || category === 'Total') {
    return closedWonPositiveAcvFilters();
  }
  return [];
}

export function buildCategoryQuery(
  category: Category,
  dateRange: DateRange,
): MetricQueryRequest {
  const categoryFilter =
    category !== 'Total'
      ? [
          {
            id: 'f0',
            target: {
              fieldId: buildFieldId(
                DASHBOARD_V2_BASE_MODEL,
                'dashboard_category',
              ),
            },
            operator: 'equals',
            values: [category],
          },
        ]
      : [];

  const dateFilter = {
    id: 'f1',
    target: {
      fieldId: buildFieldId(DASHBOARD_V2_BASE_MODEL, 'close_date'),
    },
    operator: 'inBetween',
    values: [dateRange.startDate, dateRange.endDate],
  };

  const extraFilters = getExtraFiltersForCategory(category);

  return {
    exploreName: DASHBOARD_V2_BASE_MODEL,
    metrics: [buildFieldId(DASHBOARD_V2_BASE_MODEL, 'bookings_amount')],
    dimensions: [],
    filters: {
      dimensions: {
        id: 'root',
        and: [...categoryFilter, dateFilter, ...extraFilters],
      },
    },
    sorts: [],
    limit: 1,
    tableCalculations: [],
  };
}

export function buildDictionaryQuery(
  filterKey: GlobalFilterKey,
): MetricQueryRequest {
  const dimension = FILTER_DIMENSIONS[filterKey];

  return {
    exploreName: DASHBOARD_V2_BASE_MODEL,
    metrics: [],
    dimensions: [buildFieldId(DASHBOARD_V2_BASE_MODEL, dimension)],
    filters: emptyFilters(),
    sorts: [
      {
        fieldId: buildFieldId(DASHBOARD_V2_BASE_MODEL, dimension),
        descending: false,
      },
    ],
    limit: 500,
    tableCalculations: [],
  };
}

export function defaultDateRange(): DateRange {
  const now = new Date();
  const year = now.getFullYear();
  return {
    startDate: `${year}-01-01`,
    endDate: now.toISOString().slice(0, 10),
  };
}

export function defaultPreviousDateRange(): DateRange {
  const now = new Date();
  const year = now.getFullYear() - 1;
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-${month}-${day}`,
  };
}