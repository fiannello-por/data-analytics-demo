import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildSnapshotGroupQuery,
  buildTrendQuery,
  getSnapshotGroups,
} from '@/lib/dashboard-v2/semantic-registry';
import type { Category } from '@/lib/dashboard/catalog';

describe('total metric semantic queries', () => {
  const dateRange = {
    startDate: '2026-01-01',
    endDate: '2026-03-15',
  } as const;
  const partialDateRange = {
    startDate: '2026-02-01',
    endDate: '2026-03-15',
  } as const;

  it('applies Closed Won and positive ACV filters to total booked metrics', () => {
    const bookedGroup = getSnapshotGroups('Total').find((group) =>
      group.tiles.some((tile) => tile.tileId === 'total_bookings_amount'),
    );

    expect(bookedGroup).toBeDefined();

    const query = buildSnapshotGroupQuery(
      'Total',
      {},
      dateRange,
      bookedGroup ?? getSnapshotGroups('Total')[0]!,
    );

    expect(query.filters).toEqual(
      expect.arrayContaining([
        {
          field: 'won',
          operator: 'equals',
          values: [true],
        },
        {
          field: 'stage_name',
          operator: 'equals',
          values: ['Closed Won'],
        },
        {
          field: 'acv',
          operator: 'greaterThan',
          values: [0],
        },
      ]),
    );
  });

  it('uses the same booked-metric filters in the total bookings trend query', () => {
    const query = buildTrendQuery(
      'Total',
      'total_bookings_amount',
      {},
      dateRange,
    );

    expect(query.filters).toEqual(
      expect.arrayContaining([
        {
          field: 'won',
          operator: 'equals',
          values: [true],
        },
        {
          field: 'stage_name',
          operator: 'equals',
          values: ['Closed Won'],
        },
        {
          field: 'acv',
          operator: 'greaterThan',
          values: [0],
        },
      ]),
    );
  });

  it('normalizes annual pacing snapshot queries to YTD through the selected end date', () => {
    const pacingGroup = getSnapshotGroups('Total').find((group) =>
      group.tiles.some((tile) => tile.tileId === 'total_annual_pacing_ytd'),
    );

    expect(pacingGroup).toBeDefined();

    const query = buildSnapshotGroupQuery(
      'Total',
      {},
      partialDateRange,
      pacingGroup ?? getSnapshotGroups('Total')[0]!,
    );

    expect(query.filters).toEqual(
      expect.arrayContaining([
        {
          field: 'close_date',
          operator: 'between',
          values: ['2026-01-01', '2026-03-15'],
        },
      ]),
    );
  });

  it('normalizes annual pacing trend queries to YTD through the selected end date', () => {
    const query = buildTrendQuery(
      'Total',
      'total_annual_pacing_ytd',
      {},
      partialDateRange,
    );

    expect(query.filters).toEqual(
      expect.arrayContaining([
        {
          field: 'close_date',
          operator: 'between',
          values: ['2026-01-01', '2026-03-15'],
        },
      ]),
    );
  });

  it('keeps non-pacing tiles on the exact selected date range', () => {
    const query = buildTrendQuery(
      'Total',
      'total_bookings_amount',
      {},
      partialDateRange,
    );

    expect(query.filters).toEqual(
      expect.arrayContaining([
        {
          field: 'close_date',
          operator: 'between',
          values: ['2026-02-01', '2026-03-15'],
        },
      ]),
    );
  });

  it('does not apply a Closed Won filter to total one-time revenue queries', () => {
    const snapshotGroup = getSnapshotGroups('Total').find((group) =>
      group.tiles.some((tile) => tile.tileId === 'total_one_time_revenue'),
    );

    expect(snapshotGroup).toBeDefined();

    const snapshotQuery = buildSnapshotGroupQuery(
      'Total',
      {},
      dateRange,
      snapshotGroup ?? getSnapshotGroups('Total')[0]!,
    );
    const trendQuery = buildTrendQuery(
      'Total',
      'total_one_time_revenue',
      {},
      dateRange,
    );

    expect(snapshotQuery.filters).not.toEqual(
      expect.arrayContaining([
        {
          field: 'stage_name',
          operator: 'equals',
          values: ['Closed Won'],
        },
      ]),
    );
    expect(trendQuery.filters).not.toEqual(
      expect.arrayContaining([
        {
          field: 'stage_name',
          operator: 'equals',
          values: ['Closed Won'],
        },
      ]),
    );
  });

  const pacingTileByCategory: Array<[Category, string]> = [
    ['New Logo', 'new_logo_annual_pacing_ytd'],
    ['Expansion', 'expansion_annual_pacing_ytd'],
    ['Migration', 'migration_annual_pacing_ytd'],
    ['Renewal', 'renewal_annual_pacing_ytd'],
    ['Total', 'total_annual_pacing_ytd'],
  ];

  it.each(pacingTileByCategory)(
    'normalizes %s annual pacing snapshot queries to YTD through the selected end date',
    (category, tileId) => {
      const pacingGroup = getSnapshotGroups(category).find((group) =>
        group.tiles.some((tile) => tile.tileId === tileId),
      );

      expect(pacingGroup).toBeDefined();

      const query = buildSnapshotGroupQuery(
        category,
        {},
        partialDateRange,
        pacingGroup ?? getSnapshotGroups(category)[0]!,
      );

      expect(query.filters).toEqual(
        expect.arrayContaining([
          {
            field: 'close_date',
            operator: 'between',
            values: ['2026-01-01', '2026-03-15'],
          },
        ]),
      );
    },
  );

  it.each(pacingTileByCategory)(
    'normalizes %s annual pacing trend queries to YTD through the selected end date',
    (category, tileId) => {
      const query = buildTrendQuery(category, tileId, {}, partialDateRange);

      expect(query.filters).toEqual(
        expect.arrayContaining([
          {
            field: 'close_date',
            operator: 'between',
            values: ['2026-01-01', '2026-03-15'],
          },
        ]),
      );
    },
  );
});

describe('app-serving opportunity base SQL', () => {
  it('keeps non-category opportunities available for Total rollups', () => {
    const sql = readFileSync(
      new URL(
        '../__fixtures__/sales_dashboard_v2_opportunity_base.sql',
        import.meta.url,
      ),
      'utf8',
    );

    expect(sql).not.toMatch(/where\s+dashboard_category\s+is\s+not\s+null/i);
  });

  it('persists the fiscal day counter needed for annual pacing parity', () => {
    const sql = readFileSync(
      new URL(
        '../__fixtures__/sales_dashboard_v2_opportunity_base.sql',
        import.meta.url,
      ),
      'utf8',
    );

    expect(sql).toMatch(
      /CalendarDaysPassedSinceFirstDayofCloseDateFY[\s\S]+as calendar_days_passed_since_first_day_of_close_date_fy/i,
    );
  });
});
