'use client';

import * as React from 'react';
import { CircleHelpIcon } from 'lucide-react';
import { OverviewMetricTile } from '@/components/dashboard/overview-metric-tile';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScorecardSection } from '@/components/dashboard/scorecard-section';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CATEGORY_DESCRIPTIONS } from '@/lib/dashboard/category-descriptions';
import type { OverviewCategoryCard } from '@/lib/dashboard/overview-model';

export function CategoryScorecard({ card }: { card: OverviewCategoryCard }) {
  return (
    <Card className="h-full border-border/70 bg-card/70 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {card.category}
        </CardTitle>
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
            <OverviewMetricTile
              metric={card.sectionA.hero}
              valueClassName="text-2xl tracking-tight"
            />
            {card.sectionA.support ? (
              <OverviewMetricTile
                metric={card.sectionA.support}
                valueClassName="text-2xl tracking-tight"
              />
            ) : null}
          </div>
        </ScorecardSection>

        <Separator className="bg-border/60" />

        <ScorecardSection>
          <div className="grid gap-4 md:grid-cols-3">
            {card.sectionB.metrics.map((metric) => (
              <OverviewMetricTile
                key={metric.tileId}
                metric={metric}
                valueClassName="text-2xl tracking-tight"
              />
            ))}
          </div>
        </ScorecardSection>

        <Separator className="bg-border/60" />

        <ScorecardSection>
          <div className="grid gap-4 md:grid-cols-3">
            {card.sectionC.metrics.map((metric) => (
              <OverviewMetricTile
                key={metric.tileId}
                metric={metric}
                valueClassName="text-2xl tracking-tight"
              />
            ))}
          </div>
          {card.supportRow.metrics.length > 0 ? (
            <>
              <Separator className="bg-border/50" />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {card.supportRow.metrics.map((metric) => (
                  <OverviewMetricTile
                    key={metric.tileId}
                    metric={metric}
                    valueClassName="text-sm font-medium"
                    labelClassName="text-[11px] tracking-[0.04em] text-muted-foreground/85"
                    triggerClassName="flex w-fit items-baseline gap-1.5 text-left outline-none"
                  />
                ))}
              </div>
            </>
          ) : null}
        </ScorecardSection>
      </CardContent>
    </Card>
  );
}
