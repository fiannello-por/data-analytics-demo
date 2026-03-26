import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const getDashboardV2CategorySnapshotMock = vi.fn();
const getDashboardV2ClosedWonOpportunitiesMock = vi.fn();
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

vi.mock('@/lib/server/v2/get-dashboard-closed-won-opportunities', () => ({
  getDashboardV2ClosedWonOpportunities: getDashboardV2ClosedWonOpportunitiesMock,
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
  it('renders the real sales dashboard shell at the canonical analytics-suite route', async () => {
    const newLogoSnapshot = {
      category: 'New Logo',
      currentWindowLabel: 'Jan 1, 2026 - Mar 23, 2026',
      previousWindowLabel: 'Jan 1, 2025 - Mar 23, 2025',
      lastRefreshedAt: '2026-03-24T00:00:00.000Z',
      rows: [
        {
          tileId: 'new_logo_bookings_amount',
          label: 'Bookings $',
          sortOrder: 1,
          formatType: 'currency',
          currentValue: '$100',
          previousValue: '$80',
          pctChange: '+25%',
        },
      ],
      tileTimings: [],
    } as const;

    getDashboardV2OverviewBoardMock.mockResolvedValue({
      data: {
        currentWindowLabel: 'Jan 1, 2026 - Mar 23, 2026',
        previousWindowLabel: 'Jan 1, 2025 - Mar 23, 2025',
        lastRefreshedAt: '2026-03-24T00:00:00.000Z',
        snapshots: [
          newLogoSnapshot,
          { ...newLogoSnapshot, category: 'Expansion' },
          { ...newLogoSnapshot, category: 'Migration' },
          { ...newLogoSnapshot, category: 'Renewal' },
          {
            ...newLogoSnapshot,
            category: 'Total',
            rows: [
              {
                tileId: 'total_bookings_amount',
                label: 'Bookings $',
                sortOrder: 1,
                formatType: 'currency',
                currentValue: '$400',
                previousValue: '$320',
                pctChange: '+25%',
              },
            ],
          },
        ],
      },
      meta: { source: 'lightdash', queryCount: 20, bytesProcessed: 2048 },
    });

    getDashboardV2ClosedWonOpportunitiesMock.mockResolvedValue({
      data: {
        category: 'Total',
        currentWindowLabel: 'Jan 1, 2026 - Mar 23, 2026',
        lastRefreshedAt: '2026-03-24T00:00:00.000Z',
        rows: [],
      },
      meta: { source: 'lightdash', queryCount: 1, bytesProcessed: 128 },
    });

    getDashboardV2FilterDictionaryMock.mockImplementation(async (key: string) => ({
      data: {
        filterKey: key,
        options: [{ value: 'Enterprise', label: 'Enterprise', sortOrder: 1 }],
      },
      meta: { source: 'lightdash', queryCount: 1, bytesProcessed: 10 },
    }));

    const { default: SalesPerformanceDashboardPage } = await import(
      '@/app/dashboards/sales-performance/page'
    );
    const html = renderToStaticMarkup(
      await SalesPerformanceDashboardPage({ searchParams: Promise.resolve({}) }),
    );

    expect(html).toContain('shell:/api/dashboard-v2');
    expect(html).not.toContain('iframe');
    expect(dashboardShellMock).toHaveBeenCalledWith(
      expect.objectContaining({
        apiBasePath: '/api/dashboard-v2',
        initialOverviewBoard: expect.objectContaining({
          snapshots: expect.any(Array),
        }),
        initialClosedWonOpportunities: expect.objectContaining({
          category: 'Total',
        }),
      }),
    );
  });
});
