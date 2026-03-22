import * as React from 'react';
import type { Metadata } from 'next';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { GLOBAL_FILTER_KEYS } from '@/lib/dashboard/catalog';
import { parseDashboardSearchParams } from '@/lib/dashboard/query-inputs';
import { getDashboardCategorySnapshot } from '@/lib/server/get-dashboard-category-snapshot';
import { getDashboardFilterDictionary } from '@/lib/server/get-dashboard-filter-dictionary';
import { getDashboardTileTrend } from '@/lib/server/get-dashboard-tile-trend';

export const metadata: Metadata = {
  title: 'Situation Room',
  description: 'Executive dashboard baseline for the Situation Room architecture',
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const initialState = parseDashboardSearchParams(
    toUrlSearchParams(resolvedSearchParams),
  );
  const initialSnapshot = (
    await getDashboardCategorySnapshot(initialState)
  ).data;
  const initialTrend = (
    await getDashboardTileTrend(initialState)
  ).data;
  const dictionaries = await Promise.all(
    GLOBAL_FILTER_KEYS.map(async (key) => [
      key,
      (await getDashboardFilterDictionary(key)).data,
    ]),
  );

  return (
    <DashboardShell
      initialState={initialState}
      initialSnapshot={initialSnapshot}
      initialTrend={initialTrend}
      initialDictionaries={Object.fromEntries(dictionaries)}
    />
  );
}
