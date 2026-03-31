import {
  type CatalogRequest,
  type CompiledSemanticQuery,
  type SemanticCatalogEntry,
  type SemanticFilter,
  type SemanticProvider,
  type SemanticQueryRequest,
  type SemanticSort,
} from './types';

type FetchLike = typeof fetch;

export type LightdashProviderConfig = {
  baseUrl: string;
  projectUuid: string;
  apiKey: string;
  fetch?: FetchLike;
  compileTimeoutMs?: number;
  slowCompileThresholdMs?: number;
  logger?: Pick<Console, 'warn' | 'error'>;
};

type LightdashFilterRule = {
  id: string;
  target: { fieldId: string };
  operator: string;
  values?: Array<string | number | boolean | null>;
};

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, '');
}

function buildFieldId(model: string, field: string): string {
  return `${model}_${field}`;
}

function toHeaders(apiKey: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `ApiKey ${apiKey}`,
  };
}

function filterToLightdashRule(
  model: string,
  filter: SemanticFilter,
  index: number,
): LightdashFilterRule {
  const operator =
    filter.operator === 'between' ? 'inBetween' : filter.operator;

  return {
    id: `f${index}`,
    target: { fieldId: buildFieldId(model, filter.field) },
    operator,
    values: filter.values,
  };
}

function sortToLightdashSort(model: string, sort: SemanticSort) {
  return {
    fieldId: buildFieldId(model, sort.field),
    descending: sort.descending,
  };
}

function summarizeRequest(request: SemanticQueryRequest) {
  return {
    model: request.model,
    measureCount: request.measures?.length ?? 0,
    dimensionCount: request.dimensions?.length ?? 0,
    filterCount: request.filters?.length ?? 0,
    sortCount: request.sorts?.length ?? 0,
    limit: request.limit ?? 500,
  };
}

function normalizeCompiledQueryPayload(data: unknown): string {
  if (
    typeof data === 'object' &&
    data !== null &&
    'results' in data &&
    typeof (data as { results?: { query?: unknown; sql?: unknown } })
      .results === 'object'
  ) {
    const results = (data as { results: { query?: unknown; sql?: unknown } })
      .results;
    if (typeof results.query === 'string') {
      return results.query;
    }
    if (typeof results.sql === 'string') {
      return results.sql;
    }
  }

  throw new Error(
    'Lightdash compileQuery response did not include compiled SQL.',
  );
}

function normalizeCatalogPayload(
  data: unknown,
  request: CatalogRequest,
): SemanticCatalogEntry[] {
  const fields =
    typeof data === 'object' &&
    data !== null &&
    'results' in data &&
    typeof (data as { results?: { fields?: unknown } }).results === 'object'
      ? (data as { results: { fields?: unknown } }).results.fields
      : undefined;

  if (!Array.isArray(fields)) {
    throw new Error('Lightdash catalog response did not include fields.');
  }

  return fields
    .map((field) => {
      if (
        typeof field !== 'object' ||
        field === null ||
        typeof (field as { name?: unknown }).name !== 'string' ||
        typeof (field as { label?: unknown }).label !== 'string' ||
        typeof (field as { fieldType?: unknown }).fieldType !== 'string'
      ) {
        return null;
      }

      const fieldType = (field as { fieldType: string }).fieldType;
      if (fieldType !== 'metric' && fieldType !== 'dimension') {
        return null;
      }

      return {
        model: request.model,
        field: (field as { name: string }).name,
        label: (field as { label: string }).label,
        fieldType,
        description:
          typeof (field as { description?: unknown }).description === 'string'
            ? (field as { description: string }).description
            : undefined,
      } satisfies SemanticCatalogEntry;
    })
    .filter(Boolean) as SemanticCatalogEntry[];
}

