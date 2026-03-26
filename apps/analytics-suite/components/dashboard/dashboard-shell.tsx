'use client';

import * as React from 'react';
import type {
  CategorySnapshotPayload,
  ClosedWonOpportunitiesPayload,
  DashboardState,
  DateRange,
  FilterDictionaryPayload,
  OverviewBoardPayload,
  TileTrendPayload,
} from '@/lib/dashboard/contracts';
import {
  CATEGORY_ORDER,
  findTileDefinition,
  isCategory,
  isOverviewTab,
  type Category,
} from '@/lib/dashboard/catalog';
import {
  addDashboardFilterValue,
  buildDashboardUrlFactory,
  removeDashboardFilterValue,
  serializeDashboardStateSearchParams,
  setDashboardActiveCategory,
  setDashboardSelectedTile,
} from '@/lib/dashboard/query-inputs';
import { derivePreviousYearRange, formatDateRange } from '@/lib/dashboard/date-range';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DashboardFilters } from '@/components/dashboard/dashboard-filters';
import { CategoryTabs } from '@/components/dashboard/category-tabs';
import {
  ClosedWonOpportunitiesTable,
  ClosedWonOpportunitiesTableSkeleton,
} from '@/components/dashboard/closed-won-opportunities-table';
import { OverviewSkeleton } from '@/components/dashboard/overview-skeleton';
import { OverviewTab } from '@/components/dashboard/overview-tab';
import { TileTable, TileTableSkeleton } from '@/components/dashboard/tile-table';
import { TrendPanel } from '@/components/dashboard/trend-panel';
import { ThemeToggle } from '@/components/theme-toggle';
import { buildOverviewBoard } from '@/lib/dashboard/overview-model';

type DashboardShellProps = {
  initialState: DashboardState;
  initialSnapshot?: CategorySnapshotPayload | null;
  initialTrend?: TileTrendPayload | null;
  initialClosedWonOpportunities?: ClosedWonOpportunitiesPayload | null;
  initialOverviewBoard?: OverviewBoardPayload | null;
  initialDictionaries: Record<string, FilterDictionaryPayload>;
  renderedAt: string;
  apiBasePath?: string;
};

type RefreshScope = {
  overview: boolean;
  snapshot: boolean;
  trend: boolean;
  closedWon: boolean;
  detailCategory: Category;
  closedWonCategory: Category;
};

type RefreshOptions = {
  optimisticState?: DashboardState;
  revertState?: DashboardState;
};

