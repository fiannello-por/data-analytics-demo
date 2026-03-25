import { describe, expect, it } from 'vitest';
import {
  buildClosedWonOpportunitiesQuery,
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
    expect(query.sql).toContain('dense_rank() over (order by value)');
    expect(query.sql).not.toContain('where Division in');
    expect(query.params).toEqual({});
  });

  it('derives Gate Met or Accepted from source fields instead of assuming a physical column', () => {
    const query = buildFilterDictionaryQuery('Gate Met or Accepted');

    expect(query.sql).toContain('CAST((Gate1CriteriaMet OR Accepted) AS STRING)');
    expect(query.sql).not.toContain('GateMetOrAccepted AS value');
  });

  it('applies boolean-like dashboard filters through their stringified expression', () => {
    const query = buildTileSnapshotQuery({
      category: 'New Logo',
      tileId: 'new_logo_bookings_amount',
      dateRange: { startDate: '2026-01-01', endDate: '2026-03-31' },
      previousDateRange: { startDate: '2025-01-01', endDate: '2025-03-31' },
      filters: { 'Gate Met or Accepted': ['true'] },
    });

    expect(query.sql).toContain(
      'CAST((Gate1CriteriaMet OR Accepted) AS STRING) IN UNNEST(@filter_gate_met_or_accepted)',
    );
    expect(query.params.filter_gate_met_or_accepted).toEqual(['true']);
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

  it('builds a closed won opportunities query with current-period filters and ACV sorting', () => {
    const query = buildClosedWonOpportunitiesQuery({
      category: 'New Logo',
      dateRange: { startDate: '2026-01-01', endDate: '2026-03-31' },
      filters: { Division: ['Enterprise'] },
    });

    expect(query.sql).toContain("Won = TRUE");
    expect(query.sql).toContain("StageName = 'Closed Won'");
    expect(query.sql).toContain('Division IN UNNEST(@filter_division)');
    expect(query.sql).toContain('ORDER BY ACV DESC');
    expect(query.params).toMatchObject({
      currentStartDate: '2026-01-01',
      currentEndDate: '2026-03-31',
      filter_division: ['Enterprise'],
    });
  });
});
