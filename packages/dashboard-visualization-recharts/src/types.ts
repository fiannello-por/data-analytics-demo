import type {
  ChartTileSpec,
  MetricTileSpec,
  RendererRegistry,
  TableTileSpec,
  VisualizationRenderer,
} from '@por/dashboard-spec';
import type { ReactElement } from 'react';

export type RendererRow = Record<string, unknown>;

export type RechartsVisualizationRenderer<
  TSpec extends MetricTileSpec | TableTileSpec | ChartTileSpec,
> = VisualizationRenderer<TSpec, RendererRow, ReactElement>;

export type MetricHeadlineRendererComponent =
  RechartsVisualizationRenderer<MetricTileSpec>;

export type TableStandardRendererComponent =
  RechartsVisualizationRenderer<TableTileSpec>;

export type LineComparisonRendererComponent =
  RechartsVisualizationRenderer<ChartTileSpec>;

export type RechartsRendererRegistry = RendererRegistry<RendererRow, ReactElement>;
