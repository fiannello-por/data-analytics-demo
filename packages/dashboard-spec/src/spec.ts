export interface TileDataBindingSpec {
  kind: 'binding';
  key: string;
}

export interface TileInteractionSpec {
  allowInspect?: boolean;
  allowDownload?: boolean;
}

interface BaseLayoutOptions {
  colSpan?: number;
  rowSpan?: number;
  minHeight?: number;
}

export interface SplitLayoutSpec extends BaseLayoutOptions {
  type: 'split';
  direction?: 'horizontal' | 'vertical';
}

export interface GridLayoutSpec extends BaseLayoutOptions {
  type: 'grid';
  columns?: number;
  gap?: number;
}

export interface StackLayoutSpec extends BaseLayoutOptions {
  type: 'stack';
  gap?: number;
}

export type TileLayoutSpec =
  | BaseLayoutOptions
  | SplitLayoutSpec
  | GridLayoutSpec
  | StackLayoutSpec;

export interface MetricVisualizationSpec {
  type: 'metric';
  valueField: string;
  comparisonField?: string;
}

export interface TableVisualizationColumnSpec {
  field: string;
  label: string;
}

export interface TableVisualizationSpec {
  type: 'table';
  columns: TableVisualizationColumnSpec[];
}

export interface LineComparisonVisualizationSeriesSpec {
  field: string;
  label: string;
}

export interface LineComparisonVisualizationSpec {
  type: 'line-comparison';
  xField: string;
  series: LineComparisonVisualizationSeriesSpec[];
}

export interface BaseTileSpec {
  id: string;
  kind: 'metric' | 'table' | 'chart' | 'composite';
  title: string;
  description?: string;
  data?: TileDataBindingSpec;
  layout?: TileLayoutSpec;
  interactions?: TileInteractionSpec;
}

export interface MetricTileSpec extends BaseTileSpec {
  kind: 'metric';
  data: TileDataBindingSpec;
  visualization: MetricVisualizationSpec;
}

export interface TableTileSpec extends BaseTileSpec {
  kind: 'table';
  data: TileDataBindingSpec;
  visualization: TableVisualizationSpec;
}

export interface ChartTileSpec extends BaseTileSpec {
  kind: 'chart';
  data: TileDataBindingSpec;
  visualization: LineComparisonVisualizationSpec;
}

export interface CompositeTileSpec extends BaseTileSpec {
  kind: 'composite';
  children: TileSpec[];
}

export type TileSpec =
  | MetricTileSpec
  | TableTileSpec
  | ChartTileSpec
  | CompositeTileSpec;
