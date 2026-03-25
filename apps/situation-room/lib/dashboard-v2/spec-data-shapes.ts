export type DashboardSpecBindingKey =
  | 'mainMetricsSnapshot'
  | 'selectedMetricTrend';

export type DashboardSpecBindingStatus = 'ready' | 'empty';

export type StandardizedTableRow = {
  tileId: string;
  label: string;
  currentValue: string;
  previousValue: string;
  pctChange: string;
};

export type StandardizedLineComparisonRow = {
  bucketKey: string;
  bucketLabel: string;
  currentValue: number | null;
  previousValue: number | null;
};

export type MainMetricsSnapshotBindingData = {
  status: DashboardSpecBindingStatus;
  rows: StandardizedTableRow[];
};

export type SelectedMetricTrendBindingData = {
  status: DashboardSpecBindingStatus;
  xAxisLabel: string;
  rows: StandardizedLineComparisonRow[];
};

export type DashboardSpecBindingDataMap = {
  mainMetricsSnapshot: MainMetricsSnapshotBindingData;
  selectedMetricTrend: SelectedMetricTrendBindingData;
};
