import type {
  SemanticFilter,
  SemanticQueryRequest,
  SemanticSort,
} from '@por/semantic-runtime';
import {
  findTileDefinition,
  getCategoryTiles,
  type Category,
  type GlobalFilterKey,
  type TileDefinition,
} from '@/lib/dashboard/catalog';
import type { DashboardFilters, DateRange } from '@/lib/dashboard/contracts';

export const DASHBOARD_V2_BASE_MODEL =
  'sales_dashboard_v2_opportunity_base' as const;
export const DASHBOARD_V2_CLOSED_WON_MODEL =
  'sales_dashboard_v2_closed_won' as const;

type DateRangeStrategy = 'selected' | 'ytd_to_end';

type TileSemanticSpec = {
  measure: string;
  dateDimension: string;
  extraFilters?: SemanticFilter[];
  dateRangeStrategy?: DateRangeStrategy;
};

const CLOSED_WON_FILTERS = [
  {
    field: 'won',
    operator: 'equals',
    values: [true],
  },
  {
    field: 'stage_name',
    operator: 'equals',
    values: ['Closed Won'],
  },
] satisfies SemanticFilter[];

const CLOSED_WON_POSITIVE_ACV_FILTERS = [
  ...CLOSED_WON_FILTERS,
  {
    field: 'acv',
    operator: 'greaterThan',
    values: [0],
  },
] satisfies SemanticFilter[];

const WON_POSITIVE_ACV_FILTERS = [
  {
    field: 'won',
    operator: 'equals',
    values: [true],
  },
  {
    field: 'acv',
    operator: 'greaterThan',
    values: [0],
  },
] satisfies SemanticFilter[];

const TILE_SPECS: Record<string, TileSemanticSpec> = {
  new_logo_bookings_amount: {
    measure: 'bookings_amount',
    dateDimension: 'close_date',
  },
  new_logo_bookings_count: {
    measure: 'bookings_count',
    dateDimension: 'close_date',
  },
  new_logo_annual_pacing_ytd: {
    measure: 'annual_pacing_ytd',
    dateDimension: 'close_date',
    dateRangeStrategy: 'ytd_to_end',
  },
  new_logo_close_rate: { measure: 'close_rate', dateDimension: 'close_date' },
  new_logo_avg_age: { measure: 'avg_age', dateDimension: 'close_date' },
  new_logo_avg_booked_deal: {
    measure: 'avg_booked_deal',
    dateDimension: 'close_date',
  },
  new_logo_avg_quoted_deal: {
    measure: 'avg_quoted_deal',
    dateDimension: 'created_date',
  },
  new_logo_pipeline_created: {
    measure: 'pipeline_created',
    dateDimension: 'pipeline_start_date',
  },
  new_logo_sql: { measure: 'sql_count', dateDimension: 'created_date' },
  new_logo_sqo: { measure: 'sqo_count', dateDimension: 'sales_qualified_date' },
  new_logo_gate_1_complete: {
    measure: 'gate_1_complete_count',
    dateDimension: 'gate1_completed_date',
  },
  new_logo_sdr_points: { measure: 'sdr_points', dateDimension: 'created_date' },
  new_logo_sqo_users: {
    measure: 'sqo_users',
    dateDimension: 'sales_qualified_date',
  },
  expansion_bookings_amount: {
    measure: 'bookings_amount',
    dateDimension: 'close_date',
    extraFilters: CLOSED_WON_POSITIVE_ACV_FILTERS,
  },
  expansion_bookings_count: {
    measure: 'bookings_count',
    dateDimension: 'close_date',
    extraFilters: CLOSED_WON_POSITIVE_ACV_FILTERS,
  },
  expansion_annual_pacing_ytd: {
    measure: 'annual_pacing_ytd',
    dateDimension: 'close_date',
    extraFilters: WON_POSITIVE_ACV_FILTERS,
    dateRangeStrategy: 'ytd_to_end',
  },
  expansion_close_rate: { measure: 'close_rate', dateDimension: 'close_date' },
  expansion_avg_age: {
    measure: 'avg_age_scorecard',
    dateDimension: 'close_date',
    extraFilters: WON_POSITIVE_ACV_FILTERS,
  },
  expansion_avg_booked_deal: {
    measure: 'avg_booked_deal',
    dateDimension: 'close_date',
  },
  expansion_avg_quoted_deal: {
    measure: 'avg_quoted_deal',
    dateDimension: 'created_date',
  },
  expansion_pipeline_created: {
    measure: 'pipeline_created',
    dateDimension: 'pipeline_start_date',
  },
  expansion_sql: {
    measure: 'expansion_sql_count',
    dateDimension: 'created_date',
  },
  expansion_sqo: {
    measure: 'expansion_sqo_count',
    dateDimension: 'expansion_qualified_date',
  },
  migration_bookings_amount: {
    measure: 'bookings_amount',
    dateDimension: 'close_date',
  },
  migration_bookings_count: {
    measure: 'bookings_count',
    dateDimension: 'close_date',
  },
  migration_annual_pacing_ytd: {
    measure: 'annual_pacing_ytd',
    dateDimension: 'close_date',
    dateRangeStrategy: 'ytd_to_end',
  },
  migration_close_rate: { measure: 'close_rate', dateDimension: 'close_date' },
  migration_avg_age: { measure: 'avg_age', dateDimension: 'close_date' },
  migration_avg_booked_deal: {
    measure: 'avg_booked_deal',
    dateDimension: 'close_date',
  },
  migration_avg_quoted_deal: {
    measure: 'avg_quoted_deal',
    dateDimension: 'created_date',
  },
  migration_pipeline_created: {
    measure: 'pipeline_created',
    dateDimension: 'pipeline_start_date',
  },
  migration_sql: {
    measure: 'migration_sql_count',
    dateDimension: 'created_date',
  },
  migration_sqo: {
    measure: 'migration_sqo_count',
    dateDimension: 'expansion_qualified_date',
  },
  migration_sal: {
    measure: 'migration_sal_count',
    dateDimension: 'expansion_submitted_date',
  },
  migration_avg_users: { measure: 'avg_users', dateDimension: 'close_date' },
  renewal_bookings_amount: {
    measure: 'bookings_amount',
    dateDimension: 'close_date',
  },
  renewal_bookings_count: {
    measure: 'bookings_count',
    dateDimension: 'close_date',
  },
  renewal_annual_pacing_ytd: {
    measure: 'annual_pacing_ytd',
    dateDimension: 'close_date',
    dateRangeStrategy: 'ytd_to_end',
  },
  renewal_close_rate: { measure: 'close_rate', dateDimension: 'close_date' },
  renewal_avg_age: { measure: 'avg_age', dateDimension: 'close_date' },
  renewal_avg_booked_deal: {
    measure: 'avg_booked_deal',
    dateDimension: 'close_date',
  },
  renewal_avg_quoted_deal: {
    measure: 'avg_quoted_deal',
    dateDimension: 'created_date',
  },
  renewal_pipeline_created: {
    measure: 'pipeline_created',
    dateDimension: 'pipeline_start_date',
  },
  renewal_sql: { measure: 'renewal_sql_count', dateDimension: 'close_date' },
  total_bookings_amount: {
    measure: 'bookings_amount',
    dateDimension: 'close_date',
    extraFilters: CLOSED_WON_POSITIVE_ACV_FILTERS,
  },
  total_bookings_count: {
    measure: 'bookings_count',
    dateDimension: 'close_date',
    extraFilters: CLOSED_WON_POSITIVE_ACV_FILTERS,
  },
  total_annual_pacing_ytd: {
    measure: 'annual_pacing_ytd',
    dateDimension: 'close_date',
    extraFilters: CLOSED_WON_POSITIVE_ACV_FILTERS,
    dateRangeStrategy: 'ytd_to_end',
  },
  total_one_time_revenue: {
    measure: 'one_time_revenue',
    dateDimension: 'close_date',
  },
};

