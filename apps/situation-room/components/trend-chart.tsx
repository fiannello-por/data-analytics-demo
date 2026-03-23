'use client';

import * as React from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';
import type { TileTrendPayload } from '@/lib/dashboard/contracts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  TREND_CHART_CONFIG,
  buildTrendChartData,
  formatTrendAxisLabel,
  formatTrendAxisValue,
  formatTrendTooltipValue,
  getTrendFormatType,
  getTrendAxisWidth,
} from '@/lib/trend-chart-model';
import { toStableDomId } from '@/lib/stable-dom-id';

export function TrendChart({ trend }: { trend: TileTrendPayload }) {
  const data = React.useMemo(() => buildTrendChartData(trend), [trend]);
  const formatType = React.useMemo(() => getTrendFormatType(trend), [trend]);
  const yAxisWidth = React.useMemo(() => getTrendAxisWidth(trend), [trend]);

  return (
    <div className="flex h-full min-h-[19rem] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <div className="inline-flex items-center gap-2">
          <span
            className="h-0.5 w-6 rounded-full"
            style={{ backgroundColor: 'var(--chart-1)' }}
          />
          <span>{TREND_CHART_CONFIG.current.label}</span>
        </div>
        <div className="inline-flex items-center gap-2">
          <span
            className="h-0.5 w-6 rounded-full opacity-75"
            style={{ backgroundColor: 'var(--chart-2)' }}
          />
          <span>{TREND_CHART_CONFIG.previous.label}</span>
        </div>
      </div>

      <ChartContainer
        id={`trend-chart-${toStableDomId(trend.category)}-${toStableDomId(trend.tileId)}`}
        config={TREND_CHART_CONFIG}
        className="aspect-auto h-full min-h-0 flex-1 w-full"
      >
        <LineChart
          accessibilityLayer
          data={data}
          margin={{
            top: 10,
            left: 10,
            right: 18,
            bottom: 8,
          }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeWidth={1}
            strokeDasharray="2 4"
          />
          <XAxis
            dataKey="bucketLabel"
            tickLine={{ stroke: 'var(--border)', strokeWidth: 1 }}
            tickSize={6}
            axisLine={{ stroke: 'var(--border)', strokeWidth: 1 }}
            tickMargin={12}
            minTickGap={24}
            tickFormatter={formatTrendAxisLabel}
          />
          <YAxis
            tickLine={{ stroke: 'var(--border)', strokeWidth: 1 }}
            tickSize={6}
            axisLine={{ stroke: 'var(--border)', strokeWidth: 1 }}
            tickMargin={12}
            width={yAxisWidth}
            tickFormatter={(value: number) => formatTrendAxisValue(value, formatType)}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                indicator="line"
                valueFormatter={(value) => formatTrendTooltipValue(value, formatType)}
              />
            }
          />
          <Line
            dataKey="previous"
            type="monotone"
            stroke="var(--color-previous)"
            strokeWidth={1.5}
            strokeOpacity={0.68}
            dot={false}
            activeDot={{
              r: 5,
              fill: 'var(--color-previous)',
              stroke: 'var(--background)',
              strokeWidth: 2,
            }}
          />
          <Line
            dataKey="current"
            type="monotone"
            stroke="var(--color-current)"
            strokeWidth={3}
            dot={false}
            activeDot={{
              r: 5,
              fill: 'var(--color-current)',
              stroke: 'var(--background)',
              strokeWidth: 2,
            }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
