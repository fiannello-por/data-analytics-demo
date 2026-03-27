import type { SemanticQueryRequest, SemanticQueryResult } from './types';

export type SemanticResultCache = {
  get(
    key: string,
  ): Promise<SemanticQueryResult | undefined> | SemanticQueryResult | undefined;
  set(key: string, value: SemanticQueryResult): Promise<void> | void;
};

export type InFlightRequestDeduper<T> = {
  run(key: string, factory: () => Promise<T>): Promise<T>;
};

type PersistentCacheKeyInput = {
  request: SemanticQueryRequest;
  semanticVersion: string;
};

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((normalized, key) => {
        normalized[key] = normalizeValue(
          (value as Record<string, unknown>)[key],
        );
        return normalized;
      }, {});
  }

  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeValue(value));
}

export function buildSemanticRequestSignature(
  request: SemanticQueryRequest,
): string {
  return stableStringify({
    model: request.model,
    measures: request.measures ?? [],
    dimensions: request.dimensions ?? [],
    filters: request.filters ?? [],
    sorts: request.sorts ?? [],
    limit: request.limit ?? null,
  });
}

export function buildPersistentSemanticCacheKey(
  input: PersistentCacheKeyInput,
): string {
  const dashboardNamespace = input.request.context?.dashboardId ?? 'global';
  const signature = buildSemanticRequestSignature(input.request);

  return [
    'semantic-cache',
    dashboardNamespace,
    input.semanticVersion,
    signature,
  ].join('::');
}

export function createMemorySemanticResultCache(): SemanticResultCache {
  const entries = new Map<string, SemanticQueryResult>();

  return {
    get(key) {
      return entries.get(key);
    },

    set(key, value) {
      entries.set(key, value);
    },
  };
}

export function createInFlightRequestDeduper<T>(): InFlightRequestDeduper<T> {
  const inFlight = new Map<string, Promise<T>>();

  return {
    async run(key, factory) {
      const existing = inFlight.get(key);
      if (existing) {
        return existing;
      }

      const promise = factory().finally(() => {
        inFlight.delete(key);
      });

      inFlight.set(key, promise);
      return promise;
    },
  };
}
