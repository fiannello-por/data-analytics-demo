import type {
  ChartTileSpec,
  CompositeTileSpec,
  TableTileSpec,
} from '@por/dashboard-spec';

export const mainMetricsTableSpec = {
  id: 'main_metrics_table',
  kind: 'table',
  title: 'Main Metrics',
  description: 'Track the primary outcomes for the selected booking category.',
  data: {
    kind: 'binding',
    key: 'mainMetricsSnapshot',
  },
  visualization: {
    type: 'table',
    columns: [
      { field: 'label', label: 'Metric' },
      { field: 'currentValue', label: 'Current period' },
      { field: 'previousValue', label: 'Previous year' },
      { field: 'pctChange', label: 'Change' },
    ],
  },
} satisfies TableTileSpec;

export const selectedMetricTrendSpec = {
  id: 'selected_metric_trend',
  kind: 'chart',
  title: 'Selected trend',
  description:
    'Compare the selected metric across the current and previous windows.',
  data: {
    kind: 'binding',
    key: 'selectedMetricTrend',
  },
  layout: {
    minHeight: 320,
  },
  visualization: {
    type: 'line-comparison',
    xField: 'bucketLabel',
    series: [
      { field: 'currentValue', label: 'Current period' },
      { field: 'previousValue', label: 'Previous year' },
    ],
  },
} satisfies ChartTileSpec;

export const mainMetricsCompositeSpec = {
  id: 'main_metrics_composite',
  kind: 'composite',
  title: 'Main Metrics',
  description:
    'Inspect the primary category metrics and drill into the trend for any selected metric.',
  layout: {
    type: 'split',
    direction: 'horizontal',
  },
  children: [mainMetricsTableSpec, selectedMetricTrendSpec],
} satisfies CompositeTileSpec;

export const mainMetricsSpecs = {
  mainMetricsTable: mainMetricsTableSpec,
  selectedMetricTrend: selectedMetricTrendSpec,
  mainMetricsComposite: mainMetricsCompositeSpec,
} as const;
