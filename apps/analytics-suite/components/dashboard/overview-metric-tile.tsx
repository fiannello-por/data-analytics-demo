'use client';

import * as React from 'react';
import { OverviewMetricTooltip } from '@/components/dashboard/overview-metric-tooltip';
import { TileBackendSheet } from '@/components/dashboard/tile-backend-sheet';
import type { OverviewMetric } from '@/lib/dashboard/overview-model';
import { cn } from '@/lib/utils';

function Delta({ value }: { value: string }) {
  const tone =
    value.startsWith('+')
      ? 'text-positive'
      : value.startsWith('-')
        ? 'text-negative'
        : 'text-muted-foreground';

  return <span className={cn('text-xs font-medium', tone)}>{value}</span>;
}

export function OverviewMetricTile({
  metric,
  valueClassName,
  labelClassName,
  triggerClassName,
  contentClassName,
}: {
  metric: OverviewMetric;
  valueClassName: string;
  labelClassName?: string;
  triggerClassName?: string;
  contentClassName?: string;
}) {
  return (
    <div className="group relative flex min-h-[4.5rem] flex-col justify-between rounded-lg border border-transparent px-2 py-1 transition-colors hover:border-border/50 hover:bg-muted/15">
      <TileBackendSheet
        title={metric.label}
        trace={metric.backendTrace}
        triggerClassName="absolute top-1.5 right-1.5 z-10 group-hover:opacity-100"
      />
      <OverviewMetricTooltip
        label={metric.label}
        fullValue={metric.fullValue}
        previousValue={metric.previousValue}
        delta={<Delta value={metric.delta} />}
        description={metric.description}
        calculation={metric.calculation}
        labelContent={
          <p className={cn('text-xs text-muted-foreground', labelClassName)}>{metric.label}</p>
        }
        triggerClassName={cn(
          'flex w-fit items-baseline gap-2 text-left outline-none',
          triggerClassName,
        )}
        contentClassName={cn('w-fit max-w-[24rem] rounded-lg px-3 py-2', contentClassName)}
      >
        <p className={cn('font-semibold text-foreground', valueClassName)}>{metric.value}</p>
        <Delta value={metric.delta} />
      </OverviewMetricTooltip>
    </div>
  );
}
