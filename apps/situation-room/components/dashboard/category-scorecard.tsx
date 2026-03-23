'use client';

import * as React from 'react';
import { CircleHelpIcon } from 'lucide-react';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OverviewMetricTooltip } from '@/components/dashboard/overview-metric-tooltip';
import { ScorecardSection } from '@/components/dashboard/scorecard-section';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CATEGORY_DESCRIPTIONS } from '@/lib/dashboard/category-descriptions';
import type { OverviewCategoryCard } from '@/lib/dashboard/overview-model';
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

function MetricBlock({
  label,
  value,
  fullValue,
  previousValue,
  delta,
  description,
  calculation,
}: {
  label: string;
  value: string;
  fullValue: string;
  previousValue: string;
  delta: string;
  description: string;
  calculation: string;
}) {
  return (
    <OverviewMetricTooltip
      label={label}
      fullValue={fullValue}
      previousValue={previousValue}
      delta={<Delta value={delta} />}
      description={description}
      calculation={calculation}
      labelContent={<p className="text-xs text-muted-foreground">{label}</p>}
      triggerClassName="flex w-fit items-baseline gap-2 text-left outline-none"
      contentClassName="w-fit max-w-[24rem] rounded-lg px-3 py-2"
    >
      <p
        className={cn(
          'font-semibold text-foreground',
          'text-2xl tracking-tight',
        )}
      >
        {value}
      </p>
      <Delta value={delta} />
    </OverviewMetricTooltip>
  );
}

export function CategoryScorecard({ card }: { card: OverviewCategoryCard }) {
  return (
    <Card className="h-full border-border/70 bg-card/70 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">{card.category}</CardTitle>
        <CardAction>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`About ${card.category}`}
                  className="rounded-full text-muted-foreground"
                />
              }
            >
              <CircleHelpIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent className="max-w-56 flex-col items-start gap-0.5 text-left">
              <span className="font-medium">{card.category}</span>
              <span>{CATEGORY_DESCRIPTIONS[card.category]}</span>
            </TooltipContent>
          </Tooltip>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <ScorecardSection>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricBlock
              label={card.sectionA.hero.label}
              value={card.sectionA.hero.value}
              fullValue={card.sectionA.hero.fullValue}
              previousValue={card.sectionA.hero.previousValue}
              delta={card.sectionA.hero.delta}
              description={card.sectionA.hero.description}
              calculation={card.sectionA.hero.calculation}
            />
            {card.sectionA.support ? (
              <MetricBlock
                label={card.sectionA.support.label}
                value={card.sectionA.support.value}
                fullValue={card.sectionA.support.fullValue}
                previousValue={card.sectionA.support.previousValue}
                delta={card.sectionA.support.delta}
                description={card.sectionA.support.description}
                calculation={card.sectionA.support.calculation}
              />
            ) : null}
          </div>
        </ScorecardSection>

        <Separator className="bg-border/60" />

        <ScorecardSection>
          <div className="grid gap-4 md:grid-cols-3">
            {card.sectionB.metrics.map((metric) => (
              <MetricBlock
                key={metric.tileId}
                label={metric.label}
                value={metric.value}
                fullValue={metric.fullValue}
                previousValue={metric.previousValue}
                delta={metric.delta}
                description={metric.description}
                calculation={metric.calculation}
              />
            ))}
          </div>
        </ScorecardSection>

        <Separator className="bg-border/60" />

        <ScorecardSection>
          <div className="grid gap-4 md:grid-cols-3">
            {card.sectionC.metrics.map((metric) => (
              <MetricBlock
                key={metric.tileId}
                label={metric.label}
                value={metric.value}
                fullValue={metric.fullValue}
                previousValue={metric.previousValue}
                delta={metric.delta}
                description={metric.description}
                calculation={metric.calculation}
              />
            ))}
          </div>
          {card.supportRow.metrics.length > 0 ? (
            <>
              <Separator className="bg-border/50" />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {card.supportRow.metrics.map((metric) => (
                  <OverviewMetricTooltip
                    key={metric.tileId}
                    label={metric.label}
                    fullValue={metric.fullValue}
                    previousValue={metric.previousValue}
                    delta={<Delta value={metric.delta} />}
                    description={metric.description}
                    calculation={metric.calculation}
                    labelContent={
                      <p className="text-[11px] tracking-[0.04em] text-muted-foreground/85">
                        {metric.label}
                      </p>
                    }
                    triggerClassName="flex w-fit items-baseline gap-1.5 text-left outline-none"
                    contentClassName="w-fit max-w-[24rem] rounded-lg px-3 py-2"
                  >
                    <span className="text-sm font-medium text-foreground">{metric.value}</span>
                    <Delta value={metric.delta} />
                  </OverviewMetricTooltip>
                ))}
              </div>
            </>
          ) : null}
        </ScorecardSection>
      </CardContent>
    </Card>
  );
}
