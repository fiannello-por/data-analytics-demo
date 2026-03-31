import { describe, expect, it } from 'vitest';
import { getInitialBootstrapScope } from '@/components/dashboard/dashboard-shell';
import type { CategorySnapshotPayload } from '@/lib/dashboard/contracts';
import { getCategoryTiles, type Category } from '@/lib/dashboard/catalog';

function createSnapshot(
  category: Category,
  variant: 'complete' | 'partial' = 'complete',
): CategorySnapshotPayload {
  const tiles = getCategoryTiles(category);
  const rows = (variant === 'complete' ? tiles : tiles.slice(0, 1)).map(
    (tile) => ({
      tileId: tile.tileId,
      label: tile.label,
      sortOrder: tile.sortOrder,
      formatType: tile.formatType,
      currentValue: '$0',
      previousValue: '$0',
      pctChange: '0%',
    }),
  );

  return {
    category,
    currentWindowLabel: 'Jan 1, 2026 - Mar 31, 2026',
    previousWindowLabel: 'Jan 1, 2025 - Mar 31, 2025',
    lastRefreshedAt: '2026-03-30T00:00:00.000Z',
    rows,
    tileTimings: rows.map((row) => ({
      tileId: row.tileId,
      durationMs: 1,
    })),
  };
}

describe('dashboard shell bootstrap scope', () => {
  it('bootstraps overview and closed won when overview data is missing', () => {
    expect(
      getInitialBootstrapScope({
        activeCategory: 'Overview',
        snapshotByCategory: {},
        hasClosedWonData: false,
      }),
    ).toEqual({
      overview: true,
      snapshot: false,
      trend: false,
      closedWon: true,
      detailCategory: 'New Logo',
      closedWonCategory: 'Total',
    });
  });

  it('bootstraps snapshot and closed won when category data is missing', () => {
    expect(
      getInitialBootstrapScope({
        activeCategory: 'New Logo',
        snapshotByCategory: {},
        hasClosedWonData: false,
      }),
    ).toEqual({
      overview: false,
      snapshot: true,
      trend: false,
      closedWon: true,
      detailCategory: 'New Logo',
      closedWonCategory: 'New Logo',
    });
  });

  it('skips bootstrap when overview data and closed won are already cached', () => {
    expect(
      getInitialBootstrapScope({
        activeCategory: 'Overview',
        snapshotByCategory: {
          'New Logo': createSnapshot('New Logo'),
          Expansion: createSnapshot('Expansion'),
          Migration: createSnapshot('Migration'),
          Renewal: createSnapshot('Renewal'),
          Total: createSnapshot('Total'),
        },
        hasClosedWonData: true,
      }),
    ).toBeNull();
  });

  it('bootstraps only closed won when category snapshot is cached but the table is missing', () => {
    expect(
      getInitialBootstrapScope({
        activeCategory: 'Expansion',
        snapshotByCategory: {
          Expansion: createSnapshot('Expansion'),
        },
        hasClosedWonData: false,
      }),
    ).toEqual({
      overview: false,
      snapshot: false,
      trend: false,
      closedWon: true,
      detailCategory: 'Expansion',
      closedWonCategory: 'Expansion',
    });
  });

  it('keeps snapshot bootstrap enabled when the cached active category snapshot is only partial', () => {
    expect(
      getInitialBootstrapScope({
        activeCategory: 'New Logo',
        snapshotByCategory: {
          'New Logo': createSnapshot('New Logo', 'partial'),
        },
        hasClosedWonData: true,
      }),
    ).toEqual({
      overview: false,
      snapshot: true,
      trend: false,
      closedWon: false,
      detailCategory: 'New Logo',
      closedWonCategory: 'New Logo',
    });
  });
});
