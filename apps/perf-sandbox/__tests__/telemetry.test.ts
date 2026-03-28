import { describe, expect, it } from 'vitest';
import { SpanCollector } from '@/lib/telemetry';

describe('SpanCollector', () => {
  it('creates a root span with timing', () => {
    const collector = new SpanCollector();
    const spanId = collector.startSpan('page_request');
    collector.endSpan(spanId);
    const spans = collector.getSpans();

    expect(spans).toHaveLength(1);
    expect(spans[0].name).toBe('page_request');
    expect(spans[0].durationMs).toBeGreaterThanOrEqual(0);
    expect(spans[0].parentId).toBeUndefined();
  });

  it('creates nested child spans', () => {
    const collector = new SpanCollector();
    const parentId = collector.startSpan('ssr_data_fetch');
    const childId = collector.startSpan('lightdash_compile', parentId);
    collector.endSpan(childId);
    collector.endSpan(parentId);
    const spans = collector.getSpans();

    expect(spans).toHaveLength(2);
    const child = spans.find((s) => s.name === 'lightdash_compile');
    expect(child?.parentId).toBe(parentId);
  });

  it('attaches metadata to spans', () => {
    const collector = new SpanCollector();
    const spanId = collector.startSpan('bigquery_execute');
    collector.setMetadata(spanId, { bytesProcessed: 1024, cacheHit: false });
    collector.endSpan(spanId);
    const spans = collector.getSpans();

    expect(spans[0].metadata).toEqual({
      bytesProcessed: 1024,
      cacheHit: false,
    });
  });

  it('computes aggregate metrics from spans', () => {
    const collector = new SpanCollector();

    const rootId = collector.startSpan('ssr_data_fetch');

    const c1 = collector.startSpan('lightdash_compile', rootId);
    collector.endSpan(c1);
    const e1 = collector.startSpan('bigquery_execute', rootId, {
      bytesProcessed: 500,
    });
    collector.endSpan(e1);

    const c2 = collector.startSpan('lightdash_compile', rootId);
    collector.endSpan(c2);
    const e2 = collector.startSpan('bigquery_execute', rootId, {
      bytesProcessed: 300,
    });
    collector.endSpan(e2);

    collector.endSpan(rootId);

    const agg = collector.aggregateServerMetrics();
    expect(agg.totalCompileMs).toBeGreaterThanOrEqual(0);
    expect(agg.totalExecuteMs).toBeGreaterThanOrEqual(0);
    expect(agg.totalQueryCount).toBe(2);
    expect(agg.totalBytesProcessed).toBe(800);
  });

  it('inherits activeParent when no explicit parentId given', () => {
    const collector = new SpanCollector();
    const querySpan = collector.startSpan('query_current');
    collector.setActiveParent(querySpan);
    const compileSpan = collector.startSpan('lightdash_compile');
    collector.endSpan(compileSpan);
    const executeSpan = collector.startSpan('bigquery_execute');
    collector.endSpan(executeSpan);
    collector.setActiveParent(undefined);
    collector.endSpan(querySpan);

    const spans = collector.getSpans();
    const compile = spans.find((s) => s.name === 'lightdash_compile');
    const execute = spans.find((s) => s.name === 'bigquery_execute');
    expect(compile?.parentId).toBe(querySpan);
    expect(execute?.parentId).toBe(querySpan);
  });

  it('explicit parentId overrides activeParent', () => {
    const collector = new SpanCollector();
    const parent1 = collector.startSpan('parent1');
    const parent2 = collector.startSpan('parent2');
    collector.setActiveParent(parent1);
    const child = collector.startSpan('child', parent2);
    collector.endSpan(child);
    collector.setActiveParent(undefined);
    collector.endSpan(parent1);
    collector.endSpan(parent2);

    const spans = collector.getSpans();
    const childSpan = spans.find((s) => s.name === 'child');
    expect(childSpan?.parentId).toBe(parent2);
  });

  it('resets for a new run', () => {
    const collector = new SpanCollector();
    const id = collector.startSpan('test');
    collector.endSpan(id);
    expect(collector.getSpans()).toHaveLength(1);

    collector.reset();
    expect(collector.getSpans()).toHaveLength(0);
  });
});