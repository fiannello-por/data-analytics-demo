import type { Category, GlobalFilterKey, TileFormatType } from '@/lib/dashboard/catalog';

export type DateRange = {
  startDate: string;
  endDate: string;
};

export type DashboardFilters = Partial<Record<GlobalFilterKey, string[]>>;

export type DashboardTrendGrain = 'weekly';

export type DashboardState = {
  activeCategory: Category;
  selectedTileId: string;
  filters: DashboardFilters;
  dateRange: DateRange;
  previousDateRange: DateRange;
  trendGrain: DashboardTrendGrain;
};

export type DashboardTileMetadata = {
  tileId: string;
  label: string;
  sortOrder: number;
  formatType: TileFormatType;
};

export type CategorySnapshotRow = DashboardTileMetadata & {
  currentValue: string;
  previousValue: string;
  pctChange: string;
};

export type CategorySnapshotPayload = {
  category: Category;
  currentWindowLabel: string;
  previousWindowLabel: string;
  lastRefreshedAt: string;
  rows: CategorySnapshotRow[];
};

export type TileTrendPoint = {
  bucketKey: string;
  bucketLabel: string;
  currentValue: number | null;
  previousValue: number | null;
};

export type TileTrendPayload = {
  category: Category;
  tileId: string;
  label: string;
  grain: DashboardTrendGrain;
  currentWindowLabel: string;
  previousWindowLabel: string;
  points: TileTrendPoint[];
};

export type FilterDictionaryOption = {
  value: string;
  label: string;
  sortOrder: number;
};

export type FilterDictionaryPayload = {
  filterKey: GlobalFilterKey;
  options: FilterDictionaryOption[];
};
