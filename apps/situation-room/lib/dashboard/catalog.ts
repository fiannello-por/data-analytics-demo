export const OVERVIEW_TAB = 'Overview' as const;

export const CATEGORY_ORDER = [
  'New Logo',
  'Expansion',
  'Migration',
  'Renewal',
  'Total',
] as const;

export type Category = (typeof CATEGORY_ORDER)[number];
export type DashboardTab = typeof OVERVIEW_TAB | Category;

export const DASHBOARD_TAB_ORDER = [OVERVIEW_TAB, ...CATEGORY_ORDER] as const;

export type TileFormatType = 'currency' | 'number' | 'percent' | 'days';

export type TileDefinition = {
  tileId: string;
  label: string;
  sortOrder: number;
  formatType: TileFormatType;
};

export const TILE_CATALOG = {
  'New Logo': [
    {
      tileId: 'new_logo_bookings_amount',
      label: 'Bookings $',
      sortOrder: 1,
      formatType: 'currency',
    },
    {
      tileId: 'new_logo_bookings_count',
      label: 'Bookings #',
      sortOrder: 2,
      formatType: 'number',
    },
    {
      tileId: 'new_logo_annual_pacing_ytd',
      label: 'Annual Pacing (YTD)',
      sortOrder: 3,
      formatType: 'number',
    },
    {
      tileId: 'new_logo_close_rate',
      label: 'Close Rate',
      sortOrder: 4,
      formatType: 'percent',
    },
    {
      tileId: 'new_logo_avg_age',
      label: 'Avg Age',
      sortOrder: 5,
      formatType: 'days',
    },
    {
      tileId: 'new_logo_avg_booked_deal',
      label: 'Avg Booked Deal',
      sortOrder: 6,
      formatType: 'currency',
    },
    {
      tileId: 'new_logo_avg_quoted_deal',
      label: 'Avg Quoted Deal',
      sortOrder: 7,
      formatType: 'currency',
    },
    {
      tileId: 'new_logo_pipeline_created',
      label: 'Pipeline Created',
      sortOrder: 8,
      formatType: 'number',
    },
    {
      tileId: 'new_logo_sql',
      label: 'SQL',
      sortOrder: 9,
      formatType: 'number',
    },
    {
      tileId: 'new_logo_sqo',
      label: 'SQO',
      sortOrder: 10,
      formatType: 'number',
    },
    {
      tileId: 'new_logo_gate_1_complete',
      label: 'Gate 1 Complete',
      sortOrder: 11,
      formatType: 'number',
    },
    {
      tileId: 'new_logo_sdr_points',
      label: 'SDR Points',
      sortOrder: 12,
      formatType: 'number',
    },
    {
      tileId: 'new_logo_sqo_users',
      label: 'SQO Users',
      sortOrder: 13,
      formatType: 'number',
    },
  ],
  Expansion: [
    {
      tileId: 'expansion_bookings_amount',
      label: 'Bookings $',
      sortOrder: 1,
      formatType: 'currency',
    },
    {
      tileId: 'expansion_bookings_count',
      label: 'Bookings #',
      sortOrder: 2,
      formatType: 'number',
    },
    {
      tileId: 'expansion_annual_pacing_ytd',
      label: 'Annual Pacing (YTD)',
      sortOrder: 3,
      formatType: 'number',
    },
    {
      tileId: 'expansion_close_rate',
      label: 'Close Rate',
      sortOrder: 4,
      formatType: 'percent',
    },
    {
      tileId: 'expansion_avg_age',
      label: 'Avg Age',
      sortOrder: 5,
      formatType: 'days',
    },
    {
      tileId: 'expansion_avg_booked_deal',
      label: 'Avg Booked Deal',
      sortOrder: 6,
      formatType: 'currency',
    },
    {
      tileId: 'expansion_avg_quoted_deal',
      label: 'Avg Quoted Deal',
      sortOrder: 7,
      formatType: 'currency',
    },
    {
      tileId: 'expansion_pipeline_created',
      label: 'Pipeline Created',
      sortOrder: 8,
      formatType: 'number',
    },
    {
      tileId: 'expansion_sql',
      label: 'SQL',
      sortOrder: 9,
      formatType: 'number',
    },
    {
      tileId: 'expansion_sqo',
      label: 'SQO',
      sortOrder: 10,
      formatType: 'number',
    },
  ],
  Migration: [
    {
      tileId: 'migration_bookings_amount',
      label: 'Bookings $',
      sortOrder: 1,
      formatType: 'currency',
    },
    {
      tileId: 'migration_bookings_count',
      label: 'Bookings #',
      sortOrder: 2,
      formatType: 'number',
    },
    {
      tileId: 'migration_annual_pacing_ytd',
      label: 'Annual Pacing (YTD)',
      sortOrder: 3,
      formatType: 'number',
    },
    {
      tileId: 'migration_close_rate',
      label: 'Close Rate',
      sortOrder: 4,
      formatType: 'percent',
    },
    {
      tileId: 'migration_avg_age',
      label: 'Avg Age',
      sortOrder: 5,
      formatType: 'days',
    },
    {
      tileId: 'migration_avg_booked_deal',
      label: 'Avg Booked Deal',
      sortOrder: 6,
      formatType: 'currency',
    },
    {
      tileId: 'migration_avg_quoted_deal',
      label: 'Avg Quoted Deal',
      sortOrder: 7,
      formatType: 'currency',
    },
    {
      tileId: 'migration_pipeline_created',
      label: 'Pipeline Created',
      sortOrder: 8,
      formatType: 'number',
    },
    {
      tileId: 'migration_sql',
      label: 'SQL',
      sortOrder: 9,
      formatType: 'number',
    },
    {
      tileId: 'migration_sqo',
      label: 'SQO',
      sortOrder: 10,
      formatType: 'number',
    },
    {
      tileId: 'migration_sal',
      label: 'SAL',
      sortOrder: 11,
      formatType: 'number',
    },
    {
      tileId: 'migration_avg_users',
      label: 'Avg Users',
      sortOrder: 12,
      formatType: 'number',
    },
  ],
  Renewal: [
    {
      tileId: 'renewal_bookings_amount',
      label: 'Bookings $',
      sortOrder: 1,
      formatType: 'currency',
    },
    {
      tileId: 'renewal_bookings_count',
      label: 'Bookings #',
      sortOrder: 2,
      formatType: 'number',
    },
    {
      tileId: 'renewal_annual_pacing_ytd',
      label: 'Annual Pacing (YTD)',
      sortOrder: 3,
      formatType: 'number',
    },
    {
      tileId: 'renewal_close_rate',
      label: 'Close Rate',
      sortOrder: 4,
      formatType: 'percent',
    },
    {
      tileId: 'renewal_avg_age',
      label: 'Avg Age',
      sortOrder: 5,
      formatType: 'days',
    },
    {
      tileId: 'renewal_avg_booked_deal',
      label: 'Avg Booked Deal',
      sortOrder: 6,
      formatType: 'currency',
    },
    {
      tileId: 'renewal_avg_quoted_deal',
      label: 'Avg Quoted Deal',
      sortOrder: 7,
      formatType: 'currency',
    },
    {
      tileId: 'renewal_pipeline_created',
      label: 'Pipeline Created',
      sortOrder: 8,
      formatType: 'number',
    },
    { tileId: 'renewal_sql', label: 'SQL', sortOrder: 9, formatType: 'number' },
  ],
  Total: [
    {
      tileId: 'total_bookings_amount',
      label: 'Bookings $',
      sortOrder: 1,
      formatType: 'currency',
    },
    {
      tileId: 'total_bookings_count',
      label: 'Bookings #',
      sortOrder: 2,
      formatType: 'number',
    },
    {
      tileId: 'total_annual_pacing_ytd',
      label: 'Annual Pacing (YTD)',
      sortOrder: 3,
      formatType: 'number',
    },
    {
      tileId: 'total_one_time_revenue',
      label: 'One-time Revenue',
      sortOrder: 4,
      formatType: 'currency',
    },
  ],
} as const satisfies Record<Category, readonly TileDefinition[]>;

