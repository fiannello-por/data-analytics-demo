import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const getDashboardV2CategorySnapshotMock = vi.fn();
const getDashboardV2OverviewBoardMock = vi.fn();
const getDashboardV2TileTrendMock = vi.fn();
const getDashboardV2FilterDictionaryMock = vi.fn();
const dashboardShellMock = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/components/dashboard/dashboard-shell', () => ({
  DashboardShell: (props: { apiBasePath?: string }) => {
    dashboardShellMock(props);
    return React.createElement(
      'div',
      { 'data-testid': 'dashboard-shell-v2' },
      `shell:${props.apiBasePath ?? 'default'}`,
    );
  },
}));

vi.mock('@/lib/server/v2/get-dashboard-category-snapshot', () => ({
  getDashboardV2CategorySnapshot: getDashboardV2CategorySnapshotMock,
}));

vi.mock('@/lib/server/v2/get-dashboard-overview-board', () => ({
  getDashboardV2OverviewBoard: getDashboardV2OverviewBoardMock,
}));

vi.mock('@/lib/server/v2/get-dashboard-tile-trend', () => ({
  getDashboardV2TileTrend: getDashboardV2TileTrendMock,
}));

vi.mock('@/lib/server/v2/get-dashboard-filter-dictionary', () => ({
  getDashboardV2FilterDictionary: getDashboardV2FilterDictionaryMock,
}));

describe('sales performance dashboard page', { timeout: 20000 }, () => {
  beforeEach(() => {
    getDashboardV2OverviewBoardMock.mockReset();
    getDashboardV2CategorySnapshotMock.mockReset();
    getDashboardV2TileTrendMock.mockReset();
    getDashboardV2FilterDictionaryMock.mockReset();
    dashboardShellMock.mockReset();
  });

  it('renders the real sales dashboard shell at the canonical analytics-suite route', async () => {
    const { default: SalesPerformanceDashboardPage } =
      await import('@/app/dashboards/sales-performance/page');
    const html = renderToStaticMarkup(
      await SalesPerformanceDashboardPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(html).toContain('shell:/api/dashboard-v2');
    expect(html).not.toContain('iframe');
    expect(getDashboardV2OverviewBoardMock).not.toHaveBeenCalled();
    expect(getDashboardV2CategorySnapshotMock).not.toHaveBeenCalled();
    expect(dashboardShellMock).toHaveBeenCalledWith(
      expect.objectContaining({
        apiBasePath: '/api/dashboard-v2',
        initialState: expect.objectContaining({
          activeCategory: 'Expansion',
          selectedTileId: 'expansion_bookings_amount',
        }),
        initialOverviewBoard: null,
        initialSnapshot: null,
        initialDictionaries: {},
        initialClosedWonOpportunities: null,
      }),
    );
    expect(getDashboardV2FilterDictionaryMock).not.toHaveBeenCalled();
  });

  it('does not fetch trend data during the initial server render for category views', async () => {
    const { default: SalesPerformanceDashboardPage } =
      await import('@/app/dashboards/sales-performance/page');

    renderToStaticMarkup(
      await SalesPerformanceDashboardPage({
        searchParams: Promise.resolve({
          category: 'New Logo',
          tile: 'new_logo_bookings_amount',
        }),
      }),
    );

    expect(getDashboardV2OverviewBoardMock).not.toHaveBeenCalled();
    expect(getDashboardV2CategorySnapshotMock).not.toHaveBeenCalled();
    expect(getDashboardV2TileTrendMock).not.toHaveBeenCalled();
    expect(dashboardShellMock).toHaveBeenCalledWith(
      expect.objectContaining({
        initialSnapshot: null,
        initialTrend: null,
      }),
    );
  });
});
