import type { TelemetrySpan } from './types';

let nextId = 0;
function generateId(): string {
  return `span_${++nextId}`;
}

type OpenSpan = {
  id: string;
  name: string;
  parentId?: string;
  startMs: number;
  metadata?: Record<string, unknown>;
};

export class SpanCollector {
  private open = new Map<string, OpenSpan>();
  private closed: TelemetrySpan[] = [];
  private baseTime = performance.now();
  private activeParentId: string | undefined;

  startSpan(
    name: string,
    parentId?: string,
    metadata?: Record<string, unknown>,
  ): string {
    const id = generateId();
    this.open.set(id, {
      id,
      name,
      parentId: parentId ?? this.activeParentId,
      startMs: performance.now() - this.baseTime,
      metadata,
    });
    return id;
  }

  setActiveParent(parentId: string | undefined): void {
    this.activeParentId = parentId;
  }

  endSpan(id: string): void {
    const span = this.open.get(id);
    if (!span) return;
    this.open.delete(id);
    this.closed.push({
      id: span.id,
      name: span.name,
      parentId: span.parentId,
      startMs: span.startMs,
      durationMs: performance.now() - this.baseTime - span.startMs,
      metadata: span.metadata,
    });
  }

  setMetadata(id: string, metadata: Record<string, unknown>): void {
    const span = this.open.get(id);
    if (span) {
      span.metadata = { ...span.metadata, ...metadata };
    }
  }

  getSpans(): TelemetrySpan[] {
    return [...this.closed];
  }

  aggregateServerMetrics(): {
    ssrDataFetchMs: number;
    totalCompileMs: number;
    totalExecuteMs: number;
    totalQueryCount: number;
    totalBytesProcessed: number;
    filterDictionaryMs: number;
    semanticCacheHits: number;
    semanticCacheMisses: number;
  } {
    let totalCompileMs = 0;
    let totalExecuteMs = 0;
    let totalQueryCount = 0;
    let totalBytesProcessed = 0;
    let filterDictionaryMs = 0;
    let ssrDataFetchMs = 0;
    let semanticCacheHits = 0;
    let semanticCacheMisses = 0;

    for (const span of this.closed) {
      if (span.name === 'lightdash_compile') {
        totalCompileMs += span.durationMs;
      }
      if (
        span.name === 'bigquery_execute' ||
        span.name === 'lightdash_execute'
      ) {
        totalExecuteMs += span.durationMs;
        totalQueryCount += 1;
        totalBytesProcessed += Number(span.metadata?.bytesProcessed ?? 0);
      }
      if (span.name === 'filter_dictionaries') {
        filterDictionaryMs += span.durationMs;
      }
      if (span.name === 'ssr_data_fetch') {
        ssrDataFetchMs += span.durationMs;
      }
      if (span.name === 'semantic_cache_lookup') {
        if (span.metadata?.hit) {
          semanticCacheHits += 1;
        } else {
          semanticCacheMisses += 1;
        }
      }
    }

    return {
      ssrDataFetchMs,
      totalCompileMs,
      totalExecuteMs,
      totalQueryCount,
      totalBytesProcessed,
      filterDictionaryMs,
      semanticCacheHits,
      semanticCacheMisses,
    };
  }

  reset(): void {
    this.open.clear();
    this.closed = [];
    this.baseTime = performance.now();
    this.activeParentId = undefined;
    nextId = 0;
  }
}