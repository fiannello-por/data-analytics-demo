import { describe, expect, it } from 'vitest';
import {
  buildSnapshotGroupQuery,
  buildTrendQuery,
  getSnapshotGroups,
} from '@/lib/dashboard-v2/semantic-registry';

describe('expansion bookings semantic queries', () => {
  const dateRange = {
    startDate: '2026-01-01',
    endDate: '2026-03-15',
  } as const;

  it('applies the source chart filters to expansion bookings snapshot queries', () => {
    const bookingsGroup = getSnapshotGroups('Expansion').find((group) =>
      group.tiles.some((tile) => tile.tileId === 'expansion_bookings_amount'),
    );

    expect(bookingsGroup).toBeDefined();

    const query = buildSnapshotGroupQuery(
      'Expansion',
      {},
      dateRange,
      bookingsGroup ?? getSnapshotGroups('Expansion')[0]!,
    );

    expect(query.filters).toEqual(
      expect.arrayContaining([
        {
          field: 'dashboard_category',
          operator: 'equals',
          values: ['Expansion'],
        },
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
        {
          field: 'close_date',
          operator: 'between',
          values: ['2026-01-01', '2026-03-15'],
        },
      ]),
    );
  });

  it('applies the source chart filters to expansion bookings trend queries', () => {
    const query = buildTrendQuery(
      'Expansion',
      'expansion_bookings_count',
      {},
      dateRange,
    );

    expect(query.filters).toEqual(
      expect.arrayContaining([
        {
          field: 'dashboard_category',
          operator: 'equals',
          values: ['Expansion'],
        },
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
        {
          field: 'close_date',
          operator: 'between',
          values: ['2026-01-01', '2026-03-15'],
        },
      ]),
    );
  });
});
