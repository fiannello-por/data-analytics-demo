import type {
  Category,
  DashboardTab,
  GlobalFilterKey,
  TileFormatType,
} from '@/lib/dashboard/catalog';

export type DateRange = {
  startDate: string;
  endDate: string;
};

export type DashboardFilters = Partial<Record<GlobalFilterKey, string[]>>;

export type DashboardTrendGrain = 'weekly';

export type DashboardState = {
  activeCategory: DashboardTab;
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

export type TileTiming = {
  tileId: string;
  durationMs: number;
};

export type CategorySnapshotPayload = {
  category: Category;
  currentWindowLabel: string;
  previousWindowLabel: string;
  lastRefreshedAt: string;
  rows: CategorySnapshotRow[];
  tileTimings: TileTiming[];
};

export type OverviewBoardPayload = {
  currentWindowLabel: string;
  previousWindowLabel: string;
  lastRefreshedAt: string;
  snapshots: CategorySnapshotPayload[];
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

export type ClosedWonOpportunityRow = {
  accountName: string;
  accountLink: string | null;
  opportunityName: string;
  opportunityLink: string | null;
  closeDate: string;
  createdDate: string;
  division: string;
  type: string;
  productFamily: string;
  bookingPlanOppType2025: string;
  owner: string;
  sdr: string;
  oppRecordType: string;
  age: string;
  se: string;
  quarter: string;
  contractStartDate: string;
  users: string;
  acv: string;
};

export type ClosedWonOpportunitiesPayload = {
  category: Category;
  currentWindowLabel: string;
  lastRefreshedAt: string;
  rows: ClosedWonOpportunityRow[];
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
