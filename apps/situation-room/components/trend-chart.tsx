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

type TrendChartDatum = ReturnType<typeof buildTrendChartData>[number];

function getNotablePointIndexes(
  data: TrendChartDatum[],
  key: 'current' | 'previous',
) {
  const numericPoints = data
    .map((point, index) => ({ index, value: point[key] }))
    .filter((point): point is { index: number; value: number } => point.value != null && !Number.isNaN(point.value));

  if (numericPoints.length === 0) {
    return new Set<number>();
  }

  const maxPoint = numericPoints.reduce((best, point) => (point.value > best.value ? point : best));
  const minPoint = numericPoints.reduce((best, point) => (point.value < best.value ? point : best));
  const lastPoint = numericPoints.at(-1) ?? numericPoints[0];

  return new Set([maxPoint.index, minPoint.index, lastPoint.index]);
}

function renderTrendValueLabel({
  index,
  value,
  x,
  y,
  keyName,
  notableIndexes,
  formatType,
  lastIndex,
}: {
  index?: number;
  value?: number | string;
  x?: number;
  y?: number;
  keyName: 'current' | 'previous';
  notableIndexes: Set<number>;
  formatType: ReturnType<typeof getTrendFormatType>;
  lastIndex: number;
}) {
  if (
    index == null ||
    !notableIndexes.has(index) ||
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    typeof value !== 'number'
  ) {
    return <g />;
  }

  const dy = keyName === 'current' ? -12 : 18;
  const isLastPoint = index === lastIndex;

  return (
    <text
      x={isLastPoint ? x - 6 : x}
      y={y + dy}
      textAnchor={isLastPoint ? 'end' : 'middle'}
      className="fill-muted-foreground"
      style={{ fontSize: 11, fontWeight: 500 }}
    >
      {formatTrendAxisValue(value, formatType)}
    </text>
  );
}

export function TrendChart({ trend }: { trend: TileTrendPayload }) {
  const data = React.useMemo(() => buildTrendChartData(trend), [trend]);
  const formatType = React.useMemo(() => getTrendFormatType(trend), [trend]);
  const yAxisWidth = React.useMemo(() => getTrendAxisWidth(trend), [trend]);
  const lastDataIndex = Math.max(data.length - 1, 0);
  const currentNotableIndexes = React.useMemo(
    () => getNotablePointIndexes(data, 'current'),
    [data],
  );
  const previousNotableIndexes = React.useMemo(
    () => getNotablePointIndexes(data, 'previous'),
    [data],
  );
  const xAxisFieldLabel = trend.xAxisFieldLabel ?? 'Date';

  return (
    <div className="flex h-full min-h-0 w-full flex-col justify-end gap-3">
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
        className="min-h-0 h-full w-full flex-1 !aspect-auto justify-stretch"
      >
        <LineChart
          accessibilityLayer
          data={data}
          margin={{
            top: 10,
            left: 10,
            right: 4,
            bottom: 14,
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
            label={(props) =>
              renderTrendValueLabel({
                index: props.index,
                value: props.value as number | string | undefined,
                x: props.x,
                y: props.y,
                keyName: 'previous',
                notableIndexes: previousNotableIndexes,
                formatType,
                lastIndex: lastDataIndex,
              })
            }
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
            label={(props) =>
              renderTrendValueLabel({
                index: props.index,
                value: props.value as number | string | undefined,
                x: props.x,
                y: props.y,
                keyName: 'current',
                notableIndexes: currentNotableIndexes,
                formatType,
                lastIndex: lastDataIndex,
              })
            }
            activeDot={{
              r: 5,
              fill: 'var(--color-current)',
              stroke: 'var(--background)',
              strokeWidth: 2,
            }}
          />
        </LineChart>
      </ChartContainer>
      <p className="text-center text-[11px] leading-5 text-muted-foreground">{xAxisFieldLabel}</p>
    </div>
  );
}
