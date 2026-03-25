'use client';

import * as React from 'react';
import { OverviewMetricTile } from '@/components/dashboard/overview-metric-tile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { OverviewTotalCard } from '@/lib/dashboard/overview-model';

export function TotalScorecard({ card }: { card: OverviewTotalCard }) {
  return (
    <Card className="border-border/70 bg-card/70 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">{card.category}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1.1fr)_auto_minmax(0,0.9fr)] lg:items-start">
        <div className="grid gap-4 md:grid-cols-2">
          <OverviewMetricTile metric={card.hero} valueClassName="text-3xl tracking-tight" />
          {card.support ? (
            <OverviewMetricTile metric={card.support} valueClassName="text-3xl tracking-tight" />
          ) : null}
        </div>

        <Separator className="bg-border/60 lg:hidden" />

        <div className="hidden lg:flex lg:justify-center">
          <Separator orientation="vertical" className="bg-border/60" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:pl-1">
          {card.secondaryMetrics.map((metric) => (
            <OverviewMetricTile
              key={metric.tileId}
              metric={metric}
              valueClassName="text-2xl"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
