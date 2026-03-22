import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

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

afterEach(() => {
  vi.clearAllMocks();
});

describe('dashboard routes', () => {
  it('returns the category snapshot payload', async () => {
    getDashboardCategorySnapshotMock.mockResolvedValueOnce({
      data: {
        category: 'New Logo',
        currentWindowLabel: 'Jan 1, 2026 - Mar 31, 2026',
        previousWindowLabel: 'Jan 1, 2025 - Mar 31, 2025',
        lastRefreshedAt: '2026-03-22T00:00:00.000Z',
        rows: [],
        tileTimings: [],
      },
      meta: {
        source: 'bigquery',
        queryCount: 13,
        bytesProcessed: 130,
        cacheMode: 'off',
      },
    });

    const { GET } = await import('../app/api/dashboard/category/[category]/route');
    const response = await GET(
      new NextRequest(
        'http://localhost/api/dashboard/category/New%20Logo?Division=Enterprise',
      ),
      { params: Promise.resolve({ category: 'New Logo' }) },
    );

    expect(getDashboardCategorySnapshotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        activeCategory: 'New Logo',
        filters: { Division: ['Enterprise'] },
      }),
      undefined,
      { cacheMode: 'auto' },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      category: 'New Logo',
      currentWindowLabel: 'Jan 1, 2026 - Mar 31, 2026',
      previousWindowLabel: 'Jan 1, 2025 - Mar 31, 2025',
      lastRefreshedAt: '2026-03-22T00:00:00.000Z',
      rows: [],
      tileTimings: [],
    });
    expect(response.headers.get('x-situation-room-query-count')).toBe('13');
    expect(response.headers.get('x-situation-room-source')).toBe('bigquery');
    expect(response.headers.get('x-situation-room-bytes-processed')).toBe('130');
    expect(response.headers.get('x-situation-room-cache-mode')).toBe('off');
    expect(response.headers.get('x-situation-room-server-ms')).toBeTruthy();
    expect(response.headers.get('x-situation-room-tile-timings')).toBe('[]');
  });

  it('returns the selected tile trend payload', async () => {
    getDashboardTileTrendMock.mockResolvedValueOnce({
      data: {
        category: 'New Logo',
        tileId: 'new_logo_bookings_amount',
        label: 'Bookings $',
        grain: 'weekly',
        currentWindowLabel: 'Jan 1, 2026 - Mar 31, 2026',
        previousWindowLabel: 'Jan 1, 2025 - Mar 31, 2025',
        points: [],
      },
      meta: {
        source: 'bigquery',
        queryCount: 1,
        bytesProcessed: 45,
        cacheMode: 'off',
      },
    });

    const { GET } = await import('../app/api/dashboard/trend/[tileId]/route');
    const response = await GET(
      new NextRequest(
        'http://localhost/api/dashboard/trend/new_logo_bookings_amount?Division=Enterprise&cache=off',
      ),
      { params: Promise.resolve({ tileId: 'new_logo_bookings_amount' }) },
    );

    expect(getDashboardTileTrendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        activeCategory: 'New Logo',
        selectedTileId: 'new_logo_bookings_amount',
        filters: { Division: ['Enterprise'] },
      }),
      undefined,
      { cacheMode: 'off' },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('x-situation-room-query-count')).toBe('1');
    expect(response.headers.get('x-situation-room-source')).toBe('bigquery');
    expect(response.headers.get('x-situation-room-bytes-processed')).toBe('45');
    expect(response.headers.get('x-situation-room-cache-mode')).toBe('off');
    expect(response.headers.get('x-situation-room-server-ms')).toBeTruthy();
  });

  it('returns the global filter dictionary payload', async () => {
    getDashboardFilterDictionaryMock.mockResolvedValueOnce({
      data: {
        filterKey: 'Division',
        options: [],
      },
      meta: {
        source: 'bigquery',
        queryCount: 1,
        cacheMode: 'off',
      },
    });

    const { GET } = await import(
      '../app/api/dashboard/filter-dictionaries/[key]/route'
    );
    const response = await GET(
      new NextRequest('http://localhost/api/dashboard/filter-dictionaries/Division?cache=off'),
      { params: Promise.resolve({ key: 'Division' }) },
    );

    expect(getDashboardFilterDictionaryMock).toHaveBeenCalledWith(
      'Division',
      undefined,
      { cacheMode: 'off' },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('x-situation-room-query-count')).toBe('1');
    expect(response.headers.get('x-situation-room-source')).toBe('bigquery');
    expect(response.headers.get('x-situation-room-cache-mode')).toBe('off');
    expect(response.headers.get('x-situation-room-server-ms')).toBeTruthy();
  });

  it('rejects unsupported category paths with a 400', async () => {
    const { GET } = await import('../app/api/dashboard/category/[category]/route');
    const response = await GET(
      new NextRequest('http://localhost/api/dashboard/category/Bogus'),
      { params: Promise.resolve({ category: 'Bogus' }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Unsupported dashboard category: Bogus.',
    });
  });

  it('rejects unsupported filter dictionary keys with a 400', async () => {
    const { GET } = await import(
      '../app/api/dashboard/filter-dictionaries/[key]/route'
    );
    const response = await GET(
      new NextRequest('http://localhost/api/dashboard/filter-dictionaries/Bogus'),
      { params: Promise.resolve({ key: 'Bogus' }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Unsupported dashboard filter dictionary key: Bogus.',
    });
  });

  it('rejects an unsupported dashboard cache mode with a 400', async () => {
    const { GET } = await import('../app/api/dashboard/category/[category]/route');
    const response = await GET(
      new NextRequest('http://localhost/api/dashboard/category/New%20Logo?cache=nope'),
      { params: Promise.resolve({ category: 'New Logo' }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Unsupported probe cache mode: nope.',
    });
    expect(getDashboardCategorySnapshotMock).not.toHaveBeenCalled();
  });
});
