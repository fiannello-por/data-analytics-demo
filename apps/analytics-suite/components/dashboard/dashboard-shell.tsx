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
  GLOBAL_FILTER_KEYS,
  isCategory,
  isOverviewTab,
  type GlobalFilterKey,
  type Category,
} from '@/lib/dashboard/catalog';
import {
  addDashboardFilterValue,
  buildDashboardUrlFactory,
  normalizeDashboardFilters,
  removeDashboardFilterValue,
  serializeDashboardStateSearchParams,
  setDashboardActiveCategory,
  setDashboardSelectedTile,
} from '@/lib/dashboard/query-inputs';
import {
  derivePreviousYearRange,
  formatDateRange,
} from '@/lib/dashboard/date-range';
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
import {
  TileTable,
  TileTableSkeleton,
} from '@/components/dashboard/tile-table';
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

type BackgroundWarmupTask =
  | {
      kind: 'snapshot';
      category: Category;
    }
  | {
      kind: 'closedWon';
      category: Category;
    }
  | {
      kind: 'dictionary';
      key: GlobalFilterKey;
    };

async function readJson<T>(response: Response, label: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`${label} request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

function formatRefreshError(label: string, reason: unknown): string {
  return `${label}: ${reason instanceof Error ? reason.message : 'request failed.'}`;
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

function buildClosedWonCache(
  initialClosedWonOpportunities?: ClosedWonOpportunitiesPayload | null,
): Partial<Record<Category, ClosedWonOpportunitiesPayload>> {
  if (!initialClosedWonOpportunities) {
    return {};
  }

  return {
    [initialClosedWonOpportunities.category]: initialClosedWonOpportunities,
  };
}

function hasFullSnapshotCache(
  snapshotByCategory: Partial<Record<Category, CategorySnapshotPayload>>,
) {
  return CATEGORY_ORDER.every((category) =>
    Boolean(snapshotByCategory[category]),
  );
}

function getClosedWonCategory(
  activeCategory: DashboardState['activeCategory'],
): Category {
  return isCategory(activeCategory) ? activeCategory : 'Total';
}

function getWarmupTaskKey(task: BackgroundWarmupTask): string {
  switch (task.kind) {
    case 'snapshot':
      return `snapshot:${task.category}`;
    case 'closedWon':
      return `closedWon:${task.category}`;
    case 'dictionary':
      return `dictionary:${task.key}`;
  }
}

function buildWarmupQueryKey(
  input: Pick<DashboardState, 'filters' | 'dateRange'>,
): string {
  return JSON.stringify({
    dateRange: input.dateRange,
    filters: normalizeDashboardFilters(input.filters),
  });
}

function hasWarmActiveTabData(input: {
  activeCategory: DashboardState['activeCategory'];
  snapshotByCategory: Partial<Record<Category, CategorySnapshotPayload>>;
  closedWonByCategory: Partial<Record<Category, ClosedWonOpportunitiesPayload>>;
}): boolean {
  const closedWonCategory = getClosedWonCategory(input.activeCategory);

  if (isOverviewTab(input.activeCategory)) {
    return (
      hasFullSnapshotCache(input.snapshotByCategory) &&
      Boolean(input.closedWonByCategory[closedWonCategory])
    );
  }

  return Boolean(
    input.snapshotByCategory[input.activeCategory] &&
      input.closedWonByCategory[closedWonCategory],
  );
}

export function getInitialBootstrapScope(input: {
  activeCategory: DashboardState['activeCategory'];
  snapshotByCategory: Partial<Record<Category, CategorySnapshotPayload>>;
  hasClosedWonData: boolean;
}): RefreshScope | null {
  const detailCategory = isCategory(input.activeCategory)
    ? input.activeCategory
    : CATEGORY_ORDER[0];
  const closedWonCategory = getClosedWonCategory(input.activeCategory);

  if (isOverviewTab(input.activeCategory)) {
    if (!hasFullSnapshotCache(input.snapshotByCategory)) {
      return {
        overview: true,
        snapshot: false,
        trend: false,
        closedWon: !input.hasClosedWonData,
        detailCategory,
        closedWonCategory,
      };
    }

    if (!input.hasClosedWonData) {
      return {
        overview: false,
        snapshot: false,
        trend: false,
        closedWon: true,
        detailCategory,
        closedWonCategory,
      };
    }

    return null;
  }

  if (!input.snapshotByCategory[detailCategory]) {
    return {
      overview: false,
      snapshot: true,
      trend: false,
      closedWon: !input.hasClosedWonData,
      detailCategory,
      closedWonCategory,
    };
  }

  if (!input.hasClosedWonData) {
    return {
      overview: false,
      snapshot: false,
      trend: false,
      closedWon: true,
      detailCategory,
      closedWonCategory,
    };
  }

  return null;
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

export function getWarmupCategoryOrder(
  activeCategory: DashboardState['activeCategory'],
): Category[] {
  if (isOverviewTab(activeCategory)) {
    return [...CATEGORY_ORDER];
  }

  return CATEGORY_ORDER.filter((category) => category !== activeCategory);
}

export function getNextBackgroundWarmupTask(input: {
  activeCategory: DashboardState['activeCategory'];
  snapshotByCategory: Partial<Record<Category, CategorySnapshotPayload>>;
  closedWonByCategory: Partial<Record<Category, ClosedWonOpportunitiesPayload>>;
  dictionaries: Partial<Record<GlobalFilterKey, FilterDictionaryPayload>>;
  settledTaskKeys?: ReadonlySet<string>;
}): BackgroundWarmupTask | null {
  const settledTaskKeys = input.settledTaskKeys ?? new Set<string>();

  for (const category of getWarmupCategoryOrder(input.activeCategory)) {
    const task = {
      kind: 'snapshot',
      category,
    } satisfies BackgroundWarmupTask;

    if (
      !input.snapshotByCategory[category] &&
      !settledTaskKeys.has(getWarmupTaskKey(task))
    ) {
      return task;
    }
  }

  for (const category of getWarmupCategoryOrder(input.activeCategory)) {
    const task = {
      kind: 'closedWon',
      category,
    } satisfies BackgroundWarmupTask;

    if (
      !input.closedWonByCategory[category] &&
      !settledTaskKeys.has(getWarmupTaskKey(task))
    ) {
      return task;
    }
  }

  for (const key of GLOBAL_FILTER_KEYS) {
    const task = {
      kind: 'dictionary',
      key,
    } satisfies BackgroundWarmupTask;

    if (
      !input.dictionaries[key] &&
      !settledTaskKeys.has(getWarmupTaskKey(task))
    ) {
      return task;
    }
  }

  return null;
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
  const urls = React.useMemo(
    () => buildDashboardUrlFactory(apiBasePath),
    [apiBasePath],
  );
  const [state, setState] = React.useState(initialState);
  const [snapshotByCategory, setSnapshotByCategory] = React.useState<
    Partial<Record<Category, CategorySnapshotPayload>>
  >(() => buildSnapshotCache(initialOverviewBoard, initialSnapshot));
  const [overviewBoard, setOverviewBoard] =
    React.useState<OverviewBoardPayload | null>(initialOverviewBoard ?? null);
  const [trend, setTrend] = React.useState<TileTrendPayload | null>(
    initialTrend ?? null,
  );
  const [closedWonByCategory, setClosedWonByCategory] = React.useState<
    Partial<Record<Category, ClosedWonOpportunitiesPayload>>
  >(() => buildClosedWonCache(initialClosedWonOpportunities));
  const [dictionaries, setDictionaries] =
    React.useState<Record<string, FilterDictionaryPayload>>(initialDictionaries);
  const [dictionaryLoading, setDictionaryLoading] = React.useState<
    Partial<Record<GlobalFilterKey, boolean>>
  >({});
  const [backgroundSettledTaskKeys, setBackgroundSettledTaskKeys] =
    React.useState<string[]>([]);
  const [pendingDictionaryKeys, setPendingDictionaryKeys] = React.useState<
    GlobalFilterKey[]
  >([]);
  const [isSnapshotLoading, setSnapshotLoading] = React.useState(false);
  const [isTrendLoading, setTrendLoading] = React.useState(false);
  const [isClosedWonLoading, setClosedWonLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [revealedTrendCategory, setRevealedTrendCategory] =
    React.useState<Category | null>(null);
  const refreshRequestIdRef = React.useRef(0);
  const didBootstrapInitialLoadRef = React.useRef(false);
  const isMountedRef = React.useRef(true);
  const warmupQueryKey = React.useMemo(
    () =>
      buildWarmupQueryKey({
        filters: state.filters,
        dateRange: state.dateRange,
      }),
    [state.dateRange, state.filters],
  );
  const warmupQueryKeyRef = React.useRef(warmupQueryKey);
  const backgroundSettledTaskKeySet = React.useMemo(
    () => new Set(backgroundSettledTaskKeys),
    [backgroundSettledTaskKeys],
  );

  React.useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  React.useEffect(() => {
    warmupQueryKeyRef.current = warmupQueryKey;
  }, [warmupQueryKey]);

  React.useEffect(() => {
    setBackgroundSettledTaskKeys([]);
  }, [warmupQueryKey]);

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
        ).then((response) =>
          readJson<OverviewBoardPayload>(response, 'Overview'),
        )
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
          readJson<ClosedWonOpportunitiesPayload>(
            response,
            'Closed won opportunities',
          ),
        )
      : null;

    if (closedWonFetch) {
      void closedWonFetch
        .then((payload) => {
          if (
            !isMountedRef.current ||
            requestId !== refreshRequestIdRef.current
          ) {
            return;
          }

          setClosedWonByCategory((current) => ({
            ...current,
            [payload.category]: payload,
          }));
          setClosedWonLoading(false);
        })
        .catch((reason) => {
          if (
            !isMountedRef.current ||
            requestId !== refreshRequestIdRef.current
          ) {
            return;
          }

          setClosedWonLoading(false);
          setError(
            (current) => current ?? formatRefreshError('Closed won', reason),
          );
        });
    }

    const [overviewResult, snapshotResult, trendResult] =
      await Promise.allSettled([overviewFetch, snapshotFetch, trendFetch]);

    if (!isMountedRef.current || requestId !== refreshRequestIdRef.current) {
      return;
    }

    const nextErrors: string[] = [];

    if (scope.overview) {
      if (overviewResult.status === 'rejected') {
        nextErrors.push(formatRefreshError('Overview', overviewResult.reason));
      } else if (!overviewResult.value) {
        nextErrors.push('Overview: request failed.');
      }
    }

    if (scope.snapshot) {
      if (snapshotResult.status === 'rejected') {
        nextErrors.push(formatRefreshError('Snapshot', snapshotResult.reason));
      } else if (!snapshotResult.value) {
        nextErrors.push('Snapshot: request failed.');
      }
    }

    if (scope.trend) {
      if (trendResult.status === 'rejected') {
        nextErrors.push(formatRefreshError('Trend', trendResult.reason));
      } else if (!trendResult.value) {
        nextErrors.push('Trend: request failed.');
      }
    }

    if (nextErrors.length > 0) {
      refreshRequestIdRef.current += 1;
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

    if (
      scope.overview &&
      overviewResult.status === 'fulfilled' &&
      overviewResult.value
    ) {
      setOverviewBoard(overviewResult.value);
      setSnapshotByCategory(
        Object.fromEntries(
          overviewResult.value.snapshots.map((snapshot) => [
            snapshot.category,
            snapshot,
          ]),
        ) as Partial<Record<Category, CategorySnapshotPayload>>,
      );
    }

    if (
      scope.snapshot &&
      snapshotResult.status === 'fulfilled' &&
      snapshotResult.value
    ) {
      const snapshotData = snapshotResult.value;
      setSnapshotByCategory((current) => ({
        ...current,
        [snapshotData.category]: snapshotData,
      }));
    }

    if (
      scope.trend &&
      trendResult.status === 'fulfilled' &&
      trendResult.value
    ) {
      setTrend(trendResult.value);
    }

    if (!options?.optimisticState) {
      setState(nextState);
      updateUrl(nextState);
    }
    setSnapshotLoading(false);
    setTrendLoading(false);
    if (!scope.closedWon) {
      setClosedWonLoading(false);
    }
    setError((current) =>
      current?.startsWith('Closed won:') ? current : null,
    );
  }

  function applyStateChange(
    nextState: DashboardState,
    scope: RefreshScope,
    options?: RefreshOptions,
  ) {
    void refreshDashboard(nextState, scope, options);
  }

  React.useEffect(() => {
    if (didBootstrapInitialLoadRef.current) {
      return;
    }

    const bootstrapScope = getInitialBootstrapScope({
      activeCategory: state.activeCategory,
      snapshotByCategory,
      hasClosedWonData: Boolean(
        closedWonByCategory[getClosedWonCategory(state.activeCategory)],
      ),
    });

    didBootstrapInitialLoadRef.current = true;

    if (!bootstrapScope) {
      return;
    }

    void refreshDashboard(state, bootstrapScope);
  }, [closedWonByCategory, snapshotByCategory, state]);

  const hasWarmActiveTab = React.useMemo(
    () =>
      hasWarmActiveTabData({
        activeCategory: state.activeCategory,
        snapshotByCategory,
        closedWonByCategory,
      }),
    [closedWonByCategory, snapshotByCategory, state.activeCategory],
  );

  const nextBackgroundWarmupTask = React.useMemo(
    () =>
      getNextBackgroundWarmupTask({
        activeCategory: state.activeCategory,
        snapshotByCategory,
        closedWonByCategory,
        dictionaries,
        settledTaskKeys: backgroundSettledTaskKeySet,
      }),
    [
      backgroundSettledTaskKeySet,
      closedWonByCategory,
      dictionaries,
      snapshotByCategory,
      state.activeCategory,
    ],
  );

  React.useEffect(() => {
    if (
      !hasWarmActiveTab ||
      isSnapshotLoading ||
      isClosedWonLoading ||
      isTrendLoading
    ) {
      return;
    }

    let task = nextBackgroundWarmupTask;
    if (!task) {
      return;
    }

    const prioritizedDictionaryKey = pendingDictionaryKeys.find((key) => {
      if (dictionaries[key]) {
        return false;
      }

      return !backgroundSettledTaskKeySet.has(
        getWarmupTaskKey({
          kind: 'dictionary',
          key,
        }),
      );
    });

    if (task.kind === 'dictionary' && prioritizedDictionaryKey) {
      task = {
        kind: 'dictionary',
        key: prioritizedDictionaryKey,
      };
    }

    const taskKey = getWarmupTaskKey(task);
    const queryKey = warmupQueryKey;
    const abortController = new AbortController();
    let wasCancelled = false;

    if (task.kind === 'dictionary') {
      setDictionaryLoading((current) => ({
        ...current,
        [task.key]: true,
      }));
    }

    const request =
      task.kind === 'snapshot'
        ? fetch(
            urls.buildCategoryUrl({
              ...state,
              activeCategory: task.category,
            }),
            {
              headers: { Accept: 'application/json' },
              signal: abortController.signal,
            },
          ).then((response) =>
            readJson<CategorySnapshotPayload>(response, 'Snapshot prefetch'),
          )
        : task.kind === 'closedWon'
          ? fetch(
              urls.buildClosedWonUrl({
                ...state,
                activeCategory: task.category,
              }),
              {
                headers: { Accept: 'application/json' },
                signal: abortController.signal,
              },
            ).then((response) =>
              readJson<ClosedWonOpportunitiesPayload>(
                response,
                'Closed won prefetch',
              ),
            )
          : fetch(urls.buildFilterDictionaryUrl(task.key), {
              headers: { Accept: 'application/json' },
              signal: abortController.signal,
            }).then((response) =>
              readJson<FilterDictionaryPayload>(
                response,
                `${task.key} filter prefetch`,
              ),
            );

    void request
      .then((payload) => {
        if (
          wasCancelled ||
          !isMountedRef.current ||
          warmupQueryKeyRef.current !== queryKey
        ) {
          return;
        }

        React.startTransition(() => {
          if (task.kind === 'snapshot') {
            const snapshotPayload = payload as CategorySnapshotPayload;
            setSnapshotByCategory((current) => ({
              ...current,
              [snapshotPayload.category]: snapshotPayload,
            }));
            return;
          }

          if (task.kind === 'closedWon') {
            const closedWonPayload = payload as ClosedWonOpportunitiesPayload;
            setClosedWonByCategory((current) => ({
              ...current,
              [closedWonPayload.category]: closedWonPayload,
            }));
            return;
          }

          const dictionaryPayload = payload as FilterDictionaryPayload;
          setDictionaries((current) => ({
            ...current,
            [dictionaryPayload.filterKey]: dictionaryPayload,
          }));
        });

        setBackgroundSettledTaskKeys((current) =>
          current.includes(taskKey) ? current : [...current, taskKey],
        );
        if (task.kind === 'dictionary') {
          setPendingDictionaryKeys((current) =>
            current.filter((key) => key !== task.key),
          );
          setDictionaryLoading((current) => ({
            ...current,
            [task.key]: false,
          }));
        }
      })
      .catch((reason) => {
        if (
          wasCancelled ||
          abortController.signal.aborted ||
          !isMountedRef.current ||
          warmupQueryKeyRef.current !== queryKey
        ) {
          return;
        }

        setBackgroundSettledTaskKeys((current) =>
          current.includes(taskKey) ? current : [...current, taskKey],
        );
        setError((current) => {
          if (current) {
            return current;
          }

          if (task.kind === 'dictionary') {
            return formatRefreshError(`${task.key} filter`, reason);
          }

          return formatRefreshError(`${task.kind} warmup`, reason);
        });
        if (task.kind === 'dictionary') {
          setPendingDictionaryKeys((current) =>
            current.filter((key) => key !== task.key),
          );
          setDictionaryLoading((current) => ({
            ...current,
            [task.key]: false,
          }));
        }
      });

    return () => {
      wasCancelled = true;
      abortController.abort();

      if (
        task.kind === 'dictionary' &&
        isMountedRef.current &&
        !pendingDictionaryKeys.includes(task.key)
      ) {
        setDictionaryLoading((current) => ({
          ...current,
          [task.key]: false,
        }));
      }
    };
  }, [
    backgroundSettledTaskKeySet,
    closedWonByCategory,
    dictionaries,
    hasWarmActiveTab,
    isClosedWonLoading,
    isSnapshotLoading,
    isTrendLoading,
    nextBackgroundWarmupTask,
    pendingDictionaryKeys,
    state,
    urls,
    warmupQueryKey,
  ]);

  function resetWarmCachesForForegroundRefresh() {
    setOverviewBoard(null);
    setSnapshotByCategory({});
    setClosedWonByCategory({});
    setTrend(null);
    setBackgroundSettledTaskKeys([]);
    setRevealedTrendCategory(null);
  }

  function handleCategoryChange(category: DashboardState['activeCategory']) {
    const nextState = setDashboardActiveCategory(state, category);
    setRevealedTrendCategory(null);
    const detailCategory = isCategory(category) ? category : CATEGORY_ORDER[0];
    const closedWonCategory = getClosedWonCategory(category);
    const shouldLoadOverview =
      isOverviewTab(category) && !hasFullSnapshotCache(snapshotByCategory);
    const shouldLoadSnapshot =
      isCategory(category) && !snapshotByCategory[category];
    const shouldLoadClosedWon = !closedWonByCategory[closedWonCategory];

    applyStateChange(
      nextState,
      {
        overview: shouldLoadOverview,
        snapshot: shouldLoadSnapshot,
        trend: false,
        closedWon: shouldLoadClosedWon,
        detailCategory,
        closedWonCategory,
      },
      {
        optimisticState: nextState,
        revertState: state,
      },
    );
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
    applyStateChange(
      nextState,
      {
        overview: false,
        snapshot: false,
        trend: true,
        closedWon: false,
        detailCategory: state.activeCategory,
        closedWonCategory: getClosedWonCategory(state.activeCategory),
      },
      {
        optimisticState: nextState,
        revertState: state,
      },
    );
  }

  function handleFilterValueAdd(
    key: keyof DashboardState['filters'],
    value: string,
  ) {
    const nextState = {
      ...state,
      filters: addDashboardFilterValue(state.filters, key, value),
    };
    const detailCategory = isCategory(nextState.activeCategory)
      ? nextState.activeCategory
      : CATEGORY_ORDER[0];
    resetWarmCachesForForegroundRefresh();
    applyStateChange(
      nextState,
      {
        overview: isOverviewTab(nextState.activeCategory),
        snapshot: isCategory(nextState.activeCategory),
        trend: false,
        closedWon: true,
        detailCategory,
        closedWonCategory: getClosedWonCategory(nextState.activeCategory),
      },
      {
        optimisticState: nextState,
        revertState: state,
      },
    );
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
    resetWarmCachesForForegroundRefresh();
    applyStateChange(
      nextState,
      {
        overview: isOverviewTab(nextState.activeCategory),
        snapshot: isCategory(nextState.activeCategory),
        trend: false,
        closedWon: true,
        detailCategory,
        closedWonCategory: getClosedWonCategory(nextState.activeCategory),
      },
      {
        optimisticState: nextState,
        revertState: state,
      },
    );
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
    resetWarmCachesForForegroundRefresh();
    applyStateChange(
      nextState,
      {
        overview: isOverviewTab(nextState.activeCategory),
        snapshot: isCategory(nextState.activeCategory),
        trend: false,
        closedWon: true,
        detailCategory,
        closedWonCategory: getClosedWonCategory(nextState.activeCategory),
      },
      {
        optimisticState: nextState,
        revertState: state,
      },
    );
  }

  function handleFilterOpen(key: GlobalFilterKey) {
    if (dictionaries[key] || dictionaryLoading[key]) {
      return;
    }

    setDictionaryLoading((current) => ({
      ...current,
      [key]: true,
    }));
    setPendingDictionaryKeys((current) =>
      current.includes(key) ? current : [...current, key],
    );
  }

  const detailCategory = isCategory(state.activeCategory)
    ? state.activeCategory
    : CATEGORY_ORDER[0];
  const activeSnapshot = snapshotByCategory[detailCategory] ?? null;
  const activeClosedWon =
    closedWonByCategory[getClosedWonCategory(state.activeCategory)] ?? null;
  const overviewSnapshots =
    overviewBoard?.snapshots ??
    CATEGORY_ORDER.map((category) => snapshotByCategory[category]).filter(
      (snapshot): snapshot is CategorySnapshotPayload => Boolean(snapshot),
    );
  const displayCategory = detailCategory;
  const displayWindowLabel = formatDateRange(state.dateRange);
  const displayTileLabel =
    (isCategory(detailCategory)
      ? findTileDefinition(detailCategory, state.selectedTileId)?.label
      : undefined) ??
    trend?.label ??
    'Metric trend';
  const displayPreviousWindowLabel = formatDateRange(state.previousDateRange);
  const showTrendPanel = revealedTrendCategory === detailCategory;
  const lastRefreshedAt = isOverviewTab(state.activeCategory)
    ? (overviewBoard?.lastRefreshedAt ??
      overviewSnapshots[0]?.lastRefreshedAt ??
      null)
    : (activeSnapshot?.lastRefreshedAt ??
      overviewBoard?.lastRefreshedAt ??
      null);

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
                  Track bookings, pacing, conversion, deal quality, pipeline
                  creation, and closed won performance across each booking
                  category.
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
          dictionaries={dictionaries}
          dictionaryLoading={dictionaryLoading}
          lastRefreshedAt={lastRefreshedAt}
          renderedAt={renderedAt}
          onFilterOpen={handleFilterOpen}
          onFilterValueAdd={handleFilterValueAdd}
          onFilterValueRemove={handleFilterValueRemove}
          onDateRangeApply={handleDateRangeApply}
        />

        <CategoryTabs
          activeCategory={state.activeCategory}
          onValueChange={handleCategoryChange}
        >
          {isOverviewTab(state.activeCategory) ? (
            isSnapshotLoading ||
            overviewSnapshots.length !== CATEGORY_ORDER.length ? (
              <OverviewSkeleton />
            ) : (
              <OverviewTab
                board={buildOverviewBoard(overviewSnapshots)}
                closedWonOpportunities={activeClosedWon}
              />
            )
          ) : (
            <div className="flex flex-col gap-6">
              <Card
                aria-busy={
                  isSnapshotLoading || (showTrendPanel && isTrendLoading)
                }
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
                        selectedTileId={
                          showTrendPanel ? state.selectedTileId : ''
                        }
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
                        showTrendPanel && isTrendLoading
                          ? displayTileLabel
                          : undefined
                      }
                      displayCurrentWindowLabel={
                        showTrendPanel && isTrendLoading
                          ? displayWindowLabel
                          : undefined
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
              {isClosedWonLoading || !activeClosedWon ? (
                <ClosedWonOpportunitiesTableSkeleton />
              ) : (
                <ClosedWonOpportunitiesTable payload={activeClosedWon} />
              )}
            </div>
          )}
        </CategoryTabs>
      </div>
    </main>
  );
}
