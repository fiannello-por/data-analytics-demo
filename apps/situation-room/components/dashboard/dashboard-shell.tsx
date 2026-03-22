'use client';

import * as React from 'react';
import type {
  CategorySnapshotPayload,
  DashboardState,
  DateRange,
  FilterDictionaryPayload,
  TileTrendPayload,
} from '@/lib/dashboard/contracts';
import {
  addDashboardFilterValue,
  buildDashboardCategoryUrl,
  buildDashboardTrendUrl,
  removeDashboardFilterValue,
  serializeDashboardStateSearchParams,
  setDashboardActiveCategory,
  setDashboardSelectedTile,
} from '@/lib/dashboard/query-inputs';
import { derivePreviousYearRange } from '@/lib/dashboard/date-range';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DashboardFilters } from '@/components/dashboard/dashboard-filters';
import { CategoryTabs } from '@/components/dashboard/category-tabs';
import { TileTable } from '@/components/dashboard/tile-table';
import { TrendPanel } from '@/components/dashboard/trend-panel';

type DashboardShellProps = {
  initialState: DashboardState;
  initialSnapshot: CategorySnapshotPayload;
  initialTrend: TileTrendPayload;
  initialDictionaries: Record<string, FilterDictionaryPayload>;
};

type RefreshScope = {
  snapshot: boolean;
  trend: boolean;
};

async function readJson<T>(response: Response, label: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`${label} request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

export function DashboardShell({
  initialState,
  initialSnapshot,
  initialTrend,
  initialDictionaries,
}: DashboardShellProps) {
  const [state, setState] = React.useState(initialState);
  const [snapshot, setSnapshot] = React.useState(initialSnapshot);
  const [trend, setTrend] = React.useState(initialTrend);
  const [isSnapshotLoading, setSnapshotLoading] = React.useState(false);
  const [isTrendLoading, setTrendLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const refreshRequestIdRef = React.useRef(0);
  const isMountedRef = React.useRef(true);

  React.useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  function updateUrl(nextState: DashboardState) {
    if (typeof window === 'undefined') return;

    const searchParams = serializeDashboardStateSearchParams(nextState);
    const nextUrl = `${window.location.pathname}?${searchParams.toString()}${window.location.hash}`;
    window.history.replaceState(null, '', nextUrl);
  }

  async function refreshDashboard(nextState: DashboardState, scope: RefreshScope) {
    const requestId = ++refreshRequestIdRef.current;
    setError(null);
    setSnapshotLoading(scope.snapshot);
    setTrendLoading(scope.trend);

    const snapshotFetch = scope.snapshot
      ? fetch(buildDashboardCategoryUrl(nextState), {
          headers: { Accept: 'application/json' },
        }).then((response) =>
          readJson<CategorySnapshotPayload>(response, 'Snapshot'),
        )
      : Promise.resolve(null);
    const trendFetch = scope.trend
      ? fetch(buildDashboardTrendUrl(nextState), {
          headers: { Accept: 'application/json' },
        }).then((response) => readJson<TileTrendPayload>(response, 'Trend'))
      : Promise.resolve(null);

    const [snapshotResult, trendResult] = await Promise.allSettled([
      snapshotFetch,
      trendFetch,
    ]);

    if (!isMountedRef.current || requestId !== refreshRequestIdRef.current) {
      return;
    }

    const nextErrors: string[] = [];

    if (scope.snapshot) {
      if (snapshotResult.status === 'rejected') {
        nextErrors.push(`Snapshot: ${snapshotResult.reason instanceof Error ? snapshotResult.reason.message : 'request failed.'}`);
      } else if (!snapshotResult.value) {
        nextErrors.push('Snapshot: request failed.');
      }
    }

    if (scope.trend) {
      if (trendResult.status === 'rejected') {
        nextErrors.push(`Trend: ${trendResult.reason instanceof Error ? trendResult.reason.message : 'request failed.'}`);
      } else if (!trendResult.value) {
        nextErrors.push('Trend: request failed.');
      }
    }

    if (nextErrors.length > 0) {
      setSnapshotLoading(false);
      setTrendLoading(false);
      setError(nextErrors.join(' '));
      return;
    }

    if (scope.snapshot && snapshotResult.status === 'fulfilled' && snapshotResult.value) {
      setSnapshot(snapshotResult.value);
    }

    if (scope.trend && trendResult.status === 'fulfilled' && trendResult.value) {
      setTrend(trendResult.value);
    }

    setState(nextState);
    updateUrl(nextState);
    setSnapshotLoading(false);
    setTrendLoading(false);
    setError(null);
  }

  function applyStateChange(nextState: DashboardState, scope: RefreshScope) {
    void refreshDashboard(nextState, scope);
  }

  function handleCategoryChange(category: DashboardState['activeCategory']) {
    const nextState = setDashboardActiveCategory(state, category);
    applyStateChange(nextState, { snapshot: true, trend: true });
  }

  function handleTileSelect(tileId: string) {
    const nextState = setDashboardSelectedTile(state, tileId);
    applyStateChange(nextState, { snapshot: false, trend: true });
  }

  function handleFilterValueAdd(key: keyof DashboardState['filters'], value: string) {
    const nextState = {
      ...state,
      filters: addDashboardFilterValue(state.filters, key, value),
    };
    applyStateChange(nextState, { snapshot: true, trend: true });
  }

  function handleFilterValueRemove(
    key: keyof DashboardState['filters'],
    value: string,
  ) {
    const nextState = {
      ...state,
      filters: removeDashboardFilterValue(state.filters, key, value),
    };
    applyStateChange(nextState, { snapshot: true, trend: true });
  }

  function handleDateRangeApply(dateRange: DateRange) {
    const nextState = {
      ...state,
      dateRange,
      previousDateRange: derivePreviousYearRange(dateRange),
    };
    applyStateChange(nextState, { snapshot: true, trend: true });
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Situation Room</Badge>
            <Badge variant="secondary">Executive product</Badge>
            {isSnapshotLoading ? <Badge variant="outline">Refreshing snapshot</Badge> : null}
            {isTrendLoading ? <Badge variant="outline">Refreshing trend</Badge> : null}
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Weekly executive scorecards
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Fixed tabs, curated metric rows, and a selected-metric trend panel
              backed by direct BigQuery reads for the baseline architecture.
            </p>
          </div>
        </header>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Dashboard refresh failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <DashboardFilters
          state={state}
          dictionaries={initialDictionaries}
          onFilterValueAdd={handleFilterValueAdd}
          onFilterValueRemove={handleFilterValueRemove}
          onDateRangeApply={handleDateRangeApply}
        />

        <CategoryTabs
          activeCategory={state.activeCategory}
          onValueChange={handleCategoryChange}
        >
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <Card aria-busy={isSnapshotLoading}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{snapshot.category}</CardTitle>
                  <Badge variant="outline">{snapshot.currentWindowLabel}</Badge>
                </div>
                <CardDescription>
                  Current period vs previous-year equivalent.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TileTable
                  snapshot={snapshot}
                  selectedTileId={state.selectedTileId}
                  onRowSelect={handleTileSelect}
                />
              </CardContent>
            </Card>
            <TrendPanel trend={trend} isLoading={isTrendLoading} />
          </div>
        </CategoryTabs>
      </div>
    </main>
  );
}
