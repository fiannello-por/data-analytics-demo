// apps/perf-sandbox/lib/direct-overview.ts
//
// Experiment: bypass Lightdash compile for overview queries.
// Build SQL directly and execute against BigQuery.
// This tests whether Lightdash compile latency (~1.7s per call) is the
// dominant bottleneck, and what the floor is with direct BQ execution.

import { BigQuery } from '@google-cloud/bigquery';
import type { SpanCollector } from './telemetry';

const TABLE =
  '`data-analytics-306119.scorecard_test.sales_dashboard_v2_opportunity_base`';

const CATEGORIES = ['New Logo', 'Expansion', 'Migration', 'Renewal', 'Total'] as const;

type Category = (typeof CATEGORIES)[number];

function buildOverviewSQL(
  category: Category,
  startDate: string,
  endDate: string,
): string {
  const categoryFilter =
    category !== 'Total'
      ? `AND dashboard_category = '${category}'`
      : '';

  return `
    SELECT
      SUM(CASE WHEN won = TRUE AND stage_name = 'Closed Won' AND acv > 0 THEN acv ELSE 0 END) AS bookings_amount
    FROM ${TABLE}
    WHERE close_date BETWEEN '${startDate}' AND '${endDate}'
    ${categoryFilter}
  `.trim();
}

function defaultDateRange() {
  const now = new Date();
  const year = now.getFullYear();
  return {
    startDate: `${year}-01-01`,
    endDate: now.toISOString().slice(0, 10),
  };
}

function defaultPreviousDateRange() {
  const now = new Date();
  const year = now.getFullYear() - 1;
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
  };
}

export async function loadDirectOverviewBoard(
  bigquery: BigQuery,
  collector: SpanCollector,
  location: string,
) {
  const dateRange = defaultDateRange();
  const previousDateRange = defaultPreviousDateRange();
  const boardSpanId = collector.startSpan('overview_board_direct');

  const results = await Promise.all(
    CATEGORIES.map(async (category) => {
      const catSpanId = collector.startSpan('category_snapshot', boardSpanId, {
        category,
        strategy: 'direct-sql',
      });

      // Current window
      const currentSpanId = collector.startSpan('query_current', catSpanId);
      collector.setActiveParent(currentSpanId);
      const bqCurrentId = collector.startSpan('bigquery_execute');
      const currentSql = buildOverviewSQL(category, dateRange.startDate, dateRange.endDate);
      const [currentJob] = await bigquery.createQueryJob({
        query: currentSql,
        location,
        useQueryCache: true,
      });
      const [currentRows] = await currentJob.getQueryResults();
      const [currentMeta] = await currentJob.getMetadata();
      collector.setMetadata(bqCurrentId, {
        bytesProcessed: Number(currentMeta.statistics?.query?.totalBytesProcessed ?? 0),
        cacheHit: currentMeta.statistics?.query?.cacheHit ?? false,
      });
      collector.endSpan(bqCurrentId);
      collector.setActiveParent(undefined);
      collector.endSpan(currentSpanId);

      // Previous window
      const previousSpanId = collector.startSpan('query_previous', catSpanId);
      collector.setActiveParent(previousSpanId);
      const bqPreviousId = collector.startSpan('bigquery_execute');
      const previousSql = buildOverviewSQL(category, previousDateRange.startDate, previousDateRange.endDate);
      const [previousJob] = await bigquery.createQueryJob({
        query: previousSql,
        location,
        useQueryCache: true,
      });
      const [previousRows] = await previousJob.getQueryResults();
      const [previousMeta] = await previousJob.getMetadata();
      collector.setMetadata(bqPreviousId, {
        bytesProcessed: Number(previousMeta.statistics?.query?.totalBytesProcessed ?? 0),
        cacheHit: previousMeta.statistics?.query?.cacheHit ?? false,
      });
      collector.endSpan(bqPreviousId);
      collector.setActiveParent(undefined);
      collector.endSpan(previousSpanId);

      collector.endSpan(catSpanId);

      const currentValue = (currentRows[0] as Record<string, unknown>)?.bookings_amount;
      const previousValue = (previousRows[0] as Record<string, unknown>)?.bookings_amount;

      return { category, current: currentValue, previous: previousValue };
    }),
  );

  collector.endSpan(boardSpanId);
  return results;
}
