import { describe, expect, it } from 'vitest';
import { getInitialBootstrapScope } from '@/components/dashboard/dashboard-shell';
import type { CategorySnapshotPayload } from '@/lib/dashboard/contracts';
import type { Category } from '@/lib/dashboard/catalog';

function createSnapshot(category: Category): CategorySnapshotPayload {
  return {
    category,
    currentWindowLabel: 'Jan 1, 2026 - Mar 31, 2026',
    previousWindowLabel: 'Jan 1, 2025 - Mar 31, 2025',
    lastRefreshedAt: '2026-03-30T00:00:00.000Z',
    rows: [],
    tileTimings: [],
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
});
