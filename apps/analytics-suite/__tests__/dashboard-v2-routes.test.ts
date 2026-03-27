import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getDashboardV2CategorySnapshotMock = vi.fn();
const getDashboardV2ClosedWonOpportunitiesMock = vi.fn();
const getDashboardV2FilterDictionaryMock = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/server/v2/get-dashboard-category-snapshot', () => ({
  getDashboardV2CategorySnapshot: getDashboardV2CategorySnapshotMock,
}));

vi.mock('@/lib/server/v2/get-dashboard-closed-won-opportunities', () => ({
  getDashboardV2ClosedWonOpportunities:
    getDashboardV2ClosedWonOpportunitiesMock,
}));

vi.mock('@/lib/server/v2/get-dashboard-filter-dictionary', () => ({
  getDashboardV2FilterDictionary: getDashboardV2FilterDictionaryMock,
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('dashboard v2 routes', () => {
  it('returns the v2 category snapshot payload from analytics-suite', async () => {
    getDashboardV2CategorySnapshotMock.mockResolvedValueOnce({
      data: {
        category: 'New Logo',
        currentWindowLabel: 'Jan 1, 2026 - Mar 31, 2026',
        previousWindowLabel: 'Jan 1, 2025 - Mar 31, 2025',
        lastRefreshedAt: '2026-03-24T00:00:00.000Z',
        rows: [],
        tileTimings: [],
      },
      meta: {
        source: 'lightdash',
        queryCount: 10,
        bytesProcessed: 1024,
        cacheMode: 'off',
      },
    });

    const { GET } =
      await import('@/app/api/dashboard-v2/category/[category]/route');
    const response = await GET(
      new NextRequest(
        'http://localhost/api/dashboard-v2/category/New%20Logo?Division=Enterprise&cache=off',
      ),
      { params: Promise.resolve({ category: 'New Logo' }) },
    );

    expect(getDashboardV2CategorySnapshotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        activeCategory: 'New Logo',
        filters: { Division: ['Enterprise'] },
      }),
      undefined,
      { cacheMode: 'off' },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('x-analytics-suite-source')).toBe('lightdash');
  });

  it('returns the v2 filter dictionary payload from analytics-suite', async () => {
    getDashboardV2FilterDictionaryMock.mockResolvedValueOnce({
      data: {
        filterKey: 'Division',
        options: [],
      },
      meta: {
        source: 'lightdash',
        queryCount: 1,
        bytesProcessed: 120,
        cacheMode: 'off',
      },
    });

    const { GET } =
      await import('@/app/api/dashboard-v2/filter-dictionaries/[key]/route');
    const response = await GET(
      new NextRequest(
        'http://localhost/api/dashboard-v2/filter-dictionaries/Division?cache=off',
      ),
      { params: Promise.resolve({ key: 'Division' }) },
    );

    expect(getDashboardV2FilterDictionaryMock).toHaveBeenCalledWith(
      'Division',
      undefined,
      { cacheMode: 'off' },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('x-analytics-suite-source')).toBe('lightdash');
  });
});
