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
  getReportPeriodLabel,
  getValidatedDateRangeMode,
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
    sortOrder: requireNumberField(row, 'sort_order', 'scorecard row'),
    metricName: requireStringField(row, 'metric_name', 'scorecard row'),
    currentPeriod: requireStringField(row, 'current_period', 'scorecard row'),
    previousPeriod: requireStringField(
      row,
      'previous_period',
      'scorecard row',
    ),
    pctChange: requireStringField(row, 'pct_change', 'scorecard row'),
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

function requireStringField(
  row: QueryRow,
  key: string,
  context: string,
): string {
  const value = row[key];
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${context} field "${key}": expected a string.`);
  }
  return value;
}

function requireNumberField(
  row: QueryRow,
  key: string,
  context: string,
): number {
  const value = row[key];

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  throw new Error(
    `Invalid ${context} field "${key}": expected a finite number.`,
  );
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
    const dateRangeMode = getValidatedDateRangeMode(appliedFilters);
    const query = buildScorecardReportQuery(appliedFilters);
    const { rows, bytesProcessed } = await this.client.queryRows(query);

    return {
      data: {
        reportTitle: 'Situation Room',
        reportPeriodLabel: getReportPeriodLabel(dateRangeMode),
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
            value: requireStringField(row, 'value', 'filter dictionary row'),
            label: requireStringField(row, 'label', 'filter dictionary row'),
            sortOrder: requireNumberField(
              row,
              'sort_order',
              'filter dictionary row',
            ),
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
