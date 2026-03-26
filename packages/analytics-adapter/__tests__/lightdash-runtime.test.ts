import {
  BigQueryDate,
  BigQueryDatetime,
  BigQueryTime,
  BigQueryTimestamp,
} from '@google-cloud/bigquery';
import { describe, expect, it, vi, afterEach } from 'vitest';

import type {
  QueryExecutionResult,
  SemanticProvider,
  SemanticQueryRequest,
} from '../src';
import { createSemanticRuntime, createLightdashProvider } from '../src';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Lightdash semantic runtime', () => {
  it('compiles a semantic query into a Lightdash metricQuery payload and executes normalized rows', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: {
          query:
            'select 1 as sales_dashboard_v2_opportunity_base_bookings_amount',
        },
      }),
    });

    const provider = createLightdashProvider({
      baseUrl: 'https://lightdash.example.com',
      projectUuid: 'project-123',
      apiKey: 'secret',
      fetch: fetchMock,
    });

    const executeQuery = vi.fn(async () => ({
      rows: [
        {
          sales_dashboard_v2_opportunity_base_bookings_amount: 125000,
        },
      ],
      bytesProcessed: 4096,
    }));

    const runtime = createSemanticRuntime({ provider, executeQuery });
    const request: SemanticQueryRequest = {
      model: 'sales_dashboard_v2_opportunity_base',
      measures: ['bookings_amount'],
      filters: [
        {
          field: 'dashboard_category',
          operator: 'equals',
          values: ['New Logo'],
        },
        {
          field: 'close_date',
          operator: 'between',
          values: ['2026-01-01', '2026-03-31'],
        },
      ],
    };

    const result = await runtime.runQuery(request);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://lightdash.example.com/api/v1/projects/project-123/explores/sales_dashboard_v2_opportunity_base/compileQuery',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'ApiKey secret',
        }),
      }),
    );

    const compileBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(compileBody).toMatchObject({
      exploreName: 'sales_dashboard_v2_opportunity_base',
      metrics: ['sales_dashboard_v2_opportunity_base_bookings_amount'],
      dimensions: [],
      sorts: [],
      limit: 500,
      tableCalculations: [],
    });
    expect(compileBody.filters.dimensions.and).toEqual([
      {
        id: 'f0',
        target: {
          fieldId: 'sales_dashboard_v2_opportunity_base_dashboard_category',
        },
        operator: 'equals',
        values: ['New Logo'],
      },
      {
        id: 'f1',
        target: {
          fieldId: 'sales_dashboard_v2_opportunity_base_close_date',
        },
        operator: 'inBetween',
        values: ['2026-01-01', '2026-03-31'],
      },
    ]);

    expect(executeQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        sql: 'select 1 as sales_dashboard_v2_opportunity_base_bookings_amount',
      }),
    );
    expect(result.rows).toEqual([
      {
        bookings_amount: {
          raw: 125000,
          formatted: '125000',
        },
      },
    ]);
    expect(result.meta).toMatchObject({
      source: 'lightdash',
      queryCount: 1,
      bytesProcessed: 4096,
      compiledSql:
        'select 1 as sales_dashboard_v2_opportunity_base_bookings_amount',
    });
    expect(result.meta.compileDurationMs).toBeGreaterThanOrEqual(0);
    expect(result.meta.executionDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('supports dimension-only semantic queries for filter dictionaries', async () => {
    const provider: SemanticProvider = {
      compileQuery: vi.fn(async () => ({
        sql: 'select distinct division from demo',
        aliases: {
          sales_dashboard_v2_opportunity_base_division: 'division',
        },
        model: 'sales_dashboard_v2_opportunity_base',
      })),
    };
    const executeQuery = vi.fn(async () => ({
      rows: [
        { sales_dashboard_v2_opportunity_base_division: 'Enterprise' },
        { sales_dashboard_v2_opportunity_base_division: 'SMB' },
      ],
    })) as unknown as (query: { sql: string }) => Promise<QueryExecutionResult>;
    const runtime = createSemanticRuntime({ provider, executeQuery });

    const result = await runtime.runQuery({
      model: 'sales_dashboard_v2_opportunity_base',
      dimensions: ['division'],
      sorts: [{ field: 'division', descending: false }],
      limit: 500,
    });

    expect(result.rows).toEqual([
      { division: { raw: 'Enterprise', formatted: 'Enterprise' } },
      { division: { raw: 'SMB', formatted: 'SMB' } },
    ]);
  });

  it('normalizes BigQuery temporal wrapper values into strings', async () => {
    const provider: SemanticProvider = {
      compileQuery: vi.fn(async () => ({
        sql: 'select close_date, close_datetime, close_time, close_timestamp from demo',
        aliases: {
          sales_dashboard_v2_closed_won_close_date: 'close_date',
          sales_dashboard_v2_closed_won_close_datetime: 'close_datetime',
          sales_dashboard_v2_closed_won_close_time: 'close_time',
          sales_dashboard_v2_closed_won_close_timestamp: 'close_timestamp',
        },
        model: 'sales_dashboard_v2_closed_won',
      })),
    };
    const executeQuery = vi.fn(async () => ({
      rows: [
        {
          sales_dashboard_v2_closed_won_close_date: new BigQueryDate(
            '2026-03-01',
          ),
          sales_dashboard_v2_closed_won_close_datetime: new BigQueryDatetime(
            '2026-03-01T05:06:07',
          ),
          sales_dashboard_v2_closed_won_close_time: new BigQueryTime(
            '05:06:07',
          ),
          sales_dashboard_v2_closed_won_close_timestamp: new BigQueryTimestamp(
            '2026-03-01T05:06:07.000Z',
          ),
        },
      ],
    })) as unknown as (query: { sql: string }) => Promise<QueryExecutionResult>;

    const runtime = createSemanticRuntime({ provider, executeQuery });

    const result = await runtime.runQuery({
      model: 'sales_dashboard_v2_closed_won',
      dimensions: [
        'close_date',
        'close_datetime',
        'close_time',
        'close_timestamp',
      ],
    });

    expect(result.rows).toEqual([
      {
        close_date: { raw: '2026-03-01', formatted: '2026-03-01' },
        close_datetime: {
          raw: '2026-03-01T05:06:07',
          formatted: '2026-03-01T05:06:07',
        },
        close_time: { raw: '05:06:07', formatted: '05:06:07' },
        close_timestamp: {
          raw: '2026-03-01T05:06:07.000Z',
          formatted: '2026-03-01T05:06:07.000Z',
        },
      },
    ]);
  });
});
