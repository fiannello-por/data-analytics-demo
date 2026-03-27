import { describe, expect, it } from 'vitest';
import {
  buildSnapshotGroupQuery,
  buildTrendQuery,
  getSnapshotGroups,
} from '@/lib/dashboard-v2/semantic-registry';

describe('expansion scorecard semantic queries', () => {
  const dateRange = {
    startDate: '2026-01-01',
    endDate: '2026-03-15',
  } as const;

  it('uses the scorecard-aligned avg age measure and source filters in snapshot queries', () => {
    const avgAgeGroup = getSnapshotGroups('Expansion').find((group) =>
      group.tiles.some((tile) => tile.tileId === 'expansion_avg_age'),
    );

    expect(avgAgeGroup).toBeDefined();

    const query = buildSnapshotGroupQuery(
      'Expansion',
      {},
      dateRange,
      avgAgeGroup ?? getSnapshotGroups('Expansion')[0]!,
    );

    expect(query.measures).toContain('avg_age_scorecard');
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

  it('uses the scorecard-aligned avg age measure and source filters in trend queries', () => {
    const query = buildTrendQuery(
      'Expansion',
      'expansion_avg_age',
      {},
      dateRange,
    );

    expect(query.measures).toEqual(['avg_age_scorecard']);
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

  it('applies the source filters and YTD normalization to expansion annual pacing', () => {
    const query = buildTrendQuery(
      'Expansion',
      'expansion_annual_pacing_ytd',
      {},
      {
        startDate: '2026-02-01',
        endDate: '2026-03-15',
      },
    );

    expect(query.measures).toEqual(['annual_pacing_ytd']);
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