async function readJson<T>(response: Response, label: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`${label} request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

function buildSnapshotCache(
  initialOverviewBoard?: OverviewBoardPayload | null,
  initialSnapshot?: CategorySnapshotPayload | null,
): Partial<Record<Category, CategorySnapshotPayload>> {
  const cache: Partial<Record<Category, CategorySnapshotPayload>> = {};

  for (const snapshot of initialOverviewBoard?.snapshots ?? []) {
    cache[snapshot.category] = snapshot;
  }

  if (initialSnapshot) {
    cache[initialSnapshot.category] = initialSnapshot;
  }

  return cache;
}

function hasFullSnapshotCache(
  snapshotByCategory: Partial<Record<Category, CategorySnapshotPayload>>,
) {
  return CATEGORY_ORDER.every((category) => Boolean(snapshotByCategory[category]));
}

function getClosedWonCategory(activeCategory: DashboardState['activeCategory']): Category {
  return isCategory(activeCategory) ? activeCategory : 'Total';
}

export function buildClosedWonPrefetchUrls(
  apiBasePath: string,
  input: Pick<DashboardState, 'filters' | 'dateRange'>,
): string[] {
  const urls = buildDashboardUrlFactory(apiBasePath);

  return CATEGORY_ORDER.map((category) =>
    urls.buildClosedWonUrl({
      activeCategory: category,
      filters: input.filters,
      dateRange: input.dateRange,
    }),
  );
}

export function DashboardShell({
  initialState,
  initialSnapshot,
  initialTrend,
  initialClosedWonOpportunities,
  initialOverviewBoard,
  initialDictionaries,
  renderedAt,
  apiBasePath = '/api/dashboard',
}: DashboardShellProps) {
  const urls = React.useMemo(() => buildDashboardUrlFactory(apiBasePath), [apiBasePath]);
  const [state, setState] = React.useState(initialState);
  const [snapshotByCategory, setSnapshotByCategory] = React.useState<
    Partial<Record<Category, CategorySnapshotPayload>>
  >(() => buildSnapshotCache(initialOverviewBoard, initialSnapshot));
  const [overviewBoard, setOverviewBoard] = React.useState<OverviewBoardPayload | null>(
    initialOverviewBoard ?? null,
  );
  const [trend, setTrend] = React.useState<TileTrendPayload | null>(
    initialTrend ?? null,
  );
  const [closedWonOpportunities, setClosedWonOpportunities] =
    React.useState<ClosedWonOpportunitiesPayload | null>(
      initialClosedWonOpportunities ?? null,
    );
  const [isSnapshotLoading, setSnapshotLoading] = React.useState(false);
  const [isTrendLoading, setTrendLoading] = React.useState(false);
  const [isClosedWonLoading, setClosedWonLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [revealedTrendCategory, setRevealedTrendCategory] = React.useState<Category | null>(null);
  const refreshRequestIdRef = React.useRef(0);
  const isMountedRef = React.useRef(true);

  React.useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  const closedWonPrefetchUrls = React.useMemo(
    () =>
      buildClosedWonPrefetchUrls(apiBasePath, {
        filters: state.filters,
        dateRange: state.dateRange,
      }),
    [apiBasePath, state.dateRange, state.filters],
  );

  React.useEffect(() => {
    const abortController = new AbortController();
    const timeoutIds = closedWonPrefetchUrls.map((url, index) =>
      window.setTimeout(() => {
        void fetch(url, {
          headers: { Accept: 'application/json' },
          signal: abortController.signal,
        }).catch(() => {});
      }, index * 75),
    );

    return () => {
      abortController.abort();
      for (const timeoutId of timeoutIds) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [closedWonPrefetchUrls]);

  function updateUrl(nextState: DashboardState) {
    if (typeof window === 'undefined') return;

    const searchParams = serializeDashboardStateSearchParams(nextState);
    const nextUrl = `${window.location.pathname}?${searchParams.toString()}${window.location.hash}`;
    window.history.replaceState(null, '', nextUrl);
  }

  async function refreshDashboard(
    nextState: DashboardState,
    scope: RefreshScope,
    options?: RefreshOptions,
  ) {
    const requestId = ++refreshRequestIdRef.current;
    setError(null);
    setSnapshotLoading(scope.overview || scope.snapshot);
    setTrendLoading(scope.trend);
    setClosedWonLoading(scope.closedWon);

    if (options?.optimisticState) {
      setState(options.optimisticState);
      updateUrl(options.optimisticState);
    }

    const overviewFetch = scope.overview
      ? fetch(
          urls.buildOverviewUrl({
            filters: nextState.filters,
            dateRange: nextState.dateRange,
          }),
          {
            headers: { Accept: 'application/json' },
          },
        ).then((response) => readJson<OverviewBoardPayload>(response, 'Overview'))
      : Promise.resolve(null);
    const snapshotFetch = scope.snapshot
      ? fetch(
          urls.buildCategoryUrl({
            ...nextState,
            activeCategory: scope.detailCategory,
          }),
          {
            headers: { Accept: 'application/json' },
          },
        ).then((response) =>
          readJson<CategorySnapshotPayload>(response, 'Snapshot'),
        )
      : Promise.resolve(null);
    const trendFetch = scope.trend
      ? fetch(
          urls.buildTrendUrl({
            ...nextState,
            activeCategory: scope.detailCategory,
          }),
          {
            headers: { Accept: 'application/json' },
          },
        ).then((response) => readJson<TileTrendPayload>(response, 'Trend'))
      : Promise.resolve(null);
    const closedWonFetch = scope.closedWon
      ? fetch(
          urls.buildClosedWonUrl({
            ...nextState,
            activeCategory: scope.closedWonCategory,
          }),
          {
            headers: { Accept: 'application/json' },
          },
        ).then((response) =>
          readJson<ClosedWonOpportunitiesPayload>(response, 'Closed won opportunities'),
        )
      : Promise.resolve(null);

    const [overviewResult, snapshotResult, trendResult, closedWonResult] = await Promise.allSettled([
      overviewFetch,
      snapshotFetch,
      trendFetch,
      closedWonFetch,
    ]);

    if (!isMountedRef.current || requestId !== refreshRequestIdRef.current) {
      return;
    }

    const nextErrors: string[] = [];

    if (scope.overview) {
      if (overviewResult.status === 'rejected') {
        nextErrors.push(`Overview: ${overviewResult.reason instanceof Error ? overviewResult.reason.message : 'request failed.'}`);
      } else if (!overviewResult.value) {
        nextErrors.push('Overview: request failed.');
      }
    }

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

    if (scope.closedWon) {
      if (closedWonResult.status === 'rejected') {
        nextErrors.push(`Closed won: ${closedWonResult.reason instanceof Error ? closedWonResult.reason.message : 'request failed.'}`);
      } else if (!closedWonResult.value) {
        nextErrors.push('Closed won: request failed.');
      }
    }

    if (nextErrors.length > 0) {
      if (options?.optimisticState && options.revertState) {
        setState(options.revertState);
        updateUrl(options.revertState);
      }
      setSnapshotLoading(false);
      setTrendLoading(false);
      setClosedWonLoading(false);
      setError(nextErrors.join(' '));
      return;
    }

    if (scope.overview && overviewResult.status === 'fulfilled' && overviewResult.value) {
      setOverviewBoard(overviewResult.value);
      setSnapshotByCategory(
        Object.fromEntries(
          overviewResult.value.snapshots.map((snapshot) => [snapshot.category, snapshot]),
        ) as Partial<Record<Category, CategorySnapshotPayload>>,
      );
    }

    if (scope.snapshot && snapshotResult.status === 'fulfilled' && snapshotResult.value) {
      const snapshotData = snapshotResult.value;
      setSnapshotByCategory((current) => ({
        ...current,
        [snapshotData.category]: snapshotData,
      }));
    }

    if (scope.trend && trendResult.status === 'fulfilled' && trendResult.value) {
      setTrend(trendResult.value);
    }

    if (scope.closedWon && closedWonResult.status === 'fulfilled' && closedWonResult.value) {
      setClosedWonOpportunities(closedWonResult.value);
    }

    if (!options?.optimisticState) {
      setState(nextState);
      updateUrl(nextState);
    }
    setSnapshotLoading(false);
    setTrendLoading(false);
    setClosedWonLoading(false);
    setError(null);
  }

  function applyStateChange(
    nextState: DashboardState,
    scope: RefreshScope,
    options?: RefreshOptions,
  ) {
    void refreshDashboard(nextState, scope, options);
  }

  function handleCategoryChange(category: DashboardState['activeCategory']) {
    const nextState = setDashboardActiveCategory(state, category);
    setRevealedTrendCategory(null);
    const shouldLoadOverview = isOverviewTab(category) && !hasFullSnapshotCache(snapshotByCategory);
    const shouldLoadSnapshot = isCategory(category) && !snapshotByCategory[category];

    applyStateChange(nextState, {
      overview: shouldLoadOverview,
      snapshot: shouldLoadSnapshot,
      trend: isCategory(category),
      closedWon: true,
      detailCategory: isCategory(category) ? category : CATEGORY_ORDER[0],
      closedWonCategory: getClosedWonCategory(category),
    }, {
      optimisticState: nextState,
      revertState: state,
    });
  }

  function handleTileSelect(tileId: string) {
    if (!isCategory(state.activeCategory)) {
      return;
    }
    setRevealedTrendCategory(state.activeCategory);

    if (state.selectedTileId === tileId && trend?.tileId === tileId) {
      return;
    }

    const nextState = setDashboardSelectedTile(state, tileId);
    applyStateChange(nextState, {
      overview: false,
      snapshot: false,
      trend: true,
      closedWon: false,
      detailCategory: state.activeCategory,
      closedWonCategory: getClosedWonCategory(state.activeCategory),
    }, {
      optimisticState: nextState,
      revertState: state,
    });
  }

  function handleFilterValueAdd(key: keyof DashboardState['filters'], value: string) {
    const nextState = {
      ...state,
      filters: addDashboardFilterValue(state.filters, key, value),
    };
    const detailCategory = isCategory(nextState.activeCategory)
      ? nextState.activeCategory
      : CATEGORY_ORDER[0];
    const shouldRefreshOverview =
      isOverviewTab(nextState.activeCategory) || hasFullSnapshotCache(snapshotByCategory);

    applyStateChange(nextState, {
      overview: shouldRefreshOverview,
      snapshot: !shouldRefreshOverview,
      trend: isCategory(nextState.activeCategory),
      closedWon: true,
      detailCategory,
      closedWonCategory: getClosedWonCategory(nextState.activeCategory),
    });
  }

  function handleFilterValueRemove(
    key: keyof DashboardState['filters'],
    value: string,
  ) {
    const nextState = {
      ...state,
      filters: removeDashboardFilterValue(state.filters, key, value),
    };
    const detailCategory = isCategory(nextState.activeCategory)
      ? nextState.activeCategory
      : CATEGORY_ORDER[0];
    const shouldRefreshOverview =
      isOverviewTab(nextState.activeCategory) || hasFullSnapshotCache(snapshotByCategory);

    applyStateChange(nextState, {
      overview: shouldRefreshOverview,
      snapshot: !shouldRefreshOverview,
      trend: isCategory(nextState.activeCategory),
      closedWon: true,
      detailCategory,
      closedWonCategory: getClosedWonCategory(nextState.activeCategory),
    });
  }

  function handleDateRangeApply(dateRange: DateRange) {
    const nextState = {
      ...state,
      dateRange,
      previousDateRange: derivePreviousYearRange(dateRange),
    };
    const detailCategory = isCategory(nextState.activeCategory)
      ? nextState.activeCategory
      : CATEGORY_ORDER[0];
    const shouldRefreshOverview =
      isOverviewTab(nextState.activeCategory) || hasFullSnapshotCache(snapshotByCategory);

    applyStateChange(nextState, {
      overview: shouldRefreshOverview,
      snapshot: !shouldRefreshOverview,
      trend: isCategory(nextState.activeCategory),
      closedWon: true,
      detailCategory,
      closedWonCategory: getClosedWonCategory(nextState.activeCategory),
    });
  }

  const detailCategory = isCategory(state.activeCategory)
    ? state.activeCategory
    : CATEGORY_ORDER[0];
  const activeSnapshot = snapshotByCategory[detailCategory] ?? null;
  const overviewSnapshots = overviewBoard?.snapshots ?? CATEGORY_ORDER
    .map((category) => snapshotByCategory[category])
    .filter((snapshot): snapshot is CategorySnapshotPayload => Boolean(snapshot));
  const displayCategory = detailCategory;
  const displayWindowLabel = formatDateRange(state.dateRange);
  const displayTileLabel =
    (isCategory(detailCategory)
      ? findTileDefinition(detailCategory, state.selectedTileId)?.label
      : undefined) ?? trend?.label ?? 'Metric trend';
  const displayPreviousWindowLabel = formatDateRange(state.previousDateRange);
  const showTrendPanel = revealedTrendCategory === detailCategory;
  const lastRefreshedAt = isOverviewTab(state.activeCategory)
    ? overviewBoard?.lastRefreshedAt ??
      overviewSnapshots[0]?.lastRefreshedAt ??
      null
    : activeSnapshot?.lastRefreshedAt ??
      overviewBoard?.lastRefreshedAt ??
      null;

  return (
    <main className="sales-dashboard-accent min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-semibold tracking-tight">
                  Sales Performance Dashboard
                </h1>
                <p className="max-w-3xl text-sm text-muted-foreground">
                  Track bookings, pacing, conversion, deal quality, pipeline creation,
                  and closed won performance across each booking category.
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <div className="flex items-center gap-2">
                <ThemeToggle />
              </div>
            </div>
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
          lastRefreshedAt={lastRefreshedAt}
          renderedAt={renderedAt}
          onFilterValueAdd={handleFilterValueAdd}
          onFilterValueRemove={handleFilterValueRemove}
          onDateRangeApply={handleDateRangeApply}
        />

        <CategoryTabs
          activeCategory={state.activeCategory}
          onValueChange={handleCategoryChange}
        >
          {isOverviewTab(state.activeCategory) ? (
            isSnapshotLoading || overviewSnapshots.length !== CATEGORY_ORDER.length ? (
              <OverviewSkeleton />
            ) : (
              <OverviewTab
                board={buildOverviewBoard(overviewSnapshots)}
                closedWonOpportunities={closedWonOpportunities}
              />
            )
          ) : (
            <div className="flex flex-col gap-6">
              <Card
                aria-busy={isSnapshotLoading || (showTrendPanel && isTrendLoading)}
                data-testid="snapshot-card"
                className="ring-0 shadow-none"
              >
                <CardHeader>
                  <CardTitle>Main Metrics</CardTitle>
                  <CardDescription>
                    Current period vs previous-year equivalent.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] xl:items-stretch">
                  <div className="min-w-0">
                    {isSnapshotLoading || !activeSnapshot ? (
                      <TileTableSkeleton category={detailCategory} />
                    ) : (
                      <TileTable
                        snapshot={activeSnapshot}
                        selectedTileId={showTrendPanel ? state.selectedTileId : ''}
                        onRowSelect={handleTileSelect}
                      />
                    )}
                  </div>
                  <div className="flex min-w-0 self-stretch xl:border-l xl:border-border/45 xl:pl-6">
                    <TrendPanel
                      trend={showTrendPanel ? trend : null}
                      isLoading={showTrendPanel ? isTrendLoading : false}
                      isVisible={showTrendPanel}
                      displayLabel={
                        showTrendPanel && isTrendLoading ? displayTileLabel : undefined
                      }
                      displayCurrentWindowLabel={
                        showTrendPanel && isTrendLoading ? displayWindowLabel : undefined
                      }
                      displayPreviousWindowLabel={
                        showTrendPanel && isTrendLoading
                          ? displayPreviousWindowLabel
                          : undefined
                      }
                    />
                  </div>
                </CardContent>
              </Card>
              {isClosedWonLoading || !closedWonOpportunities ? (
                <ClosedWonOpportunitiesTableSkeleton />
              ) : (
                <ClosedWonOpportunitiesTable payload={closedWonOpportunities} />
              )}
            </div>
          )}
        </CategoryTabs>
      </div>
    </main>
  );
}
