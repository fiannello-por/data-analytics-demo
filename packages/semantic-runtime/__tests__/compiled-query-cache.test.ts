import { describe, expect, it, vi } from 'vitest';

import type { SemanticProvider } from '../src';
import { createSemanticRuntime } from '../src';

describe('compiled query cache', () => {
  it('reuses compiled SQL across identical requests even when dashboard namespaces differ', async () => {
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
      },
    });

    await runtime.runQuery({
      model: 'sales_dashboard_v2_opportunity_base',
      measures: ['bookings_amount'],
      context: {
        dashboardId: 'sales-performance',
      },
    });
    const second = await runtime.runQuery({
      model: 'sales_dashboard_v2_opportunity_base',
      measures: ['bookings_amount'],
      context: {
        dashboardId: 'pipeline-health',
      },
    });

    expect(provider.compileQuery).toHaveBeenCalledTimes(1);
    expect(executeQuery).toHaveBeenCalledTimes(2);
    expect(second.meta.compileDurationMs).toBe(0);
    expect(second.meta.executionDurationMs).toBeGreaterThanOrEqual(0);
  });
});