const FILTER_DIMENSIONS: Record<GlobalFilterKey, string> = {
  Division: 'division',
  Owner: 'owner',
  Segment: 'opportunity_segment',
  Region: 'region',
  SE: 'se',
  'Booking Plan Opp Type': 'booking_plan_opp_type_2025',
  'Product Family': 'product_family',
  'SDR Source': 'sdr_source',
  SDR: 'sdr',
  'POR v R360': 'opp_record_type',
  'Account Owner': 'account_owner',
  'Owner Department': 'owner_department',
  'Strategic Filter': 'strategic_filter',
  Accepted: 'accepted',
  'Gate 1 Criteria Met': 'gate1_criteria_met',
  'Gate Met or Accepted': 'gate_met_or_accepted',
};

const CLOSED_WON_DIMENSIONS = [
  'account_name',
  'account_link',
  'opportunity_name',
  'opportunity_link',
  'close_date',
  'created_date',
  'division',
  'type',
  'product_family',
  'booking_plan_opp_type_2025',
  'owner',
  'sdr',
  'opp_record_type',
  'age_days',
  'se',
  'quarter_label',
  'contract_start_date',
  'users',
  'acv',
] as const;

export function getSemanticTileSpec(tileId: string): TileSemanticSpec {
  const spec = TILE_SPECS[tileId];

  if (!spec) {
    throw new Error(`Missing v2 semantic tile spec for "${tileId}".`);
  }

  return spec;
}

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

type SnapshotGroup = {
  dateDimension: string;
  extraFilters?: SemanticFilter[];
  dateRangeStrategy?: DateRangeStrategy;
  tiles: Array<TileDefinition & TileSemanticSpec>;
};

function buildFilterSignature(filters?: SemanticFilter[]): string {
  if (!filters?.length) {
    return '';
  }

  return JSON.stringify(filters);
}

function getEffectiveDateRange(
  dateRange: DateRange,
  strategy: DateRangeStrategy | undefined,
): DateRange {
  if (strategy !== 'ytd_to_end') {
    return dateRange;
  }

  // The source scorecard/opportunity_view YTD logic is calendar-year based:
  // it uses DATE_TRUNC(..., YEAR) and EXTRACT(DAYOFYEAR ...), so the dashboard
  // needs to normalize pacing windows to Jan 1 through the selected end date.
  return {
    startDate: `${dateRange.endDate.slice(0, 4)}-01-01`,
    endDate: dateRange.endDate,
  };
}

export function getSnapshotGroups(category: Category): SnapshotGroup[] {
  const groups = new Map<string, SnapshotGroup>();

  for (const tile of getCategoryTiles(category)) {
    const semantic = getSemanticTileSpec(tile.tileId);
    const key = `${semantic.dateDimension}:${semantic.dateRangeStrategy ?? 'selected'}:${buildFilterSignature(semantic.extraFilters)}`;
    const group = groups.get(key) ?? {
      dateDimension: semantic.dateDimension,
      extraFilters: semantic.extraFilters,
      dateRangeStrategy: semantic.dateRangeStrategy,
      tiles: [],
    };

    group.tiles.push({
      ...tile,
      ...semantic,
    });
    groups.set(key, group);
  }

  return [...groups.values()];
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
