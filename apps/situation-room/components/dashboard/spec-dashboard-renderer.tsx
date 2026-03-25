'use client';

import * as React from 'react';
import {
  DashboardSplit,
} from '@por/dashboard-layout';
import {
  type VisualizationRenderer,
  getVisualizationRendererKey,
  normalizeTileSpec,
  validateTileSpec,
} from '@por/dashboard-spec';
import { createRechartsRendererRegistry } from '@por/dashboard-visualization-recharts';
import { CardDescription, CardTitle } from '@/components/ui/card';
import { TileTable, TileTableSkeleton } from '@/components/dashboard/tile-table';
import { TrendPanel } from '@/components/dashboard/trend-panel';
import type {
  CategorySnapshotPayload,
  TileTrendPayload,
} from '@/lib/dashboard/contracts';
import { getDashboardSpecBinding } from '@/lib/dashboard-v2/spec-bindings';
import { mainMetricsCompositeSpec } from '@/lib/dashboard-v2/specs/main-metrics';
import type {
  MainMetricsSnapshotBindingData,
  SelectedMetricTrendBindingData,
} from '@/lib/dashboard-v2/spec-data-shapes';
import type { Category } from '@/lib/dashboard/catalog';

const mainMetricsValidation = validateTileSpec(mainMetricsCompositeSpec);

if (!mainMetricsValidation.ok) {
  throw new Error(
    `Invalid Main Metrics dashboard spec: ${mainMetricsValidation.errors.join(', ')}`,
  );
}

const normalizedMainMetricsCompositeSpec = normalizeTileSpec(
  mainMetricsCompositeSpec,
);

if (normalizedMainMetricsCompositeSpec.children == null) {
  throw new Error('Main Metrics composite spec must include table and chart children.');
}

function isTableTileSpec(
  child: (typeof mainMetricsCompositeSpec.children)[number],
): child is Extract<
  (typeof mainMetricsCompositeSpec.children)[number],
  { kind: 'table' }
> {
  return child.kind === 'table';
}

function isChartTileSpec(
  child: (typeof mainMetricsCompositeSpec.children)[number],
): child is Extract<
  (typeof mainMetricsCompositeSpec.children)[number],
  { kind: 'chart' }
> {
  return child.kind === 'chart';
}

const mainMetricsTableSpec = mainMetricsCompositeSpec.children.find(isTableTileSpec);
const selectedMetricTrendSpec =
  mainMetricsCompositeSpec.children.find(isChartTileSpec);

if (
  mainMetricsTableSpec == null ||
  mainMetricsTableSpec.kind !== 'table' ||
  selectedMetricTrendSpec == null ||
  selectedMetricTrendSpec.kind !== 'chart'
) {
  throw new Error('Main Metrics composite spec must include table and chart children.');
}

const resolvedMainMetricsTableSpec = mainMetricsTableSpec;
const resolvedSelectedMetricTrendSpec = selectedMetricTrendSpec;

getVisualizationRendererKey(resolvedMainMetricsTableSpec);
const selectedMetricTrendRendererKey = getVisualizationRendererKey(
  resolvedSelectedMetricTrendSpec,
);
const rechartsRegistry = createRechartsRendererRegistry();
const selectedMetricTrendRenderer =
  rechartsRegistry.visualizations[selectedMetricTrendRendererKey] as
    | VisualizationRenderer<
        typeof resolvedSelectedMetricTrendSpec,
        SelectedMetricTrendBindingData['rows'][number],
        React.ReactNode
      >
    | undefined;
const mainMetricsSplitDirection =
  'type' in normalizedMainMetricsCompositeSpec.layout &&
  normalizedMainMetricsCompositeSpec.layout.type === 'split' &&
  normalizedMainMetricsCompositeSpec.layout.direction === 'vertical'
    ? 'column'
    : 'row';

type MainMetricsSpecRendererProps = {
  category: Category;
  snapshot: CategorySnapshotPayload | null;
  trend: TileTrendPayload | null;
  selectedTileId: string;
  isSnapshotLoading?: boolean;
  isTrendLoading?: boolean;
  showTrend: boolean;
  onRowSelect?: (tileId: string) => void;
  displayTrendLabel?: string;
  displayCurrentWindowLabel?: string;
  displayPreviousWindowLabel?: string;
};

function renderTrendPlaceholder() {
  return (
    <section className="flex h-full min-h-[20rem] flex-1 flex-col justify-center rounded-lg border border-dashed border-border/60 bg-muted/[0.04] px-6 py-5 text-center">
      <div className="mx-auto max-w-sm space-y-2">
        <CardTitle className="text-base">See the line chart</CardTitle>
        <CardDescription className="text-sm leading-6">
          Click any metric in the table to inspect its evolution over time and
          compare the current period with the previous year.
        </CardDescription>
      </div>
    </section>
  );
}

function resolveSnapshotBinding(
  snapshot: CategorySnapshotPayload | null,
): MainMetricsSnapshotBindingData & {
  traces: Record<string, CategorySnapshotPayload['rows'][number]['backendTrace']>;
} | null {
  if (!snapshot) {
    return null;
  }

  return getDashboardSpecBinding('mainMetricsSnapshot')(snapshot);
}

function resolveTrendBinding(
  trend: TileTrendPayload | null,
): SelectedMetricTrendBindingData & {
  trace?: TileTrendPayload['backendTrace'];
} | null {
  if (!trend) {
    return null;
  }

  return getDashboardSpecBinding('selectedMetricTrend')(trend);
}

export function MainMetricsSpecRenderer({
  category,
  snapshot,
  trend,
  selectedTileId,
  isSnapshotLoading = false,
  isTrendLoading = false,
  showTrend,
  onRowSelect,
  displayTrendLabel,
  displayCurrentWindowLabel,
  displayPreviousWindowLabel,
}: MainMetricsSpecRendererProps) {
  const snapshotBinding = resolveSnapshotBinding(snapshot);
  const trendBinding = showTrend ? resolveTrendBinding(trend) : null;
  const trendChartContent =
    trendBinding != null && selectedMetricTrendRenderer != null
      ? selectedMetricTrendRenderer({
          spec: resolvedSelectedMetricTrendSpec,
          rows: trendBinding.rows,
        })
      : null;

  return (
    <DashboardSplit
      direction={mainMetricsSplitDirection}
      gap="1.5rem"
      leading={
        <div className="min-w-0">
          {isSnapshotLoading || snapshotBinding == null ? (
            <TileTableSkeleton category={category} />
          ) : (
            <TileTable
              columns={resolvedMainMetricsTableSpec.visualization.columns}
              rows={snapshotBinding.rows}
              traces={snapshotBinding.traces}
              selectedTileId={showTrend ? selectedTileId : ''}
              onRowSelect={onRowSelect}
            />
          )}
        </div>
      }
      trailing={
        <div className="flex min-w-0 xl:border-l xl:border-border/45 xl:pl-6">
          {showTrend && (isTrendLoading || trendBinding != null || trend != null) ? (
            <TrendPanel
              trend={trend}
              binding={trendBinding}
              category={category}
              tileId={selectedTileId}
              trace={trendBinding?.trace}
              grain={trend?.grain}
              chartContent={trendChartContent}
              isLoading={isTrendLoading}
              displayLabel={displayTrendLabel}
              displayCurrentWindowLabel={displayCurrentWindowLabel}
              displayPreviousWindowLabel={displayPreviousWindowLabel}
            />
          ) : (
            renderTrendPlaceholder()
          )}
        </div>
      }
    />
  );
}