export function createLightdashProvider(
  config: LightdashProviderConfig,
): SemanticProvider {
  const fetchImpl = config.fetch ?? fetch;
  const baseUrl = trimTrailingSlash(config.baseUrl);
  const headers = toHeaders(config.apiKey);
  const compileTimeoutMs = config.compileTimeoutMs ?? 10_000;
  const slowCompileThresholdMs = config.slowCompileThresholdMs ?? 750;
  const logger = config.logger ?? console;

  return {
    async compileQuery(
      request: SemanticQueryRequest,
    ): Promise<CompiledSemanticQuery> {
      const measures = (request.measures ?? []).map((field) =>
        buildFieldId(request.model, field),
      );
      const dimensions = (request.dimensions ?? []).map((field) =>
        buildFieldId(request.model, field),
      );
      const sorts = (request.sorts ?? []).map((sort) =>
        sortToLightdashSort(request.model, sort),
      );
      const aliases = Object.fromEntries([
        ...measures.map((fieldId, index) => [
          fieldId,
          request.measures?.[index] ?? fieldId,
        ]),
        ...dimensions.map((fieldId, index) => [
          fieldId,
          request.dimensions?.[index] ?? fieldId,
        ]),
      ]);

      const filters = {
        dimensions: {
          id: 'root',
          and: (request.filters ?? []).map((filter, index) =>
            filterToLightdashRule(request.model, filter, index),
          ),
        },
      };

      const compileUrl = `${baseUrl}/api/v1/projects/${config.projectUuid}/explores/${request.model}/compileQuery`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, compileTimeoutMs);
      const startedAt = performance.now();

      let response: Response;
      try {
        response = await fetchImpl(compileUrl, {
          method: 'POST',
          headers,
          signal: controller.signal,
          body: JSON.stringify({
            exploreName: request.model,
            metrics: measures,
            dimensions,
            filters,
            sorts,
            limit: request.limit ?? 500,
            tableCalculations: [],
          }),
        });
      } catch (error) {
        const durationMs = performance.now() - startedAt;
        const event =
          controller.signal.aborted ||
          (error instanceof Error && error.name === 'AbortError')
            ? 'lightdash_compile_timeout'
            : 'lightdash_compile_failed';

        logger.error(
          JSON.stringify({
            event,
            durationMs,
            compileTimeoutMs,
            projectUuid: config.projectUuid,
            ...summarizeRequest(request),
            error: error instanceof Error ? error.message : String(error),
          }),
        );

        if (event === 'lightdash_compile_timeout') {
          throw new Error(
            `Lightdash compileQuery timed out after ${compileTimeoutMs}ms.`,
          );
        }

        throw error;
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        logger.error(
          JSON.stringify({
            event: 'lightdash_compile_failed',
            durationMs: performance.now() - startedAt,
            compileTimeoutMs,
            projectUuid: config.projectUuid,
            status: response.status,
            ...summarizeRequest(request),
          }),
        );
        throw new Error(
          `Lightdash compileQuery failed with status ${response.status}.`,
        );
      }

      const sql = normalizeCompiledQueryPayload(await response.json());
      const durationMs = performance.now() - startedAt;

      if (durationMs >= slowCompileThresholdMs) {
        logger.warn(
          JSON.stringify({
            event: 'lightdash_compile_slow',
            durationMs,
            slowCompileThresholdMs,
            projectUuid: config.projectUuid,
            ...summarizeRequest(request),
          }),
        );
      }

      return {
        model: request.model,
        sql,
        aliases,
      };
    },

    async getCatalogEntries(
      request: CatalogRequest,
    ): Promise<SemanticCatalogEntry[]> {
      const response = await fetchImpl(
        `${baseUrl}/api/v1/projects/${config.projectUuid}/dataCatalog/${request.model}/metadata`,
        {
          method: 'GET',
          headers,
        },
      );

      if (!response.ok) {
        throw new Error(
          `Lightdash data catalog lookup failed with status ${response.status}.`,
        );
      }

      return normalizeCatalogPayload(await response.json(), request);
    },
  };
}
