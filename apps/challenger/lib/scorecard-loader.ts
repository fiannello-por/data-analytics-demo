// apps/challenger/lib/scorecard-loader.ts

import { unstable_cache } from 'next/cache';
import { getSnapshotGroups, findTileDefinition } from '@por/dashboard-constants';
import {
  executeMetricQuery,
  createCallTracker,
  type CallTracker,
} from './lightdash-v2-client';
import {
  buildV2SnapshotGroupQuery,
  DASHBOARD_V2_BASE_MODEL,
  type Category,
  type DateRange,
  type DashboardFilters,
} from './v2-query-builder';
import type { ProbeCacheMode } from './cache-mode';

export type ScorecardTileResult = {
  tileId: string;
  measure: string;
  currentValue: string;
  previousValue: string;
  pctChange: string;
};

export type ScorecardResult = {
  category: Category;
  tiles: ScorecardTileResult[];
  durationMs: number;
  queryCount: number;
};

async function fetchScorecard(
  tracker: CallTracker,
  category: Category,
  tileIds: string[],
  filters: DashboardFilters,
  dateRange: DateRange,
  previousDateRange: DateRange,
): Promise<ScorecardTileResult[]> {
  const groups = getSnapshotGroups(tileIds);

  const tileResults = await Promise.all(
    groups.map(async (group) => {
      const [current, previous] = await Promise.all([
        tracker.track(
          executeMetricQuery(
            buildV2SnapshotGroupQuery(category, filters, dateRange, group),
          ),
        ),
        tracker.track(
          executeMetricQuery(
            buildV2SnapshotGroupQuery(
              category,
              filters,
              previousDateRange,
              group,
            ),
          ),
        ),
      ]);

      const currentRow = current.rows[0] ?? {};
      const previousRow = previous.rows[0] ?? {};

      return group.tiles.map((tile): ScorecardTileResult => {
        const fieldId = `${DASHBOARD_V2_BASE_MODEL}_${tile.measure}`;
        const currentFormatted =
          currentRow[fieldId]?.value?.formatted ?? '';
        const previousFormatted =
          previousRow[fieldId]?.value?.formatted ?? '';

        const currentRaw = Number(currentRow[fieldId]?.value?.raw ?? 0);
        const previousRaw = Number(previousRow[fieldId]?.value?.raw ?? 0);

        let pctChange = '';
        if (
          previousFormatted === '—' ||
          previousFormatted === '' ||
          Number.isNaN(previousRaw)
        ) {
          pctChange = '—';
        } else if (previousRaw !== 0) {
          const pct =
            ((currentRaw - previousRaw) / Math.abs(previousRaw)) * 100;
          pctChange = pct.toFixed(1);
        }

        return {
          tileId: tile.tileId,
          measure: tile.measure,
          currentValue: currentFormatted,
          previousValue: previousFormatted,
          pctChange,
        };
      });
    }),
  );

  const tiles = tileResults.flat();

  tiles.sort((a, b) => {
    const aDef = findTileDefinition(category, a.tileId);
    const bDef = findTileDefinition(category, b.tileId);
    return (aDef?.sortOrder ?? 0) - (bDef?.sortOrder ?? 0);
  });

  return tiles;
}

export async function loadScorecard(
  category: Category,
  tileIds: string[],
  filters: DashboardFilters,
  dateRange: DateRange,
  previousDateRange: DateRange,
  cacheMode: ProbeCacheMode = 'auto',
): Promise<ScorecardResult> {
  const tracker = createCallTracker();
  const start = performance.now();

  if (cacheMode === 'off') {
    const tiles = await fetchScorecard(
      tracker,
      category,
      tileIds,
      filters,
      dateRange,
      previousDateRange,
    );
    const durationMs = performance.now() - start;
    const { actualCallCount } = tracker.getStats();
    return { category, tiles, durationMs, queryCount: actualCallCount };
  }

  const tiles = await unstable_cache(
    () =>
      fetchScorecard(
        tracker,
        category,
        tileIds,
        filters,
        dateRange,
        previousDateRange,
      ),
    [`challenger-scorecard-${category}`],
    {
      revalidate: 60,
      tags: [`challenger-scorecard-${category}`],
    },
  )();

  const durationMs = performance.now() - start;
  const { actualCallCount } = tracker.getStats();
  return { category, tiles, durationMs, queryCount: actualCallCount };
}
