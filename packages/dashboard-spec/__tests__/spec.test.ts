import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  type RendererRegistry,
  type VisualizationRenderer,
  getVisualizationRendererKey,
  normalizeTileSpec,
  validateTileSpec,
  type ChartTileSpec,
  type CompositeTileSpec,
  type MetricTileSpec,
  type TableTileSpec,
} from '../src';

describe('tile spec contracts', () => {
  it('validates a metric tile spec', () => {
    const spec: MetricTileSpec = {
      id: 'bookings_total',
      kind: 'metric',
      title: 'Bookings $',
      description: 'Booked revenue total for the selected period.',
      data: { kind: 'binding', key: 'bookingsTotal' },
      visualization: {
        type: 'metric',
        valueField: 'value',
      },
    };
    const result = validateTileSpec(spec);

    expect(result).toEqual({ ok: true });
  });

  it('validates a table tile spec', () => {
    const spec: TableTileSpec = {
      id: 'top_accounts',
      kind: 'table',
      title: 'Top Accounts',
      description: 'Accounts ranked by bookings.',
      data: { kind: 'binding', key: 'topAccounts' },
      visualization: {
        type: 'table',
        columns: [
          { field: 'accountName', label: 'Account' },
          { field: 'bookingsAmount', label: 'Bookings $' },
        ],
      },
    };
    const result = validateTileSpec(spec);

    expect(result).toEqual({ ok: true });
  });

  it('validates a line comparison chart spec', () => {
    const spec: ChartTileSpec = {
      id: 'bookings_trend',
      kind: 'chart',
      title: 'Bookings $',
      description: 'Current period versus previous year trend.',
      data: { kind: 'binding', key: 'bookingsTrend' },
      visualization: {
        type: 'line-comparison',
        xField: 'bucketLabel',
        series: [
          { field: 'currentValue', label: 'Current period' },
          { field: 'previousValue', label: 'Previous year' },
        ],
      },
    };
    const result = validateTileSpec(spec);

    expect(result).toEqual({ ok: true });
  });

  it('validates a composite tile spec', () => {
    const spec: CompositeTileSpec = {
      id: 'main_metrics',
      kind: 'composite',
      title: 'Main Metrics',
      description: 'Primary KPIs with supporting trend context.',
      layout: { type: 'split', direction: 'horizontal' },
      children: [
        {
          id: 'bookings_total',
          kind: 'metric',
          title: 'Bookings $',
          description: 'Booked revenue total for the selected period.',
          data: { kind: 'binding', key: 'bookingsTotal' },
          visualization: {
            type: 'metric',
            valueField: 'value',
          },
        },
        {
          id: 'bookings_trend',
          kind: 'chart',
          title: 'Bookings Trend',
          description: 'Current period versus prior year.',
          data: { kind: 'binding', key: 'bookingsTrend' },
          visualization: {
            type: 'line-comparison',
            xField: 'bucketLabel',
            series: [{ field: 'currentValue', label: 'Current period' }],
          },
        },
      ],
    };
    const result = validateTileSpec(spec);

    expect(result).toEqual({ ok: true });
  });

  it('rejects a composite tile spec with missing children', () => {
    const result = validateTileSpec({
      id: 'main_metrics',
      kind: 'composite',
      title: 'Main Metrics',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('children must contain at least one tile for composite tiles');
    }
  });

  it('rejects a chart tile spec without visualization.type', () => {
    const result = validateTileSpec({
      id: 'bookings_trend',
      kind: 'chart',
      title: 'Bookings $',
      data: { kind: 'binding', key: 'bookingsTrend' },
      visualization: {
        xField: 'bucketLabel',
        series: [{ field: 'currentValue', label: 'Current period' }],
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('visualization.type is required for chart tiles');
    }
  });

  it('rejects a metric tile spec with a non-string comparisonField', () => {
    const result = validateTileSpec({
      id: 'bookings_total',
      kind: 'metric',
      title: 'Bookings $',
      data: { kind: 'binding', key: 'bookingsTotal' },
      visualization: {
        type: 'metric',
        valueField: 'value',
        comparisonField: 42,
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('tile.visualization.comparisonField must be a non-empty string');
    }
  });

  it('normalizes safe default layout and interactions', () => {
    const normalized = normalizeTileSpec({
      id: 'bookings_total',
      kind: 'metric',
      title: 'Bookings $',
      description: 'Booked revenue total for the selected period.',
      data: { kind: 'binding', key: 'bookingsTotal' },
      visualization: {
        type: 'metric',
        valueField: 'value',
      },
    });

    expect(normalized.layout).toEqual({
      colSpan: 1,
      minHeight: 240,
    });
    expect(normalized.interactions).toEqual({
      allowInspect: false,
      allowDownload: false,
    });
  });

  it('builds visualization renderer keys from visualization contracts', () => {
    expect(
      getVisualizationRendererKey({
        id: 'bookings_total',
        kind: 'metric',
        title: 'Bookings $',
        description: 'Booked revenue total for the selected period.',
        data: { kind: 'binding', key: 'bookingsTotal' },
        visualization: {
          type: 'metric',
          valueField: 'value',
        },
      }),
    ).toBe('metric.headline');

    expect(
      getVisualizationRendererKey({
        id: 'top_accounts',
        kind: 'table',
        title: 'Top Accounts',
        description: 'Accounts ranked by bookings.',
        data: { kind: 'binding', key: 'topAccounts' },
        visualization: {
          type: 'table',
          columns: [{ field: 'accountName', label: 'Account' }],
        },
      }),
    ).toBe('table.standard');

    expect(
      getVisualizationRendererKey({
        id: 'bookings_trend',
        kind: 'chart',
        title: 'Bookings Trend',
        description: 'Current period versus prior year.',
        data: { kind: 'binding', key: 'bookingsTrend' },
        visualization: {
          type: 'line-comparison',
          xField: 'bucketLabel',
          series: [{ field: 'currentValue', label: 'Current period' }],
        },
      }),
    ).toBe('chart.line-comparison');
  });

  it('allows type-safe registration of specialized visualization renderers', () => {
    const metricRenderer: VisualizationRenderer<MetricTileSpec, string> = (spec) =>
      spec.visualization.valueField;
    const tableRenderer: VisualizationRenderer<TableTileSpec, number> = (spec) =>
      spec.visualization.columns.length;

    const metricRegistry: RendererRegistry<string> = {
      visualizations: {
        'metric.headline': metricRenderer,
      },
    };
    const tableRegistry: RendererRegistry<number> = {
      visualizations: {
        'table.standard': tableRenderer,
      },
    };

    expect(metricRegistry.visualizations['metric.headline']?.({
      id: 'bookings_total',
      kind: 'metric',
      title: 'Bookings $',
      description: 'Booked revenue total for the selected period.',
      data: { kind: 'binding', key: 'bookingsTotal' },
      visualization: {
        type: 'metric',
        valueField: 'value',
      },
    })).toBe('value');
    expect(tableRegistry.visualizations['table.standard']?.({
      id: 'top_accounts',
      kind: 'table',
      title: 'Top Accounts',
      description: 'Accounts ranked by bookings.',
      data: { kind: 'binding', key: 'topAccounts' },
      visualization: {
        type: 'table',
        columns: [{ field: 'accountName', label: 'Account' }],
      },
    })).toBe(1);

    expectTypeOf(metricRegistry.visualizations['metric.headline']).toEqualTypeOf<
      VisualizationRenderer<MetricTileSpec, string> | undefined
    >();
    expectTypeOf(tableRegistry.visualizations['table.standard']).toEqualTypeOf<
      VisualizationRenderer<TableTileSpec, number> | undefined
    >();
  });

  it('does not create visualization renderer keys for composite tiles', () => {
    const compositeSpec: CompositeTileSpec = {
      id: 'main_metrics',
      kind: 'composite',
      title: 'Main Metrics',
      description: 'Primary KPIs with supporting trend context.',
      children: [],
    };

    expect(() =>
      getVisualizationRendererKey(
        compositeSpec as unknown as Parameters<typeof getVisualizationRendererKey>[0],
      ),
    ).toThrow('Composite tiles do not have visualization renderer keys');
  });
});
