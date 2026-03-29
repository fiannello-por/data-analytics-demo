// apps/challenger/lib/v2-query-builder.ts

import type { MetricQueryRequest, MetricQueryFilters } from './types';
import {
  DASHBOARD_V2_BASE_MODEL,
  DASHBOARD_V2_CLOSED_WON_MODEL,
  CLOSED_WON_DIMENSIONS,
  getSemanticTileSpec,
  getEffectiveDateRange,
  buildSemanticFilters,
  type Category,
  type DateRange,
  type SemanticFilter,
  type SnapshotGroup,
  type DashboardFilters,
} from '@por/dashboard-constants';

// Re-export commonly used constants/types/functions for convenience
export {
  DASHBOARD_V2_BASE_MODEL,
  DASHBOARD_V2_CLOSED_WON_MODEL,
  CLOSED_WON_DIMENSIONS,
  getSemanticTileSpec,
  getEffectiveDateRange,
  buildSemanticFilters,
  type Category,
  type DateRange,
  type SemanticFilter,
  type SnapshotGroup,
  type DashboardFilters,
};

// ── Internal helpers ──────────────────────────────────────────────────────────

function buildFieldId(model: string, field: string): string {
  return `${model}_${field}`;
}

function mapOperator(semanticOp: string): string {
  if (semanticOp === 'between') {
    return 'inBetween';
  }
  return semanticOp;
}

function toMetricQueryFilters(
  model: string,
  semanticFilters: SemanticFilter[],
): MetricQueryFilters {
  return {
    dimensions: {
      id: 'root',
      and: semanticFilters.map((f, i) => ({
        id: `sf${i}`,
        target: { fieldId: buildFieldId(model, f.field) },
        operator: mapOperator(f.operator),
        values: f.values,
      })),
    },
  };
}

// ── Public query builders ─────────────────────────────────────────────────────

/**
 * Build a snapshot (single-row) query for all tiles within a SnapshotGroup.
 * Combines category + dashboard filters, group.extraFilters, and a date range
 * filter derived from the group's dateRangeStrategy.
 */
export function buildV2SnapshotGroupQuery(
  category: Category,
  filters: DashboardFilters,
  dateRange: DateRange,
  group: SnapshotGroup,
): MetricQueryRequest {
  const effectiveDateRange = getEffectiveDateRange(
    dateRange,
    group.dateRangeStrategy,
  );

  // Category filter + global dashboard filters
  const categoryAndDashboardFilters = buildSemanticFilters(filters, category);

  // Group extra filters
  const groupExtraFilters: SemanticFilter[] = group.extraFilters ?? [];

  // Date range filter
  const dateRangeFilter: SemanticFilter = {
    field: group.dateDimension,
    operator: 'between',
    values: [effectiveDateRange.startDate, effectiveDateRange.endDate],
  };

  const allFilters: SemanticFilter[] = [
    ...categoryAndDashboardFilters,
    ...groupExtraFilters,
    dateRangeFilter,
  ];

  const metrics = group.tiles.map((tile) =>
    buildFieldId(DASHBOARD_V2_BASE_MODEL, tile.measure),
  );

  return {
    exploreName: DASHBOARD_V2_BASE_MODEL,
    metrics,
    dimensions: [],
    filters: toMetricQueryFilters(DASHBOARD_V2_BASE_MODEL, allFilters),
    sorts: [],
    limit: 1,
    tableCalculations: [],
  };
}

/**
 * Build a weekly trend query for a single tile.
 * Uses the tile's dateDimension for weekly bucketing and sorts ascending.
 */
export function buildV2TrendQuery(
  category: Category,
  tileId: string,
  filters: DashboardFilters,
  dateRange: DateRange,
): MetricQueryRequest {
  const spec = getSemanticTileSpec(tileId);
  const effectiveDateRange = getEffectiveDateRange(
    dateRange,
    spec.dateRangeStrategy,
  );

  const categoryAndDashboardFilters = buildSemanticFilters(filters, category);
  const tileExtraFilters: SemanticFilter[] = spec.extraFilters ?? [];

  const dateRangeFilter: SemanticFilter = {
    field: spec.dateDimension,
    operator: 'between',
    values: [effectiveDateRange.startDate, effectiveDateRange.endDate],
  };

  const allFilters: SemanticFilter[] = [
    ...categoryAndDashboardFilters,
    ...tileExtraFilters,
    dateRangeFilter,
  ];

  const weekDimension = buildFieldId(
    DASHBOARD_V2_BASE_MODEL,
    `${spec.dateDimension}_week`,
  );

  return {
    exploreName: DASHBOARD_V2_BASE_MODEL,
    metrics: [buildFieldId(DASHBOARD_V2_BASE_MODEL, spec.measure)],
    dimensions: [weekDimension],
    filters: toMetricQueryFilters(DASHBOARD_V2_BASE_MODEL, allFilters),
    sorts: [{ fieldId: weekDimension, descending: false }],
    limit: 500,
    tableCalculations: [],
  };
}

/**
 * Build the closed-won detail query. Uses DASHBOARD_V2_CLOSED_WON_MODEL,
 * returns all 19 CLOSED_WON_DIMENSIONS with no metrics, sorted by the given
 * field (defaults to close_date descending).
 */
export function buildV2ClosedWonQuery(
  category: Category,
  filters: DashboardFilters,
  dateRange: DateRange,
  sortField: string = 'close_date',
  sortDescending: boolean = true,
): MetricQueryRequest {
  const categoryAndDashboardFilters = buildSemanticFilters(filters, category);

  const dateRangeFilter: SemanticFilter = {
    field: 'close_date',
    operator: 'between',
    values: [dateRange.startDate, dateRange.endDate],
  };

  const allFilters: SemanticFilter[] = [
    ...categoryAndDashboardFilters,
    dateRangeFilter,
  ];

  const dimensions = CLOSED_WON_DIMENSIONS.map((dim) =>
    buildFieldId(DASHBOARD_V2_CLOSED_WON_MODEL, dim),
  );

  const sortFieldId = buildFieldId(
    DASHBOARD_V2_CLOSED_WON_MODEL,
    sortField,
  );

  return {
    exploreName: DASHBOARD_V2_CLOSED_WON_MODEL,
    metrics: [],
    dimensions,
    filters: toMetricQueryFilters(DASHBOARD_V2_CLOSED_WON_MODEL, allFilters),
    sorts: [{ fieldId: sortFieldId, descending: sortDescending }],
    limit: 500,
    tableCalculations: [],
  };
}
