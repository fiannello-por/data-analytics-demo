import { describe, expect, it } from 'vitest';
import type {
  CategorySnapshotPayload,
  TileBackendTrace,
  TileTrendPayload,
} from '@/lib/dashboard/contracts';
import {
  dashboardSpecBindingRegistry,
  getDashboardSpecBinding,
} from '@/lib/dashboard-v2/spec-bindings';

function buildTrace(kind: 'single' | 'composite'): TileBackendTrace {
  return {
    kind,
    model: 'sales_dashboard_v2_opportunity_base',
    includes: ['Bookings $'],
    compiledAt: '2026-03-25T00:00:00.000Z',
    semanticYamlSnippet: 'metrics: {}',
    executions: [],
  };
}

describe('dashboard spec bindings', () => {
  it('maps snapshot payload rows into standardized table rows', () => {
    const backendTrace = buildTrace('composite');
    const snapshot: CategorySnapshotPayload = {
      category: 'New Logo',
      currentWindowLabel: 'Jan 1, 2026 - Mar 31, 2026',
      previousWindowLabel: 'Jan 1, 2025 - Mar 31, 2025',
      lastRefreshedAt: '2026-03-25T00:00:00.000Z',
      tileTimings: [],
      rows: [
        {
          tileId: 'new_logo_bookings_amount',
          label: 'Bookings $',
          sortOrder: 1,
          formatType: 'currency',
          currentValue: '$100',
          previousValue: '$80',
          pctChange: '+25%',
          backendTrace,
        },
      ],
    };

    const result = dashboardSpecBindingRegistry.mainMetricsSnapshot(snapshot);

    expect(getDashboardSpecBinding('mainMetricsSnapshot')).toBe(
      dashboardSpecBindingRegistry.mainMetricsSnapshot,
    );
    expect(result).toEqual({
      status: 'ready',
      rows: [
        {
          tileId: 'new_logo_bookings_amount',
          label: 'Bookings $',
          currentValue: '$100',
          previousValue: '$80',
          pctChange: '+25%',
        },
      ],
      traces: {
        new_logo_bookings_amount: backendTrace,
      },
    });
  });

  it('maps trend payload points into standardized line comparison rows', () => {
    const backendTrace = buildTrace('single');
    const trend: TileTrendPayload = {
      category: 'New Logo',
      tileId: 'new_logo_bookings_amount',
      label: 'Bookings $',
      grain: 'weekly',
      xAxisFieldLabel: 'Close Date',
      currentWindowLabel: 'Jan 1, 2026 - Mar 31, 2026',
      previousWindowLabel: 'Jan 1, 2025 - Mar 31, 2025',
      points: [
        {
          bucketKey: '2026-01-05',
          bucketLabel: 'Jan 05',
          currentValue: 100,
          previousValue: 80,
        },
      ],
      backendTrace,
    };

    const result = dashboardSpecBindingRegistry.selectedMetricTrend(trend);

    expect(getDashboardSpecBinding('selectedMetricTrend')).toBe(
      dashboardSpecBindingRegistry.selectedMetricTrend,
    );
    expect(result).toEqual({
      status: 'ready',
      xAxisLabel: 'Close Date',
      rows: [
        {
          bucketKey: '2026-01-05',
          bucketLabel: 'Jan 05',
          currentValue: 100,
          previousValue: 80,
        },
      ],
      trace: backendTrace,
    });
  });

  it('uses the semantic x-axis label from the payload metadata', () => {
    const trend: TileTrendPayload = {
      category: 'New Logo',
      tileId: 'new_logo_pipeline_created',
      label: 'Pipeline Created',
      grain: 'weekly',
      xAxisFieldLabel: 'Pipeline Start Date',
      currentWindowLabel: 'Jan 1, 2026 - Mar 31, 2026',
      previousWindowLabel: 'Jan 1, 2025 - Mar 31, 2025',
      points: [],
    };

    const result = dashboardSpecBindingRegistry.selectedMetricTrend(trend);

    expect(result.status).toBe('empty');
    expect(result.xAxisLabel).toBe('Pipeline Start Date');
  });

  it('fails loudly when a v2 trend payload is missing the semantic x-axis label', () => {
    const trend: TileTrendPayload = {
      category: 'New Logo',
      tileId: 'new_logo_pipeline_created',
      label: 'Pipeline Created',
      grain: 'weekly',
      currentWindowLabel: 'Jan 1, 2026 - Mar 31, 2026',
      previousWindowLabel: 'Jan 1, 2025 - Mar 31, 2025',
      points: [],
    };

    expect(() =>
      dashboardSpecBindingRegistry.selectedMetricTrend(trend),
    ).toThrowError(
      'Selected metric trend binding requires a semantic x-axis field label.',
    );
  });
});
