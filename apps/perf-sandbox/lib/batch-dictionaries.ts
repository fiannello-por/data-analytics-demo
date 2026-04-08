// apps/perf-sandbox/lib/batch-dictionaries.ts
//
// Experiment: load all 16 filter dictionaries in a single BigQuery query
// instead of 16 separate Lightdash compile+execute round-trips.
// This bypasses Lightdash entirely for dictionaries.

import { BigQuery } from '@google-cloud/bigquery';
import type { SpanCollector } from './telemetry';

const DICTIONARY_COLUMNS = [
  'division',
  'owner',
  'opportunity_segment',
  'region',
  'se',
  'booking_plan_opp_type_2025',
  'product_family',
  'sdr_source',
  'sdr',
  'opp_record_type',
  'account_owner',
  'owner_department',
  'strategic_filter',
  'accepted',
  'gate1_criteria_met',
  'gate_met_or_accepted',
] as const;

const TABLE =
  '`data-analytics-306119.scorecard_test.sales_dashboard_v2_opportunity_base`';

function buildBatchDictionarySQL(): string {
  // Single query that fetches distinct values for all 16 columns.
  // Uses UNPIVOT-like approach: one SELECT DISTINCT per column, UNIONed together.
  const parts = DICTIONARY_COLUMNS.map(
    (col) =>
      `SELECT '${col}' AS dimension_name, CAST(${col} AS STRING) AS dimension_value FROM ${TABLE} WHERE ${col} IS NOT NULL GROUP BY ${col}`,
  );
  return parts.join('\nUNION ALL\n') + '\nORDER BY dimension_name, dimension_value';
}

export async function loadBatchDictionaries(
  bigquery: BigQuery,
  collector: SpanCollector,
  location: string,
) {
  const dictSpanId = collector.startSpan('filter_dictionaries_batch', undefined, {
    count: DICTIONARY_COLUMNS.length,
    strategy: 'single-query',
  });

  const sql = buildBatchDictionarySQL();

  collector.setActiveParent(dictSpanId);
  const bqSpanId = collector.startSpan('bigquery_execute', dictSpanId, {
    strategy: 'batch',
  });

  const [job] = await bigquery.createQueryJob({
    query: sql,
    location,
    useQueryCache: true,
  });
  const [rows] = await job.getQueryResults();
  const [metadata] = await job.getMetadata();

  collector.setMetadata(bqSpanId, {
    bytesProcessed: Number(
      metadata.statistics?.query?.totalBytesProcessed ?? 0,
    ),
    cacheHit: metadata.statistics?.query?.cacheHit ?? false,
    slotMs: Number(metadata.statistics?.query?.totalSlotMs ?? 0),
  });
  collector.endSpan(bqSpanId);
  collector.setActiveParent(undefined);

  // Group results by dimension_name
  const grouped = new Map<string, string[]>();
  for (const row of rows as Array<{
    dimension_name: string;
    dimension_value: string;
  }>) {
    const existing = grouped.get(row.dimension_name) ?? [];
    existing.push(row.dimension_value);
    grouped.set(row.dimension_name, existing);
  }

  const results = DICTIONARY_COLUMNS.map((col) => ({
    key: col,
    options: grouped.get(col) ?? [],
  }));

  collector.endSpan(dictSpanId);
  return results;
}
