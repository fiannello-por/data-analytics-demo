import type { RechartsRendererRegistry } from './types';
import { LineComparisonRenderer } from './renderers/chart-line-comparison';
import { MetricHeadlineRenderer } from './renderers/metric-headline';
import { TableStandardRenderer } from './renderers/table-standard';

export function createRechartsRendererRegistry(): RechartsRendererRegistry {
  return {
    visualizations: {
      'metric.headline': MetricHeadlineRenderer,
      'table.standard': TableStandardRenderer,
      'chart.line-comparison': LineComparisonRenderer,
    } satisfies RechartsRendererRegistry['visualizations'],
  };
}
