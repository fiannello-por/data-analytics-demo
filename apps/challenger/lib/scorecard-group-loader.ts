// apps/challenger/lib/scorecard-group-loader.ts
// Loads a single snapshot group's tiles (current + previous window).
// Each group gets its own Suspense boundary so tiles stream in clusters
// as each group's queries complete.

import { unstable_cache } from 'next/cache';
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
import type { SnapshotGroup } from '@por/dashboard-constants';
import { findTileDefinition } from '@por/dashboard-constants';
import type { ProbeCacheMode } from './cache-mode';
import type { WaterfallCollector } from './waterfall-types';

export type ScorecardTileResult = {
  tileId: string;
  measure: string;
  currentValue: string;
  previousValue: string;
  pctChange: string;
  sortOrder: number;
};

export type ScorecardGroupResult = {
  category: Category;
  groupIndex: number;
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

async function fetchScorecardGroup(
  tracker: CallTracker,
  category: Category,
  group: SnapshotGroup,
  groupIndex: number,
  filters: DashboardFilters,
  dateRange: DateRange,
  previousDateRange: DateRange,
  collector?: WaterfallCollector,
): Promise<ScorecardTileResult[]> {
  const mkInstrumentation = (
    suffix: string,
  ): QueryInstrumentation | undefined =>
    collector
      ? {
          collector,
          id: `scorecard/${category}/group-${groupIndex}/${suffix}`,
          section: 'scorecard',
          priority: 1,
        }
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
    const currentFormatted = currentRow[fieldId]?.value?.formatted ?? '';
    const previousFormatted = previousRow[fieldId]?.value?.formatted ?? '';

    const currentRaw = Number(currentRow[fieldId]?.value?.raw ?? null);
    const previousRaw = Number(previousRow[fieldId]?.value?.raw ?? null);

    const pctChange = computePctChange(
      currentRow[fieldId]?.value?.raw != null ? currentRaw : null,
      previousRow[fieldId]?.value?.raw != null ? previousRaw : null,
    );

    const def = findTileDefinition(category, tile.tileId);

    return {
      tileId: tile.tileId,
      measure: tile.measure,
      currentValue: currentFormatted,
      previousValue: previousFormatted,
      pctChange,
      sortOrder: def?.sortOrder ?? 999,
    };
  });
}

export async function loadScorecardGroup(
  category: Category,
  group: SnapshotGroup,
  groupIndex: number,
  filters: DashboardFilters,
  dateRange: DateRange,
  previousDateRange: DateRange,
  cacheMode: ProbeCacheMode = 'auto',
  collector?: WaterfallCollector,
): Promise<ScorecardGroupResult> {
  const tracker = createCallTracker();
  const start = performance.now();

  const load = () =>
    fetchScorecardGroup(
      tracker,
      category,
      group,
      groupIndex,
      filters,
      dateRange,
      previousDateRange,
      collector,
    );

  const tiles =
    cacheMode === 'off'
      ? await load()
      : await unstable_cache(load, [`challenger-scorecard-${category}-g${groupIndex}`], {
          revalidate: 60,
          tags: [`challenger-scorecard-${category}`],
        })();

  const durationMs = performance.now() - start;
  const { actualCallCount } = tracker.getStats();

  return { category, groupIndex, tiles, durationMs, queryCount: actualCallCount };
}
