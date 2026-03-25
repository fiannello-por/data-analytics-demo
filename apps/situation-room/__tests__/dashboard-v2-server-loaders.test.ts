import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock('server-only', () => ({}));

describe('dashboard v2 server loaders', { timeout: 20000 }, () => {
  it('maps semantic snapshot query groups back into the legacy category snapshot payload shape', async () => {
    const runtime = {
      getCatalogEntries: vi.fn(),
      runQuery: vi.fn(
        async (request: {
          measures?: string[];
          filters?: Array<{ values?: string[] }>;
        }) => {
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
        },
      ),
    } as Parameters<
      (typeof import('@/lib/server/v2/get-dashboard-category-snapshot'))['getDashboardV2CategorySnapshot']
    >[1];

    const { getDashboardV2CategorySnapshot } =
      await import('@/lib/server/v2/get-dashboard-category-snapshot');

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
    const trace = result.data.rows[0]?.backendTrace;
    expect(trace).toBeDefined();
    expect(trace).toMatchObject({
      kind: 'composite',
      model: 'sales_dashboard_v2_opportunity_base',
    });
    expect(trace?.includes).toEqual(
      expect.arrayContaining(['Bookings $', 'Bookings #']),
    );
    expect(trace?.executions).toHaveLength(2);
    expect(trace?.executions[0]).toMatchObject({
      label: 'Current window',
      compiledSql: 'select 1',
    });
    expect(result.data.specBindings?.mainMetricsSnapshot.rows[0]).toEqual({
      tileId: 'new_logo_bookings_amount',
      label: 'Bookings $',
      currentValue: '$100',
      previousValue: '$80',
      pctChange: '+25%',
    });
    expect(
      result.data.specBindings?.mainMetricsSnapshot.traces
        .new_logo_bookings_amount,
    ).toMatchObject({
      kind: 'composite',
      model: 'sales_dashboard_v2_opportunity_base',
    });
    expect(result.data.rows).toHaveLength(13);
    expect(result.meta.source).toBe('lightdash');
    expect(result.meta.queryCount).toBeGreaterThan(1);
  });

  it('maps semantic dimension results into filter dictionary options', async () => {
    const runtime = {
      getCatalogEntries: vi.fn(),
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
    } as Parameters<
      (typeof import('@/lib/server/v2/get-dashboard-filter-dictionary'))['getDashboardV2FilterDictionary']
    >[1];

    const { getDashboardV2FilterDictionary } =
      await import('@/lib/server/v2/get-dashboard-filter-dictionary');

    const result = await getDashboardV2FilterDictionary('Division', runtime, {
      cacheMode: 'off',
    });

    expect(result.data).toEqual({
      filterKey: 'Division',
      options: [
        { value: 'Enterprise', label: 'Enterprise', sortOrder: 1 },
        { value: 'SMB', label: 'SMB', sortOrder: 2 },
      ],
    });
    expect(result.meta.source).toBe('lightdash');
  });

  it('attaches single-tile backend trace metadata to trend and closed won payloads', async () => {
    const runtime = {
      getCatalogEntries: vi.fn(),
      runQuery: vi
        .fn()
        .mockResolvedValueOnce({
          rows: [
            {
              close_date_week: { raw: '2026-01-05', formatted: '2026-01-05' },
              bookings_amount: { raw: 100, formatted: '100' },
            },
          ],
          meta: {
            source: 'lightdash' as const,
            model: 'sales_dashboard_v2_opportunity_base',
            queryCount: 1,
            compiledSql: 'select current trend',
            compileDurationMs: 1,
            executionDurationMs: 2,
            bytesProcessed: 64,
            cacheStatus: 'miss' as const,
          },
        })
        .mockResolvedValueOnce({
          rows: [
            {
              close_date_week: { raw: '2025-01-06', formatted: '2025-01-06' },
              bookings_amount: { raw: 80, formatted: '80' },
            },
          ],
          meta: {
            source: 'lightdash' as const,
            model: 'sales_dashboard_v2_opportunity_base',
            queryCount: 1,
            compiledSql: 'select previous trend',
            compileDurationMs: 1,
            executionDurationMs: 2,
            bytesProcessed: 64,
            cacheStatus: 'hit' as const,
          },
        })
        .mockResolvedValueOnce({
          rows: [
            {
              account_name: { raw: 'Acme', formatted: 'Acme' },
              account_link: { raw: null, formatted: '' },
              opportunity_name: { raw: 'Big Deal', formatted: 'Big Deal' },
              opportunity_link: { raw: null, formatted: '' },
              close_date: { raw: '2026-03-01', formatted: '2026-03-01' },
              created_date: { raw: '2026-01-01', formatted: '2026-01-01' },
              division: { raw: 'Enterprise', formatted: 'Enterprise' },
              type: { raw: 'New', formatted: 'New' },
              product_family: { raw: 'Core', formatted: 'Core' },
              booking_plan_opp_type_2025: { raw: 'Plan', formatted: 'Plan' },
              owner: { raw: 'Alice', formatted: 'Alice' },
              sdr: { raw: 'Sam', formatted: 'Sam' },
              opp_record_type: { raw: 'POR', formatted: 'POR' },
              age_days: { raw: 12, formatted: '12' },
              se: { raw: 'Pat', formatted: 'Pat' },
              quarter_label: { raw: '2026-Q1', formatted: '2026-Q1' },
              contract_start_date: {
                raw: '2026-04-01',
                formatted: '2026-04-01',
              },
              users: { raw: 5, formatted: '5' },
              acv: { raw: 120000, formatted: '120000' },
            },
          ],
          meta: {
            source: 'lightdash' as const,
            model: 'sales_dashboard_v2_closed_won',
            queryCount: 1,
            compiledSql: 'select closed won',
            compileDurationMs: 1,
            executionDurationMs: 2,
            bytesProcessed: 64,
            cacheStatus: 'miss' as const,
          },
        }),
    } as Parameters<
      (typeof import('@/lib/server/v2/get-dashboard-tile-trend'))['getDashboardV2TileTrend']
    >[1];

    const { getDashboardV2TileTrend } =
      await import('@/lib/server/v2/get-dashboard-tile-trend');
    const { getDashboardV2ClosedWonOpportunities } =
      await import('@/lib/server/v2/get-dashboard-closed-won-opportunities');

    const trend = await getDashboardV2TileTrend(
      {
        activeCategory: 'New Logo',
        selectedTileId: 'new_logo_bookings_amount',
        filters: { Division: ['Enterprise'] },
        dateRange: { startDate: '2026-01-01', endDate: '2026-03-31' },
        previousDateRange: { startDate: '2025-01-01', endDate: '2025-03-31' },
        trendGrain: 'weekly',
      },
      runtime,
      { cacheMode: 'off' },
    );

    expect(trend.data.backendTrace).toBeDefined();
    expect(trend.data.backendTrace).toMatchObject({
      kind: 'single',
      model: 'sales_dashboard_v2_opportunity_base',
    });
    expect(trend.data.xAxisFieldLabel).toBe('Close Date');
    expect(trend.data.backendTrace?.executions).toHaveLength(2);
    expect(trend.data.backendTrace?.executions[0]?.compiledSql).toBe(
      'select current trend',
    );
    expect(trend.data.specBindings?.selectedMetricTrend).toEqual({
      status: 'ready',
      xAxisLabel: 'Close Date',
      rows: [
        {
          bucketKey: '0',
          bucketLabel: '2026-01-05',
          currentValue: 100,
          previousValue: 80,
        },
      ],
      trace: trend.data.backendTrace,
    });

    const closedWon = await getDashboardV2ClosedWonOpportunities(
      {
        activeCategory: 'New Logo',
        filters: { Division: ['Enterprise'] },
        dateRange: { startDate: '2026-01-01', endDate: '2026-03-31' },
      },
      runtime,
      { cacheMode: 'off' },
    );

    expect(closedWon.data.backendTrace).toBeDefined();
    expect(closedWon.data.backendTrace).toMatchObject({
      kind: 'single',
      model: 'sales_dashboard_v2_closed_won',
      includes: ['Closed Won Opportunities'],
    });
    expect(closedWon.data.backendTrace?.executions).toHaveLength(1);
  });
});
