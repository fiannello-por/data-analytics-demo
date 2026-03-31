import { describe, expect, it } from 'vitest';
import { getTileTableDisplayRows } from '@/components/dashboard/tile-table';
import type { CategorySnapshotPayload } from '@/lib/dashboard/contracts';

describe('tile table display rows', () => {
  it('keeps unloaded rows in place as skeleton entries', () => {
    const partialSnapshot: CategorySnapshotPayload = {
      category: 'New Logo',
      currentWindowLabel: 'Jan 1, 2026 - Mar 31, 2026',
      previousWindowLabel: 'Jan 1, 2025 - Mar 31, 2025',
      lastRefreshedAt: '2026-03-30T00:00:00.000Z',
      rows: [
        {
          tileId: 'new_logo_bookings_amount',
          label: 'Bookings $',
          sortOrder: 1,
          formatType: 'currency',
          currentValue: '$1,332,752',
          previousValue: '$1,086,961',
          pctChange: '+22.6%',
        },
      ],
      tileTimings: [
        {
          tileId: 'new_logo_bookings_amount',
          durationMs: 10,
        },
      ],
    };

    expect(
      getTileTableDisplayRows(partialSnapshot)
        .slice(0, 3)
        .map((row) => ({
          kind: row.kind,
          tileId: row.tileId,
          label: row.label,
        })),
    ).toEqual([
      {
        kind: 'loaded',
        tileId: 'new_logo_bookings_amount',
        label: 'Bookings $',
      },
      {
        kind: 'skeleton',
        tileId: 'new_logo_bookings_count',
        label: 'Bookings #',
      },
      {
        kind: 'skeleton',
        tileId: 'new_logo_annual_pacing_ytd',
        label: 'Annual Pacing (YTD)',
      },
    ]);
  });
});
