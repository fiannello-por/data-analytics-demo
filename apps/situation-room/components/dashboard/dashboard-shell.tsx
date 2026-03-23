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
  buildDashboardCategoryUrl,
  buildDashboardClosedWonUrl,
  buildDashboardOverviewUrl,
  buildDashboardTrendUrl,
  removeDashboardFilterValue,
  serializeDashboardStateSearchParams,
  setDashboardActiveCategory,
  setDashboardSelectedTile,
} from '@/lib/dashboard/query-inputs';
import { derivePreviousYearRange, formatDateRange } from '@/lib/dashboard/date-range';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
import {
  BellRing,
  Braces,
  ExternalLink,
  LayoutPanelTop,
  Sparkles,
} from 'lucide-react';

type DashboardShellProps = {
  initialState: DashboardState;
  initialSnapshot?: CategorySnapshotPayload | null;
  initialTrend?: TileTrendPayload | null;
  initialClosedWonOpportunities?: ClosedWonOpportunitiesPayload | null;
  initialOverviewBoard?: OverviewBoardPayload | null;
  initialDictionaries: Record<string, FilterDictionaryPayload>;
  renderedAt: string;
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

const ARCHITECTURE_EXPLAINER_URL =
  process.env.NEXT_PUBLIC_ARCHITECTURE_EXPLAINER_URL ?? 'http://localhost:3200';

export function DashboardShell({
  initialState,
  initialSnapshot,
  initialTrend,
  initialClosedWonOpportunities,
  initialOverviewBoard,
  initialDictionaries,
  renderedAt,
}: DashboardShellProps) {
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
          buildDashboardOverviewUrl({
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
          buildDashboardCategoryUrl({
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
          buildDashboardTrendUrl({
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
          buildDashboardClosedWonUrl({
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
  const lastRefreshedAt = isOverviewTab(state.activeCategory)
    ? overviewBoard?.lastRefreshedAt ??
      overviewSnapshots[0]?.lastRefreshedAt ??
      null
    : activeSnapshot?.lastRefreshedAt ??
      overviewBoard?.lastRefreshedAt ??
      null;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-semibold tracking-tight">
                  Sales Performance Dashboard
                </h1>
                <p className="max-w-3xl text-sm text-muted-foreground">
                  Fixed tabs, curated metric rows, and a selected-metric trend panel
                  backed by direct BigQuery reads for the baseline architecture.
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <div className="flex items-center gap-2">
                <Sheet>
                  <SheetTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label="Open dashboard tools"
                      />
                    }
                  >
                    <Sparkles className="size-4" />
                    Meta tools
                  </SheetTrigger>
                  <SheetContent side="right">
                    <SheetHeader>
                      <SheetTitle>Dashboard tools</SheetTitle>
                      <SheetDescription>
                        Meta-level tools around the dashboard experience. Start with
                        architecture visibility now, then expand into semantic layer
                        exploration, alerts, and performance reporting.
                      </SheetDescription>
                    </SheetHeader>

                    <div className="grid gap-3">
                      <Card className="border-primary/30 bg-primary/6">
                        <CardHeader className="gap-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <LayoutPanelTop className="size-4 text-primary" />
                            Architecture diagram
                          </div>
                          <CardDescription>
                            Open the explainer app to inspect components, request flow,
                            timing, and lineage from UI to BigQuery.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <a
                            href={ARCHITECTURE_EXPLAINER_URL}
                            target="_blank"
                            rel="noreferrer"
                            className={buttonVariants({ size: 'sm' })}
                          >
                            Open architecture app
                            <ExternalLink className="size-3.5" />
                          </a>
                        </CardContent>
                      </Card>

                      <Card className="bg-card/70">
                        <CardHeader className="gap-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Braces className="size-4 text-muted-foreground" />
                            Semantic layer explorer
                          </div>
                          <CardDescription>
                            Reserved for the future semantic-layer comparison surface.
                          </CardDescription>
                        </CardHeader>
                      </Card>

                      <Card className="bg-card/70">
                        <CardHeader className="gap-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <BellRing className="size-4 text-muted-foreground" />
                            Alert policies
                          </div>
                          <CardDescription>
                            Reserved for operational alerts and ownership routing.
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    </div>
                  </SheetContent>
                </Sheet>
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
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <Card
                  aria-busy={isSnapshotLoading}
                  data-testid="snapshot-card"
                  className="ring-0 shadow-none"
                >
                  <CardHeader>
                    <CardTitle>{displayCategory}</CardTitle>
                    <CardDescription>
                      Current period vs previous-year equivalent.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isSnapshotLoading || !activeSnapshot ? (
                      <TileTableSkeleton category={detailCategory} />
                    ) : (
                      <TileTable
                        snapshot={activeSnapshot}
                        selectedTileId={state.selectedTileId}
                        onRowSelect={handleTileSelect}
                      />
                    )}
                  </CardContent>
                </Card>
                <TrendPanel
                  trend={trend}
                  isLoading={isTrendLoading}
                  displayLabel={isTrendLoading ? displayTileLabel : undefined}
                  displayCurrentWindowLabel={isTrendLoading ? displayWindowLabel : undefined}
                  displayPreviousWindowLabel={
                    isTrendLoading ? displayPreviousWindowLabel : undefined
                  }
                />
              </div>
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
