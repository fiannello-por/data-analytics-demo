// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CategorySnapshotPayload,
  TileTrendPayload,
} from '@/lib/dashboard/contracts';

const trendPanelSpy = vi.fn();

vi.mock('@/components/dashboard/tile-table', () => ({
  TileTable: () => React.createElement('div', { 'data-testid': 'tile-table' }),
  TileTableSkeleton: () =>
    React.createElement('div', { 'data-testid': 'tile-table-skeleton' }),
}));

vi.mock('@/components/dashboard/trend-panel', () => ({
  TrendPanel: (props: Record<string, unknown>) => {
    trendPanelSpy(props);
    return React.createElement('div', { 'data-testid': 'trend-panel' });
  },
}));

describe('MainMetricsSpecRenderer', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    trendPanelSpy.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('lets TrendPanel render the selected metric chart instead of injecting chartContent', async () => {
    const snapshot: CategorySnapshotPayload = {
      category: 'Expansion',
      currentWindowLabel: 'Jan 1, 2026 - Mar 26, 2026',
      previousWindowLabel: 'Jan 1, 2025 - Mar 26, 2025',
      lastRefreshedAt: '2026-03-26T12:00:00.000Z',
      rows: [
        {
          tileId: 'expansion_bookings_count',
          label: 'Bookings #',
          sortOrder: 1,
          formatType: 'number',
          currentValue: '599',
          previousValue: '757',
          pctChange: '-20.9%',
        },
      ],
      tileTimings: [],
    };

    const trend: TileTrendPayload = {
      category: 'Expansion',
      tileId: 'expansion_bookings_count',
      label: 'Bookings #',
      grain: 'weekly',
      xAxisFieldLabel: 'Close Date',
      currentWindowLabel: 'Jan 1, 2026 - Mar 26, 2026',
      previousWindowLabel: 'Jan 1, 2025 - Mar 26, 2025',
      points: [
        {
          bucketKey: '2026-01-01',
          bucketLabel: 'Jan 1',
          currentValue: 599,
          previousValue: 757,
        },
      ],
    };

    const { MainMetricsSpecRenderer } = await import(
      '@/components/dashboard/spec-dashboard-renderer'
    );

    await act(async () => {
      root.render(
        React.createElement(MainMetricsSpecRenderer, {
          category: 'Expansion',
          snapshot,
          trend,
          selectedTileId: 'expansion_bookings_count',
          showTrend: true,
        }),
      );
    });

    expect(trendPanelSpy).toHaveBeenCalled();
    expect(trendPanelSpy.mock.calls.at(-1)?.[0]).not.toHaveProperty(
      'chartContent',
    );
    expect(
      container
        .querySelector('[data-testid="trend-panel"]')
        ?.parentElement?.getAttribute('class'),
    ).toContain('self-stretch');
    expect(
      container
        .querySelector('[data-testid="trend-panel"]')
        ?.parentElement?.getAttribute('class'),
    ).toContain('h-full');
  });
});
