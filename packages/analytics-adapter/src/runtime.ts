import {
  type SemanticFieldValue,
  type SemanticProvider,
  type SemanticQueryExecutor,
  type SemanticQueryRequest,
  type SemanticQueryResult,
} from './types';

export type SemanticRuntime = {
  runQuery(request: SemanticQueryRequest): Promise<SemanticQueryResult>;
};

export type SemanticRuntimeConfig = {
  provider: SemanticProvider;
  executeQuery: SemanticQueryExecutor;
};

function formatValue(value: unknown): string {
  if (value == null) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function normalizeRow(
  row: Record<string, unknown>,
  aliases: Record<string, string>,
): Record<string, SemanticFieldValue> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      aliases[key] ?? key,
      {
        raw: value ?? null,
        formatted: formatValue(value),
      } satisfies SemanticFieldValue,
    ]),
  );
}

export function createSemanticRuntime(
  config: SemanticRuntimeConfig,
): SemanticRuntime {
  return {
    async runQuery(request: SemanticQueryRequest): Promise<SemanticQueryResult> {
      const compileStartedAt = performance.now();
      const compiled = await config.provider.compileQuery(request);
      const compileDurationMs = performance.now() - compileStartedAt;

      const executionStartedAt = performance.now();
      const execution = await config.executeQuery({ sql: compiled.sql });
      const executionDurationMs = performance.now() - executionStartedAt;

      return {
        rows: execution.rows.map((row) => normalizeRow(row, compiled.aliases)),
        meta: {
          source: 'lightdash',
          model: compiled.model,
          queryCount: 1,
          compiledSql: compiled.sql,
          compileDurationMs,
          executionDurationMs,
          bytesProcessed: execution.bytesProcessed,
        },
      };
    },
  };
}
