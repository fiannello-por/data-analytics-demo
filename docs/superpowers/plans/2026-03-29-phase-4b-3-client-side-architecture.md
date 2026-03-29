# Phase 4b-3: Client-Side Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 4b-2 server-re-render model with a client-driven dashboard shell — instant tab switching for cached data, filter draft/apply, TanStack Query caching, TanStack Table for closed-won, and optimistic transitions.

**Architecture:** A `"use client"` `DashboardShell` owns all state via `useReducer`. Server page parses URL, passes `initialState` as props. Shell orchestrates fetches imperatively via `queryClient.prefetchQuery` in priority order. API routes serve as BFF layer calling existing server-side loaders. TanStack Query manages cache, deduplication, and stale-while-revalidate. URL syncs via `pushState`/`replaceState`.

**Tech Stack:** Next.js 15, React 19, TypeScript, TanStack Query v5, TanStack Table v8, recharts (existing), `@por/dashboard-constants`, Playwright

**Prerequisite:** Phase 4b-2 deployed and working (tab navigation, trend charts, closed-won pagination, filters, waterfall telemetry).

---

## File Map

### New files

| File | Responsibility |
|------|---------------|
| `apps/challenger/lib/dashboard-reducer.ts` | Reducer, action types, initial state builder, derived state helpers |
| `apps/challenger/lib/query-keys.ts` | Canonical `buildQueryKey` helper with normalized inputs |
| `apps/challenger/lib/query-hooks.ts` | TanStack Query hooks per surface + prefetch helper |
| `apps/challenger/lib/fetch-orchestrator.ts` | Imperative fetch priority logic called by shell effects |
| `apps/challenger/lib/url-sync.ts` | `pushState`/`replaceState` serialization + `popstate` listener |
| `apps/challenger/components/dashboard-shell.tsx` | `"use client"` shell: reducer, QueryClientProvider, effects, layout |
| `apps/challenger/components/dashboard-query-provider.tsx` | `"use client"` stable QueryClient via useState |
| `apps/challenger/components/overview-tab.tsx` | Client component rendering overview board from query hook |
| `apps/challenger/components/category-tab.tsx` | Client component rendering scorecard + trend + closed-won |
| `apps/challenger/components/scorecard-section.tsx` | Client component rendering scorecard from query hook |
| `apps/challenger/components/trend-section.tsx` | Client component rendering trend chart from query hook |
| `apps/challenger/components/closed-won-section.tsx` | Client component rendering TanStack Table from query hook |
| `apps/challenger/components/filter-bar-client.tsx` | Client filter bar with draft state, global apply/cancel |
| `apps/challenger/components/clear-cache-button.tsx` | Client component for scoped cache purge + refetch |
| `apps/challenger/components/section-skeleton.tsx` | Reusable skeleton with stable height |
| `apps/challenger/components/section-error.tsx` | Error banner with retry button |
| `apps/challenger/components/refreshing-indicator.tsx` | Subtle refreshing overlay for stale-while-revalidate |
| `apps/challenger/app/api/overview/route.ts` | GET: overview board |
| `apps/challenger/app/api/scorecard/[category]/route.ts` | GET: all scorecard groups batched |
| `apps/challenger/app/api/trend/[category]/[tileId]/route.ts` | GET: trend points |
| `apps/challenger/app/api/closed-won/[category]/route.ts` | GET: paginated closed-won rows |
| `apps/challenger/app/api/filters/route.ts` | GET: all 16 dictionaries batched |
| `apps/challenger/app/api/revalidate/route.ts` | POST: scoped revalidateTag |

### Modified files

| File | Change |
|------|--------|
| `apps/challenger/app/page.tsx` | Becomes thin server component: parse URL, render DashboardShell with initialState |
| `apps/challenger/package.json` | Add `@tanstack/react-query`, `@tanstack/react-table` |
| `apps/challenger/e2e/benchmark.spec.ts` | 4b-3 gate tests: client-side interactions, error resilience, URL round-trip |

### Files that become unused (from 4b-2 SSR architecture)

These files were for the server-component streaming model. The client shell replaces them. They can be kept for reference or removed:

| File | Replaced by |
|------|-------------|
| `components/filter-bar-shell.tsx` | `filter-bar-client.tsx` |
| `components/filter-bar-options.tsx` | `filter-bar-client.tsx` (dead code already) |
| `components/single-filter.tsx` | `filter-bar-client.tsx` |
| `components/scorecard-group.tsx` | `scorecard-section.tsx` |
| `components/category-scorecard.tsx` | `scorecard-section.tsx` |
| `components/category-trend.tsx` | `trend-section.tsx` |
| `components/closed-won-table.tsx` | `closed-won-section.tsx` |
| `components/closed-won-pagination.tsx` | Built into `closed-won-section.tsx` |
| `components/closed-won-sort-header.tsx` | Built into TanStack Table |
| `components/overview-board.tsx` | `overview-tab.tsx` |
| `components/waterfall-injector.tsx` | Shell injects waterfall directly |

The server-side loaders (`lib/*-loader.ts`) are KEPT — they're called by the API routes.

---

## Task 1: Add Dependencies

**Files:**
- Modify: `apps/challenger/package.json`

- [ ] **Step 1: Install TanStack Query and TanStack Table**

Run:
```bash
cd apps/challenger && pnpm add @tanstack/react-query @tanstack/react-table
```

- [ ] **Step 2: Verify build**

Run: `cd apps/challenger && npx next build`
Expected: Build succeeds (no code changes yet, just new dependencies)

- [ ] **Step 3: Commit**

```bash
git add apps/challenger/package.json pnpm-lock.yaml
git commit -m "feat(challenger): add @tanstack/react-query and @tanstack/react-table"
```

---

## Task 2: Dashboard Reducer

