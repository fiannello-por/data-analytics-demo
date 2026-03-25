'use client';

import * as React from 'react';
import { TileBackendSheet } from '@/components/dashboard/tile-backend-sheet';
import type { TileTrendPayload } from '@/lib/dashboard/contracts';
import { CardDescription, CardTitle } from '@/components/ui/card';
import { TrendChart } from '@/components/trend-chart';
import { formatTrendRangeLabel } from '@/lib/trend-chart-model';
import { Skeleton } from '@/components/ui/skeleton';

export function TrendPanel({
  trend,
  isLoading,
  isVisible = true,
  displayLabel,
  displayCurrentWindowLabel,
  displayPreviousWindowLabel,
}: {
  trend: TileTrendPayload | null;
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
          {trend ? (
            <TileBackendSheet title={label} trace={trend.backendTrace} />
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
      ) : trend ? (
        <div className="mt-6">
          <TrendChart trend={trend} />
        </div>
      ) : (
        <div className="mt-6 flex aspect-[1.75/1] min-h-[16rem] w-full max-h-[min(24rem,42vh)] items-center justify-center rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground">
          Select a metric to load its trend.
        </div>
      )}
    </section>
  );
}
