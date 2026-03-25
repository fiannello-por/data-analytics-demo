import { describe, expect, it, vi } from 'vitest';
import {
  buildDivisionFilterOptionsQuery,
  buildProbeSummaryQuery,
} from '@/lib/bigquery/probe';
import {
  getProbePing,
  getProbeDivisionFilterOptions,
  getProbeSummary,
  runProbe,
} from '@/lib/server/architecture-probes';

const {
  getDashboardCategorySnapshotMock,
  getDashboardTileTrendMock,
  getDashboardFilterDictionaryMock,
} = vi.hoisted(() => ({
  getDashboardCategorySnapshotMock: vi.fn(),
  getDashboardTileTrendMock: vi.fn(),
  getDashboardFilterDictionaryMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/env.server', () => ({
  getSituationRoomEnv: () => ({
    backend: 'bigquery',
    projectId: 'demo-project',
    dataset: 'custom_dataset',
    location: 'US',
    serviceAccountJson: '{"client_email":"inline"}',
  }),
}));
vi.mock('@/lib/server/get-dashboard-category-snapshot', () => ({
  getDashboardCategorySnapshot: getDashboardCategorySnapshotMock,
}));
vi.mock('@/lib/server/get-dashboard-tile-trend', () => ({
  getDashboardTileTrend: getDashboardTileTrendMock,
}));
vi.mock('@/lib/server/get-dashboard-filter-dictionary', () => ({
  getDashboardFilterDictionary: getDashboardFilterDictionaryMock,
}));

describe('probe SQL builders', () => {
  it('targets the source scorecard table for summary probes', () => {
    const query = buildProbeSummaryQuery('demo-project', 'custom_dataset');

    expect(query.sql).toContain(
      '`demo-project.custom_dataset.scorecard_daily`',
    );
    expect(query.sql).toContain('count(*) as row_count');
    expect(query.sql).toContain('min(report_date) as min_report_date');
    expect(query.sql).toContain('max(report_date) as max_report_date');
    expect(query.params).toEqual({});
  });

  it('targets the source scorecard table for Division filter options', () => {
    const query = buildDivisionFilterOptionsQuery(
      'demo-project',
      'custom_dataset',
    );

    expect(query.sql).toContain(
      '`demo-project.custom_dataset.scorecard_daily`',
    );
    expect(query.sql).toContain('select distinct');
    expect(query.sql).toContain('Division as value');
    expect(query.sql).toContain('dense_rank() over (order by value)');
    expect(query.params).toEqual({});
  });
});

