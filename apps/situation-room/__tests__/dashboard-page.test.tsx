import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const getDashboardCategorySnapshotMock = vi.fn();
const getDashboardTileTrendMock = vi.fn();
const getDashboardFilterDictionaryMock = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/server/get-dashboard-category-snapshot', () => ({
  getDashboardCategorySnapshot: getDashboardCategorySnapshotMock,
}));

vi.mock('@/lib/server/get-dashboard-tile-trend', () => ({
  getDashboardTileTrend: getDashboardTileTrendMock,
}));

vi.mock('@/lib/server/get-dashboard-filter-dictionary', () => ({
  getDashboardFilterDictionary: getDashboardFilterDictionaryMock,
}));

describe('dashboard page', { timeout: 10000 }, () => {
  it('renders the five fixed category tabs', async () => {
    getDashboardCategorySnapshotMock.mockResolvedValue({
      data: {
        category: 'New Logo',
        currentWindowLabel: 'Jan 1, 2026 - Dec 31, 2026',
        previousWindowLabel: 'Jan 1, 2025 - Dec 31, 2025',
        lastRefreshedAt: '2026-03-22T00:00:00.000Z',
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
      },
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

    getDashboardFilterDictionaryMock.mockResolvedValue({
      data: {
        filterKey: 'Division',
        options: [{ value: 'Enterprise', label: 'Enterprise', sortOrder: 1 }],
      },
      meta: { source: 'bigquery', queryCount: 1, bytesProcessed: 5 },
    });

    const { default: DashboardPage } = await import('@/app/page');
    const html = renderToStaticMarkup(await DashboardPage({}));

    expect(html).toContain('New Logo');
    expect(html).toContain('Expansion');
    expect(html).toContain('Migration');
    expect(html).toContain('Renewal');
    expect(html).toContain('Total');
  });

  it('renders filter controls with server-provided dictionary options', async () => {
    getDashboardCategorySnapshotMock.mockResolvedValue({
      data: {
        category: 'New Logo',
        currentWindowLabel: 'Jan 1, 2026 - Dec 31, 2026',
        previousWindowLabel: 'Jan 1, 2025 - Dec 31, 2025',
        lastRefreshedAt: '2026-03-22T00:00:00.000Z',
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
      },
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

    getDashboardFilterDictionaryMock.mockImplementation(async (key: string) => ({
      data: {
        filterKey: key,
        options: [{ value: 'Enterprise', label: 'Enterprise', sortOrder: 1 }],
      },
      meta: { source: 'bigquery', queryCount: 1, bytesProcessed: 5 },
    }));

    const { default: DashboardPage } = await import('@/app/page');
    const html = renderToStaticMarkup(await DashboardPage({}));

    expect(html).toContain('Division');
    expect(html).toContain('Date Range');
    expect(html).toContain('0 active filters');
    expect(html).toContain('id="date-range-trigger"');
    expect(html).toContain('id="filter-trigger-division"');
    expect(html).toContain('id="category-tab-new-logo"');
    expect(html).toContain('id="category-panel-new-logo"');
  });

  it('shows selected-filter counts in the shell', async () => {
    getDashboardCategorySnapshotMock.mockResolvedValue({
      data: {
        category: 'New Logo',
        currentWindowLabel: 'Jan 1, 2026 - Dec 31, 2026',
        previousWindowLabel: 'Jan 1, 2025 - Dec 31, 2025',
        lastRefreshedAt: '2026-03-22T00:00:00.000Z',
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
      },
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

    getDashboardFilterDictionaryMock.mockImplementation(async (key: string) => ({
      data: {
        filterKey: key,
        options: [
          { value: 'Enterprise', label: 'Enterprise', sortOrder: 1 },
          { value: 'SMB', label: 'SMB', sortOrder: 2 },
        ],
      },
      meta: { source: 'bigquery', queryCount: 1, bytesProcessed: 5 },
    }));

    const { default: DashboardPage } = await import('@/app/page');
    const html = renderToStaticMarkup(
      await DashboardPage({
        searchParams: Promise.resolve({ Division: ['Enterprise', 'SMB'] }),
      }),
    );

    expect(html).toContain('Division · 2');
    expect(html).toContain('1 active filter');
  });

  it('renders the snapshot section without the outer card border', async () => {
    getDashboardCategorySnapshotMock.mockResolvedValue({
      data: {
        category: 'New Logo',
        currentWindowLabel: 'Jan 1, 2026 - Dec 31, 2026',
        previousWindowLabel: 'Jan 1, 2025 - Dec 31, 2025',
        lastRefreshedAt: '2026-03-22T00:00:00.000Z',
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
      },
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

    getDashboardFilterDictionaryMock.mockImplementation(async (key: string) => ({
      data: {
        filterKey: key,
        options: [{ value: 'Enterprise', label: 'Enterprise', sortOrder: 1 }],
      },
      meta: { source: 'bigquery', queryCount: 1, bytesProcessed: 5 },
    }));

    const { default: DashboardPage } = await import('@/app/page');
    const html = renderToStaticMarkup(await DashboardPage({}));

    expect(html).toContain('data-testid="snapshot-card"');
    expect(html).toContain('ring-0');
  });
});
