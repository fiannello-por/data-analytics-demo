import { describe, expect, it, vi } from 'vitest';
import { BigQueryAdapter } from '@/lib/data-adapters/bigquery-adapter';

describe('BigQueryAdapter', () => {
  it('does not eagerly import the runtime BigQuery client module', async () => {
    vi.resetModules();
    vi.doMock('@/lib/bigquery/client', () => {
      throw new Error('runtime client imported eagerly');
    });

    const module = await import('@/lib/data-adapters/bigquery-adapter');

    expect(module.BigQueryAdapter).toBeDefined();
  });

  it('groups rows into the canonical category order', async () => {
    const adapter = new BigQueryAdapter({
      queryRows: vi.fn().mockResolvedValue({
        rows: [
          {
            category: 'Total',
            sort_order: 90,
            metric_name: 'Pipeline',
            current_period: '$30.0K',
            previous_period: '$25.0K',
            pct_change: '+20.0%',
            report_date: '2026-03-20',
          },
          {
            category: 'Expansion',
            sort_order: 20,
            metric_name: 'Bookings',
            current_period: '$10.0K',
            previous_period: '$8.0K',
            pct_change: '+25.0%',
            report_date: '2026-03-20',
          },
        ],
        bytesProcessed: 1234,
      }),
    });

    const result = await adapter.getScorecardReport({});

    expect(result.data.appliedFilters).toEqual({ DateRange: ['current_year'] });
    expect(result.data.reportPeriodLabel).toBe('Current Year');
    expect(result.data.categories.map((category) => category.category)).toEqual([
      'New Logo',
      'Expansion',
      'Migration',
      'Renewal',
      'Total',
    ]);
    expect(result.data.categories[1]).toEqual({
      category: 'Expansion',
      rows: [
        {
          sortOrder: 20,
          metricName: 'Bookings',
          currentPeriod: '$10.0K',
          previousPeriod: '$8.0K',
          pctChange: '+25.0%',
        },
      ],
    });
    expect(result.data.categories[4]).toEqual({
      category: 'Total',
      rows: [
        {
          sortOrder: 90,
          metricName: 'Pipeline',
          currentPeriod: '$30.0K',
          previousPeriod: '$25.0K',
          pctChange: '+20.0%',
        },
      ],
    });
    expect(result.meta).toEqual({
      source: 'bigquery',
      queryCount: 1,
      bytesProcessed: 1234,
    });
  });

  it('rejects malformed scorecard rows', async () => {
    const adapter = new BigQueryAdapter({
      queryRows: vi.fn().mockResolvedValue({
        rows: [
          {
            category: 'Expansion',
            sort_order: 'not-a-number',
            metric_name: 'Bookings',
            current_period: '$10.0K',
            previous_period: '$8.0K',
            pct_change: '+25.0%',
          },
        ],
      }),
    });

    await expect(adapter.getScorecardReport({})).rejects.toThrowError(
      'Invalid scorecard row field "sort_order": expected a finite number.',
    );
  });

  it('rejects scorecard rows with unknown categories', async () => {
    const adapter = new BigQueryAdapter({
      queryRows: vi.fn().mockResolvedValue({
        rows: [
          {
            category: 'Upsell',
            sort_order: 20,
            metric_name: 'Bookings',
            current_period: '$10.0K',
            previous_period: '$8.0K',
            pct_change: '+25.0%',
          },
        ],
      }),
    });

    await expect(adapter.getScorecardReport({})).rejects.toThrowError(
      'Invalid scorecard row field "category": unexpected category "Upsell".',
    );
  });

  it('maps filter dictionary rows into sorted options', async () => {
    const adapter = new BigQueryAdapter({
      queryRows: vi.fn().mockResolvedValue({
        rows: [
          {
            value: 'rental',
            label: 'Rental',
            sort_order: 10,
          },
        ],
        bytesProcessed: 456,
      }),
    });

    const result = await adapter.getFilterDictionary('Division');

    expect(result.data.key).toBe('Division');
    expect(result.data.options).toEqual([
      {
        value: 'rental',
        label: 'Rental',
        sortOrder: 10,
      },
    ]);
    expect(result.meta).toEqual({
      source: 'bigquery',
      queryCount: 1,
      bytesProcessed: 456,
    });
  });

  it('rejects malformed filter dictionary rows', async () => {
    const adapter = new BigQueryAdapter({
      queryRows: vi.fn().mockResolvedValue({
        rows: [
          {
            value: 'rental',
            label: null,
            sort_order: 10,
          },
        ],
      }),
    });

    await expect(adapter.getFilterDictionary('Division')).rejects.toThrowError(
      'Invalid filter dictionary row field "label": expected a string.',
    );
  });
});
