import { describe, it, expect } from 'vitest';
import { parseScorecardRows } from '@/lib/scorecard-parser';

describe('parseScorecardRows', () => {
  it('transforms raw Lightdash rows into ScorecardRow objects', () => {
    const raw = [
      {
        scorecard_daily_sort_order: { value: { raw: 1, formatted: '1' } },
        scorecard_daily_metric_name: {
          value: { raw: 'Annual Pacing', formatted: 'Annual Pacing' },
        },
        scorecard_daily_current_period: {
          value: { raw: '$1,234.56K', formatted: '$1,234.56K' },
        },
        scorecard_daily_previous_period: {
          value: { raw: '$1,100.00K', formatted: '$1,100.00K' },
        },
        scorecard_daily_pct_change: {
          value: { raw: '+12.2%', formatted: '+12.2%' },
        },
      },
    ];
    const result = parseScorecardRows(raw);
    expect(result).toEqual([
      {
        sortOrder: 1,
        metricName: 'Annual Pacing',
        currentPeriod: '$1,234.56K',
        previousPeriod: '$1,100.00K',
        pctChange: '+12.2%',
      },
    ]);
  });

  it('sorts rows by sortOrder ascending', () => {
    const raw = [
      {
        scorecard_daily_sort_order: { value: { raw: 3, formatted: '3' } },
        scorecard_daily_metric_name: { value: { raw: 'C', formatted: 'C' } },
        scorecard_daily_current_period: {
          value: { raw: '10', formatted: '10' },
        },
        scorecard_daily_previous_period: {
          value: { raw: '8', formatted: '8' },
        },
        scorecard_daily_pct_change: {
          value: { raw: '+25%', formatted: '+25%' },
        },
      },
      {
        scorecard_daily_sort_order: { value: { raw: 1, formatted: '1' } },
        scorecard_daily_metric_name: { value: { raw: 'A', formatted: 'A' } },
        scorecard_daily_current_period: {
          value: { raw: '20', formatted: '20' },
        },
        scorecard_daily_previous_period: {
          value: { raw: '15', formatted: '15' },
        },
        scorecard_daily_pct_change: {
          value: { raw: '+33%', formatted: '+33%' },
        },
      },
    ];
    const result = parseScorecardRows(raw);
    expect(result[0].metricName).toBe('A');
    expect(result[1].metricName).toBe('C');
  });

  it('handles empty rows array', () => {
    expect(parseScorecardRows([])).toEqual([]);
  });
});
