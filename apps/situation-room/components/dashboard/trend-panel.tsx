'use client';

import * as React from 'react';
import type { TileTrendPayload } from '@/lib/dashboard/contracts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendChart } from '@/components/trend-chart';

export function TrendPanel({
  trend,
  isLoading,
}: {
  trend: TileTrendPayload;
  isLoading?: boolean;
}) {
  return (
    <Card aria-busy={isLoading}>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{trend.label}</CardTitle>
          <Badge variant="outline">{trend.grain}</Badge>
          {isLoading ? <Badge variant="secondary">Refreshing</Badge> : null}
        </div>
        <CardDescription>
          {trend.currentWindowLabel} vs {trend.previousWindowLabel}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <TrendChart trend={trend} />
      </CardContent>
    </Card>
  );
}
