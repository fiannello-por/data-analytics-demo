import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { vi } from 'vitest';

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

async function renderPage() {
  const { default: Page } = await import('../app/page');
  return Page({});
}

describe('SituationRoomPage', () => {
  it('renders the dashboard shell on the root route', async () => {
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
    getDashboardFilterDictionaryMock.mockImplementation(
      async (key: string) => ({
        data: {
          filterKey: key,
          options: [{ value: 'Enterprise', label: 'Enterprise', sortOrder: 1 }],
        },
        meta: { source: 'bigquery', queryCount: 1, bytesProcessed: 5 },
      }),
    );

    const element = await renderPage();

    const markup = renderToStaticMarkup(element as ReactElement);

    expect(markup).toContain('Situation Room');
    expect(markup).toContain('Weekly executive scorecards');
    expect(markup).toContain('New Logo');
    expect(markup).toContain('Total');
    expect(markup).toContain('Filters');
  }, 10_000);
});
