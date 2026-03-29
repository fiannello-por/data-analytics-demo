// packages/dashboard-constants/src/semantic-types.ts

export type SemanticFilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'greaterThan'
  | 'lessThan'
  | 'between'
  | 'isTrue'
  | 'isFalse'
  | 'isNull'
  | 'isNotNull';

export type SemanticFilter = {
  field: string;
  operator: SemanticFilterOperator;
  values: Array<string | number | boolean | null>;
};

export type DateRange = {
  startDate: string;
  endDate: string;
};

export type DateRangeStrategy = 'selected' | 'ytd_to_end';

export type TileSemanticSpec = {
  measure: string;
  dateDimension: string;
  extraFilters?: SemanticFilter[];
  dateRangeStrategy?: DateRangeStrategy;
};

export type SnapshotGroup = {
  dateDimension: string;
  extraFilters?: SemanticFilter[];
  dateRangeStrategy?: DateRangeStrategy;
  tiles: Array<TileSemanticSpec & { tileId: string }>;
};
