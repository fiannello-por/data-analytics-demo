import { describe, expect, it } from 'vitest';
import {
  addDashboardFilterValue,
  buildDashboardCategoryUrl,
  buildDashboardTrendUrl,
  removeDashboardFilterValue,
  parseDashboardSearchParams,
  serializeDashboardSnapshotSearchParams,
  serializeDashboardStateSearchParams,
  serializeDashboardStateKey,
  setDashboardActiveCategory,
} from '@/lib/dashboard/query-inputs';

describe('dashboard query inputs', () => {
  it('defaults to Overview when no category is present', () => {
    const state = parseDashboardSearchParams(new URLSearchParams());

    expect(state.activeCategory).toBe('Overview');
  });

  it('normalizes dashboard search params into stable state', () => {
    const params = new URLSearchParams();
    params.append('category', 'New Logo');
    params.append('Division', 'B');
    params.append('Division', 'A');

    const state = parseDashboardSearchParams(params);

    expect(state.activeCategory).toBe('New Logo');
    expect(state.filters.Division).toEqual(['A', 'B']);
  });

  it('parses Overview as the active dashboard tab', () => {
    const params = new URLSearchParams();
    params.set('category', 'Overview');

    const state = parseDashboardSearchParams(params);

    expect(state.activeCategory).toBe('Overview');
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

  it('serializes dashboard state to stable URL search params', () => {
    const params = serializeDashboardStateSearchParams({
      activeCategory: 'Renewal',
      selectedTileId: 'renewal_sql',
      filters: {
        Owner: ['Bravo', 'Alpha'],
        Division: ['Enterprise'],
      },
      dateRange: {
        startDate: '2026-01-01',
        endDate: '2026-03-31',
      },
    });

    expect(params.toString()).toBe(
      'category=Renewal&startDate=2026-01-01&endDate=2026-03-31&Division=Enterprise&Owner=Alpha&Owner=Bravo&tileId=renewal_sql',
    );
  });

  it('builds dashboard category and trend endpoint urls from state', () => {
    const state = {
      activeCategory: 'New Logo' as const,
      selectedTileId: 'new_logo_bookings_amount',
      filters: { Division: ['Enterprise'] },
      dateRange: { startDate: '2026-01-01', endDate: '2026-03-31' },
    };

    expect(serializeDashboardSnapshotSearchParams(state).toString()).toBe(
      'category=New+Logo&startDate=2026-01-01&endDate=2026-03-31&Division=Enterprise',
    );
    expect(buildDashboardCategoryUrl(state)).toBe(
      '/api/dashboard/category/New%20Logo?category=New+Logo&startDate=2026-01-01&endDate=2026-03-31&Division=Enterprise',
    );
    expect(buildDashboardTrendUrl(state)).toBe(
      '/api/dashboard/trend/new_logo_bookings_amount?category=New+Logo&startDate=2026-01-01&endDate=2026-03-31&Division=Enterprise&tileId=new_logo_bookings_amount',
    );
  });

  it('adds and removes filter values deterministically', () => {
    const added = addDashboardFilterValue(
      { Division: ['Enterprise'] },
      'Division',
      'SMB',
    );
    const deduped = addDashboardFilterValue(added, 'Division', 'Enterprise');
    const removed = removeDashboardFilterValue(
      deduped,
      'Division',
      'Enterprise',
    );

    expect(added.Division).toEqual(['Enterprise', 'SMB']);
    expect(deduped.Division).toEqual(['Enterprise', 'SMB']);
    expect(removed.Division).toEqual(['SMB']);
  });

  it('defaults the selected tile when the active category changes', () => {
    const nextState = setDashboardActiveCategory(
      {
        activeCategory: 'New Logo',
        selectedTileId: 'new_logo_sql',
        filters: { Division: ['Enterprise'] },
        dateRange: { startDate: '2026-01-01', endDate: '2026-03-31' },
        previousDateRange: { startDate: '2025-01-01', endDate: '2025-03-31' },
        trendGrain: 'weekly',
      },
      'Total',
    );

    expect(nextState.activeCategory).toBe('Total');
    expect(nextState.selectedTileId).toBe('total_bookings_amount');
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
      endDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
  });
});
