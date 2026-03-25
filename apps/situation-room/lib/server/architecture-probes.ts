import 'server-only';

import { getBigQueryClient } from '@/lib/bigquery/client';
import {
  buildPingQuery,
  buildDivisionFilterOptionsQuery,
  buildProbeSummaryQuery,
  getProbeTableLabel,
} from '@/lib/bigquery/probe';
import type {
  CategorySnapshotPayload,
  FilterDictionaryPayload,
  TileTrendPayload,
} from '@/lib/dashboard/contracts';
import { parseDashboardSearchParams } from '@/lib/dashboard/query-inputs';
import { getSituationRoomEnv } from '@/lib/env.server';
import {
  normalizeProbeExecutionOptions,
  shouldUseBigQueryQueryCache,
  type ProbeExecutionOptions,
} from '@/lib/probe-cache-mode';
import { getDashboardCategorySnapshot } from '@/lib/server/get-dashboard-category-snapshot';
import { getDashboardFilterDictionary } from '@/lib/server/get-dashboard-filter-dictionary';
import { getDashboardTileTrend } from '@/lib/server/get-dashboard-tile-trend';

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
  queryRows: (
    query: QueryDefinition,
    options: { cacheMode: 'auto' | 'off' },
  ) => Promise<QueryResult>;
};

type ProbeResult<T> = {
  data: T;
  meta: {
    source: 'bigquery' | 'lightdash';
    queryCount: number;
    bytesProcessed?: number;
    cacheMode: 'auto' | 'off';
  };
};

type ArchitectureProbeId =
  | 'ping'
  | 'summary'
  | 'division-options'
  | 'dashboard-category-snapshot'
  | 'dashboard-tile-trend'
  | 'dashboard-filter-dictionary';

type ProbeRunPayload<T> = T & {
  source: 'bigquery' | 'lightdash';
  queryCount: number;
  bytesProcessed?: number;
  cacheMode: 'auto' | 'off';
};

export type ProbeRunResult<T> = {
  payload: ProbeRunPayload<T>;
};

