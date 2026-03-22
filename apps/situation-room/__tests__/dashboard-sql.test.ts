import { describe, expect, it } from 'vitest';
import {
  buildFilterDictionaryQuery,
  buildTileSnapshotQuery,
  buildTileTrendQuery,
} from '@/lib/bigquery/dashboard-sql';

describe('dashboard sql', () => {
  it('builds a tile snapshot query scoped to one tile and one category', () => {
    const query = buildTileSnapshotQuery({
      category: 'New Logo',
      tileId: 'new_logo_bookings_amount',
      dateRange: { startDate: '2026-01-01', endDate: '2026-03-31' },
      previousDateRange: { startDate: '2025-01-01', endDate: '2025-03-31' },
      filters: { Division: ['Enterprise'] },
    });

    expect(query.sql).toContain('Bookings $');
    expect(query.sql).toContain('Division IN UNNEST(@filter_division)');
    expect(query.sql).toContain('DATE(@currentStartDate)');
    expect(query.sql).toContain('DATE(@previousEndDate)');
    expect(query.params).toMatchObject({
      currentStartDate: '2026-01-01',
      currentEndDate: '2026-03-31',
      previousStartDate: '2025-01-01',
      previousEndDate: '2025-03-31',
      filter_division: ['Enterprise'],
    });
  });

  it('builds a weekly trend query with aligned current and previous ranges', () => {
    const query = buildTileTrendQuery({
      category: 'New Logo',
      tileId: 'new_logo_bookings_amount',
      dateRange: { startDate: '2026-01-01', endDate: '2026-03-31' },
      previousDateRange: { startDate: '2025-01-01', endDate: '2025-03-31' },
      filters: {},
    });

    expect(query.sql).toContain('DATE_TRUNC');
    expect(query.sql).toContain('WEEK');
    expect(query.sql).toContain('current_value');
    expect(query.sql).toContain('previous_value');
    expect(query.params.currentStartDate).toBe('2026-01-01');
    expect(query.params.previousStartDate).toBe('2025-01-01');
  });

  it('builds a global dictionary query without contextual filters', () => {
    const query = buildFilterDictionaryQuery('Division');
    expect(query.sql).toContain('distinct');
    expect(query.sql).not.toContain('where Division in');
    expect(query.params).toEqual({});
  });

  it('supports non-new-logo tile ids instead of misparsing their metric key', () => {
    const query = buildTileSnapshotQuery({
      category: 'Expansion',
      tileId: 'expansion_bookings_amount',
      dateRange: { startDate: '2026-01-01', endDate: '2026-03-31' },
      previousDateRange: { startDate: '2025-01-01', endDate: '2025-03-31' },
      filters: {},
    });

    expect(query.sql).toContain('Bookings $');
    expect(query.sql).toContain("Type = 'Existing Business'");
  });

  it('keeps user-controlled filter values out of the SQL text', () => {
    const query = buildTileSnapshotQuery({
      category: 'Total',
      tileId: 'total_one_time_revenue',
      dateRange: { startDate: '2026-01-01', endDate: '2026-03-31' },
      previousDateRange: { startDate: '2025-01-01', endDate: '2025-03-31' },
      filters: { Owner: [`O'Hara`] },
    });

    expect(query.sql).toContain('Owner IN UNNEST(@filter_owner)');
    expect(query.sql).not.toContain(`O'Hara`);
    expect(query.params.filter_owner).toEqual([`O'Hara`]);
  });
});
