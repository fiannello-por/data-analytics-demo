import {
  CATEGORY_ORDER,
  type CategoryData,
  type ScorecardFilters,
  type ScorecardRow,
  withDefaultDateRange,
} from '@/lib/contracts';
import {
  buildFilterDictionaryQuery,
  buildScorecardReportQuery,
} from '@/lib/bigquery/sql';
import type {
  AdapterResult,
  FilterDictionaryPayload,
  ScorecardDataAdapter,
} from '@/lib/data-adapters/types';

type QueryDefinition = {
  sql: string;
  params: Record<string, unknown>;
};

type QueryRow = Record<string, unknown>;

type QueryResult = {
  rows: QueryRow[];
  bytesProcessed?: number;
};

type QueryClient = {
  queryRows: (query: QueryDefinition) => Promise<QueryResult>;
};

const defaultQueryClient: QueryClient = {
  async queryRows(query) {
    const { getBigQueryClient } = await import('@/lib/bigquery/client');
    const bigquery = getBigQueryClient();
    const [job] = await bigquery.createQueryJob({
      query: query.sql,
      params: query.params,
      location: process.env.BIGQUERY_LOCATION ?? 'US',
    });
    const [rows] = await job.getQueryResults();
    const [metadata] = await job.getMetadata();

    return {
      rows: rows as QueryRow[],
      bytesProcessed: Number(
        metadata.statistics?.query?.totalBytesProcessed ?? 0,
      ),
    };
  },
};

function mapRow(row: QueryRow): ScorecardRow {
  return {
    sortOrder: Number(row.sort_order),
    metricName: String(row.metric_name),
    currentPeriod: String(row.current_period),
    previousPeriod: String(row.previous_period),
    pctChange: String(row.pct_change),
  };
}

function mapCategories(rows: QueryRow[]): CategoryData[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    rows: rows
      .filter((row) => row.category === category)
      .map(mapRow)
      .sort((left, right) => left.sortOrder - right.sortOrder),
  }));
}

function nowIsoString(): string {
  return new Date().toISOString();
}

export class BigQueryAdapter implements ScorecardDataAdapter {
  constructor(private readonly client: QueryClient = defaultQueryClient) {}

  async getScorecardReport(
    filters: ScorecardFilters,
  ): Promise<
    AdapterResult<{
      reportTitle: string;
      reportPeriodLabel: string;
      lastRefreshedAt: string;
      appliedFilters: ScorecardFilters;
      categories: CategoryData[];
    }>
  > {
    const appliedFilters = withDefaultDateRange(filters);
    const query = buildScorecardReportQuery(appliedFilters);
    const { rows, bytesProcessed } = await this.client.queryRows(query);

    return {
      data: {
        reportTitle: 'Situation Room',
        reportPeriodLabel: 'Current Year',
        lastRefreshedAt: nowIsoString(),
        appliedFilters,
        categories: mapCategories(rows),
      },
      meta: {
        source: 'bigquery',
        queryCount: 1,
        bytesProcessed,
      },
    };
  }

  async getFilterDictionary(
    key: string,
  ): Promise<AdapterResult<FilterDictionaryPayload>> {
    const query = buildFilterDictionaryQuery(key);
    const { rows, bytesProcessed } = await this.client.queryRows(query);

    return {
      data: {
        key,
        refreshedAt: nowIsoString(),
        options: rows
          .map((row) => ({
            value: String(row.value),
            label: String(row.label),
            sortOrder: Number(row.sort_order),
          }))
          .sort((left, right) => left.sortOrder - right.sortOrder),
      },
      meta: {
        source: 'bigquery',
        queryCount: 1,
        bytesProcessed,
      },
    };
  }
}
