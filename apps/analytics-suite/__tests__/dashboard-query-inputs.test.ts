import { describe, expect, it } from 'vitest';
import { parseDashboardSearchParams } from '@/lib/dashboard/query-inputs';

describe('dashboard query inputs', () => {
  it('defaults the landing page to Expansion when no category is provided', () => {
    const state = parseDashboardSearchParams(new URLSearchParams());

    expect(state.activeCategory).toBe('Expansion');
    expect(state.selectedTileId).toBe('expansion_bookings_amount');
  });
});
