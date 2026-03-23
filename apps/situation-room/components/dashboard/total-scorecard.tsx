'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OverviewMetricTooltip } from '@/components/dashboard/overview-metric-tooltip';
import { Separator } from '@/components/ui/separator';
import type { OverviewTotalCard } from '@/lib/dashboard/overview-model';
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

export function TotalScorecard({ card }: { card: OverviewTotalCard }) {
  return (
    <Card className="border-border/70 bg-card/70 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">{card.category}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1.1fr)_auto_minmax(0,0.9fr)] lg:items-start">
        <div className="grid gap-4 md:grid-cols-2">
          <OverviewMetricTooltip
            label={card.hero.label}
            fullValue={card.hero.fullValue}
            previousValue={card.hero.previousValue}
            delta={<Delta value={card.hero.delta} />}
            description={card.hero.description}
            calculation={card.hero.calculation}
            labelContent={<p className="text-xs text-muted-foreground">{card.hero.label}</p>}
            triggerClassName="flex w-fit items-baseline gap-2 text-left outline-none"
            contentClassName="w-fit max-w-[24rem] rounded-lg px-3 py-2"
          >
            <p className="text-3xl font-semibold tracking-tight text-foreground">
              {card.hero.value}
            </p>
            <Delta value={card.hero.delta} />
          </OverviewMetricTooltip>
          {card.support ? (
            <OverviewMetricTooltip
              label={card.support.label}
              fullValue={card.support.fullValue}
              previousValue={card.support.previousValue}
              delta={<Delta value={card.support.delta} />}
              description={card.support.description}
              calculation={card.support.calculation}
              labelContent={<p className="text-xs text-muted-foreground">{card.support.label}</p>}
              triggerClassName="flex w-fit items-baseline gap-2 text-left outline-none"
              contentClassName="w-fit max-w-[24rem] rounded-lg px-3 py-2"
            >
              <p className="text-3xl font-semibold tracking-tight text-foreground">{card.support.value}</p>
              <Delta value={card.support.delta} />
            </OverviewMetricTooltip>
          ) : null}
        </div>

        <Separator className="bg-border/60 lg:hidden" />

        <div className="hidden lg:flex lg:justify-center">
          <Separator orientation="vertical" className="bg-border/60" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:pl-1">
          {card.secondaryMetrics.map((metric) => (
            <OverviewMetricTooltip
              key={metric.tileId}
              label={metric.label}
              fullValue={metric.fullValue}
              previousValue={metric.previousValue}
              delta={<Delta value={metric.delta} />}
              description={metric.description}
              calculation={metric.calculation}
              labelContent={<p className="text-xs text-muted-foreground">{metric.label}</p>}
              triggerClassName="flex w-fit items-baseline gap-2 text-left outline-none"
              contentClassName="w-fit max-w-[24rem] rounded-lg px-3 py-2"
            >
              <p className="text-2xl font-semibold text-foreground">{metric.value}</p>
              <Delta value={metric.delta} />
            </OverviewMetricTooltip>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
