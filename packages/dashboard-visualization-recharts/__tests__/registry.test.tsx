import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ChartTileSpec, MetricTileSpec, TableTileSpec } from '@por/dashboard-spec';
import { describe, expect, it } from 'vitest';

import {
  createRechartsRendererRegistry,
  LineComparisonRenderer,
  MetricHeadlineRenderer,
  TableStandardRenderer,
} from '../src';

const metricSpec: MetricTileSpec = {
  id: 'revenue_headline',
  kind: 'metric',
  title: 'Revenue',
  data: { kind: 'binding', key: 'revenueHeadline' },
  visualization: {
    type: 'metric',
    valueField: 'value',
    comparisonField: 'change',
  },
};

const tableSpec: TableTileSpec = {
  id: 'top_locations',
  kind: 'table',
  title: 'Top Locations',
  data: { kind: 'binding', key: 'topLocations' },
  visualization: {
    type: 'table',
    columns: [
      { field: 'location', label: 'Location' },
      { field: 'bookings', label: 'Bookings' },
    ],
  },
};

const lineComparisonSpec: ChartTileSpec = {
  id: 'bookings_trend',
  kind: 'chart',
  title: 'Bookings Trend',
  data: { kind: 'binding', key: 'bookingsTrend' },
  visualization: {
    type: 'line-comparison',
    xField: 'bucketLabel',
    series: [
      { field: 'currentValue', label: 'Current period' },
      { field: 'previousValue', label: 'Previous period' },
    ],
  },
};

describe('createRechartsRendererRegistry', () => {
  it('resolves metric.headline, table.standard, and chart.line-comparison', () => {
    const registry = createRechartsRendererRegistry();

    expect(registry.visualizations['metric.headline']).toBe(
      MetricHeadlineRenderer,
    );
    expect(registry.visualizations['table.standard']).toBe(TableStandardRenderer);
    expect(registry.visualizations['chart.line-comparison']).toBe(
      LineComparisonRenderer,
    );
  });
});

describe('MetricHeadlineRenderer', () => {
  it('renders the metric value and comparison fields from the provided rows', () => {
    const html = renderToStaticMarkup(
      <MetricHeadlineRenderer
        spec={metricSpec}
        rows={[{ value: '$128,400', change: '+12.4%' }]}
      />,
    );

    expect(html).toContain('Revenue');
    expect(html).toContain('$128,400');
    expect(html).toContain('+12.4%');
  });
});

describe('TableStandardRenderer', () => {
  it('renders the configured columns and row values', () => {
    const html = renderToStaticMarkup(
      <TableStandardRenderer
        spec={tableSpec}
        rows={[
          { location: 'Austin', bookings: 84 },
          { location: 'Dallas', bookings: 63 },
        ]}
      />,
    );

    expect(html).toContain('Location');
    expect(html).toContain('Bookings');
    expect(html).toContain('Austin');
    expect(html).toContain('84');
    expect(html).toContain('Dallas');
  });
});

describe('LineComparisonRenderer', () => {
  it('fills the available width without imposing a structural width policy', () => {
    const html = renderToStaticMarkup(
      <LineComparisonRenderer
        spec={lineComparisonSpec}
        rows={[
          {
            bucketLabel: 'Jan',
            currentValue: 120,
            previousValue: 100,
          },
          {
            bucketLabel: 'Feb',
            currentValue: 144,
            previousValue: 116,
          },
        ]}
      />,
    );

    expect(html).toContain('data-line-comparison-root="true"');
    expect(html).toContain('width:100%');
    expect(html).not.toContain('max-width');
    expect(html).not.toContain('flex:1 1 0%');
  });
});
