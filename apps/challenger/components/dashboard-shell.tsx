// apps/challenger/components/dashboard-shell.tsx
'use client';

import { useEffect, useReducer, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CATEGORY_ORDER } from '@por/dashboard-constants';
import type { Category } from '@por/dashboard-constants';

import {
  dashboardReducer,
  isCategory,
  type DashboardAction,
  type DashboardState,
  type DashboardTab,
} from '@/lib/dashboard-reducer';
import { pushDashboardState, replaceDashboardState } from '@/lib/url-sync';
import { orchestratePrefetch, prefetchAdjacentTab } from '@/lib/fetch-orchestrator';
import { parseDashboardUrl } from '@/lib/url-state';
import { createInitialState } from '@/lib/dashboard-reducer';

import { TabBar } from './tab-bar';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateKey, queryClient]);

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

      {/* Filter bar placeholder — Task 13 */}
      <div data-testid="filter-bar-placeholder">Filter bar (Task 13)</div>

      {/* Clear cache button placeholder — Task 14 */}
      <div data-testid="clear-cache-placeholder">Clear cache (Task 14)</div>

      {/* Tab content */}
      {state.activeTab === 'Overview' ? (
        <div data-testid="overview-tab-placeholder">
          Overview tab (Task 10) — orchestrated: {String(orchestrated)}
        </div>
      ) : (
        <div data-testid="category-tab-placeholder">
          Category tab: {state.activeTab} (Task 11-12) — orchestrated:{' '}
          {String(orchestrated)}
        </div>
      )}
    </main>
  );
}
