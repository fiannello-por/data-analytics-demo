import { describe, expect, it } from 'vitest';
import type {
  CategorySnapshotGroupPayload,
  CategorySnapshotPayload,
} from '@/lib/dashboard/contracts';
import {
  getCategorySnapshotGroupManifest,
  isCategorySnapshotComplete,
  mergeCategorySnapshotGroupPayload,
} from '@/lib/dashboard/progressive-snapshot';

function createGroupPayload(
  input: Pick<CategorySnapshotGroupPayload, 'category' | 'groupId' | 'rows'>,
): CategorySnapshotGroupPayload {
  return {
    category: input.category,
    groupId: input.groupId,
    currentWindowLabel: 'Jan 1, 2026 - Mar 31, 2026',
    previousWindowLabel: 'Jan 1, 2025 - Mar 31, 2025',
    lastRefreshedAt: '2026-03-30T00:00:00.000Z',
    rows: input.rows,
    tileTimings: input.rows.map((row) => ({
      tileId: row.tileId,
      durationMs: 10,
    })),
  };
}

describe('progressive category snapshots', () => {
  it('returns a stable ordered group manifest for the category', () => {
    expect(getCategorySnapshotGroupManifest('New Logo')).toEqual([
      {
        category: 'New Logo',
        groupId: 'new_logo_bookings_amount',
        tileIds: [
          'new_logo_bookings_amount',
          'new_logo_bookings_count',
          'new_logo_close_rate',
          'new_logo_avg_age',
          'new_logo_avg_booked_deal',
        ],
      },
      {
        category: 'New Logo',
        groupId: 'new_logo_annual_pacing_ytd',
        tileIds: ['new_logo_annual_pacing_ytd'],
      },
      {
        category: 'New Logo',
        groupId: 'new_logo_avg_quoted_deal',
        tileIds: [
          'new_logo_avg_quoted_deal',
          'new_logo_sql',
          'new_logo_sdr_points',
        ],
      },
      {
        category: 'New Logo',
        groupId: 'new_logo_pipeline_created',
        tileIds: ['new_logo_pipeline_created'],
      },
      {
        category: 'New Logo',
        groupId: 'new_logo_sqo',
        tileIds: ['new_logo_sqo', 'new_logo_sqo_users'],
      },
      {
        category: 'New Logo',
        groupId: 'new_logo_gate_1_complete',
        tileIds: ['new_logo_gate_1_complete'],
      },
    ]);
  });

  it('merges group payloads without duplicating rows and preserves sort order', () => {
    const firstGroup = createGroupPayload({
      category: 'New Logo',
      groupId: 'new_logo_avg_quoted_deal',
      rows: [
        {
          tileId: 'new_logo_avg_quoted_deal',
          label: 'Avg Quoted Deal',
          sortOrder: 7,
          formatType: 'currency',
          currentValue: '$4,492',
          previousValue: '$4,654',
          pctChange: '-3.5%',
        },
        {
          tileId: 'new_logo_sql',
          label: 'SQL',
          sortOrder: 9,
          formatType: 'number',
          currentValue: '657',
          previousValue: '751',
          pctChange: '-12.5%',
        },
      ],
    });
    const secondGroup = createGroupPayload({
      category: 'New Logo',
      groupId: 'new_logo_bookings_amount',
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
    });

    const merged = mergeCategorySnapshotGroupPayload(null, firstGroup);
    const remerged = mergeCategorySnapshotGroupPayload(merged, secondGroup);

    expect(remerged.rows.map((row) => row.tileId)).toEqual([
      'new_logo_bookings_amount',
      'new_logo_avg_quoted_deal',
      'new_logo_sql',
    ]);
    expect(remerged.tileTimings.map((timing) => timing.tileId)).toEqual([
      'new_logo_bookings_amount',
      'new_logo_avg_quoted_deal',
      'new_logo_sql',
    ]);
  });

  it('treats partial snapshots as incomplete until every tile row is loaded', () => {
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

    expect(isCategorySnapshotComplete('New Logo', null)).toBe(false);
    expect(isCategorySnapshotComplete('New Logo', partialSnapshot)).toBe(false);

    const completeSnapshot = getCategorySnapshotGroupManifest(
      'New Logo',
    ).reduce(
      (snapshot, group, index) =>
        mergeCategorySnapshotGroupPayload(
          snapshot,
          createGroupPayload({
            category: 'New Logo',
            groupId: group.groupId,
            rows: group.tileIds.map((tileId, rowIndex) => ({
              tileId,
              label: `${tileId}-label`,
              sortOrder: index * 10 + rowIndex + 1,
              formatType: 'number',
              currentValue: '1',
              previousValue: '1',
              pctChange: '0%',
            })),
          }),
        ),
      null as CategorySnapshotPayload | null,
    );

    expect(isCategorySnapshotComplete('New Logo', completeSnapshot)).toBe(true);
  });
});
