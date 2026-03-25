import { describe, expect, it } from 'vitest';
import type { TileTrendPayload } from '@/lib/dashboard/contracts';
import {
  TREND_CHART_CONFIG,
  buildTrendChartData,
  formatTrendRangeLabel,
  formatTrendAxisLabel,
  formatTrendAxisValue,
  formatTrendTooltipValue,
  getTrendAxisWidth,
} from '@/lib/trend-chart-model';

describe('trend chart model', () => {
  it('defines the current and previous series with palette tokens', () => {
    expect(TREND_CHART_CONFIG.current.label).toBe('Current period');
    expect(TREND_CHART_CONFIG.current.color).toBe('var(--chart-1)');
    expect(TREND_CHART_CONFIG.previous.label).toBe('Previous year');
    expect(TREND_CHART_CONFIG.previous.color).toBe('var(--chart-2)');
  });

  it('maps trend payload points into recharts-ready data', () => {
    const trend: TileTrendPayload = {
      category: 'New Logo',
      tileId: 'new_logo_sql',
      label: 'SQL',
      grain: 'weekly',
      xAxisFieldLabel: 'Created Date',
      currentWindowLabel: 'Jan 1, 2026 - Mar 31, 2026',
      previousWindowLabel: 'Jan 1, 2025 - Mar 31, 2025',
      points: [
        {
          bucketKey: '2026-W01',
          bucketLabel: 'Jan 05',
          currentValue: 12,
          previousValue: 9,
        },
        {
          bucketKey: '2026-W02',
          bucketLabel: 'Jan 12',
          currentValue: 15,
          previousValue: 11,
        },
      ],
    };

    expect(buildTrendChartData(trend)).toEqual([
      { bucketLabel: 'Jan 05', current: 12, previous: 9 },
      { bucketLabel: 'Jan 12', current: 15, previous: 11 },
    ]);
  });

  it('formats panel ranges in a readable executive style', () => {
    expect(formatTrendRangeLabel('Jan 1, 2026 - Mar 31, 2026')).toBe(
      'Jan 1, 2026 to Mar 31, 2026',
    );
  });

  it('shortens axis labels for weekly buckets', () => {
    expect(formatTrendAxisLabel('Jan 05')).toBe('Jan 5');
    expect(formatTrendAxisLabel('2026-03-31')).toBe('Mar 31');
  });

  it('formats chart numeric values from the tile format type', () => {
    expect(formatTrendTooltipValue(12432, 'currency')).toBe('$12,432');
    expect(formatTrendAxisValue(12432, 'currency')).toBe('$12.4K');
    expect(formatTrendTooltipValue(0.142, 'percent')).toBe('14.2%');
    expect(formatTrendAxisValue(0.142, 'percent')).toBe('14%');
    expect(formatTrendTooltipValue(18, 'days')).toBe('18 days');
    expect(formatTrendAxisValue(18, 'days')).toBe('18d');
    expect(formatTrendTooltipValue(12432, 'number')).toBe('12,432');
    expect(formatTrendAxisValue(12432, 'number')).toBe('12.4K');
  });

  it('derives y-axis width from the longest formatted tick label', () => {
    const trend: TileTrendPayload = {
      category: 'New Logo',
      tileId: 'new_logo_avg_age',
      label: 'Avg Age',
      grain: 'weekly',
      xAxisFieldLabel: 'Close Date',
      currentWindowLabel: 'Jan 1, 2026 - Mar 31, 2026',
      previousWindowLabel: 'Jan 1, 2025 - Mar 31, 2025',
      points: [
        {
          bucketKey: '1',
          bucketLabel: 'Jan 05',
          currentValue: 140,
          previousValue: 7,
        },
      ],
    };

    expect(getTrendAxisWidth(trend, (text) => text.length * 10)).toBe(56);
  });
});
