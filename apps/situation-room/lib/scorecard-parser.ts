import type { ScorecardRow } from './types';

export function parseScorecardRows(
  raw: Record<string, { value: { raw: unknown; formatted: string } }>[],
): ScorecardRow[] {
  return raw
    .map((row) => ({
      sortOrder: Number(row.scorecard_daily_sort_order.value.raw),
      metricName: String(row.scorecard_daily_metric_name.value.formatted),
      currentPeriod: String(row.scorecard_daily_current_period.value.formatted),
      previousPeriod: String(
        row.scorecard_daily_previous_period.value.formatted,
      ),
      pctChange: String(row.scorecard_daily_pct_change.value.formatted),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
