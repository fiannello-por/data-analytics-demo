import 'server-only';

import { getBigQueryClient } from '@/lib/bigquery/client';
import { getSituationRoomEnv } from '@/lib/env.server';
import {
  normalizeProbeExecutionOptions,
  shouldUseBigQueryQueryCache,
  type ProbeExecutionOptions,
  type ProbeCacheMode,
} from '@/lib/probe-cache-mode';
import type { DashboardQueryDefinition } from '@/lib/bigquery/dashboard-sql';

export type DashboardQueryRow = Record<string, unknown>;

export type DashboardQueryResult = {
  rows: DashboardQueryRow[];
  bytesProcessed?: number;
};

export type DashboardQueryExecution = {
  cacheMode: ProbeCacheMode;
};

export type DashboardQueryClient = {
  queryRows: (
    query: DashboardQueryDefinition,
    execution: DashboardQueryExecution,
  ) => Promise<DashboardQueryResult>;
};

export type DashboardLoaderMeta = {
  source: 'bigquery' | 'lightdash';
  queryCount: number;
  bytesProcessed?: number;
  cacheMode: ProbeCacheMode;
};

export type DashboardLoaderResult<T> = {
  data: T;
  meta: DashboardLoaderMeta;
};

export const defaultDashboardQueryClient: DashboardQueryClient = {
  async queryRows(query, execution) {
    const bigquery = getBigQueryClient();
    const env = getSituationRoomEnv();
    const [job] = await bigquery.createQueryJob({
      query: query.sql,
      params: query.params,
      location: env.location,
      useQueryCache: shouldUseBigQueryQueryCache(execution.cacheMode),
    });
    const [rows] = await job.getQueryResults();
    const [metadata] = await job.getMetadata();

    return {
      rows: rows as DashboardQueryRow[],
      bytesProcessed: Number(metadata.statistics?.query?.totalBytesProcessed ?? 0),
    };
  },
};

export function normalizeDashboardExecutionOptions(
  options: ProbeExecutionOptions = {},
): DashboardQueryExecution {
  return normalizeProbeExecutionOptions(options);
}

export function nowIsoString(): string {
  return new Date().toISOString();
}

export function requireStringField(
  row: DashboardQueryRow,
  key: string,
  context: string,
): string {
  const value = row[key];

  if (typeof value !== 'string') {
    throw new Error(`Invalid ${context} field "${key}": expected a string.`);
  }

  return value;
}

export function requireNumberField(
  row: DashboardQueryRow,
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

export function requireOptionalNumberField(
  row: DashboardQueryRow,
  key: string,
  context: string,
): number | null {
  const value = row[key];

  if (value == null) {
    return null;
  }

  return requireNumberField(row, key, context);
}

export function formatMetricValue(
  value: number | null,
  formatType: 'currency' | 'number' | 'percent' | 'days',
): string {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }

  if (formatType === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }

  if (formatType === 'percent') {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      maximumFractionDigits: 1,
    }).format(value);
  }

  if (formatType === 'days') {
    return `${new Intl.NumberFormat('en-US', {
      maximumFractionDigits: value % 1 === 0 ? 0 : 1,
    }).format(value)} days`;
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

export function formatPctChange(
  currentValue: number | null,
  previousValue: number | null,
): string {
  if (
    currentValue == null ||
    previousValue == null ||
    previousValue === 0 ||
    Number.isNaN(currentValue) ||
    Number.isNaN(previousValue)
  ) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 1,
    signDisplay: 'always',
  }).format((currentValue - previousValue) / Math.abs(previousValue));
}
