import type { SemanticFilter, TileSemanticSpec } from './semantic-types';

export const CLOSED_WON_FILTERS: SemanticFilter[] = [
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
];

export const CLOSED_WON_POSITIVE_ACV_FILTERS: SemanticFilter[] = [
  ...CLOSED_WON_FILTERS,
  {
    field: 'acv',
    operator: 'greaterThan',
    values: [0],
  },
];

export const WON_POSITIVE_ACV_FILTERS: SemanticFilter[] = [
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
];

export const TILE_SPECS: Record<string, TileSemanticSpec> = {
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

export const CLOSED_WON_DIMENSIONS = [
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
