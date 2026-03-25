import type {
  ChartTileSpec,
  CompositeTileSpec,
  MetricTileSpec,
  TableTileSpec,
  TileSpec,
} from './spec';

export type VisualizationTileSpec = Exclude<TileSpec, CompositeTileSpec>;

const METRIC_VISUALIZATION_RENDERER_KEYS = {
  metric: 'metric.headline',
} as const;

const TABLE_VISUALIZATION_RENDERER_KEYS = {
  table: 'table.standard',
} as const;

const CHART_VISUALIZATION_RENDERER_KEYS = {
  'line-comparison': 'chart.line-comparison',
} as const;

export type VisualizationRendererSpecMap = {
  'metric.headline': MetricTileSpec;
  'table.standard': TableTileSpec;
  'chart.line-comparison': ChartTileSpec;
};

export type VisualizationRendererKey = keyof VisualizationRendererSpecMap;

export type VisualizationRendererDataRow = Record<string, unknown>;

export interface VisualizationRendererProps<
  TSpec extends VisualizationTileSpec = VisualizationTileSpec,
  TRow extends VisualizationRendererDataRow = VisualizationRendererDataRow,
> {
  spec: TSpec;
  rows: TRow[];
}

export type VisualizationRenderer<
  TSpec extends VisualizationTileSpec = VisualizationTileSpec,
  TRow extends VisualizationRendererDataRow = VisualizationRendererDataRow,
  TResult = unknown,
> = (props: VisualizationRendererProps<TSpec, TRow>) => TResult;

export interface RendererRegistry<
  TRow extends VisualizationRendererDataRow = VisualizationRendererDataRow,
  TResult = unknown,
> {
  visualizations: Partial<{
    [K in VisualizationRendererKey]: VisualizationRenderer<
      VisualizationRendererSpecMap[K],
      TRow,
      TResult
    >;
  }>;
}

export function getVisualizationRendererKey(spec: TileSpec): VisualizationRendererKey {
  if (spec.kind === 'composite') {
    throw new Error('Composite tiles do not have visualization renderer keys');
  }

  switch (spec.kind) {
    case 'metric':
      return getMetricVisualizationRendererKey(spec);
    case 'table':
      return getTableVisualizationRendererKey(spec);
    case 'chart':
      return getChartVisualizationRendererKey(spec);
  }
}

function getMetricVisualizationRendererKey(
  spec: MetricTileSpec,
): VisualizationRendererKey {
  return METRIC_VISUALIZATION_RENDERER_KEYS[spec.visualization.type];
}

function getTableVisualizationRendererKey(
  spec: TableTileSpec,
): VisualizationRendererKey {
  return TABLE_VISUALIZATION_RENDERER_KEYS[spec.visualization.type];
}

function getChartVisualizationRendererKey(
  spec: ChartTileSpec,
): VisualizationRendererKey {
  return CHART_VISUALIZATION_RENDERER_KEYS[spec.visualization.type];
}
