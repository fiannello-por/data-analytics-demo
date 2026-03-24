import { describe, expect, it, vi } from 'vitest';

import {
  buildPersistentSemanticCacheKey,
  buildSemanticRequestSignature,
  createInFlightRequestDeduper,
} from '../src/cache';
import type { SemanticQueryRequest } from '../src/types';

describe('semantic cache primitives', () => {
  it('builds a stable semantic request signature for equivalent requests', () => {
    const left: SemanticQueryRequest = {
      model: 'sales_dashboard_v2_opportunity_base',
      measures: ['bookings_amount'],
      dimensions: ['close_date_week'],
      filters: [
        {
          field: 'division',
          operator: 'equals',
          values: ['Enterprise'],
        },
      ],
      context: {
        dashboardId: 'sales-performance',
        surfaceId: 'overview-board',
      },
    };

    const right: SemanticQueryRequest = {
      model: 'sales_dashboard_v2_opportunity_base',
      measures: ['bookings_amount'],
      dimensions: ['close_date_week'],
      filters: [
        {
          operator: 'equals',
          field: 'division',
          values: ['Enterprise'],
        },
      ],
      context: {
        surfaceId: 'overview-board',
        dashboardId: 'sales-performance',
      },
    };

    expect(buildSemanticRequestSignature(left)).toBe(
      buildSemanticRequestSignature(right),
    );
  });

  it('includes dashboard namespace and semantic version in persistent cache keys', () => {
    const request: SemanticQueryRequest = {
      model: 'sales_dashboard_v2_opportunity_base',
      measures: ['bookings_amount'],
      context: {
        dashboardId: 'sales-performance',
      },
    };

    const baseKey = buildPersistentSemanticCacheKey({
      request,
      semanticVersion: 'sha-1',
    });
    const otherDashboardKey = buildPersistentSemanticCacheKey({
      request: {
        ...request,
        context: { dashboardId: 'pipeline-health' },
      },
      semanticVersion: 'sha-1',
    });
    const otherVersionKey = buildPersistentSemanticCacheKey({
      request,
      semanticVersion: 'sha-2',
    });

    expect(baseKey).not.toBe(otherDashboardKey);
    expect(baseKey).not.toBe(otherVersionKey);
    expect(baseKey).toContain('sales-performance');
    expect(baseKey).toContain('sha-1');
  });

  it('dedupes identical in-flight requests', async () => {
    const deduper = createInFlightRequestDeduper<string>();
    const factory = vi.fn(
      async () =>
        await new Promise<string>((resolve) => {
          setTimeout(() => resolve('compiled'), 5);
        }),
    );

    const [first, second] = await Promise.all([
      deduper.run('sales-performance::same', factory),
      deduper.run('sales-performance::same', factory),
    ]);

    expect(first).toBe('compiled');
    expect(second).toBe('compiled');
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('does not dedupe materially different request signatures', async () => {
    const deduper = createInFlightRequestDeduper<string>();
    const factory = vi.fn(async (value: string) => value);

    const [first, second] = await Promise.all([
      deduper.run('sales-performance::one', () => factory('one')),
      deduper.run('sales-performance::two', () => factory('two')),
    ]);

    expect(first).toBe('one');
    expect(second).toBe('two');
    expect(factory).toHaveBeenCalledTimes(2);
  });
});
