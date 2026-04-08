import type {
  SemanticQueryRequest,
  SemanticSort,
} from '@por/semantic-runtime';
import {
  findTileDefinition,
  getCategoryTiles,
  type Category,
} from '@/lib/dashboard/catalog';
import {
  FILTER_DIMENSIONS,
  DASHBOARD_V2_BASE_MODEL,
  DASHBOARD_V2_CLOSED_WON_MODEL,
  CLOSED_WON_DIMENSIONS,
  getSemanticTileSpec,
  getEffectiveDateRange,
  buildSemanticFilters,
  buildFilterSignature,
  getSnapshotGroups as getSnapshotGroupsByTileIds,
  type GlobalFilterKey,
  type TileSemanticSpec,
  type DateRangeStrategy,
  type SnapshotGroup,
  type SemanticFilter,
  type DateRange,
  type DashboardFilters,
} from '@por/dashboard-constants';

export function getSemanticFilterDimension(key: GlobalFilterKey): string {
  return FILTER_DIMENSIONS[key];
}

export function getClosedWonDimensions(): readonly string[] {
  return CLOSED_WON_DIMENSIONS;
}

export function buildClosedWonQuery(
  category: Category,
  filters: DashboardFilters,
  dateRange: DateRange,
): SemanticQueryRequest {
  return {
    model: DASHBOARD_V2_CLOSED_WON_MODEL,
    dimensions: [...CLOSED_WON_DIMENSIONS],
    filters: [
      ...buildSemanticFilters(filters, category),
      {
        field: 'close_date',
        operator: 'between',
        values: [dateRange.startDate, dateRange.endDate],
      },
    ],
    sorts: [{ field: 'close_date', descending: true }],
    limit: 500,
  };
}

export function buildFilterDictionaryQuery(
  key: GlobalFilterKey,
): SemanticQueryRequest {
  const dimension = getSemanticFilterDimension(key);

  return {
    model: DASHBOARD_V2_BASE_MODEL,
    dimensions: [dimension],
    sorts: [{ field: dimension, descending: false }],
    limit: 500,
  };
}

export function getSnapshotGroups(category: Category): SnapshotGroup[] {
  const tileIds = getCategoryTiles(category).map((t) => t.tileId);
  return getSnapshotGroupsByTileIds(tileIds);
}

export function buildSnapshotGroupQuery(
  category: Category,
  filters: DashboardFilters,
  dateRange: DateRange,
  group: SnapshotGroup,
): SemanticQueryRequest {
  const effectiveDateRange = getEffectiveDateRange(
    dateRange,
    group.dateRangeStrategy,
  );

  return {
    model: DASHBOARD_V2_BASE_MODEL,
    measures: group.tiles.map((tile) => tile.measure),
    filters: [
      ...buildSemanticFilters(filters, category),
      ...(group.extraFilters ?? []),
      {
        field: group.dateDimension,
        operator: 'between',
        values: [effectiveDateRange.startDate, effectiveDateRange.endDate],
      },
    ],
  };
}

export function buildTrendQuery(
  category: Category,
  tileId: string,
  filters: DashboardFilters,
  dateRange: DateRange,
): SemanticQueryRequest {
  const tile = findTileDefinition(category, tileId);
  if (!tile) {
    throw new Error(`Unknown tile "${tileId}" for category "${category}".`);
  }

  const semantic = getSemanticTileSpec(tileId);
  const effectiveDateRange = getEffectiveDateRange(
    dateRange,
    semantic.dateRangeStrategy,
  );

  return {
    model: DASHBOARD_V2_BASE_MODEL,
    measures: [semantic.measure],
    dimensions: [`${semantic.dateDimension}_week`],
    filters: [
      ...buildSemanticFilters(filters, category),
      ...(semantic.extraFilters ?? []),
      {
        field: semantic.dateDimension,
        operator: 'between',
        values: [effectiveDateRange.startDate, effectiveDateRange.endDate],
      },
    ],
    sorts: [
      {
        field: `${semantic.dateDimension}_week`,
        descending: false,
      } satisfies SemanticSort,
    ],
    limit: 500,
  };
}

// Re-export shared package symbols for backward compatibility
export {
  DASHBOARD_V2_BASE_MODEL,
  DASHBOARD_V2_CLOSED_WON_MODEL,
  getSemanticTileSpec,
  buildSemanticFilters,
  getEffectiveDateRange,
  buildFilterSignature,
};

export type {
  TileSemanticSpec,
  DateRangeStrategy,
  SnapshotGroup,
  SemanticFilter,
  DateRange,
  DashboardFilters,
};
