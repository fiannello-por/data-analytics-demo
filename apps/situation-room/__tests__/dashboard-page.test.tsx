import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const getDashboardCategorySnapshotMock = vi.fn();
const getDashboardClosedWonOpportunitiesMock = vi.fn();
const getDashboardOverviewBoardMock = vi.fn();
const getDashboardTileTrendMock = vi.fn();
const getDashboardFilterDictionaryMock = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/components/dashboard/closed-won-opportunities-table', () => ({
  ClosedWonOpportunitiesTable: ({
    payload,
  }: {
    payload: { category: string };
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'closed-won-table' },
      `Closed Won Opportunities ${payload.category}`,
    ),
}));

vi.mock('@/lib/server/get-dashboard-category-snapshot', () => ({
  getDashboardCategorySnapshot: getDashboardCategorySnapshotMock,
}));

vi.mock('@/lib/server/get-dashboard-closed-won-opportunities', () => ({
  getDashboardClosedWonOpportunities: getDashboardClosedWonOpportunitiesMock,
}));

vi.mock('@/lib/server/get-dashboard-overview-board', () => ({
  getDashboardOverviewBoard: getDashboardOverviewBoardMock,
}));

vi.mock('@/lib/server/get-dashboard-tile-trend', () => ({
  getDashboardTileTrend: getDashboardTileTrendMock,
}));

vi.mock('@/lib/server/get-dashboard-filter-dictionary', () => ({
  getDashboardFilterDictionary: getDashboardFilterDictionaryMock,
}));

