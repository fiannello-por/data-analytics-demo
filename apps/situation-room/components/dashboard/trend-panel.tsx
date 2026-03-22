'use client';

import * as React from 'react';
import type { TileTrendPayload } from '@/lib/dashboard/contracts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendChart } from '@/components/trend-chart';
import { formatTrendRangeLabel } from '@/lib/trend-chart-model';
import { Skeleton } from '@/components/ui/skeleton';

export function TrendPanel({
  trend,
  isLoading,
  displayLabel,
  displayCurrentWindowLabel,
  displayPreviousWindowLabel,
}: {
  trend: TileTrendPayload;
  isLoading?: boolean;
  displayLabel?: string;
  displayCurrentWindowLabel?: string;
  displayPreviousWindowLabel?: string;
}) {
  const label = displayLabel ?? trend.label;
  const currentWindowLabel = displayCurrentWindowLabel ?? trend.currentWindowLabel;
  const previousWindowLabel =
    displayPreviousWindowLabel ?? trend.previousWindowLabel;

  return (
    <Card aria-busy={isLoading} className="h-full ring-0 shadow-none">
      <CardHeader className="gap-2 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base">{label}</CardTitle>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Weekly trend
            </p>
          </div>
          {isLoading ? (
            <span className="pt-0.5 text-xs text-muted-foreground">Refreshing…</span>
          ) : null}
        </div>
        <CardDescription className="text-xs leading-5 text-foreground/80">
          {formatTrendRangeLabel(currentWindowLabel)}
        </CardDescription>
        <p className="text-xs leading-5 text-muted-foreground">
          Compared with {formatTrendRangeLabel(previousWindowLabel)}
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 pt-0">
        {isLoading ? (
          <div className="flex h-full min-h-[19rem] flex-col gap-3">
            <div className="flex gap-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
        ) : (
          <TrendChart trend={trend} />
        )}
      </CardContent>
    </Card>
  );
}
