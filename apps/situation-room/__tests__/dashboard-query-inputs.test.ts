import { describe, expect, it } from 'vitest';
import {
  parseDashboardSearchParams,
  serializeDashboardStateKey,
} from '@/lib/dashboard/query-inputs';

describe('dashboard query inputs', () => {
  it('normalizes dashboard search params into stable state', () => {
    const params = new URLSearchParams();
    params.append('category', 'New Logo');
    params.append('Division', 'B');
    params.append('Division', 'A');

    const state = parseDashboardSearchParams(params);

    expect(state.activeCategory).toBe('New Logo');
    expect(state.filters.Division).toEqual(['A', 'B']);
  });

  it('serializes identical filter states to the same key', () => {
    const left = serializeDashboardStateKey({
      activeCategory: 'New Logo',
      filters: { Division: ['A', 'B'] },
    });
    const right = serializeDashboardStateKey({
      activeCategory: 'New Logo',
      filters: { Division: ['B', 'A'] },
    });

    expect(left).toBe(right);
  });

  it('falls back to the default tile when tileId does not belong to the category', () => {
    const params = new URLSearchParams();
    params.set('category', 'Total');
    params.set('tileId', 'new_logo_bookings_amount');

    const state = parseDashboardSearchParams(params);

    expect(state.selectedTileId).toBe('total_bookings_amount');
  });

  it('falls back to the current-year range when URL dates are malformed', () => {
    const params = new URLSearchParams();
    params.set('startDate', 'bad-date');
    params.set('endDate', 'still-bad');

    const state = parseDashboardSearchParams(params);

    expect(state.dateRange).toEqual({
      startDate: expect.stringMatching(/^\d{4}-01-01$/),
      endDate: expect.stringMatching(/^\d{4}-12-31$/),
    });
  });
});