**Files:**
- Create: `apps/challenger/lib/dashboard-reducer.ts`

The reducer owns all dashboard user-intent state. Pure, synchronous. No data, no side effects.

- [ ] **Step 1: Create the reducer**

```typescript
// apps/challenger/lib/dashboard-reducer.ts

import {
  CATEGORY_ORDER,
  getDefaultTileId,
  getCategoryTiles,
  type Category,
  type DashboardFilters,
  type DateRange,
} from '@por/dashboard-constants';

// ── Types ──────────────────────────────────────────────────────────

export type DashboardTab = 'Overview' | Category;

export type ClosedWonSort = {
  field: string;
  direction: 'asc' | 'desc';
};

export type DashboardState = {
  activeTab: DashboardTab;
  committedFilters: DashboardFilters;
  committedDateRange: DateRange;
  draftFilters: DashboardFilters;
  draftDateRange: DateRange;
  selectedTileByCategory: Partial<Record<Category, string>>;
  cwSortByCategory: Partial<Record<Category, ClosedWonSort>>;
  cwPage: number;
};

// ── Actions ────────────────────────────────────────────────────────

export type DashboardAction =
  | { type: 'SWITCH_TAB'; tab: DashboardTab }
  | { type: 'SET_DRAFT_FILTER'; key: string; values: string[] }
  | { type: 'SET_DRAFT_DATE_RANGE'; dateRange: DateRange }
  | { type: 'APPLY_FILTERS' }
  | { type: 'CANCEL_FILTERS' }
  | { type: 'SELECT_TILE'; category: Category; tileId: string }
  | { type: 'SET_CW_PAGE'; page: number }
  | { type: 'SET_CW_SORT'; category: Category; field: string }
  | { type: 'RESTORE_URL_STATE'; state: DashboardState };

// ── Derived helpers ────────────────────────────────────────────────

export function derivePreviousDateRange(dateRange: DateRange): DateRange {
  const endDate = new Date(dateRange.endDate);
  const year = endDate.getFullYear() - 1;
  const month = String(endDate.getMonth() + 1).padStart(2, '0');
  const day = String(endDate.getDate()).padStart(2, '0');
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-${month}-${day}`,
  };
}

export function getActiveSelectedTileId(state: DashboardState): string | undefined {
  if (state.activeTab === 'Overview') return undefined;
  const category = state.activeTab as Category;
  return state.selectedTileByCategory[category] ?? getDefaultTileId(category);
}

export function getActiveCwSort(state: DashboardState): ClosedWonSort {
  if (state.activeTab === 'Overview') return { field: 'close_date', direction: 'desc' };
  const category = state.activeTab as Category;
  return state.cwSortByCategory[category] ?? { field: 'close_date', direction: 'desc' };
}

export function hasPendingDraftChanges(state: DashboardState): boolean {
  const filtersMatch =
    JSON.stringify(state.draftFilters) === JSON.stringify(state.committedFilters);
  const dateMatch =
    state.draftDateRange.startDate === state.committedDateRange.startDate &&
    state.draftDateRange.endDate === state.committedDateRange.endDate;
  return !filtersMatch || !dateMatch;
}

export function isCategory(tab: DashboardTab): tab is Category {
  return tab !== 'Overview';
}

// ── Default state ──────────────────────────────────────────────────

function defaultDateRange(): DateRange {
  const now = new Date();
  return {
    startDate: `${now.getFullYear()}-01-01`,
    endDate: now.toISOString().slice(0, 10),
  };
}

export function createInitialState(
  overrides?: Partial<DashboardState>,
): DashboardState {
  const dateRange = overrides?.committedDateRange ?? defaultDateRange();
  const filters = overrides?.committedFilters ?? {};
  return {
    activeTab: overrides?.activeTab ?? 'Overview',
    committedFilters: filters,
    committedDateRange: dateRange,
    draftFilters: overrides?.draftFilters ?? { ...filters },
    draftDateRange: overrides?.draftDateRange ?? { ...dateRange },
    selectedTileByCategory: overrides?.selectedTileByCategory ?? {},
    cwSortByCategory: overrides?.cwSortByCategory ?? {},
    cwPage: overrides?.cwPage ?? 1,
  };
}

// ── Reducer ────────────────────────────────────────────────────────

