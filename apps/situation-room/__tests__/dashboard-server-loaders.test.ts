import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCategoryTiles } from '@/lib/dashboard/catalog';

const unstableCacheMock = vi.fn((fn) => fn);

vi.mock('next/cache', () => ({
  unstable_cache: unstableCacheMock,
}));

vi.mock('server-only', () => ({}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('dashboard server loaders', () => {
  it('fans out one snapshot query per tile and aggregates rows in curated order', async () => {
    const queryRows = vi.fn(async (query: { sql: string }) => {
      const tileId = query.sql.match(/'([^']+)' AS tile_id/u)?.[1];
      const label = query.sql.match(/'([^']+)' AS label/u)?.[1];
      const sortOrder = Number(
        query.sql.match(/(\d+) AS sort_order/u)?.[1] ?? 0,
      );
      const formatType = query.sql.match(/'([^']+)' AS format_type/u)?.[1];

      return {
        rows: [
          {
            tile_id: tileId,
            label,
            sort_order: sortOrder,
            format_type: formatType,
            current_value: 100,
            previous_value: 80,
          },
        ],
        bytesProcessed: 10,
      };
    });

    const { getDashboardCategorySnapshot } =
      await import('@/lib/server/get-dashboard-category-snapshot');

    const result = await getDashboardCategorySnapshot(
      {
        activeCategory: 'New Logo',
        selectedTileId: 'new_logo_bookings_amount',
        filters: {},
        dateRange: { startDate: '2026-01-01', endDate: '2026-03-31' },
        previousDateRange: { startDate: '2025-01-01', endDate: '2025-03-31' },
      },
      { queryRows },
    );

    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      expect.arrayContaining(['dashboard-category-snapshot']),
      expect.objectContaining({
        revalidate: 60,
        tags: ['dashboard-category-snapshot'],
      }),
    );
    expect(queryRows).toHaveBeenCalledTimes(
      getCategoryTiles('New Logo').length,
    );
    expect(result.data.rows[0]?.tileId).toBe('new_logo_bookings_amount');
    expect(result.data.rows).toHaveLength(13);
    expect(result.data.tileTimings).toHaveLength(13);
    expect(result.meta.queryCount).toBe(13);
    expect(result.meta.bytesProcessed).toBe(130);
  });

  it('does not fragment the category snapshot cache by selected tile', async () => {
    const queryRows = vi.fn().mockResolvedValue({
      rows: [
        {
          tile_id: 'new_logo_bookings_amount',
          label: 'Bookings $',
          sort_order: 1,
          format_type: 'currency',
          current_value: 100,
          previous_value: 80,
        },
      ],
      bytesProcessed: 10,
    });

    const { getDashboardCategorySnapshot } =
      await import('@/lib/server/get-dashboard-category-snapshot');

    await getDashboardCategorySnapshot(
      {
        activeCategory: 'New Logo',
        selectedTileId: 'new_logo_bookings_amount',
        filters: {},
        dateRange: { startDate: '2026-01-01', endDate: '2026-03-31' },
        previousDateRange: { startDate: '2025-01-01', endDate: '2025-03-31' },
      },
      { queryRows },
    );

    await getDashboardCategorySnapshot(
      {
        activeCategory: 'New Logo',
        selectedTileId: 'new_logo_bookings_count',
        filters: {},
        dateRange: { startDate: '2026-01-01', endDate: '2026-03-31' },
        previousDateRange: { startDate: '2025-01-01', endDate: '2025-03-31' },
      },
      { queryRows },
    );

    const cacheCalls = unstableCacheMock.mock.calls as unknown as Array<
      [unknown, string[]]
    >;
    const firstKey = cacheCalls.at(-2)?.[1]?.[1];
    const secondKey = cacheCalls.at(-1)?.[1]?.[1];

    expect(firstKey).toBe(secondKey);
    expect(String(firstKey)).not.toContain('new_logo_bookings_count');
  });

  it('formats null metric values as empty-state placeholders instead of throwing', async () => {
    const queryRows = vi.fn().mockResolvedValue({
      rows: [
        {
          tile_id: 'new_logo_close_rate',
          label: 'Close Rate',
          sort_order: 4,
          format_type: 'percent',
          current_value: null,
          previous_value: null,
        },
      ],
      bytesProcessed: 10,
    });

    const { getDashboardCategorySnapshot } =
      await import('@/lib/server/get-dashboard-category-snapshot');

    const result = await getDashboardCategorySnapshot(
      {
        activeCategory: 'New Logo',
        selectedTileId: 'new_logo_close_rate',
        filters: {},
        dateRange: { startDate: '2026-01-01', endDate: '2026-03-31' },
        previousDateRange: { startDate: '2025-01-01', endDate: '2025-03-31' },
      },
      { queryRows },
    );

    expect(result.data.rows[0]).toMatchObject({
      tileId: 'new_logo_close_rate',
      currentValue: '—',
      previousValue: '—',
      pctChange: '—',
    });
  });

  it('loads one weekly trend series for the selected tile', async () => {
    const queryRows = vi.fn().mockResolvedValue({
      rows: [
        {
          bucket_index: 0,
          bucket_label: '2026-01-06',
          current_value: 20,
          previous_value: 12,
        },
      ],
      bytesProcessed: 45,
    });

    const { getDashboardTileTrend } =
      await import('@/lib/server/get-dashboard-tile-trend');

    const result = await getDashboardTileTrend(
      {
        activeCategory: 'New Logo',
        selectedTileId: 'new_logo_bookings_amount',
        filters: {},
        dateRange: { startDate: '2026-01-01', endDate: '2026-03-31' },
        previousDateRange: { startDate: '2025-01-01', endDate: '2025-03-31' },
        trendGrain: 'weekly',
      },
      { queryRows },
    );

    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      expect.arrayContaining(['dashboard-tile-trend']),
      expect.objectContaining({
        revalidate: 60,
        tags: ['dashboard-tile-trend'],
      }),
    );
    expect(result.data.tileId).toBe('new_logo_bookings_amount');
    expect(result.data.points).toEqual([
      {
        bucketKey: '0',
        bucketLabel: '2026-01-06',
        currentValue: 20,
        previousValue: 12,
      },
    ]);
    expect(result.meta.queryCount).toBe(1);
    expect(result.meta.bytesProcessed).toBe(45);
  });

  it('loads a global filter dictionary with a long-lived cache wrapper', async () => {
    const queryRows = vi.fn().mockResolvedValue({
      rows: [
        { value: 'Enterprise', label: 'Enterprise', sort_order: 1 },
        { value: 'SMB', label: 'SMB', sort_order: 2 },
      ],
      bytesProcessed: 7,
    });

    const { getDashboardFilterDictionary } =
      await import('@/lib/server/get-dashboard-filter-dictionary');

    const result = await getDashboardFilterDictionary('Division', {
      queryRows,
    });

    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ['dashboard-filter-dictionary', 'Division'],
      expect.objectContaining({
        revalidate: 900,
        tags: ['dashboard-filter-dictionary'],
      }),
    );
    expect(result.data).toEqual({
      filterKey: 'Division',
      options: [
        { value: 'Enterprise', label: 'Enterprise', sortOrder: 1 },
        { value: 'SMB', label: 'SMB', sortOrder: 2 },
      ],
    });
    expect(result.meta.queryCount).toBe(1);
    expect(result.meta.bytesProcessed).toBe(7);
  });

  it('loads closed won opportunities through a cached current-period query', async () => {
    const queryRows = vi.fn().mockResolvedValue({
      rows: [
        {
          account_name: 'Acme',
          account_link: 'https://example.com/account',
          opportunity_name: 'Acme Renewal',
          opportunity_link: 'https://example.com/opportunity',
          close_date: '2026-03-21',
          created_date: '2026-01-10',
          division: 'Enterprise',
          type: 'New Business',
          product_family: 'Core',
          booking_plan_opp_type_2025: 'Plan A',
          owner: 'Ada',
          sdr: 'Sam',
          opp_record_type: 'POR',
          age: 42,
          se: 'Taylor',
          quarter: '2026-Q1',
          contract_start_date: '2026-04-01',
          users: 88,
          acv: 125000,
        },
      ],
      bytesProcessed: 33,
    });

    const { getDashboardClosedWonOpportunities } =
      await import('@/lib/server/get-dashboard-closed-won-opportunities');

    const result = await getDashboardClosedWonOpportunities(
      {
        activeCategory: 'New Logo',
        filters: { Division: ['Enterprise'] },
        dateRange: { startDate: '2026-01-01', endDate: '2026-03-31' },
      },
      { queryRows },
    );

    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      expect.arrayContaining(['dashboard-closed-won']),
      expect.objectContaining({
        revalidate: 60,
        tags: ['dashboard-closed-won'],
      }),
    );
    expect(result.data.rows[0]).toMatchObject({
      accountName: 'Acme',
      opportunityName: 'Acme Renewal',
      users: '88',
      acv: '$125,000',
    });
    expect(result.meta.queryCount).toBe(1);
    expect(result.meta.bytesProcessed).toBe(33);
  });

  it('bypasses unstable_cache when cache mode is off', async () => {
    const queryRows = vi.fn().mockResolvedValue({
      rows: [
        {
          tile_id: 'new_logo_bookings_amount',
          label: 'Bookings $',
          sort_order: 1,
          format_type: 'currency',
          current_value: 100,
          previous_value: 80,
        },
      ],
      bytesProcessed: 10,
    });

    const { getDashboardCategorySnapshot } =
      await import('@/lib/server/get-dashboard-category-snapshot');

    await getDashboardCategorySnapshot(
      {
        activeCategory: 'New Logo',
        selectedTileId: 'new_logo_bookings_amount',
        filters: {},
        dateRange: { startDate: '2026-01-01', endDate: '2026-03-31' },
        previousDateRange: { startDate: '2025-01-01', endDate: '2025-03-31' },
      },
      { queryRows },
      { cacheMode: 'off' },
    );

    expect(unstableCacheMock).not.toHaveBeenCalled();
    expect(queryRows).toHaveBeenCalled();
  });
});
