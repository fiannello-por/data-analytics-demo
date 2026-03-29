// apps/challenger/components/dashboard-shell.tsx
'use client';

import { useEffect, useReducer, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CATEGORY_ORDER } from '@por/dashboard-constants';
import type { Category } from '@por/dashboard-constants';

import {
  dashboardReducer,
  getActiveSelectedTileId,
  getActiveCwSort,
  hasPendingDraftChanges,
  isCategory,
  type DashboardAction,
  type DashboardState,
  type DashboardTab,
} from '@/lib/dashboard-reducer';
import { pushDashboardState, replaceDashboardState } from '@/lib/url-sync';
import { orchestratePrefetch, prefetchAdjacentTab } from '@/lib/fetch-orchestrator';
import { parseDashboardUrl } from '@/lib/url-state';
import { createInitialState } from '@/lib/dashboard-reducer';
import { getTimingSpans, resetTimingStore } from '@/lib/query-fns';

import { CategoryTab } from './category-tab';
import { ClearCacheButton } from './clear-cache-button';
import { FilterBarClient } from './filter-bar-client';
import { TabBar } from './tab-bar';
import { OverviewTab } from './overview-tab';

// ─── Action classification ──────────────────────────────────────────────────

type UrlSyncMode = 'push' | 'replace' | 'none';

function classifyAction(action: DashboardAction): UrlSyncMode {
  switch (action.type) {
    case 'SWITCH_TAB':
    case 'APPLY_FILTERS':
    case 'SELECT_TILE':
      return 'push';
    case 'SET_CW_PAGE':
    case 'SET_CW_SORT':
      return 'replace';
    case 'SET_DRAFT_FILTERS':
    case 'SET_DRAFT_DATE_RANGE':
    case 'DISCARD_DRAFTS':
    case 'RESTORE_URL_STATE':
      return 'none';
    default: {
      // exhaustive check
      const _: never = action;
      return _;
    }
  }
}

// ─── Committed state key ─────────────────────────────────────────────────────
// Used to detect when the committed state has changed (triggering re-fetch).

