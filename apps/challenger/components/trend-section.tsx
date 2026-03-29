'use client';

// apps/challenger/components/trend-section.tsx

import type { Category, DashboardFilters, DateRange } from '@por/dashboard-constants';

import { useTrend } from '@/lib/query-hooks';
import type { TrendPoint } from '@/lib/trend-loader';

import { RefreshingIndicator } from './refreshing-indicator';
import { SectionError } from './section-error';
import { SectionSkeleton } from './section-skeleton';
import { TrendChart } from './trend-chart';

type TrendSectionProps = {
  category: Category;
  tileId: string | undefined;
  filters: DashboardFilters;
  dateRange: DateRange;
  enabled: boolean;
};

/**
 * Merge currentPoints and previousPoints arrays (aligned by index)
 * into the `{ week, current, previous }` format that TrendChart expects.
 */
function mergeTrendPoints(
  currentPoints: TrendPoint[],
  previousPoints: TrendPoint[],
): { week: string; current: number | null; previous: number | null }[] {
  const length = Math.max(currentPoints.length, previousPoints.length);
  const merged: {
    week: string;
    current: number | null;
    previous: number | null;
  }[] = [];

  for (let i = 0; i < length; i++) {
    const cp = currentPoints[i];
    const pp = previousPoints[i];
    const week = cp?.week ?? pp?.week ?? `W${i + 1}`;
    const currentVal = cp?.value ? Number(cp.value) : null;
    const previousVal = pp?.value ? Number(pp.value) : null;

    merged.push({
      week,
      current: currentVal != null && !Number.isNaN(currentVal) ? currentVal : null,
      previous: previousVal != null && !Number.isNaN(previousVal) ? previousVal : null,
    });
  }

  return merged;
}

export function TrendSection({
  category,
  tileId,
  filters,
  dateRange,
  enabled,
}: TrendSectionProps) {
  // Double-gate: both orchestration AND tile selection must be truthy
  const queryEnabled = enabled && !!tileId;

  const { data, isPending, isFetching, isError, error, refetch } = useTrend(
    category,
    tileId ?? '',
    filters,
    dateRange,
    { enabled: queryEnabled },
  );

  if (!tileId) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#9ca3af',
        }}
      >
        Select a metric to see its trend
      </div>
    );
  }

  if (isPending) {
    return <SectionSkeleton height={300} label="trend" />;
  }

  if (isError) {
    return (
      <SectionError
        message={
          error instanceof Error
            ? error.message
            : 'Failed to load trend data'
        }
        onRetry={() => void refetch()}
        staleContent={data ? renderChart() : undefined}
      />
    );
  }

  const content = renderChart();

  if (isFetching) {
    return <RefreshingIndicator isRefreshing>{content}</RefreshingIndicator>;
  }

  return content;

  // ── Chart renderer ──────────────────────────────────────────────────────

  function renderChart() {
    if (!data) return null;

    const merged = mergeTrendPoints(data.currentPoints, data.previousPoints);

    return (
      <div data-testid="section-ready">
        <TrendChart
          data={merged}
          currentLabel="Current Period"
          previousLabel="Previous Period"
        />
      </div>
    );
  }
}
