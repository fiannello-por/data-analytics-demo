export const CATEGORY_ORDER = [
  'New Logo',
  'Expansion',
  'Migration',
  'Renewal',
  'Total',
] as const;

export type Category = (typeof CATEGORY_ORDER)[number];

export const DEFAULT_DATE_RANGE = ['current_year'] as const;

export type ScorecardFilters = Partial<
  Record<
    | 'DateRange'
    | 'Division'
    | 'Owner'
    | 'Segment'
    | 'Region'
    | 'SE'
    | 'BookingPlanOppType'
    | 'ProductFamily'
    | 'SDRSource'
    | 'SDR'
    | 'OppRecordType'
    | 'AccountOwner'
    | 'OwnerDepartment'
    | 'StrategicFilter'
    | 'Accepted'
    | 'Gate1CriteriaMet'
    | 'GateMetOrAccepted',
    string[]
  >
>;

export type ScorecardRow = {
  sortOrder: number;
  metricName: string;
  currentPeriod: string;
  previousPeriod: string;
  pctChange: string;
};

export type CategoryData = {
  category: Category;
  rows: ScorecardRow[];
};

export type ScorecardReportPayload = {
  reportTitle: string;
  reportPeriodLabel: string;
  lastRefreshedAt: string;
  appliedFilters: ScorecardFilters;
  categories: CategoryData[];
};

export function withDefaultDateRange(filters: ScorecardFilters): ScorecardFilters {
  return filters.DateRange?.length
    ? filters
    : { ...filters, DateRange: [...DEFAULT_DATE_RANGE] };
}

export function summarizeFilters(filters: ScorecardFilters) {
  return Object.entries(filters)
    .filter(([, values]) => values && values.length > 0)
    .map(([key, values]) => ({ key, values: values! }));
}
