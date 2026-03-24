import * as React from 'react';
import type { Metadata } from 'next';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { CATEGORY_ORDER, GLOBAL_FILTER_KEYS, isCategory, isOverviewTab } from '@/lib/dashboard/catalog';
import { parseDashboardSearchParams } from '@/lib/dashboard/query-inputs';
import { getDashboardV2CategorySnapshot } from '@/lib/server/v2/get-dashboard-category-snapshot';
import { getDashboardV2ClosedWonOpportunities } from '@/lib/server/v2/get-dashboard-closed-won-opportunities';
import { getDashboardV2FilterDictionary } from '@/lib/server/v2/get-dashboard-filter-dictionary';
import { getDashboardV2OverviewBoard } from '@/lib/server/v2/get-dashboard-overview-board';
import { getDashboardV2TileTrend } from '@/lib/server/v2/get-dashboard-tile-trend';

export const metadata: Metadata = {
  title: 'Sales Performance Dashboard',
  description: 'Semantic v2 of the executive sales performance dashboard backed by Lightdash and BigQuery.',
};

type SearchParamsInput =
  | Record<string, string | string[] | undefined>
  | undefined;

function toUrlSearchParams(input: SearchParamsInput): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (!input) {
    return searchParams;
  }

  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, item);
      }
      continue;
    }

    if (typeof value === 'string') {
      searchParams.set(key, value);
    }
  }

  return searchParams;
}

export default async function DashboardPageV2({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const renderedAt = new Date().toISOString();
  const resolvedSearchParams = await searchParams;
  const initialState = parseDashboardSearchParams(
    toUrlSearchParams(resolvedSearchParams),
  );
  const initialOverviewBoard = isOverviewTab(initialState.activeCategory)
    ? (
        await getDashboardV2OverviewBoard({
          filters: initialState.filters,
          dateRange: initialState.dateRange,
          previousDateRange: initialState.previousDateRange,
        })
      ).data
    : null;
  const initialSnapshot = isCategory(initialState.activeCategory)
    ? (
        await getDashboardV2CategorySnapshot({
          activeCategory: initialState.activeCategory,
          filters: initialState.filters,
          dateRange: initialState.dateRange,
          previousDateRange: initialState.previousDateRange,
        })
      ).data
    : initialOverviewBoard?.snapshots.find((snapshot) => snapshot.category === CATEGORY_ORDER[0]) ?? null;
  const initialTrend = isCategory(initialState.activeCategory)
    ? (
        await getDashboardV2TileTrend({
          activeCategory: initialState.activeCategory,
          selectedTileId: initialState.selectedTileId,
          filters: initialState.filters,
          dateRange: initialState.dateRange,
          previousDateRange: initialState.previousDateRange,
          trendGrain: initialState.trendGrain,
        })
      ).data
    : null;
  const initialClosedWonOpportunities =
    isCategory(initialState.activeCategory) || isOverviewTab(initialState.activeCategory)
      ? (
          await getDashboardV2ClosedWonOpportunities({
            activeCategory: isCategory(initialState.activeCategory)
              ? initialState.activeCategory
              : 'Total',
            filters: initialState.filters,
            dateRange: initialState.dateRange,
          })
        ).data
      : null;
  const dictionaries = await Promise.all(
    GLOBAL_FILTER_KEYS.map(async (key) => [
      key,
      (await getDashboardV2FilterDictionary(key)).data,
    ]),
  );

  return (
    <DashboardShell
      initialState={initialState}
      initialSnapshot={initialSnapshot}
      initialTrend={initialTrend}
      initialClosedWonOpportunities={initialClosedWonOpportunities}
      initialOverviewBoard={initialOverviewBoard}
      initialDictionaries={Object.fromEntries(dictionaries)}
      renderedAt={renderedAt}
      apiBasePath="/api/dashboard-v2"
    />
  );
}
