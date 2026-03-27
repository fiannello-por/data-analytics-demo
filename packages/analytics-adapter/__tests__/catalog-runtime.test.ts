import { describe, expect, it, vi } from 'vitest';

import type { QueryExecutionResult, SemanticProvider } from '../src';
import { createSemanticRuntime } from '../src';

describe('semantic runtime catalog and dashboard metadata', () => {
  it('exposes semantic catalog access through the shared runtime', async () => {
    const provider: SemanticProvider = {
      compileQuery: vi.fn(),
      getCatalogEntries: vi.fn(async () => [
        {
          model: 'sales_dashboard_v2_opportunity_base',
          field: 'bookings_amount',
          label: 'Bookings $',
          fieldType: 'metric' as const,
          description: 'Booked ACV.',
        },
      ]),
    };
    const runtime = createSemanticRuntime({
      provider,
      executeQuery: vi.fn(),
    });

    const catalog = await runtime.getCatalogEntries({
      model: 'sales_dashboard_v2_opportunity_base',
    });

    expect(provider.getCatalogEntries).toHaveBeenCalledWith({
      model: 'sales_dashboard_v2_opportunity_base',
    });
    expect(catalog).toEqual([
      {
        model: 'sales_dashboard_v2_opportunity_base',
        field: 'bookings_amount',
        label: 'Bookings $',
        fieldType: 'metric',
        description: 'Booked ACV.',
      },
    ]);
  });

  it('retains dashboard and surface identity in execution metadata', async () => {
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
    const runtime = createSemanticRuntime({
      provider,
      executeQuery: vi.fn(async () => ({
        rows: [
          {
            sales_dashboard_v2_opportunity_base_bookings_amount: 42,
          },
        ],
        bytesProcessed: 2048,
      })) as unknown as (query: {
        sql: string;
      }) => Promise<QueryExecutionResult>,
    });

    const result = await runtime.runQuery({
      model: 'sales_dashboard_v2_opportunity_base',
      measures: ['bookings_amount'],
      context: {
        dashboardId: 'sales-performance',
        surfaceId: 'overview-board',
      },
    });

    expect(result.meta).toMatchObject({
      dashboardId: 'sales-performance',
      surfaceId: 'overview-board',
      bytesProcessed: 2048,
      queryCount: 1,
    });
  });
});
