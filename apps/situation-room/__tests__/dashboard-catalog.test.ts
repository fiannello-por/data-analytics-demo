import { describe, expect, it } from 'vitest';
import {
  CATEGORY_ORDER,
  DASHBOARD_TAB_ORDER,
  GLOBAL_FILTER_KEYS,
  getDefaultTileId,
  isOverviewTab,
  TILE_CATALOG,
} from '@/lib/dashboard/catalog';

describe('dashboard catalog', () => {
  it('keeps the approved category order', () => {
    expect(CATEGORY_ORDER).toEqual([
      'New Logo',
      'Expansion',
      'Migration',
      'Renewal',
      'Total',
    ]);
  });

  it('includes Overview before the category tabs', () => {
    expect(DASHBOARD_TAB_ORDER).toEqual([
      'Overview',
      'New Logo',
      'Expansion',
      'Migration',
      'Renewal',
      'Total',
    ]);
    expect(isOverviewTab('Overview')).toBe(true);
  });

  it('uses the first curated tile as the default selection', () => {
    expect(getDefaultTileId('New Logo')).toBe('new_logo_bookings_amount');
  });

  it('includes all approved non-date global filters', () => {
    expect(GLOBAL_FILTER_KEYS).toContain('Division');
    expect(GLOBAL_FILTER_KEYS).toContain('Gate Met or Accepted');
  });

  it('keeps total ordered and formatted as approved', () => {
    expect(TILE_CATALOG.Total).toEqual([
      {
        tileId: 'total_bookings_amount',
        label: 'Bookings $',
        sortOrder: 1,
        formatType: 'currency',
      },
      {
        tileId: 'total_bookings_count',
        label: 'Bookings #',
        sortOrder: 2,
        formatType: 'number',
      },
      {
        tileId: 'total_annual_pacing_ytd',
        label: 'Annual Pacing (YTD)',
        sortOrder: 3,
        formatType: 'number',
      },
      {
        tileId: 'total_one_time_revenue',
        label: 'One-time Revenue',
        sortOrder: 4,
        formatType: 'currency',
      },
    ]);
  });
});
