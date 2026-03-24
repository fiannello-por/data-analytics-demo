import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock('server-only', () => ({}));

describe('dashboard v2 server loaders', { timeout: 20000 }, () => {
  it('maps semantic snapshot query groups back into the legacy category snapshot payload shape', async () => {
    const runtime = {
      runQuery: vi.fn(async (request: { measures?: string[]; filters?: Array<{ values?: string[] }> }) => {
        const isPreviousRange = request.filters?.some((filter) =>
          filter.values?.includes('2025-01-01'),
        );
        const value = isPreviousRange ? 80 : 100;

        return {
          rows: [
            Object.fromEntries(
              (request.measures ?? []).map((measure) => [
                measure,
                {
                  raw: value,
                  formatted: String(value),
                },
              ]),
            ),
          ],
          meta: {
            source: 'lightdash' as const,
            model: 'sales_dashboard_v2_opportunity_base',
            queryCount: 1,
            compiledSql: 'select 1',
            compileDurationMs: 1,
            executionDurationMs: 2,
            bytesProcessed: 64,
          },
        };
      }),
    } as Parameters<typeof import('@/lib/server/v2/get-dashboard-category-snapshot')['getDashboardV2CategorySnapshot']>[1];

    const { getDashboardV2CategorySnapshot } = await import(
      '@/lib/server/v2/get-dashboard-category-snapshot'
    );

    const result = await getDashboardV2CategorySnapshot(
      {
        activeCategory: 'New Logo',
        selectedTileId: 'new_logo_bookings_amount',
        filters: { Division: ['Enterprise'] },
        dateRange: { startDate: '2026-01-01', endDate: '2026-03-31' },
        previousDateRange: { startDate: '2025-01-01', endDate: '2025-03-31' },
      },
      runtime,
      { cacheMode: 'off' },
    );

    expect(result.data.category).toBe('New Logo');
    expect(result.data.rows[0]).toMatchObject({
      tileId: 'new_logo_bookings_amount',
      currentValue: '$100',
      previousValue: '$80',
      pctChange: '+25%',
    });
    expect(result.data.rows).toHaveLength(13);
    expect(result.meta.source).toBe('lightdash');
    expect(result.meta.queryCount).toBeGreaterThan(1);
  });

  it('maps semantic dimension results into filter dictionary options', async () => {
    const runtime = {
      runQuery: vi.fn(async () => ({
        rows: [
          { division: { raw: 'Enterprise', formatted: 'Enterprise' } },
          { division: { raw: 'SMB', formatted: 'SMB' } },
        ],
        meta: {
          source: 'lightdash' as const,
          model: 'sales_dashboard_v2_opportunity_base',
          queryCount: 1,
          compiledSql: 'select division from demo',
          compileDurationMs: 1,
          executionDurationMs: 2,
          bytesProcessed: 8,
        },
      })),
    } as Parameters<typeof import('@/lib/server/v2/get-dashboard-filter-dictionary')['getDashboardV2FilterDictionary']>[1];

    const { getDashboardV2FilterDictionary } = await import(
      '@/lib/server/v2/get-dashboard-filter-dictionary'
    );

    const result = await getDashboardV2FilterDictionary(
      'Division',
      runtime,
      { cacheMode: 'off' },
    );

    expect(result.data).toEqual({
      filterKey: 'Division',
      options: [
        { value: 'Enterprise', label: 'Enterprise', sortOrder: 1 },
        { value: 'SMB', label: 'SMB', sortOrder: 2 },
      ],
    });
    expect(result.meta.source).toBe('lightdash');
  });
});