describe('dashboard page', { timeout: 20000 }, () => {
  const newLogoSnapshot = {
    category: 'New Logo',
    currentWindowLabel: 'Jan 1, 2026 - Mar 23, 2026',
    previousWindowLabel: 'Jan 1, 2025 - Mar 23, 2025',
    lastRefreshedAt: '2026-03-23T00:00:00.000Z',
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

  const overviewBoard = {
    currentWindowLabel: 'Jan 1, 2026 - Mar 23, 2026',
    previousWindowLabel: 'Jan 1, 2025 - Mar 23, 2025',
    lastRefreshedAt: '2026-03-23T00:00:00.000Z',
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
  } as const;

  it('renders the five fixed category tabs', async () => {
    getDashboardOverviewBoardMock.mockResolvedValue({
      data: overviewBoard,
      meta: { source: 'bigquery', queryCount: 5, bytesProcessed: 130 },
    });
    getDashboardClosedWonOpportunitiesMock.mockResolvedValue({
      data: {
        category: 'Total',
        currentWindowLabel: 'Jan 1, 2026 - Mar 23, 2026',
        lastRefreshedAt: '2026-03-23T00:00:00.000Z',
        rows: [],
      },
      meta: { source: 'bigquery', queryCount: 1, bytesProcessed: 22 },
    });

    getDashboardFilterDictionaryMock.mockResolvedValue({
      data: {
        filterKey: 'Division',
        options: [{ value: 'Enterprise', label: 'Enterprise', sortOrder: 1 }],
      },
      meta: { source: 'bigquery', queryCount: 1, bytesProcessed: 5 },
    });

    const { default: DashboardPage } = await import('@/app/page');
    const html = renderToStaticMarkup(await DashboardPage({}));

    expect(html).toContain('aria-label="Overview"');
    expect(html).toContain('New Logo');
    expect(html).toContain('Expansion');
    expect(html).toContain('Migration');
    expect(html).toContain('Renewal');
    expect(html).toContain('Total');
    expect(html).toContain('Closed Won Opportunities');
  });

  it('renders filter controls with server-provided dictionary options', async () => {
    getDashboardOverviewBoardMock.mockResolvedValue({
      data: overviewBoard,
      meta: { source: 'bigquery', queryCount: 5, bytesProcessed: 130 },
    });
    getDashboardClosedWonOpportunitiesMock.mockResolvedValue({
      data: {
        category: 'Total',
        currentWindowLabel: 'Jan 1, 2026 - Mar 23, 2026',
        lastRefreshedAt: '2026-03-23T00:00:00.000Z',
        rows: [],
      },
      meta: { source: 'bigquery', queryCount: 1, bytesProcessed: 22 },
    });

    getDashboardFilterDictionaryMock.mockImplementation(
      async (key: string) => ({
        data: {
          filterKey: key,
          options: [{ value: 'Enterprise', label: 'Enterprise', sortOrder: 1 }],
        },
        meta: { source: 'bigquery', queryCount: 1, bytesProcessed: 5 },
      }),
    );

    const { default: DashboardPage } = await import('@/app/page');
    const html = renderToStaticMarkup(await DashboardPage({}));

    expect(html).toContain('Division');
    expect(html).toContain('1 active filter');
    expect(html).toContain('Updated');
    expect(html).toContain('Meta tools');
    expect(html).toContain('aria-label="Toggle color theme"');
    expect(html).toContain('id="date-range-trigger"');
    expect(html).toContain('id="filter-trigger-division"');
    expect(html).toContain('id="category-tab-new-logo"');
    expect(html).toContain('id="category-panel-overview"');
    expect(html).toContain('overflow-y-hidden');
  });

  it('shows selected-filter counts in the shell', async () => {
    getDashboardOverviewBoardMock.mockResolvedValue({
      data: overviewBoard,
      meta: { source: 'bigquery', queryCount: 5, bytesProcessed: 130 },
    });
    getDashboardClosedWonOpportunitiesMock.mockResolvedValue({
      data: {
        category: 'Total',
        currentWindowLabel: 'Jan 1, 2026 - Mar 23, 2026',
        lastRefreshedAt: '2026-03-23T00:00:00.000Z',
        rows: [],
      },
      meta: { source: 'bigquery', queryCount: 1, bytesProcessed: 22 },
    });

    getDashboardFilterDictionaryMock.mockImplementation(
      async (key: string) => ({
        data: {
          filterKey: key,
          options: [
            { value: 'Enterprise', label: 'Enterprise', sortOrder: 1 },
            { value: 'SMB', label: 'SMB', sortOrder: 2 },
          ],
        },
        meta: { source: 'bigquery', queryCount: 1, bytesProcessed: 5 },
      }),
    );

    const { default: DashboardPage } = await import('@/app/page');
    const html = renderToStaticMarkup(
      await DashboardPage({
        searchParams: Promise.resolve({ Division: ['Enterprise', 'SMB'] }),
      }),
    );

    expect(html).toContain('Division · 2');
    expect(html).toContain('2 active filters');
  });

  it('renders the snapshot section without the outer card border', async () => {
    getDashboardCategorySnapshotMock.mockResolvedValue({
      data: newLogoSnapshot,
      meta: { source: 'bigquery', queryCount: 13, bytesProcessed: 130 },
    });

    getDashboardTileTrendMock.mockResolvedValue({
      data: {
        category: 'New Logo',
        tileId: 'new_logo_bookings_amount',
        label: 'Bookings $',
        grain: 'weekly',
        currentWindowLabel: 'Jan 1, 2026 - Dec 31, 2026',
        previousWindowLabel: 'Jan 1, 2025 - Dec 31, 2025',
        points: [],
      },
      meta: { source: 'bigquery', queryCount: 1, bytesProcessed: 45 },
    });

    getDashboardClosedWonOpportunitiesMock.mockResolvedValue({
      data: {
        category: 'New Logo',
        currentWindowLabel: 'Jan 1, 2026 - Mar 31, 2026',
        lastRefreshedAt: '2026-03-23T00:00:00.000Z',
        rows: [],
      },
      meta: { source: 'bigquery', queryCount: 1, bytesProcessed: 22 },
    });

    getDashboardFilterDictionaryMock.mockImplementation(
      async (key: string) => ({
        data: {
          filterKey: key,
          options: [{ value: 'Enterprise', label: 'Enterprise', sortOrder: 1 }],
        },
        meta: { source: 'bigquery', queryCount: 1, bytesProcessed: 5 },
      }),
    );

    const { default: DashboardPage } = await import('@/app/page');
    const html = renderToStaticMarkup(
      await DashboardPage({
        searchParams: Promise.resolve({ category: 'New Logo' }),
      }),
    );

    expect(html).toContain('data-testid="snapshot-card"');
    expect(html).toContain('ring-0');
    expect(html).toContain('Closed Won Opportunities');
  });
});
