import * as React from 'react';
import type { Metadata } from 'next';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { parseDashboardSearchParams } from '@/lib/dashboard/query-inputs';

export const metadata: Metadata = {
  title: 'Sales Performance Dashboard',
  description:
    'Executive sales performance dashboard backed by Lightdash and BigQuery.',
};

export const runtime = 'nodejs';
export const preferredRegion = 'pdx1';
export const maxDuration = 300;

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

  return (
    <DashboardShell
      initialState={initialState}
      initialSnapshot={null}
      initialTrend={null}
      initialClosedWonOpportunities={null}
      initialOverviewBoard={null}
      initialDictionaries={{}}
      renderedAt={renderedAt}
      apiBasePath="/api/dashboard-v2"
    />
  );
}