describe('architecture probe loaders', () => {
  it('maps the ping probe into a stable payload', async () => {
    const queryRows = vi.fn().mockResolvedValue({
      rows: [{ ping_value: 1 }],
      bytesProcessed: 11,
    });
    const result = await getProbePing({
      queryRows,
    });

    expect(queryRows).toHaveBeenCalledWith(
      expect.objectContaining({
        sql: 'select 1 as ping_value',
      }),
      { cacheMode: 'auto' },
    );
    expect(result.data).toEqual({
      ok: true,
      refreshedAt: expect.any(String),
      pingValue: 1,
      table: 'custom_dataset.scorecard_daily',
    });
    expect(result.meta).toEqual({
      source: 'bigquery',
      queryCount: 1,
      bytesProcessed: 11,
      cacheMode: 'auto',
    });
  });

  it('maps the summary probe into a stable payload', async () => {
    const result = await getProbeSummary({
      queryRows: vi.fn().mockResolvedValue({
        rows: [
          {
            row_count: 12,
            division_count: 3,
            min_report_date: '2026-03-01',
            max_report_date: '2026-03-21',
          },
        ],
        bytesProcessed: 99,
      }),
    });

    expect(result.data).toEqual({
      dataset: 'custom_dataset',
      table: 'scorecard_daily',
      refreshedAt: expect.any(String),
      rowCount: 12,
      divisionCount: 3,
      minReportDate: '2026-03-01',
      maxReportDate: '2026-03-21',
    });
    expect(result.meta).toEqual({
      source: 'bigquery',
      queryCount: 1,
      bytesProcessed: 99,
      cacheMode: 'auto',
    });
  });

  it('forwards cache mode off into the query client', async () => {
    const queryRows = vi.fn().mockResolvedValue({
      rows: [
        {
          row_count: 12,
          division_count: 3,
          min_report_date: '2026-03-01',
          max_report_date: '2026-03-21',
        },
      ],
      bytesProcessed: 101,
    });

    const result = await getProbeSummary(
      {
        queryRows,
      },
      { cacheMode: 'off' },
    );

    expect(queryRows).toHaveBeenCalledWith(
      expect.objectContaining({
        sql: expect.stringContaining(
          '`demo-project.custom_dataset.scorecard_daily`',
        ),
      }),
      { cacheMode: 'off' },
    );
    expect(result.meta.cacheMode).toBe('off');
  });

  it('maps Division probe options into sorted payload entries', async () => {
    const result = await getProbeDivisionFilterOptions('Division', {
      queryRows: vi.fn().mockResolvedValue({
        rows: [
          { value: 'SMB', label: 'SMB', sort_order: 2 },
          { value: 'Enterprise', label: 'Enterprise', sort_order: 1 },
        ],
        bytesProcessed: 88,
      }),
    });

    expect(result.data).toEqual({
      key: 'Division',
      refreshedAt: expect.any(String),
      optionCount: 2,
      options: [
        { value: 'Enterprise', label: 'Enterprise', sortOrder: 1 },
        { value: 'SMB', label: 'SMB', sortOrder: 2 },
      ],
    });
    expect(result.meta).toEqual({
      source: 'bigquery',
      queryCount: 1,
      bytesProcessed: 88,
      cacheMode: 'auto',
    });
  });

  it('runs the dashboard tile trend probe through the dashboard loader', async () => {
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

    const result = await runProbe('dashboard-tile-trend', {
      cacheMode: 'off',
    });

    expect(getDashboardTileTrendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        activeCategory: 'New Logo',
        selectedTileId: 'new_logo_bookings_amount',
      }),
      undefined,
      { cacheMode: 'off' },
    );
    expect(result.payload).toMatchObject({
      source: 'bigquery',
      cacheMode: 'off',
      tileId: 'new_logo_bookings_amount',
    });
  });

  it('keeps dashboard category snapshot tile timings in the probe payload', async () => {
    getDashboardCategorySnapshotMock.mockResolvedValueOnce({
      data: {
        category: 'New Logo',
        currentWindowLabel: 'Jan 1, 2026 - Mar 31, 2026',
        previousWindowLabel: 'Jan 1, 2025 - Mar 31, 2025',
        lastRefreshedAt: '2026-03-22T00:00:00.000Z',
        rows: [],
        tileTimings: [
          { tileId: 'new_logo_bookings_amount', durationMs: 12.34 },
        ],
      },
      meta: {
        source: 'bigquery',
        queryCount: 13,
        bytesProcessed: 130,
      },
    });

    const result = await runProbe('dashboard-category-snapshot');

    expect(getDashboardCategorySnapshotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        activeCategory: 'New Logo',
      }),
      undefined,
      { cacheMode: 'auto' },
    );
    expect(result.payload).toMatchObject({
      source: 'bigquery',
      tileTimings: [{ tileId: 'new_logo_bookings_amount', durationMs: 12.34 }],
    });
  });

  it('runs the dashboard filter dictionary probe with the requested cache mode', async () => {
    getDashboardFilterDictionaryMock.mockResolvedValueOnce({
      data: {
        filterKey: 'Division',
        options: [],
      },
      meta: {
        source: 'bigquery',
        queryCount: 1,
        bytesProcessed: 22,
        cacheMode: 'off',
      },
    });

    const result = await runProbe('dashboard-filter-dictionary', {
      cacheMode: 'off',
    });

    expect(getDashboardFilterDictionaryMock).toHaveBeenCalledWith(
      'Division',
      undefined,
      { cacheMode: 'off' },
    );
    expect(result.payload.cacheMode).toBe('off');
  });
});