export const GLOBAL_FILTER_KEYS = [
  'Division',
  'Owner',
  'Segment',
  'Region',
  'SE',
  'Booking Plan Opp Type',
  'Product Family',
  'SDR Source',
  'SDR',
  'POR v R360',
  'Account Owner',
  'Owner Department',
  'Strategic Filter',
  'Accepted',
  'Gate 1 Criteria Met',
  'Gate Met or Accepted',
] as const;

export type GlobalFilterKey = (typeof GLOBAL_FILTER_KEYS)[number];

export function isCategory(value: string): value is Category {
  return CATEGORY_ORDER.includes(value as Category);
}

export function isOverviewTab(value: string): value is typeof OVERVIEW_TAB {
  return value === OVERVIEW_TAB;
}

export function isDashboardTab(value: string): value is DashboardTab {
  return isOverviewTab(value) || isCategory(value);
}

export function getCategoryTiles(
  category: Category,
): readonly TileDefinition[] {
  return TILE_CATALOG[category];
}

export function getDefaultTileId(category: Category): string {
  return getCategoryTiles(category)[0]?.tileId ?? '';
}

export function findTileDefinition(
  category: Category,
  tileId: string,
): TileDefinition | undefined {
  return getCategoryTiles(category).find((tile) => tile.tileId === tileId);
}

export function findCategoryForTileId(tileId: string): Category | undefined {
  return CATEGORY_ORDER.find((category) =>
    getCategoryTiles(category).some((tile) => tile.tileId === tileId),
  );
}
