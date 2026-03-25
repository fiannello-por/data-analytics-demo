import { describe, expect, it, vi } from 'vitest';

import {
  createMemorySemanticResultCache,
  createSemanticRuntime,
  type SemanticProvider,
} from '@por/analytics-adapter';

describe('suite cache behavior', () => {
  it('separates persistent cache entries by dashboard namespace', async () => {
    const provider: SemanticProvider = {
      compileQuery: vi.fn(async () => ({
        model: 'sales_dashboard_v2_opportunity_base',
        sql: 'select 1 as sales_dashboard_v2_opportunity_base_bookings_amount',
        aliases: {
          sales_dashboard_v2_opportunity_base_bookings_amount:
            'bookings_amount',
        },
      })),
    };
    const executeQuery = vi.fn(async () => ({
      rows: [{ sales_dashboard_v2_opportunity_base_bookings_amount: 10 }],
      bytesProcessed: 512,
    }));

    const runtime = createSemanticRuntime({
      provider,
      executeQuery,
      cache: {
        semanticVersion: 'ld-sha-1',
        resultCache: createMemorySemanticResultCache(),
      },
    });

    await runtime.runQuery({
      model: 'sales_dashboard_v2_opportunity_base',
      measures: ['bookings_amount'],
      context: {
        dashboardId: 'sales-performance',
      },
    });
    await runtime.runQuery({
      model: 'sales_dashboard_v2_opportunity_base',
      measures: ['bookings_amount'],
      context: {
        dashboardId: 'pipeline-health',
      },
    });

    expect(provider.compileQuery).toHaveBeenCalledTimes(2);
    expect(executeQuery).toHaveBeenCalledTimes(2);
  });

  it('invalidates persistent cache entries when the semantic version changes', async () => {
    const provider: SemanticProvider = {
      compileQuery: vi.fn(async () => ({
        model: 'sales_dashboard_v2_opportunity_base',
        sql: 'select 1 as sales_dashboard_v2_opportunity_base_bookings_amount',
        aliases: {
          sales_dashboard_v2_opportunity_base_bookings_amount:
            'bookings_amount',
        },
      })),
    };
    const executeQuery = vi.fn(async () => ({
      rows: [{ sales_dashboard_v2_opportunity_base_bookings_amount: 10 }],
      bytesProcessed: 512,
    }));
    const sharedCache = createMemorySemanticResultCache();

    const runtimeV1 = createSemanticRuntime({
      provider,
      executeQuery,
      cache: {
        semanticVersion: 'ld-sha-1',
        resultCache: sharedCache,
      },
    });
    const runtimeV2 = createSemanticRuntime({
      provider,
      executeQuery,
      cache: {
        semanticVersion: 'ld-sha-2',
        resultCache: sharedCache,
      },
    });

    const request = {
      model: 'sales_dashboard_v2_opportunity_base',
      measures: ['bookings_amount'],
      context: {
        dashboardId: 'sales-performance',
      },
    };

    const first = await runtimeV1.runQuery(request);
    const second = await runtimeV1.runQuery(request);
    const third = await runtimeV2.runQuery(request);

    expect(first.meta.cacheStatus).toBe('miss');
    expect(second.meta.cacheStatus).toBe('hit');
    expect(third.meta.cacheStatus).toBe('miss');
    expect(provider.compileQuery).toHaveBeenCalledTimes(2);
    expect(executeQuery).toHaveBeenCalledTimes(2);
  });
});