export function dashboardReducer(
  state: DashboardState,
  action: DashboardAction,
): DashboardState {
  switch (action.type) {
    case 'SWITCH_TAB':
      return {
        ...state,
        activeTab: action.tab,
        cwPage: 1,
        draftFilters: { ...state.committedFilters },
        draftDateRange: { ...state.committedDateRange },
      };

    case 'SET_DRAFT_FILTER': {
      const next = { ...state.draftFilters };
      if (action.values.length > 0) {
        next[action.key as keyof DashboardFilters] = action.values;
      } else {
        delete next[action.key as keyof DashboardFilters];
      }
      return { ...state, draftFilters: next };
    }

    case 'SET_DRAFT_DATE_RANGE':
      return { ...state, draftDateRange: action.dateRange };

    case 'APPLY_FILTERS':
      return {
        ...state,
        committedFilters: { ...state.draftFilters },
        committedDateRange: { ...state.draftDateRange },
        cwPage: 1,
      };

    case 'CANCEL_FILTERS':
      return {
        ...state,
        draftFilters: { ...state.committedFilters },
        draftDateRange: { ...state.committedDateRange },
      };

    case 'SELECT_TILE':
      return {
        ...state,
        selectedTileByCategory: {
          ...state.selectedTileByCategory,
          [action.category]: action.tileId,
        },
      };

    case 'SET_CW_PAGE':
      return { ...state, cwPage: action.page };

    case 'SET_CW_SORT': {
      const current = state.cwSortByCategory[action.category];
      const newDirection: 'asc' | 'desc' =
        current?.field === action.field
          ? current.direction === 'desc' ? 'asc' : 'desc'
          : 'desc';
      return {
        ...state,
        cwSortByCategory: {
          ...state.cwSortByCategory,
          [action.category]: { field: action.field, direction: newDirection },
        },
        cwPage: 1,
      };
    }

    case 'RESTORE_URL_STATE':
      return action.state;

    default:
      return state;
  }
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd apps/challenger && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/challenger/lib/dashboard-reducer.ts
git commit -m "feat(challenger): add dashboard reducer with actions, derived helpers, cross-surface reset rules"
```

---

## Task 3: Query Key Normalization

**Files:**
- Create: `apps/challenger/lib/query-keys.ts`

Canonical query key builder with deterministic normalization. This is the single source of truth for cache identity.

- [ ] **Step 1: Create query-keys.ts**

```typescript
// apps/challenger/lib/query-keys.ts

import type { DashboardFilters, DateRange } from '@por/dashboard-constants';
import type { ClosedWonSort } from './dashboard-reducer';

function normalizeFilters(filters: DashboardFilters): string {
  const entries = Object.entries(filters)
    .filter(([, v]) => v && v.length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${[...v!].sort().join('+')}`)
    .join('|');
  return entries || '_none_';
}

function normalizeDateRange(dateRange: DateRange): string {
  return `${dateRange.startDate}:${dateRange.endDate}`;
}

export const queryKeys = {
  overview: (filters: DashboardFilters, dateRange: DateRange) =>
    ['overview', normalizeFilters(filters), normalizeDateRange(dateRange)] as const,

  scorecard: (category: string, filters: DashboardFilters, dateRange: DateRange) =>
    ['scorecard', category, normalizeFilters(filters), normalizeDateRange(dateRange)] as const,

  trend: (category: string, tileId: string, filters: DashboardFilters, dateRange: DateRange) =>
    ['trend', category, tileId, normalizeFilters(filters), normalizeDateRange(dateRange)] as const,

  closedWon: (
    category: string,
    filters: DashboardFilters,
    dateRange: DateRange,
    page: number,
    sort: ClosedWonSort,
  ) =>
    [
      'closed-won',
      category,
      normalizeFilters(filters),
      normalizeDateRange(dateRange),
      page,
      sort.field,
      sort.direction,
    ] as const,

  filters: () => ['filters'] as const,
};
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd apps/challenger && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/challenger/lib/query-keys.ts
git commit -m "feat(challenger): add canonical query key normalization for TanStack Query cache identity"
```

---

## Task 4: API Routes (BFF Layer)

**Files:**
- Create: `apps/challenger/app/api/overview/route.ts`
- Create: `apps/challenger/app/api/scorecard/[category]/route.ts`
- Create: `apps/challenger/app/api/trend/[category]/[tileId]/route.ts`
- Create: `apps/challenger/app/api/closed-won/[category]/route.ts`
- Create: `apps/challenger/app/api/filters/route.ts`
- Create: `apps/challenger/app/api/revalidate/route.ts`

Each route is thin transport: parse params, validate, call shared loader, return JSON.

- [ ] **Step 1: Create all 6 API routes**

Read each existing loader to understand its signature, then create a route handler that:
1. Parses search params (filters as repeated params, dateRange, page, sort)
2. Validates inputs (tab against CATEGORY_ORDER, sort field against CLOSED_WON_DIMENSIONS)
3. Calls the corresponding loader
4. Returns `NextResponse.json(result)`

**`/api/overview/route.ts`** — parses filters + dateRange, calls `loadOverviewBoard(filters, dateRange, previousDateRange, cacheMode)`. Read `apps/challenger/lib/overview-loader.ts` for the exact signature.

**`/api/scorecard/[category]/route.ts`** — parses category from URL, filters + dateRange from search params. Calls `loadScorecard(category, tileIds, filters, dateRange, previousDateRange, cacheMode)`. Read `apps/challenger/lib/scorecard-loader.ts`. Note: the scorecard loader still exists from 4b-1 and accepts tileIds — get them via `getCategoryTiles(category).map(t => t.tileId)`.

**`/api/trend/[category]/[tileId]/route.ts`** — parses category + tileId from URL. Calls `loadTrend(category, tileId, filters, dateRange, previousDateRange, cacheMode)`.

**`/api/closed-won/[category]/route.ts`** — parses category, filters, dateRange, page, pageSize, sortField, sortDescending. Calls `loadClosedWon(...)`.

**`/api/filters/route.ts`** — calls `loadFilterDictionaries(cacheMode)` which returns all 16 dictionaries. Read `apps/challenger/lib/dictionary-loader.ts`.

**`/api/revalidate/route.ts`** — POST handler. Reads `tags[]` from request body. Calls `revalidateTag(tag)` for each. Returns `{ revalidated: tags }`.

All routes should:
- Parse `cacheMode` from search params (default 'auto')
- Derive `previousDateRange` from `dateRange` using the `derivePreviousDateRange` helper from the reducer
- Parse filters from repeated search params (same pattern as `url-state.ts`)
- Return proper error responses (400 for invalid params, 500 for loader errors)

- [ ] **Step 2: Verify build**

Run: `cd apps/challenger && npx next build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add apps/challenger/app/api/
git commit -m "feat(challenger): add API routes as BFF layer for client-side fetching"
```

---

## Task 5: TanStack Query Hooks

**Files:**
- Create: `apps/challenger/lib/query-hooks.ts`
- Create: `apps/challenger/components/dashboard-query-provider.tsx`

- [ ] **Step 1: Create the query provider**

```typescript
// apps/challenger/components/dashboard-query-provider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export function DashboardQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // No retry for 4xx
              if (error instanceof Error && error.message.includes('4')) return false;
              // One retry for network/5xx
              return failureCount < 1;
            },
            retryDelay: 2000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

- [ ] **Step 2: Create query hooks**

Create `apps/challenger/lib/query-hooks.ts` with custom hooks per surface. Each hook:
- Constructs the query key via `queryKeys.*`
- Builds the fetch URL with normalized params
- Sets surface-appropriate `staleTime`
- Returns the full TanStack Query object

Read `apps/challenger/lib/url-state.ts` for the existing param serialization helpers (or write a simple `buildApiUrl` helper for constructing fetch URLs with repeated filter params).

Hooks to create:
- `useOverviewBoard(filters, dateRange)` — staleTime 60s
- `useScorecard(category, filters, dateRange)` — staleTime 60s
- `useTrend(category, tileId, filters, dateRange, { enabled })` — staleTime 60s
- `useClosedWon(category, filters, dateRange, page, sort)` — staleTime 60s. Use `placeholderData` to keep previous page visible during page changes. Do NOT use placeholder for sort changes.
- `useFilterDictionaries()` — staleTime 900s (15 min)
- `prefetchTab(queryClient, tab, filters, dateRange)` — imperative helper for hover prefetch. Does NOT prefetch closed-won.

**Fetch priority contract:** The hooks and the orchestrator (Task 7)
share the same `queryKey` + `queryFn` pairs. TanStack Query deduplicates
— if the orchestrator starts a fetch and the hook mounts and requests
the same key, TanStack returns the in-flight promise rather than
starting a second request.

The orchestrator enforces priority by **awaiting** each priority level
before starting the next (see Task 7). This means when hook components
mount and fire their queries, the orchestrator has already started the
higher-priority fetches. Lower-priority hooks that mount simultaneously
may trigger their own fetch if the orchestrator hasn't reached them
yet — but the server-side concurrency limiter (MAX_CONCURRENT=10) still
batches them into waves, so the priority ordering holds at the server
level even if client-side launch order is not perfectly sequential.

The net effect: scorecard queries are guaranteed to be in-flight before
trend queries enter the server limiter queue, and trend before closed-won.
This is a best-effort priority mechanism, not strict sequential gating.

Each hook should build the API URL with the same repeated-params encoding as the existing URL state. Create a shared `buildApiParams` helper for filter/dateRange serialization into `URLSearchParams`. The `queryFn` must be defined identically in hooks and orchestrator — extract into shared `queryFns` object to avoid duplication.

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd apps/challenger && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/challenger/components/dashboard-query-provider.tsx apps/challenger/lib/query-hooks.ts
git commit -m "feat(challenger): add TanStack Query hooks per surface with normalized keys"
```

---

## Task 6: URL Sync Module

**Files:**
- Create: `apps/challenger/lib/url-sync.ts`

Handles `pushState`/`replaceState` serialization and `popstate` listening.

- [ ] **Step 1: Create url-sync.ts**

```typescript
// apps/challenger/lib/url-sync.ts

import {
  GLOBAL_FILTER_KEYS,
  getCategoryTiles,
  type GlobalFilterKey,
} from '@por/dashboard-constants';
import type { DashboardState, DashboardTab } from './dashboard-reducer';

// ── Serialize state to URL search params ───────────────────────────

function stateToParams(state: DashboardState): URLSearchParams {
  const params = new URLSearchParams();

  if (state.activeTab !== 'Overview') {
    params.set('tab', state.activeTab);
  }

  // Committed filters — repeated params
  for (const key of GLOBAL_FILTER_KEYS) {
    const values = state.committedFilters[key];
    if (values?.length) {
      for (const v of values) {
        params.append(key, v);
      }
    }
  }

  // Date range (omit if default YTD)
  const now = new Date();
  const defaultStart = `${now.getFullYear()}-01-01`;
  const defaultEnd = now.toISOString().slice(0, 10);
  if (
    state.committedDateRange.startDate !== defaultStart ||
    state.committedDateRange.endDate !== defaultEnd
  ) {
    params.set('startDate', state.committedDateRange.startDate);
    params.set('endDate', state.committedDateRange.endDate);
  }

  // Selected tile (category tabs only)
  if (state.activeTab !== 'Overview') {
    const tileId = state.selectedTileByCategory[state.activeTab as keyof typeof state.selectedTileByCategory];
    if (tileId) {
      params.set('tile', tileId);
    }
  }

  // Closed-won page/sort (only if non-default)
  if (state.cwPage > 1) {
    params.set('cwPage', String(state.cwPage));
  }
  if (state.activeTab !== 'Overview') {
    const sort = state.cwSortByCategory[state.activeTab as keyof typeof state.cwSortByCategory];
    if (sort && (sort.field !== 'close_date' || sort.direction !== 'desc')) {
      params.set('cwSort', sort.field);
      params.set('cwDir', sort.direction);
    }
  }

  return params;
}

export function pushDashboardState(state: DashboardState): void {
  const params = stateToParams(state);
  const url = params.toString() ? `/?${params.toString()}` : '/';
  window.history.pushState(null, '', url);
}

export function replaceDashboardState(state: DashboardState): void {
  const params = stateToParams(state);
  const url = params.toString() ? `/?${params.toString()}` : '/';
  window.history.replaceState(null, '', url);
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd apps/challenger && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/challenger/lib/url-sync.ts
git commit -m "feat(challenger): add URL sync module with pushState/replaceState serialization"
```

---

## Task 7: Fetch Orchestrator

**Files:**
- Create: `apps/challenger/lib/fetch-orchestrator.ts`

The shell calls this on state changes to fire prefetches in staged
priority order. The orchestrator **awaits** each priority level before
starting the next, ensuring higher-priority queries enter the server-side
concurrency limiter first. TanStack Query deduplicates — hooks that
mount and request the same key get the in-flight promise, not a second
request.

The `queryFns` object is shared with query-hooks.ts so both the
orchestrator and hooks use identical queryKey + queryFn pairs. Extract
`queryFns` into a shared module (e.g., within query-hooks.ts or a
dedicated query-fns.ts) and import in both places.

- [ ] **Step 1: Create fetch-orchestrator.ts**

```typescript
// apps/challenger/lib/fetch-orchestrator.ts

import type { QueryClient } from '@tanstack/react-query';
import type { DashboardState } from './dashboard-reducer';
import {
  getActiveSelectedTileId,
  getActiveCwSort,
  isCategory,
} from './dashboard-reducer';
import { queryKeys } from './query-keys';
import { queryFns } from './query-fns'; // shared with query-hooks.ts
import { getDefaultTileId, type Category } from '@por/dashboard-constants';

export type DashboardTab = 'Overview' | Category;

/**
 * Orchestrate fetches for the active tab in staged priority order.
 * Each priority level is awaited before the next starts, ensuring
 * higher-priority queries enter the server-side concurrency limiter
 * queue first.
 *
 * Called from the shell's useEffect on committed state changes.
 * Returns a promise that resolves when all fetches are initiated
 * (not when they complete — completion is handled by the hooks).
 */
export async function orchestrateFetches(
  queryClient: QueryClient,
  state: DashboardState,
): Promise<void> {
  const { committedFilters: filters, committedDateRange: dateRange } = state;

  if (state.activeTab === 'Overview') {
    // Single priority level: overview board
    queryClient.prefetchQuery({
      queryKey: queryKeys.overview(filters, dateRange),
      queryFn: queryFns.overview(filters, dateRange),
      staleTime: 60_000,
    });
    return;
  }

  const category = state.activeTab as Category;
  const tileId = getActiveSelectedTileId(state)!;
  const sort = getActiveCwSort(state);

  // Priority 1: scorecard — await ensures scorecard queries enter the
  // server limiter before trend/closed-won queries are even initiated
  await queryClient.prefetchQuery({
    queryKey: queryKeys.scorecard(category, filters, dateRange),
    queryFn: queryFns.scorecard(category, filters, dateRange),
    staleTime: 60_000,
  });

  // Priority 2: trend — awaited before closed-won
  await queryClient.prefetchQuery({
    queryKey: queryKeys.trend(category, tileId, filters, dateRange),
    queryFn: queryFns.trend(category, tileId, filters, dateRange),
    staleTime: 60_000,
  });

  // Priority 3: closed-won — fire and forget (lowest priority)
  queryClient.prefetchQuery({
    queryKey: queryKeys.closedWon(category, filters, dateRange, state.cwPage, sort),
    queryFn: queryFns.closedWon(category, filters, dateRange, state.cwPage, sort),
    staleTime: 60_000,
  });
}

export function prefetchAdjacentTab(
  queryClient: QueryClient,
  targetTab: DashboardTab,
  state: DashboardState,
): void {
  if (targetTab === 'Overview') {
    queryClient.prefetchQuery({
      queryKey: queryKeys.overview(state.committedFilters, state.committedDateRange),
      queryFn: () => fetchJson(buildApiUrl('/api/overview', state)),
      staleTime: 60_000,
    });
  } else {
    const category = targetTab as Category;
    const defaultTile = getDefaultTileId(category);
    queryClient.prefetchQuery({
      queryKey: queryKeys.scorecard(category, state.committedFilters, state.committedDateRange),
      queryFn: () => fetchJson(buildApiUrl(`/api/scorecard/${encodeURIComponent(category)}`, state)),
      staleTime: 60_000,
    });
    queryClient.prefetchQuery({
      queryKey: queryKeys.trend(category, defaultTile, state.committedFilters, state.committedDateRange),
      queryFn: () =>
        fetchJson(
          buildApiUrl(`/api/trend/${encodeURIComponent(category)}/${encodeURIComponent(defaultTile)}`, state),
        ),
      staleTime: 60_000,
    });
  }
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd apps/challenger && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/challenger/lib/fetch-orchestrator.ts
git commit -m "feat(challenger): add fetch orchestrator for imperative priority-ordered prefetch"
```

---

## Task 8: Skeleton, Error, and Refreshing Components

**Files:**
- Create: `apps/challenger/components/section-skeleton.tsx`
- Create: `apps/challenger/components/section-error.tsx`
- Create: `apps/challenger/components/refreshing-indicator.tsx`

- [ ] **Step 1: Create section-skeleton.tsx**

A `"use client"` component that renders a placeholder with stable height.

```tsx
// apps/challenger/components/section-skeleton.tsx
'use client';

type Props = {
  height?: number;
  label?: string;
};

export function SectionSkeleton({ height = 200, label }: Props) {
  return (
    <div
      data-testid="section-skeleton"
      style={{
        height,
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9ca3af',
        fontSize: '14px',
      }}
    >
      {label ? `Loading ${label}...` : 'Loading...'}
    </div>
  );
}
```

- [ ] **Step 2: Create section-error.tsx**

```tsx
// apps/challenger/components/section-error.tsx
'use client';

type Props = {
  message: string;
  onRetry: () => void;
  staleContent?: React.ReactNode;
};

export function SectionError({ message, onRetry, staleContent }: Props) {
  return (
    <div>
      {staleContent}
      <div
        data-testid="section-error"
        style={{
          padding: '12px 16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#991b1b',
          fontSize: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: staleContent ? '8px' : undefined,
        }}
      >
        <span>{message}</span>
        <button
          onClick={onRetry}
          style={{
            padding: '4px 12px',
            backgroundColor: '#fff',
            border: '1px solid #fecaca',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create refreshing-indicator.tsx**

```tsx
// apps/challenger/components/refreshing-indicator.tsx
'use client';

import type { ReactNode } from 'react';

type Props = {
  isRefreshing: boolean;
  children: ReactNode;
};

export function RefreshingIndicator({ isRefreshing, children }: Props) {
  return (
    <div style={{ position: 'relative' }}>
      {children}
      {isRefreshing && (
        <div
          data-testid="refreshing-indicator"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            backgroundColor: '#3b82f6',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/challenger/components/section-skeleton.tsx apps/challenger/components/section-error.tsx apps/challenger/components/refreshing-indicator.tsx
git commit -m "feat(challenger): add skeleton, error, and refreshing indicator components"
```

---

## Task 9: Dashboard Shell + Page Rewrite

**Files:**
- Create: `apps/challenger/components/dashboard-shell.tsx`
- Modify: `apps/challenger/app/page.tsx`

This is the core architectural change. The shell is the central client component that owns the reducer, wires up URL sync, orchestrates fetches, and renders tab content.

- [ ] **Step 1: Create dashboard-shell.tsx**

A `"use client"` component that:
1. Receives `initialState: DashboardState` as a prop
2. Initializes `useReducer(dashboardReducer, initialState)`
3. Sets up URL sync:
   - `useEffect` listens to `popstate` → dispatches `RESTORE_URL_STATE`
   - After dispatch of `SWITCH_TAB`, `APPLY_FILTERS`, `SELECT_TILE` → `pushDashboardState`
   - After dispatch of `SET_CW_PAGE`, `SET_CW_SORT` → `replaceDashboardState`
4. Sets up fetch orchestration:
   - `useEffect` on committed state changes → calls `orchestrateFetches(queryClient, state)`
   - Adjacent-tab prefetch on tab hover via `prefetchAdjacentTab`
5. Renders:
   - `TabBar` (with onTabClick, onTabHover)
   - `FilterBarClient` (with draft state, apply/cancel)
   - `ClearCacheButton`
   - `OverviewTab` or `CategoryTab` based on `activeTab`

Read each of the components it needs to render (they'll be created in Tasks 10-13) to understand their props. For now, define the shell's interface and leave TODO placeholders for child components that don't exist yet — they'll be wired in subsequent tasks.

Actually, since all tasks build on the shell, implement the shell with all child component references and create stub components in the same task if needed. The cleaner approach: implement the shell fully and render placeholder divs where components don't exist yet. Each subsequent task replaces a placeholder with the real component.

- [ ] **Step 2: Rewrite page.tsx as thin server component**

The page should:
1. Parse URL params via `parseDashboardUrl` — update it to also parse
   `tile` (selected tile ID, category tabs only) if not already present.
   Read `apps/challenger/lib/url-state.ts` to check. Add `tile?: string`
   to `DashboardUrlState` and parse it from `params.tile`.
2. Build `initialState` via `createInitialState()` with full URL mapping
3. Render `DashboardQueryProvider` → `DashboardShell` with `initialState`

Import `getCategoryTiles` and `Category` from `@por/dashboard-constants`
and `ClosedWonSort` from the reducer for the tile validation and sort
type.

```tsx
// apps/challenger/app/page.tsx
import { parseDashboardUrl } from '../lib/url-state';
import { createInitialState } from '../lib/dashboard-reducer';
import { DashboardQueryProvider } from '../components/dashboard-query-provider';
import { DashboardShell } from '../components/dashboard-shell';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
};

export default async function Page({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const urlState = parseDashboardUrl(params);

  // Full URL → initialState mapping. Every field that appears in the
  // URL must be reconstructed here for correct hydration and
  // back/forward round-trip behavior.
  const selectedTileByCategory: Partial<Record<string, string>> = {};
  if (urlState.tab !== 'Overview' && urlState.tile) {
    // Validate tile belongs to this category's catalog
    const validTiles = getCategoryTiles(urlState.tab as Category).map(t => t.tileId);
    if (validTiles.includes(urlState.tile)) {
      selectedTileByCategory[urlState.tab] = urlState.tile;
    }
  }

  const cwSortByCategory: Partial<Record<string, ClosedWonSort>> = {};
  if (urlState.tab !== 'Overview' && urlState.cwSort) {
    cwSortByCategory[urlState.tab] = urlState.cwSort;
  }

  const initialState = createInitialState({
    activeTab: urlState.tab,
    committedFilters: urlState.filters,
    committedDateRange: urlState.dateRange,
    selectedTileByCategory,
    cwSortByCategory,
    cwPage: urlState.cwPage,
  });

  return (
    <DashboardQueryProvider>
      <DashboardShell initialState={initialState} />
    </DashboardQueryProvider>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `cd apps/challenger && npx next build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add apps/challenger/components/dashboard-shell.tsx apps/challenger/app/page.tsx
git commit -m "feat(challenger): client-side dashboard shell with reducer, URL sync, fetch orchestration"
```

---

## Task 10: Overview Tab Component

**Files:**
- Create: `apps/challenger/components/overview-tab.tsx`

- [ ] **Step 1: Create overview-tab.tsx**

A `"use client"` component that uses `useOverviewBoard(filters, dateRange)` to render the overview cards. Shows skeleton while loading, error with retry on failure, refreshing indicator on stale refetch. Renders `CategoryCard` for each category (reuse existing `category-card.tsx`).

Read `apps/challenger/components/category-card.tsx` for its current props. It may need updating to accept data as props instead of from a promise.

- [ ] **Step 2: Wire into dashboard-shell.tsx**

Replace the overview placeholder in the shell with `<OverviewTab>`.

- [ ] **Step 3: Verify build**

Run: `cd apps/challenger && npx next build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add apps/challenger/components/overview-tab.tsx apps/challenger/components/dashboard-shell.tsx
git commit -m "feat(challenger): overview tab component with TanStack Query hook"
```

---

## Task 11: Scorecard + Trend + Tile Selection

**Files:**
- Create: `apps/challenger/components/scorecard-section.tsx`
- Create: `apps/challenger/components/trend-section.tsx`
- Create: `apps/challenger/components/category-tab.tsx`

- [ ] **Step 1: Create scorecard-section.tsx**

A `"use client"` component that:
- Uses `useScorecard(category, filters, dateRange)`
- Renders tiles in an HTML table (reusing existing table structure)
- Each tile row is clickable — dispatches `SELECT_TILE`
- Highlights the selected tile
- Shows skeleton/error/refreshing states

- [ ] **Step 2: Create trend-section.tsx**

A `"use client"` component that:
- Uses `useTrend(category, tileId, filters, dateRange, { enabled: !!tileId })`
- Renders the existing `TrendChart` client component
- Shows skeleton/error/refreshing states
- On tile selection, tileId changes → query key changes → new fetch

- [ ] **Step 3: Create category-tab.tsx**

Composes `ScorecardSection`, `TrendSection`, and the closed-won section (Task 12). Each is an independent render boundary.

- [ ] **Step 4: Wire into dashboard-shell.tsx**

Replace the category tab placeholder with `<CategoryTab>`.

- [ ] **Step 5: Verify build**

Run: `cd apps/challenger && npx next build`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add apps/challenger/components/scorecard-section.tsx apps/challenger/components/trend-section.tsx apps/challenger/components/category-tab.tsx apps/challenger/components/dashboard-shell.tsx
git commit -m "feat(challenger): scorecard, trend, and category tab components with tile selection"
```

---

## Task 12: Closed-Won Section with TanStack Table

**Files:**
- Create: `apps/challenger/components/closed-won-section.tsx`

- [ ] **Step 1: Create closed-won-section.tsx**

A `"use client"` component that:
- Uses `useClosedWon(category, filters, dateRange, page, sort)`
- Renders a TanStack Table with all 19 CLOSED_WON_DIMENSIONS as columns
- Column definitions: each dimension becomes a column with `accessorKey: dim`
- Sorting: TanStack Table in controlled mode. `onSortingChange` dispatches `SET_CW_SORT` to the reducer. Reducer owns sort state, table reflects it.
- Pagination: Previous/Next buttons dispatch `SET_CW_PAGE`. `replaceState` for URL.
- Column resizing: enabled via TanStack Table. Widths persisted to `localStorage` per category (presentation only).
- Sort change: shows brief loading state (not stale rows from old ordering). Use `placeholderData: undefined` for sort changes, `keepPreviousData` for page changes.
- Page change: previous page stays visible while next loads.

Read the existing `apps/challenger/components/closed-won-table.tsx` for the current rendering pattern, then rebuild using TanStack Table.

- [ ] **Step 2: Wire into category-tab.tsx**

Add `ClosedWonSection` to the category tab layout.

- [ ] **Step 3: Verify build**

Run: `cd apps/challenger && npx next build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add apps/challenger/components/closed-won-section.tsx apps/challenger/components/category-tab.tsx
git commit -m "feat(challenger): closed-won section with TanStack Table, server-side sort and pagination"
```

---

## Task 13: Client-Side Filter Bar with Draft State

**Files:**
- Create: `apps/challenger/components/filter-bar-client.tsx`

- [ ] **Step 1: Create filter-bar-client.tsx**

A `"use client"` component that:
- Uses `useFilterDictionaries()` to get option data
- Renders filter dropdowns with draft state from the reducer
- Each dropdown's checkbox changes dispatch `SET_DRAFT_FILTER`
- Shows "pending changes" indicator when `hasPendingDraftChanges(state)` is true
- Global Apply button dispatches `APPLY_FILTERS`
- Global Cancel button dispatches `CANCEL_FILTERS`
- Stays interactive during data refresh (no disabled state during fetches)
- Shows skeleton buttons while dictionaries load (`isPending`)

Read the existing `apps/challenger/components/filter-dropdown.tsx` for the dropdown UI pattern. The 4b-2 `FilterDropdown` receives state and builds URLs — in 4b-3, it receives draft state and dispatches actions instead of building URLs. Either modify the existing component or create a new one.

- [ ] **Step 2: Wire into dashboard-shell.tsx**

Replace the filter bar placeholder with `FilterBarClient`.

- [ ] **Step 3: Verify build**

Run: `cd apps/challenger && npx next build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add apps/challenger/components/filter-bar-client.tsx apps/challenger/components/dashboard-shell.tsx
git commit -m "feat(challenger): client-side filter bar with draft state and global apply/cancel"
```

---

## Task 14: Clear Cache Button

**Files:**
- Create: `apps/challenger/components/clear-cache-button.tsx`

- [ ] **Step 1: Create clear-cache-button.tsx**

A `"use client"` component that:
1. On click: calls `POST /api/revalidate` with the active tab's cache tags
2. Then: `queryClient.removeQueries()` scoped to active tab surfaces + current committed state fingerprint
3. Then: components re-mount queries automatically (TanStack Query refetches after removal)

Determine cache tags per tab:
- Overview: `['challenger-overview-board']`
- Category tab: `['challenger-scorecard-{category}', 'challenger-trend-{category}', 'challenger-closed-won-{category}']`

Uses `useQueryClient()` from TanStack Query to access the client.

Shows a spinning icon while refetch is in progress. Disabled until all refetches complete.

- [ ] **Step 2: Wire into dashboard-shell.tsx**

- [ ] **Step 3: Verify build**

Run: `cd apps/challenger && npx next build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add apps/challenger/components/clear-cache-button.tsx apps/challenger/components/dashboard-shell.tsx
git commit -m "feat(challenger): clear cache button with scoped server revalidation + client purge"
```

---

## Task 15: Tab Prefetch on Hover

**Files:**
- Modify: `apps/challenger/components/dashboard-shell.tsx`

- [ ] **Step 1: Add tab hover prefetch**

In the dashboard shell:
- Pass an `onTabHover` callback to `TabBar` that calls `prefetchAdjacentTab(queryClient, hoveredTab, state)`
- Also set up idle-time prefetch: after active tab queries settle, use `requestIdleCallback` to prefetch adjacent tabs (the next tab in DASHBOARD_TAB_ORDER)

Update `TabBar` to accept and call `onTabHover`. Read the existing `apps/challenger/components/tab-bar.tsx` — it currently uses `<a>` tags with hrefs for server navigation. In 4b-3, tab clicks should dispatch `SWITCH_TAB` instead of navigating. Update it to:
- Accept `onTabClick(tab)` and `onTabHover(tab)` callbacks
- Use `<button>` elements instead of `<a>` tags (no page navigation)
- Call `onTabClick` on click, `onTabHover` on mouseenter

- [ ] **Step 2: Verify build**

Run: `cd apps/challenger && npx next build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add apps/challenger/components/dashboard-shell.tsx apps/challenger/components/tab-bar.tsx
git commit -m "feat(challenger): prefetch adjacent tabs on hover and idle"
```

---

## Task 16: Waterfall Telemetry in Client Architecture

**Files:**
- Modify: `apps/challenger/components/dashboard-shell.tsx`

The 4b-2 waterfall was injected via `WaterfallInjector` server component. In 4b-3, the waterfall data comes from the API routes (which still use the server-side loaders with instrumentation). The client shell needs to collect waterfall data from API responses and write it to `sessionStorage`.

- [ ] **Step 1: Update API routes to include waterfall spans in responses**

Each API route should include the waterfall collector's spans in the response JSON (alongside the data). Read the current API routes from Task 4 and the waterfall types from `apps/challenger/lib/waterfall-types.ts`.

Add a `waterfall` field to each API response that contains the collector's spans for that request.

- [ ] **Step 2: Collect and aggregate waterfall data in the shell**

After each TanStack Query fetch resolves, extract the `waterfall` spans from the response and aggregate them. Write the aggregated spans to `sessionStorage` under `'challenger-waterfall'`.

This can be done via a `useEffect` that watches for query completion and collects spans.

- [ ] **Step 3: Verify build**

Run: `cd apps/challenger && npx next build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add apps/challenger/app/api/ apps/challenger/components/dashboard-shell.tsx
git commit -m "feat(challenger): waterfall telemetry collection in client-side architecture"
```

---

## Task 17: Playwright Gate Tests

**Files:**
- Modify: `apps/challenger/e2e/benchmark.spec.ts`
- Modify: `apps/challenger/e2e/harness.ts`

- [ ] **Step 1: Update the benchmark harness for client-side architecture**

The 4b-2 harness waited for `[data-testid="all-data-loaded"]` from the `WaterfallInjector`. In 4b-3, the architecture is client-driven. Update the harness to:
- Wait for all query surfaces to render data (look for `data-testid="section-ready"` or similar markers on the client components)
- Verify no full-page navigations on interactions (monitor network for document requests)

- [ ] **Step 2: Add gate tests**

Add new test cases:

1. **Client-side state:** Navigate to a category tab, switch tabs via click, verify no document request in network log
2. **Tab switch cached:** Load a tab, switch away, switch back — verify the second visit is < 100ms
3. **Filter apply:** Apply a filter, verify data changes without page reload
4. **Closed-won pagination:** Click next page, verify only closed-won data updates
5. **Draft filters:** Edit filter draft, verify no data change. Apply, verify data change.
6. **Error resilience:** Mock an API error for `/api/scorecard/*`, verify trend and closed-won still render. Verify error banner shows with retry.
7. **URL round-trip:** Navigate tabs, apply filters, use `page.goBack()` / `page.goForward()`, verify URL and visible state match

- [ ] **Step 3: Verify harness compiles**

Run: `cd apps/challenger && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/challenger/e2e/
git commit -m "feat(challenger): Playwright gate tests for client-side architecture (4b-3)"
```

---

## Task 18: Cleanup and Validation

**Files:** No new files — cleanup + verification

- [ ] **Step 1: Remove unused 4b-2 SSR components**

Delete components that are no longer imported:
- `filter-bar-options.tsx` (already dead code)
- `filter-bar-shell.tsx` (replaced by `filter-bar-client.tsx`)
- `single-filter.tsx` (replaced by `filter-bar-client.tsx`)
- `scorecard-group.tsx` (replaced by `scorecard-section.tsx`)
- `category-scorecard.tsx` (replaced by `scorecard-section.tsx`)
- `category-trend.tsx` (replaced by `trend-section.tsx`)
- `closed-won-table.tsx` (replaced by `closed-won-section.tsx`)
- `closed-won-pagination.tsx` (built into `closed-won-section.tsx`)
- `closed-won-sort-header.tsx` (built into TanStack Table)
- `overview-board.tsx` (replaced by `overview-tab.tsx`)
- `waterfall-injector.tsx` (shell handles waterfall)

Only delete files that are truly not imported anywhere. Verify with `grep -r` before deleting.

- [ ] **Step 2: Run analytics-suite tests**

Run: `pnpm suite:test`
Expected: All tests pass (production not affected)

- [ ] **Step 3: Build challenger**

Run: `cd apps/challenger && npx next build`
Expected: Build succeeds

- [ ] **Step 4: Start and smoke test**

Start the challenger: `cd apps/challenger && npx next start -p 3500`
Verify:
- Overview tab loads
- Category tab loads
- Tab switching works without page reload
- Filter apply works
- Closed-won pagination works
- Waterfall page shows data

- [ ] **Step 5: Commit cleanup**

```bash
git add -A
git commit -m "feat(challenger): Phase 4b-3 client-side architecture complete — cleanup unused SSR components"
```
