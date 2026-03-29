// apps/challenger/lib/scorecard-loader.ts

import { unstable_cache } from 'next/cache';
import { getSnapshotGroups, findTileDefinition } from '@por/dashboard-constants';
import {
  executeMetricQuery,
  createCallTracker,
  type CallTracker,
  type QueryInstrumentation,
} from './lightdash-v2-client';
import {
  buildV2SnapshotGroupQuery,
  DASHBOARD_V2_BASE_MODEL,
  type Category,
  type DateRange,
  type DashboardFilters,
} from './v2-query-builder';
import type { ProbeCacheMode } from './cache-mode';
import type { WaterfallCollector } from './waterfall-types';

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

function computePctChange(
  currentValue: number | null,
  previousValue: number | null,
): string {
  if (
    currentValue == null ||
    previousValue == null ||
    previousValue === 0 ||
    Number.isNaN(currentValue) ||
    Number.isNaN(previousValue)
  ) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 1,
    signDisplay: 'always',
  }).format((currentValue - previousValue) / Math.abs(previousValue));
}

async function fetchScorecard(
  tracker: CallTracker,
  category: Category,
  tileIds: string[],
  filters: DashboardFilters,
  dateRange: DateRange,
  previousDateRange: DateRange,
  collector?: WaterfallCollector,
): Promise<ScorecardTileResult[]> {
  const groups = getSnapshotGroups(tileIds);

  const tileResults = await Promise.all(
    groups.map(async (group, groupIdx) => {
      const mkInstrumentation = (
        suffix: string,
      ): QueryInstrumentation | undefined =>
        collector
          ? { collector, id: `scorecard/${category}/group-${groupIdx}/${suffix}`, section: 'scorecard', priority: 1 }
          : undefined;

      const [current, previous] = await Promise.all([
        tracker.track(
          executeMetricQuery(
            buildV2SnapshotGroupQuery(category, filters, dateRange, group),
            undefined,
            mkInstrumentation('current'),
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
            undefined,
            mkInstrumentation('previous'),
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

        const currentRaw = Number(currentRow[fieldId]?.value?.raw ?? null);
        const previousRaw = Number(previousRow[fieldId]?.value?.raw ?? null);

        const pctChange = computePctChange(
          currentRow[fieldId]?.value?.raw != null ? currentRaw : null,
          previousRow[fieldId]?.value?.raw != null ? previousRaw : null,
        );

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
  collector?: WaterfallCollector,
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
      collector,
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
        collector,
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
