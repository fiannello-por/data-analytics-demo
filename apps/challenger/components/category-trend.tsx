// apps/challenger/components/category-trend.tsx

import type { TrendResult } from '@/lib/trend-loader';
import { TrendChart } from './trend-chart';

function parseValue(formatted: string): number | null {
  const num = parseFloat(formatted.replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? null : num;
}

export async function CategoryTrend({
  data,
}: {
  data: Promise<TrendResult>;
}) {
  const result = await data;
  const { category, tileId } = result;

  const len = Math.max(result.currentPoints.length, result.previousPoints.length);
  const chartData = Array.from({ length: len }, (_, i) => ({
    week: result.currentPoints[i]?.week ?? result.previousPoints[i]?.week ?? '',
    current: result.currentPoints[i] ? parseValue(result.currentPoints[i].value) : null,
    previous: result.previousPoints[i] ? parseValue(result.previousPoints[i].value) : null,
  }));

  const currentYear = result.currentPoints[0]?.week?.slice(0, 4) ?? 'Current';
  const previousYear = result.previousPoints[0]?.week?.slice(0, 4) ?? 'Previous';

  return (
    <div data-testid="section-ready">
      <h3 style={{ marginBottom: 4 }}>
        {category} Trend ({tileId}) — {result.queryCount} queries,{' '}
        {result.durationMs.toFixed(0)}ms
      </h3>
      <TrendChart
        data={chartData}
        currentLabel={currentYear}
        previousLabel={previousYear}
      />
    </div>
  );
}
