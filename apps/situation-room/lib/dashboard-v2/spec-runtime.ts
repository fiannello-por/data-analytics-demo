import {
  getVisualizationRendererKey,
  normalizeTileSpec,
  validateTileSpec,
  type NormalizedTileSpec,
  type TileSpec,
  type VisualizationRenderer,
} from '@por/dashboard-spec';
import { createRechartsRendererRegistry } from '@por/dashboard-visualization-recharts';

const dashboardVisualizationRegistry = createRechartsRendererRegistry();

type DashboardVisualizationTileSpec = Exclude<TileSpec, { kind: 'composite' }>;

export function resolveDashboardTileSpec<TSpec extends TileSpec>(
  spec: TSpec,
  label: string,
): NormalizedTileSpec {
  const validation = validateTileSpec(spec);

  if (!validation.ok) {
    throw new Error(
      `Invalid ${label} dashboard spec: ${validation.errors.join(', ')}`,
    );
  }

  return normalizeTileSpec(spec);
}

export function getDashboardVisualizationRenderer<
  TSpec extends DashboardVisualizationTileSpec,
>(spec: TSpec): VisualizationRenderer<TSpec> | undefined {
  const key = getVisualizationRendererKey(spec);

  return dashboardVisualizationRegistry.visualizations[key] as
    | VisualizationRenderer<TSpec>
    | undefined;
}
