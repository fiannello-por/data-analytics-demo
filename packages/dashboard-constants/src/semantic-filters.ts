// packages/dashboard-constants/src/semantic-filters.ts

import type { SemanticFilter } from './semantic-types';
import type { Category } from './categories';
import { FILTER_DIMENSIONS, type GlobalFilterKey } from './filters';

export type DashboardFilters = Partial<Record<GlobalFilterKey, string[]>>;

export function buildSemanticFilters(
  filters: DashboardFilters,
  category: Category,
): SemanticFilter[] {
  const semanticFilters: SemanticFilter[] = [];

  if (category !== 'Total') {
    semanticFilters.push({
      field: 'dashboard_category',
      operator: 'equals',
      values: [category],
    });
  }

  for (const [key, values] of Object.entries(filters)) {
    if (!values?.length) {
      continue;
    }
    const dimension = FILTER_DIMENSIONS[key as GlobalFilterKey];
    if (!dimension) {
      continue;
    }
    semanticFilters.push({
      field: dimension,
      operator: 'equals',
      values,
    });
  }

  return semanticFilters;
}
