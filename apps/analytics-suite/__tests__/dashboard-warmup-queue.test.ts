import { describe, expect, it } from 'vitest';
import {
  getNextBackgroundWarmupTask,
  getWarmupCategoryOrder,
} from '@/components/dashboard/dashboard-shell';
import type {
  CategorySnapshotPayload,
  ClosedWonOpportunitiesPayload,
  FilterDictionaryPayload,
} from '@/lib/dashboard/contracts';
import {
  GLOBAL_FILTER_KEYS,
  getCategoryTiles,
  type Category,
  type GlobalFilterKey,
} from '@/lib/dashboard/catalog';

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

function createClosedWon(category: Category): ClosedWonOpportunitiesPayload {
  return {
    category,
    currentWindowLabel: 'Jan 1, 2026 - Mar 31, 2026',
    lastRefreshedAt: '2026-03-30T00:00:00.000Z',
    rows: [],
  };
}

function createDictionary(key: GlobalFilterKey): FilterDictionaryPayload {
  return {
    filterKey: key,
    options: [],
  };
}

describe('dashboard warmup queue', () => {
  it('orders hidden categories after the active category', () => {
    expect(getWarmupCategoryOrder('New Logo')).toEqual([
      'Expansion',
      'Migration',
      'Renewal',
      'Total',
    ]);
  });

  it('uses the full category order when overview is active', () => {
    expect(getWarmupCategoryOrder('Overview')).toEqual([
      'New Logo',
      'Expansion',
      'Migration',
      'Renewal',
      'Total',
    ]);
  });

  it('warms missing hidden tab snapshots before closed won or filters', () => {
    expect(
      getNextBackgroundWarmupTask({
        activeCategory: 'New Logo',
        snapshotByCategory: {
          'New Logo': createSnapshot('New Logo'),
        },
        closedWonByCategory: {
          'New Logo': createClosedWon('New Logo'),
        },
        dictionaries: {},
      }),
    ).toEqual({
      kind: 'snapshot',
      category: 'Expansion',
    });
  });

  it('warms closed won for hidden tabs after snapshots are cached', () => {
    expect(
      getNextBackgroundWarmupTask({
        activeCategory: 'Overview',
        snapshotByCategory: {
          'New Logo': createSnapshot('New Logo'),
          Expansion: createSnapshot('Expansion'),
          Migration: createSnapshot('Migration'),
          Renewal: createSnapshot('Renewal'),
          Total: createSnapshot('Total'),
        },
        closedWonByCategory: {
          Total: createClosedWon('Total'),
        },
        dictionaries: {},
      }),
    ).toEqual({
      kind: 'closedWon',
      category: 'New Logo',
    });
  });

  it('waits until all tab warmup work finishes before prefetching filters', () => {
    expect(
      getNextBackgroundWarmupTask({
        activeCategory: 'Renewal',
        snapshotByCategory: {
          'New Logo': createSnapshot('New Logo'),
          Expansion: createSnapshot('Expansion'),
          Migration: createSnapshot('Migration'),
          Renewal: createSnapshot('Renewal'),
          Total: createSnapshot('Total'),
        },
        closedWonByCategory: {
          'New Logo': createClosedWon('New Logo'),
          Expansion: createClosedWon('Expansion'),
          Migration: createClosedWon('Migration'),
          Renewal: createClosedWon('Renewal'),
          Total: createClosedWon('Total'),
        },
        dictionaries: {},
      }),
    ).toEqual({
      kind: 'dictionary',
      key: 'Division',
    });
  });

  it('treats hidden tabs with only partial snapshots as still needing snapshot warmup', () => {
    expect(
      getNextBackgroundWarmupTask({
        activeCategory: 'New Logo',
        snapshotByCategory: {
          'New Logo': createSnapshot('New Logo'),
          Expansion: createSnapshot('Expansion', 'partial'),
          Migration: createSnapshot('Migration'),
          Renewal: createSnapshot('Renewal'),
          Total: createSnapshot('Total'),
        },
        closedWonByCategory: {
          'New Logo': createClosedWon('New Logo'),
        },
        dictionaries: {},
      }),
    ).toEqual({
      kind: 'snapshot',
      category: 'Expansion',
    });
  });

  it('returns null when every tab and filter dictionary is already warm', () => {
    const dictionaries = Object.fromEntries(
      GLOBAL_FILTER_KEYS.map((key) => [key, createDictionary(key)]),
    ) as Record<GlobalFilterKey, FilterDictionaryPayload>;

    expect(
      getNextBackgroundWarmupTask({
        activeCategory: 'Migration',
        snapshotByCategory: {
          'New Logo': createSnapshot('New Logo'),
          Expansion: createSnapshot('Expansion'),
          Migration: createSnapshot('Migration'),
          Renewal: createSnapshot('Renewal'),
          Total: createSnapshot('Total'),
        },
        closedWonByCategory: {
          'New Logo': createClosedWon('New Logo'),
          Expansion: createClosedWon('Expansion'),
          Migration: createClosedWon('Migration'),
          Renewal: createClosedWon('Renewal'),
          Total: createClosedWon('Total'),
        },
        dictionaries,
      }),
    ).toBeNull();
  });
});