function committedStateKey(state: DashboardState): string {
  return JSON.stringify({
    activeTab: state.activeTab,
    committedFilters: state.committedFilters,
    committedDateRange: state.committedDateRange,
    selectedTileByCategory: state.selectedTileByCategory,
    cwSortByCategory: state.cwSortByCategory,
    cwPage: state.cwPage,
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardShell({
  initialState,
}: {
  initialState: DashboardState;
}) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const [orchestrated, setOrchestrated] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const queryClient = useQueryClient();

  // Track the last action's URL sync mode so the URL-sync effect knows
  // whether to push, replace, or skip.
  const pendingSyncRef = useRef<UrlSyncMode>('none');

  // ── URL sync: push/replace after state changes ─────────────────────────

  const prevKeyRef = useRef(committedStateKey(state));

  useEffect(() => {
    const mode = pendingSyncRef.current;
    pendingSyncRef.current = 'none'; // consume

    if (mode === 'push') {
      pushDashboardState(state);
    } else if (mode === 'replace') {
      replaceDashboardState(state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.activeTab,
    state.committedFilters,
    state.committedDateRange,
    state.selectedTileByCategory,
    state.cwSortByCategory,
    state.cwPage,
  ]);

  // ── URL sync: popstate (browser back/forward) ─────────────────────────

  useEffect(() => {
    function handlePopState() {
      const params: Record<string, string | string[]> = {};
      const searchParams = new URLSearchParams(window.location.search);
      for (const key of searchParams.keys()) {
        const values = searchParams.getAll(key);
        params[key] = values.length === 1 ? values[0]! : values;
      }

      const parsed = parseDashboardUrl(params);
      const restored = createInitialState({
        activeTab: parsed.tab,
        committedFilters: parsed.filters,
        committedDateRange: parsed.dateRange,
        cwPage: parsed.cwPage,
        cwSortByCategory:
          isCategory(parsed.tab)
            ? { [parsed.tab]: parsed.cwSort }
            : {},
        selectedTileByCategory:
          parsed.tile && isCategory(parsed.tab)
            ? { [parsed.tab]: parsed.tile }
            : {},
      });

      dispatch({ type: 'RESTORE_URL_STATE', state: restored });
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ── Fetch orchestration ────────────────────────────────────────────────
  // When committed state changes, orchestrate prefetches then flip enabled.

  const stateKey = committedStateKey(state);

  useEffect(() => {
    let cancelled = false;

    setOrchestrated(false);
    resetTimingStore();

    orchestratePrefetch(queryClient, state).then(() => {
      if (!cancelled) {
        setOrchestrated(true);
      }
    });

    return () => {
      cancelled = true;
    };
    // We deliberately depend on the serialized key instead of individual
    // state fields so a single effect fires per committed-state change.
    // refreshToken forces re-orchestration after cache clear.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateKey, refreshToken, queryClient]);

  // ── Idle-time adjacent tab prefetch ───────────────────────────────────
  // After active-tab data settles, speculatively prefetch the next tab in
  // CATEGORY_ORDER so that navigating there feels instant.

  useEffect(() => {
    if (!orchestrated) return;

    const activeTab = state.activeTab;
    const allTabs = [...CATEGORY_ORDER] as Category[];

    // Find the next category tab after the active one
    const activeIndex = isCategory(activeTab) ? allTabs.indexOf(activeTab as Category) : -1;
    const nextTab: Category | undefined = allTabs[(activeIndex + 1) % allTabs.length];

    if (!nextTab || nextTab === activeTab) return;

    let handle: ReturnType<typeof setTimeout> | number | null = null;
    let idleHandle: number | null = null;

    function doIdlePrefetch() {
      void prefetchAdjacentTab(queryClient, nextTab!, state);
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleHandle = (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(doIdlePrefetch, { timeout: 2000 });
    } else {
      // Fallback: setTimeout after 500ms
      handle = setTimeout(doIdlePrefetch, 500);
    }

    return () => {
      if (idleHandle !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleHandle);
      }
      if (handle !== null) {
        clearTimeout(handle as ReturnType<typeof setTimeout>);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orchestrated, stateKey, queryClient]);

  // ── Waterfall telemetry ────────────────────────────────────────────────
  // After orchestration, snapshot client-side timing into sessionStorage
  // so the /waterfall page can visualize it.

  useEffect(() => {
    if (!orchestrated) return;

    const spans = getTimingSpans();
    if (spans.length === 0) return;

    try {
      sessionStorage.setItem('challenger-waterfall', JSON.stringify(spans));
    } catch {
      // sessionStorage may be unavailable (e.g. private browsing quota)
    }
  }, [orchestrated, stateKey]);

  // ── Dispatch wrapper ───────────────────────────────────────────────────

  function handleDispatch(action: DashboardAction) {
    const mode = classifyAction(action);
    pendingSyncRef.current = mode;
    dispatch(action);
  }

  // ── Tab callbacks ──────────────────────────────────────────────────────

  function handleTabClick(tab: DashboardTab) {
    if (tab === state.activeTab) return;
    handleDispatch({ type: 'SWITCH_TAB', tab });
  }

  function handleTabHover(tab: DashboardTab) {
    if (tab === state.activeTab) return;
    if (!isCategory(tab)) return;
    // Fire-and-forget hover prefetch
    void prefetchAdjacentTab(queryClient, tab as Category, state);
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <main>
      <h1 id="challenger-shell">Sales Performance</h1>

      <TabBar
        activeTab={state.activeTab}
        onTabClick={handleTabClick}
        onTabHover={handleTabHover}
      />

      {/* Filter bar with draft state */}
      <FilterBarClient
        draftFilters={state.draftFilters}
        draftDateRange={state.draftDateRange}
        committedFilters={state.committedFilters}
        committedDateRange={state.committedDateRange}
        hasPendingChanges={hasPendingDraftChanges(state)}
        dispatch={handleDispatch}
      />

      {/* Clear cache button — scoped to the active tab */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.25rem 0' }}>
        <ClearCacheButton
          activeTab={state.activeTab}
          category={isCategory(state.activeTab) ? state.activeTab : undefined}
          onRefreshComplete={() => setRefreshToken((t) => t + 1)}
        />
      </div>

      {/* Tab content */}
      {state.activeTab === 'Overview' ? (
        <OverviewTab
          filters={state.committedFilters}
          dateRange={state.committedDateRange}
          enabled={orchestrated}
        />
      ) : (
        <CategoryTab
          category={state.activeTab}
          filters={state.committedFilters}
          dateRange={state.committedDateRange}
          selectedTileId={getActiveSelectedTileId(state) || undefined}
          cwPage={state.cwPage}
          cwSort={getActiveCwSort(state)}
          enabled={orchestrated}
          dispatch={handleDispatch}
        />
      )}
    </main>
  );
}
