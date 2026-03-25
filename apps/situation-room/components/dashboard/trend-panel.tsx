'use client';

import * as React from 'react';
import { TileBackendSheet } from '@/components/dashboard/tile-backend-sheet';
import type {
  TileBackendTrace,
  TileTrendPayload,
} from '@/lib/dashboard/contracts';
import type { SelectedMetricTrendBindingData } from '@/lib/dashboard-v2/spec-data-shapes';
import { CardDescription, CardTitle } from '@/components/ui/card';
import { TrendChart } from '@/components/trend-chart';
import { formatTrendRangeLabel } from '@/lib/trend-chart-model';
import { Skeleton } from '@/components/ui/skeleton';

export function TrendPanel({
  trend,
  binding,
  category,
  tileId,
  trace,
  grain = 'weekly',
  chartContent,
  isLoading,
  isVisible = true,
  displayLabel,
  displayCurrentWindowLabel,
  displayPreviousWindowLabel,
}: {
  trend: TileTrendPayload | null;
  binding?: SelectedMetricTrendBindingData | null;
  category: TileTrendPayload['category'];
  tileId: string;
  trace?: TileBackendTrace;
  grain?: TileTrendPayload['grain'];
  chartContent?: React.ReactNode;
  isLoading?: boolean;
  isVisible?: boolean;
  displayLabel?: string;
  displayCurrentWindowLabel?: string;
  displayPreviousWindowLabel?: string;
}) {
  const label = displayLabel ?? trend?.label ?? 'Selected metric';
  const currentWindowLabel =
    displayCurrentWindowLabel ?? trend?.currentWindowLabel ?? 'Current period';
  const previousWindowLabel =
    displayPreviousWindowLabel ??
    trend?.previousWindowLabel ??
    'Previous period';

  if (!isVisible) {
    return null;
  }

  const trendChartPayload =
    binding != null
      ? {
          category,
          tileId,
          label,
          grain,
          xAxisFieldLabel: binding.xAxisLabel,
          currentWindowLabel,
          previousWindowLabel,
          points: binding.rows.map((row) => ({
            bucketKey: row.bucketKey,
            bucketLabel: row.bucketLabel,
            currentValue: row.currentValue,
            previousValue: row.previousValue,
          })),
          backendTrace: trace,
        }
      : trend;

  return (
    <section className="group flex h-full min-h-[20rem] flex-col justify-end gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-base">{label}</CardTitle>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Weekly trend
          </p>
        </div>
        <div className="flex items-center gap-2">
          {trace ?? trend?.backendTrace ? (
            <TileBackendSheet
              title={label}
              trace={trace ?? trend?.backendTrace}
            />
          ) : null}
          {isLoading ? (
            <span className="pt-0.5 text-xs text-muted-foreground">
              Refreshing…
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-1">
        <CardDescription className="text-xs leading-5 text-foreground/80">
          {formatTrendRangeLabel(currentWindowLabel)}
        </CardDescription>
        <p className="text-xs leading-5 text-muted-foreground">
          Compared with {formatTrendRangeLabel(previousWindowLabel)}
        </p>
      </div>

      {isLoading ? (
        <div className="mt-6 flex aspect-[1.75/1] min-h-[16rem] w-full max-h-[min(24rem,42vh)] flex-col gap-3">
          <div className="flex gap-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="min-h-0 flex-1 rounded-lg" />
        </div>
      ) : chartContent ? (
        <div className="mt-6">
          {chartContent}
          {binding?.xAxisLabel ? (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {binding.xAxisLabel}
            </p>
          ) : null}
        </div>
      ) : trendChartPayload ? (
        <div className="mt-6">
          <TrendChart trend={trendChartPayload} />
        </div>
      ) : null}
    </section>
  );
}
