export type Category =
  | 'New Logo'
  | 'Expansion'
  | 'Migration'
  | 'Renewal'
  | 'Total';

export interface ScorecardRow {
  sortOrder: number;
  metricName: string;
  currentPeriod: string;
  previousPeriod: string;
  pctChange: string;
}

export interface CategoryData {
  category: Category;
  rows: ScorecardRow[];
}

export interface LightdashFilterRule {
  id: string;
  target: { fieldId: string };
  operator: string;
  values?: (string | number | boolean)[];
  settings?: Record<string, unknown>;
}
