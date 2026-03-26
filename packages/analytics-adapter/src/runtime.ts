import {
  BigQueryDate,
  BigQueryDatetime,
  BigQueryTime,
  BigQueryTimestamp,
} from '@google-cloud/bigquery';
import type { DashboardBudgetTracker } from './budgets';
import {
  buildPersistentSemanticCacheKey,
  createInFlightRequestDeduper,
  type InFlightRequestDeduper,
  type SemanticResultCache,
} from './cache';
import {
  type CatalogRequest,
  type SemanticCatalogEntry,
  type SemanticFieldValue,
  type SemanticProvider,
  type SemanticQueryExecutor,
  type SemanticQueryRequest,
  type SemanticQueryResult,
} from './types';

export type SemanticRuntime = {
  runQuery(request: SemanticQueryRequest): Promise<SemanticQueryResult>;
  getCatalogEntries(request: CatalogRequest): Promise<SemanticCatalogEntry[]>;
};

export type SemanticRuntimeConfig = {
  provider: SemanticProvider;
  executeQuery: SemanticQueryExecutor;
  cache?: {
    semanticVersion: string;
    resultCache?: SemanticResultCache;
    inFlightDeduper?: InFlightRequestDeduper<SemanticQueryResult>;
  };
  budgetTracker?: DashboardBudgetTracker;
};

function normalizeScalarValue(value: unknown): unknown {
  if (
    value instanceof BigQueryDate ||
    value instanceof BigQueryDatetime ||
    value instanceof BigQueryTime ||
    value instanceof BigQueryTimestamp
  ) {
    return value.value;
  }

  return value;
}

function formatValue(value: unknown): string {
  const normalized = normalizeScalarValue(value);

  if (normalized == null) {
    return '';
  }

  if (normalized instanceof Date) {
    return normalized.toISOString();
  }

  return String(normalized);
}

function normalizeFieldValue(value: unknown): SemanticFieldValue {
  const normalized = normalizeScalarValue(value);

  if (value == null) {
    return {
      raw: null,
      formatted: '',
    };
  }

  return {
    raw: normalized,
    formatted: formatValue(normalized),
  };
}

function normalizeRow(
  row: Record<string, unknown>,
  aliases: Record<string, string>,
): Record<string, SemanticFieldValue> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      aliases[key] ?? key,
      normalizeFieldValue(value),
    ]),
  );
}

function withRequestContext(
  result: SemanticQueryResult,
  request: SemanticQueryRequest,
  overrides?: Partial<SemanticQueryResult['meta']>,
): SemanticQueryResult {
  return {
    rows: result.rows,
    meta: {
      ...result.meta,
      dashboardId: request.context?.dashboardId,
      surfaceId: request.context?.surfaceId,
      ...overrides,
    },
  };
}

function applyBudgetState(
  result: SemanticQueryResult,
  request: SemanticQueryRequest,
  budgetTracker?: DashboardBudgetTracker,
): SemanticQueryResult {
  const dashboardId = request.context?.dashboardId;
  if (!dashboardId || !budgetTracker) {
    return result;
  }

  const report = budgetTracker.record(dashboardId, {
    queryCount: result.meta.queryCount,
    bytesProcessed: result.meta.bytesProcessed,
    compileDurationMs: result.meta.compileDurationMs,
    executionDurationMs: result.meta.executionDurationMs,
    cacheStatus: result.meta.cacheStatus,
  });

  return withRequestContext(result, request, {
    budgetStatus: report.status,
  });
}

export function createSemanticRuntime(
  config: SemanticRuntimeConfig,
): SemanticRuntime {
  const inFlightDeduper =
    config.cache?.inFlightDeduper ??
    createInFlightRequestDeduper<SemanticQueryResult>();

  return {
    async getCatalogEntries(
      request: CatalogRequest,
    ): Promise<SemanticCatalogEntry[]> {
      if (!config.provider.getCatalogEntries) {
        throw new Error('Semantic provider does not support catalog access.');
      }

      return config.provider.getCatalogEntries(request);
    },

    async runQuery(
      request: SemanticQueryRequest,
    ): Promise<SemanticQueryResult> {
      const semanticVersion = config.cache?.semanticVersion;
      const cacheKey =
        semanticVersion == null
          ? undefined
          : buildPersistentSemanticCacheKey({
              request,
              semanticVersion,
            });

      if (cacheKey && config.cache?.resultCache) {
        const cachedResult = await config.cache.resultCache.get(cacheKey);
        if (cachedResult) {
          return applyBudgetState(
            withRequestContext(cachedResult, request, {
              bytesProcessed: 0,
              compileDurationMs: 0,
              executionDurationMs: 0,
              semanticVersion,
              cacheStatus: 'hit',
            }),
            request,
            config.budgetTracker,
          );
        }
      }

      const executeFreshQuery = async (): Promise<SemanticQueryResult> => {
        const compileStartedAt = performance.now();
        const compiled = await config.provider.compileQuery(request);
        const compileDurationMs = performance.now() - compileStartedAt;

        const executionStartedAt = performance.now();
        const execution = await config.executeQuery({ sql: compiled.sql });
        const executionDurationMs = performance.now() - executionStartedAt;

        const result: SemanticQueryResult = {
          rows: execution.rows.map((row) =>
            normalizeRow(row, compiled.aliases),
          ),
          meta: {
            source: 'lightdash',
            model: compiled.model,
            queryCount: 1,
            compiledSql: compiled.sql,
            compileDurationMs,
            executionDurationMs,
            bytesProcessed: execution.bytesProcessed,
            dashboardId: request.context?.dashboardId,
            surfaceId: request.context?.surfaceId,
            semanticVersion,
            cacheStatus: semanticVersion ? 'miss' : undefined,
          },
        };

        if (cacheKey && config.cache?.resultCache) {
          await config.cache.resultCache.set(cacheKey, result);
        }

        return result;
      };

      if (cacheKey) {
        const result = await inFlightDeduper.run(cacheKey, executeFreshQuery);
        return applyBudgetState(
          withRequestContext(result, request, {
            semanticVersion,
            cacheStatus: 'miss',
          }),
          request,
          config.budgetTracker,
        );
      }

      const compileStartedAt = performance.now();
      const compiled = await config.provider.compileQuery(request);
      const compileDurationMs = performance.now() - compileStartedAt;

      const executionStartedAt = performance.now();
      const execution = await config.executeQuery({ sql: compiled.sql });
      const executionDurationMs = performance.now() - executionStartedAt;

      return applyBudgetState(
        {
          rows: execution.rows.map((row) =>
            normalizeRow(row, compiled.aliases),
          ),
          meta: {
            source: 'lightdash',
            model: compiled.model,
            queryCount: 1,
            compiledSql: compiled.sql,
            compileDurationMs,
            executionDurationMs,
            bytesProcessed: execution.bytesProcessed,
            dashboardId: request.context?.dashboardId,
            surfaceId: request.context?.surfaceId,
            semanticVersion,
          },
        },
        request,
        config.budgetTracker,
      );
    },
  };
}