const defaultQueryClient: QueryClient = {
  async queryRows(query, options) {
    const bigquery = getBigQueryClient();
    const env = getSituationRoomEnv();
    const [job] = await bigquery.createQueryJob({
      query: query.sql,
      params: query.params,
      location: env.location,
      useQueryCache: shouldUseBigQueryQueryCache(options.cacheMode),
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

function nowIsoString(): string {
  return new Date().toISOString();
}

function requireBooleanLikeField(
  row: QueryRow,
  key: string,
  context: string,
): boolean {
  const value = row[key];

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    if (value === '1' || value.toLowerCase() === 'true') {
      return true;
    }

    if (value === '0' || value.toLowerCase() === 'false') {
      return false;
    }
  }

  throw new Error(
    `Invalid ${context} field "${key}": expected a boolean-like value.`,
  );
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

function requireOptionalStringField(
  row: QueryRow,
  key: string,
): string | null {
  const value = row[key];

  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value !== 'string') {
    if (
      typeof value === 'object' &&
      'value' in value &&
      typeof value.value === 'string'
    ) {
      return value.value;
    }

    throw new Error(`Invalid probe summary field "${key}": expected a string.`);
  }

  return value;
}

function mergeProbePayload<T>(
  result: {
    data: T;
    meta: {
      source: 'bigquery' | 'lightdash';
      queryCount: number;
      bytesProcessed?: number;
      cacheMode?: 'auto' | 'off';
    };
  },
): ProbeRunResult<T> {
  return {
    payload: {
      ...result.data,
      source: result.meta.source,
      queryCount: result.meta.queryCount,
      bytesProcessed: result.meta.bytesProcessed,
      cacheMode: result.meta.cacheMode ?? 'auto',
    },
  };
}

function buildDashboardState(
  category: string,
  tileId?: string,
) {
  const searchParams = new URLSearchParams();
  searchParams.set('category', category);

  if (tileId) {
    searchParams.set('tileId', tileId);
  }

  return parseDashboardSearchParams(searchParams);
}

export async function getProbePing(
  client: QueryClient = defaultQueryClient,
  options: ProbeExecutionOptions = {},
): Promise<
  ProbeResult<{
    ok: boolean;
    refreshedAt: string;
    pingValue: number;
    table: string;
  }>
> {
  const execution = normalizeProbeExecutionOptions(options);
  const env = getSituationRoomEnv();
  const query = buildPingQuery();
  const { rows, bytesProcessed } = await client.queryRows(query, execution);
  const row = rows[0] ?? {};

  return {
    data: {
      ok: requireBooleanLikeField(row, 'ping_value', 'ping probe'),
      refreshedAt: nowIsoString(),
      pingValue: requireNumberField(row, 'ping_value', 'ping probe'),
      table: getProbeTableLabel(env.dataset),
    },
    meta: {
      source: 'bigquery',
      queryCount: 1,
      bytesProcessed,
      cacheMode: execution.cacheMode,
    },
  };
}

export async function getProbeSummary(
  client: QueryClient = defaultQueryClient,
  options: ProbeExecutionOptions = {},
): Promise<ProbeResult<{
  dataset: string;
  table: string;
  refreshedAt: string;
  rowCount: number;
  divisionCount: number;
  minReportDate: string | null;
  maxReportDate: string | null;
}>> {
  const execution = normalizeProbeExecutionOptions(options);
  const env = getSituationRoomEnv();
  const query = buildProbeSummaryQuery(env.projectId, env.dataset);
  const { rows, bytesProcessed } = await client.queryRows(query, execution);
  const row = rows[0] ?? {};

  return {
    data: {
      dataset: env.dataset,
      table: 'scorecard_daily',
      refreshedAt: nowIsoString(),
      rowCount: requireNumberField(row, 'row_count', 'probe summary'),
      divisionCount: requireNumberField(row, 'division_count', 'probe summary'),
      minReportDate: requireOptionalStringField(row, 'min_report_date'),
      maxReportDate: requireOptionalStringField(row, 'max_report_date'),
    },
    meta: {
      source: 'bigquery',
      queryCount: 1,
      bytesProcessed,
      cacheMode: execution.cacheMode,
    },
  };
}

export async function getProbeDivisionFilterOptions(
  key: 'Division',
  client: QueryClient = defaultQueryClient,
  options: ProbeExecutionOptions = {},
): Promise<ProbeResult<{
  key: 'Division';
  refreshedAt: string;
  optionCount: number;
  options: { value: string; label: string; sortOrder: number }[];
}>> {
  if (key !== 'Division') {
    throw new Error(`Unsupported probe filter key: ${key}.`);
  }

  const execution = normalizeProbeExecutionOptions(options);
  const env = getSituationRoomEnv();
  const query = buildDivisionFilterOptionsQuery(env.projectId, env.dataset);
  const { rows, bytesProcessed } = await client.queryRows(query, execution);
  const filterOptions = rows
    .map((row) => ({
      value: requireStringField(row, 'value', 'probe filter options row'),
      label: requireStringField(row, 'label', 'probe filter options row'),
      sortOrder: requireNumberField(
        row,
        'sort_order',
        'probe filter options row',
      ),
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder);

  return {
    data: {
      key: 'Division',
      refreshedAt: nowIsoString(),
      optionCount: filterOptions.length,
      options: filterOptions,
    },
    meta: {
      source: 'bigquery',
      queryCount: 1,
      bytesProcessed,
      cacheMode: execution.cacheMode,
    },
  };
}

export async function runProbe(
  id: ArchitectureProbeId,
  options: ProbeExecutionOptions = {},
): Promise<
  | ProbeRunResult<{
      ok: boolean;
      refreshedAt: string;
      pingValue: number;
      table: string;
    }>
  | ProbeRunResult<{
      dataset: string;
      table: string;
      refreshedAt: string;
      rowCount: number;
      divisionCount: number;
      minReportDate: string | null;
      maxReportDate: string | null;
    }>
  | ProbeRunResult<{
      key: 'Division';
      refreshedAt: string;
      optionCount: number;
      options: { value: string; label: string; sortOrder: number }[];
    }>
  | ProbeRunResult<CategorySnapshotPayload>
  | ProbeRunResult<TileTrendPayload>
  | ProbeRunResult<FilterDictionaryPayload>
> {
  const execution = normalizeProbeExecutionOptions(options);

  if (id === 'ping') {
    return mergeProbePayload(await getProbePing(undefined, execution));
  }

  if (id === 'summary') {
    return mergeProbePayload(await getProbeSummary(undefined, execution));
  }

  if (id === 'division-options') {
    return mergeProbePayload(
      await getProbeDivisionFilterOptions('Division', undefined, execution),
    );
  }

  if (id === 'dashboard-category-snapshot') {
    const state = buildDashboardState('New Logo');
    return mergeProbePayload(
      await getDashboardCategorySnapshot(
        {
          activeCategory: 'New Logo',
          filters: state.filters,
          dateRange: state.dateRange,
          previousDateRange: state.previousDateRange,
          selectedTileId: state.selectedTileId,
        },
        undefined,
        execution,
      ),
    );
  }

  if (id === 'dashboard-tile-trend') {
    const state = buildDashboardState('New Logo', 'new_logo_bookings_amount');
    return mergeProbePayload(
      await getDashboardTileTrend(
        {
          activeCategory: 'New Logo',
          selectedTileId: state.selectedTileId,
          filters: state.filters,
          dateRange: state.dateRange,
          previousDateRange: state.previousDateRange,
          trendGrain: 'weekly',
        },
        undefined,
        execution,
      ),
    );
  }

  return mergeProbePayload(
    await getDashboardFilterDictionary('Division', undefined, execution),
  );
}
