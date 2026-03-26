import type { ChartConfig } from '@/components/ui/chart';
import { findTileDefinition, type TileFormatType } from '@/lib/dashboard/catalog';
import { parseIsoDate } from '@/lib/dashboard/date-range';
import type { TileTrendPayload } from '@/lib/dashboard/contracts';

export const TREND_CHART_CONFIG = {
  current: {
    label: 'Current period',
    color: 'var(--chart-1)',
  },
  previous: {
    label: 'Previous year',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

export function buildTrendChartData(trend: TileTrendPayload) {
  return trend.points.map((point) => ({
    bucketLabel: point.bucketLabel,
    current: point.currentValue,
    previous: point.previousValue,
  }));
}

export function formatTrendRangeLabel(value: string): string {
  return value.replace(/\s*[–-]\s*/u, ' to ');
}

export function formatTrendAxisLabel(value: string): string {
  const isoDate = parseIsoDate(value);
  if (isoDate) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(isoDate);
  }

  const match = value.match(/^([A-Za-z]{3})\s+0?(\d{1,2})$/);
  if (match) {
    return `${match[1]} ${Number(match[2])}`;
  }

  return value;
}

export function getTrendFormatType(trend: TileTrendPayload): TileFormatType {
  return findTileDefinition(trend.category, trend.tileId)?.formatType ?? 'number';
}

export function formatTrendTooltipValue(
  value: number | null | undefined,
  formatType: TileFormatType,
): string {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }

  if (formatType === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }

  if (formatType === 'percent') {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      maximumFractionDigits: 1,
    }).format(value);
  }

  if (formatType === 'days') {
    return `${new Intl.NumberFormat('en-US', {
      maximumFractionDigits: value % 1 === 0 ? 0 : 1,
    }).format(value)} days`;
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

export function formatTrendAxisValue(
  value: number | null | undefined,
  formatType: TileFormatType,
): string {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }

  if (formatType === 'currency') {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short',
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 1,
    }).format(value);
  }

  if (formatType === 'percent') {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      maximumFractionDigits: 0,
    }).format(value);
  }

  if (formatType === 'days') {
    return `${new Intl.NumberFormat('en-US', {
      maximumFractionDigits: value % 1 === 0 ? 0 : 1,
    }).format(value)}d`;
  }

  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(value);
}

function defaultTextMeasure(text: string): number {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (context) {
      context.font = '12px var(--font-sans)';
      return context.measureText(text).width;
    }
  }

  return text.length * 8;
}

export function getTrendAxisWidth(
  trend: TileTrendPayload,
  measureText: (text: string) => number = defaultTextMeasure,
): number {
  const formatType = getTrendFormatType(trend);
  const labels = trend.points
    .flatMap((point) => [point.currentValue, point.previousValue])
    .filter((value): value is number => value != null && !Number.isNaN(value))
    .map((value) => formatTrendAxisValue(value, formatType));

  const longestLabelWidth = Math.max(
    ...((labels.length > 0 ? labels : [formatTrendAxisValue(0, formatType)]).map(measureText)),
  );

  return Math.ceil(longestLabelWidth + 16);
}
