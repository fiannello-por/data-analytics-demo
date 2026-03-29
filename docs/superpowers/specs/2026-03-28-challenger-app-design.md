# Challenger App — Lightdash v2 Architecture

**Date:** 2026-03-28
**Status:** Draft
**Goal:** Build a challenger dashboard app achieving full 32-tile parity with the production analytics-suite, using Lightdash's v2 API execution path, streaming SSR, and no BigQuery client on Vercel.
**Scope:** Phased delivery. Phase 4a: overview tab (architecture validation). Phase 4b: full parity (all tabs, tile tables, trends, closed-won). Success is declared only at Phase 4b completion.
**Prerequisite:** Performance analysis from [issue #72](https://github.com/fiannello-por/data-analytics-demo/issues/72). Sandbox benchmark infrastructure from `apps/perf-sandbox/`.

---

## Background

The current analytics-suite on Vercel takes ~15-20s to fully render. The
equivalent Lightdash native dashboard loads in ~4-5s. Both use the same
self-hosted Lightdash instance on Render and the same BigQuery warehouse.

The performance gap is architectural:

| | Current analytics-suite | Lightdash native dashboard |
|---|---|---|
| Query API | v1 `compileQuery` (SQL only) | v2 `query/dashboard-chart` (compile + execute) |
| BQ execution | App runs BQ via `@google-cloud/bigquery` from Vercel | Lightdash runs BQ internally (same process) |
| Hops per query | 4+ (compile HTTP + createJob + getResults + getMetadata) | 2 (submit + poll) |
| Rendering | Blocking SSR (all data before any HTML) | Progressive (each tile independent) |
| BQ connection | Cold per request (Vercel serverless) | Persistent (Lightdash process pool) |

The challenger app adopts Lightdash's execution model: v2 API for all data,
streaming SSR for progressive rendering, no BigQuery dependency on Vercel.

---

## Delivery Phases

### Phase 4a: Architecture Validation (Overview Tab) — COMPLETE

Proves the v2 execution path works end-to-end with measurable performance:
- 5 category cards with bookings metrics
- Filter bar (read-only, proves dictionary loading)
- Streaming SSR with Suspense boundaries
- Benchmark harness from `apps/perf-sandbox/` adapted for the challenger

**Gate:** Phase 4a measurements collected. Architecture proven viable.
**Result:** 65ms TTFB, ~8.2s total (2x faster than production's 15-20s).

### Phase 4b: Full Parity (Three Sub-Phases)

Phase 4b is delivered incrementally. Each sub-phase builds on the previous
and can be validated independently.

#### Phase 4b-1: Data Layer Parity

Proves every production query shape works through v2 `executeMetricQuery`.
Spartan server-rendered UI — no client-side state, no tabs, no charts.

- Extract tile specs (`TILE_SPECS`, filter constants, `getSnapshotGroups()`)
  into `@por/dashboard-constants` so both apps share the semantic contract
  that determines query shapes
- Build v2 query builder that translates shared tile specs into Lightdash
  `MetricQuery` format
- Render all 5 category scorecards (all tiles, not just bookings)
- Render default trend for each category as HTML tables
- Render closed-won opportunities for each category as HTML tables
- Validate output matches production API responses tile-by-tile

**Gate:** All ~50 tile queries execute correctly. Values match production
for the same date range. No query shape unsupported.

#### Phase 4b-2: Streaming Architecture

Builds a streaming-first dashboard on top of the proven data layer.
Server components with per-section Suspense boundaries, tab-scoped
query execution, and priority-ordered loading.

**Topics (implementation order):**

1. **Tab navigation** — URL search params (`?tab=New+Logo`) + server
   re-render. Overview tab shows 5 category cards (10 queries). Category
   tabs show scorecard + trend + closed-won (8-15 queries). Tab links are
   plain `<a>` tags — no client-side routing. Single `page.tsx` reads
   `searchParams.tab` and conditionally renders the active tab's content.

2. **Query priority system** — The page component eagerly creates loader
   promises in manifest order before rendering any Suspense boundaries.
   This is the priority mechanism: by calling loaders sequentially at the
   top of the page's async function, higher-priority loaders submit their
   queries to the FIFO concurrency limiter first. The resulting promises
   are then passed as props to child server components, which `await` them
   inside their Suspense boundaries.

   ```tsx
   // page.tsx (simplified)
   const scorecardPromise = loadScorecard(category, ...);  // submits first
   const trendPromise = loadTrend(category, ...);          // submits second
   const closedWonPromise = loadClosedWon(category, ...);  // submits third
   const filtersPromise = loadFilters(...);                 // submits last

   return (
     <>
       <Suspense fallback={...}><Scorecard data={scorecardPromise} /></Suspense>
       <Suspense fallback={...}><Trend data={trendPromise} /></Suspense>
       ...
     </>
   );
   ```

   This avoids relying on React's render traversal order. The page owns
   submission order explicitly. Components receive promises, not loaders.

   Overview tab: overview board (1) → filters (2).
   Category tabs: scorecard (1) → trend (2) → closed-won (3) → filters (4).

   The manifest is a plain config array. Reordering for 4b-3 is changing
   the call sequence.

3. **Filter bar shell-then-data** — The filter bar layout (labels +
   disabled dropdown buttons) renders synchronously as part of the shell
   HTML. A nested Suspense loads the 16 dictionary queries at lowest
   priority. Dropdowns become enabled when options arrive. No "Loading..."
   text — just inactive UI that comes alive.

4. **Interactive filters** — Filter selections serialize into URL params
   (`?tab=New+Logo&Division=East&Division=West`). Applying filters navigates to
   the new URL, triggering a full server re-render of the active tab with
   filtered data. Date range is also URL-driven (`?startDate=...&endDate=...`),
   defaulting to current YTD if omitted.

   One small `"use client"` component handles dropdown interaction
   (checking options, constructing the apply URL). This is presentation JS,
   not data-fetching state. The URL is the single source of truth.

5. **Trend charts** — Replace HTML trend tables with recharts line charts.
   Two series: current window (solid) and previous window (dashed).
   Data loading stays in a server component (`CategoryTrend`); the chart
   itself is a `"use client"` leaf component (`TrendChart`) receiving
   points as props. recharts is already a production dependency.

6. **Closed-won server-side pagination** — Lightdash v2 caches query
   results and supports `pageSize` + `page` on the poll endpoint without
   re-scanning BigQuery (confirmed via live test: 138 rows paginated into
   3 pages of 50, different rows per page, instant response).

   Implementation: submit the query once, poll page 1 (50 rows). Page
   navigation adds `?cwPage=2` to the URL, triggering a server re-render.
   The loader re-submits the same query (Lightdash cache hit, ~100ms),
   then polls the requested page. `unstable_cache` wraps the submission
   so repeated page navigations within 60s skip the submit entirely.

   Loader signature: `loadClosedWon(category, filters, dateRange, page,
   pageSize, cacheMode)`.

7. **Closed-won table sorting** — Column-header clicks add sort params
   to the URL (`?cwSort=close_date&cwDir=desc`). The loader passes sort
   field and direction to `buildV2ClosedWonQuery`. Changing sort resets
   to page 1. Lightdash handles numeric vs lexicographic sorting based
   on dimension type definitions. Default: `close_date` descending.

8. **Performance gate** — Per-tab measurement:

   | Metric | Target | How measured |
   |--------|--------|-------------|
   | TTFB (full-cold p50) | < 50ms | Playwright harness |
   | Total load per tab (full-cold p50) | < 4s | Playwright, all 6 tabs measured |
   | Tab content complete | All Suspense resolved | Playwright waits for data-testid markers |
   | Filter dictionaries populated | All 16 | Playwright checks dropdown option counts |

   5 runs per mode × 6 tabs = 30 runs minimum. Every tab must independently
   meet the < 4s gate. Category tabs have different tile counts (New Logo
   has 13 tiles, Total has 4) — measuring all 6 ensures the worst case passes.

9. **Telemetry waterfall visualization** — Per-query timing captured and
   rendered as a horizontal bar chart on a dev-only `/waterfall` route.

   Per-query span data:
   - Concurrency limiter wait time (queued → slot opened)
   - App-side submit latency (POST round-trip)
   - App-side poll latency (first poll → "ready")
   - Lightdash `initialQueryExecutionMs` (from response)
   - Lightdash `resultsPageExecutionMs` (from response)
   - Lightdash `cacheHit` (boolean)

   Spans grouped by section (scorecard, trend, closed-won, filters) on
   the Y-axis. Time from page start on the X-axis. Concurrency waves
   visible as clusters of bars starting together.

   Data injected into `window.__CHALLENGER_TELEMETRY__.waterfall` as JSON
   and mirrored to `sessionStorage` so it survives navigation. The
   `/waterfall` route is a `"use client"` component that reads from
   `sessionStorage` and renders the chart. Also extractable by the
   Playwright harness for reports (reads from `window` before navigating).

   Note: Lightdash does not expose compile vs BQ execution as separate
   timings — `initialQueryExecutionMs` bundles both. This is a Lightdash
   internals limitation.

10. **Metric completeness pass** — After topics 1-9 pass, audit the
    challenger against the production dashboard to verify every metric in
    `TILE_CATALOG` renders with correct data on the correct tab. Extend
    the parity validation script to verify: each tab renders without
    errors via direct URL navigation, filter application changes values,
    and closed-won pagination returns correct page counts.

**Gate:** Full-cold total load < 4s per tab. TTFB < 50ms. All metrics
present. Waterfall report generated.

#### Phase 4b-3: Client-Side Architecture

Replaces the 4b-2 server-re-render model with a client-driven
architecture for instant interactions and smart caching.

**Topics (14):**

1. **Client-side dashboard shell** — `"use client"` `DashboardShell`
   component with `useReducer`. Server page parses URL and passes
   `initialState` as props. Shell owns all dashboard state:

   ```
   activeTab
   committedFilters        committedDateRange
   draftFilters            draftDateRange
   selectedTileByCategory  (Partial<Record<Category, string>>)
   cwSortByCategory        (Partial<Record<Category, ClosedWonSort>>)
   cwPage
   ```

   `previousDateRange` is derived from `committedDateRange`, not stored.
   Cache invalidation is a shell-side effect, not a reducer action.

   Cross-surface reset rules:
   - `SWITCH_TAB`: reset `cwPage` to 1, discard draft changes (reset
     drafts to committed). Preserve committed filters, dateRange,
     selectedTileByCategory, cwSortByCategory.
   - `APPLY_FILTERS` / `SET_DATE_RANGE`: reset `cwPage` to 1.
   - `SET_CW_SORT`: reset `cwPage` to 1.
   - `SELECT_TILE`: no resets.

2. **URL contract** — URL encodes committed state only: `tab`,
   committed filters (repeated params), `startDate`, `endDate`, `tile`
   (category tabs only, validated against catalog), `cwPage`, `cwSort`,
   `cwDir`.

   - `pushState` for meaningful navigations: tab switch, filter apply,
     date range change, tile selection.
   - `replaceState` for micro-state: `cwPage`, `cwSort`.
   - Draft filters/dateRange never touch the URL.
   - Shell listens to `popstate`, dispatches `RESTORE_URL_STATE`.
   - Back/forward restores committed state only; drafts are ephemeral.
   - Server parses URL, passes `initialState` to shell as props — no
     mount-time re-parse, no hydration mismatch.

3. **Data ownership boundaries** — Three layers:
   - **Reducer** owns user intent (state listed above). Pure, synchronous.
   - **TanStack Query** owns server state: fetched payloads, request
     lifecycle (in-flight, errors, retries, stale/fresh, cancellation,
     deduplication). Shell never stores fetched data in the reducer.
   - **Derived** owns computed view decisions: `previousDateRange`,
     active `selectedTileId`, active `cwSort`, query keys, loading/error
     states per surface. Computed from reducer + query cache, stored
     nowhere.

   Filter dictionaries have different freshness semantics from tab data
   (same ownership layer, different `staleTime`).

4. **Query key / cache identity rules** — First-class design topic, not
   an implementation detail. A canonical `buildQueryKey` helper produces
   flat, deterministic keys with normalized inputs (filters: sorted keys
   + sorted values; dateRange: `start:end`; sort: `field:dir`).

   | Surface | Key |
   |---------|-----|
   | Overview | `['overview', filtersKey, dateRangeKey]` |
   | Scorecard | `['scorecard', category, filtersKey, dateRangeKey]` |
   | Trend | `['trend', category, tileId, filtersKey, dateRangeKey]` |
   | Closed-won | `['closed-won', category, filtersKey, dateRangeKey, page, sortField, sortDir]` |
   | Dictionaries | `['filters']` |

   Policies:
   - Key change drives refetch, not manual invalidation.
   - Clear-cache is explicit scoped purge + refetch (see topic 11).
   - Server revalidation only for explicit refresh, not ordinary state
     changes.
   - Prefetched queries use the same `buildQueryKey` with committed
     state + default tile/page/sort for the target tab.

5. **API routes (BFF layer)** — Thin transport: parse params, validate,
   call shared loaders, return JSON. No business logic.

   | Route | Returns |
   |-------|---------|
   | `GET /api/overview` | All 5 category cards |
   | `GET /api/scorecard/[category]` | All snapshot groups batched |
   | `GET /api/trend/[category]/[tileId]` | Trend points |
   | `GET /api/closed-won/[category]` | Paginated rows |
   | `GET /api/filters` | All 16 dictionaries batched |
   | `POST /api/revalidate` | Scoped `revalidateTag()` |

   Scorecard intentionally batched (one request per category, not per
   group) to reduce client HTTP overhead. Filters batched (one request,
   not 16) — the per-filter streaming from 4b-2 made sense for SSR but
   adds unnecessary HTTP overhead from the browser.

6. **TanStack Query setup** — `QueryClientProvider` with `useState`-
   created `QueryClient`. Custom hooks per surface:

   - `useOverviewBoard(filters, dateRange)`
   - `useScorecard(category, filters, dateRange)`
   - `useTrend(category, tileId, filters, dateRange, { enabled })`
   - `useClosedWon(category, filters, dateRange, page, sort)`
   - `useFilterDictionaries()`
   - `prefetchTab(targetTab, committedState)` helper

   Policies:
   - `staleTime`: 60s for tab data, 15m for filter dictionaries.
   - Retry: once for network errors and 5xx, none for 4xx.
   - Hooks return the full TanStack Query object (`isPending`,
     `isFetching`, `isStale`, `refetch`).
   - Show stale data while refetching where semantics are valid
     (tab switches, page changes). Brief loading state where stale data
     would be misleading (sort changes).

7. **Tab switching** — Three cases:
   - Cached fresh: instant, no fetch.
   - Cached stale: instant stale render + background refetch + subtle
     refreshing indicator per section.
   - Uncached: per-section skeletons, each populates independently.

   Prefetch fires on tab hover and after active tab settles. Prefetches
   scorecard + trend (default tile). Does NOT prefetch closed-won
   (heavier, lower value for instant perception).

   Scorecard, trend, and closed-won are independent query/render
   boundaries. Tab is not gated on a single combined fetch.

8. **Filter draft state with apply/cancel** — Unified draft model:
   `committedFilters` + `committedDateRange` vs `draftFilters` +
   `draftDateRange`. Any diff shows "pending changes" indicator.

   - Global Apply: commits filters + dateRange atomically, resets
     `cwPage` to 1, `pushState`.
   - Global Cancel: reverts drafts to committed.
   - Tab switch: discards uncommitted drafts.
   - No query key changes until commit.
   - Filter bar stays interactive during data refresh.

9. **Optimistic updates + error/rollback** —
   - Optimistic for navigational intent: tab switch + tile selection
     update UI immediately. Trend fetches normally after tile select.
   - Stale-while-revalidate for data surfaces on filter/date apply.
   - No reducer rollback on fetch failure. Committed state remains
     source of truth. Errors attach to the surfaces that failed.
   - Stale data preserved alongside error banner where possible. Full
     error state only when no stale data exists.
   - Retry is surface-local (`refetch()` on that query), not global.

10. **TanStack Table for closed-won** — Controlled table: reducer owns
    `cwSort`, TanStack Table reflects and emits intents. Server-side
    sort + pagination (Lightdash sorts across full dataset).

    - Column resizing: client-side, persisted in `localStorage`
      (presentation only — no semantic state in localStorage).
    - Sort change: resets `cwPage` to 1, shows brief loading state
      (not stale rows from old ordering).
    - Page change: `replaceState`, previous page visible while next
      loads. Intentionally not in history (avoids polluting back/forward
      with page-by-page navigation).
    - `cwSort` persists per category via `cwSortByCategory`.

11. **Clear cache and refresh button** — Operator/debugging affordance.
    Operation order:
    1. `POST /api/revalidate` with active tab's `unstable_cache` tags
       (bust server cache first)
    2. `queryClient.removeQueries()` scoped to active tab surfaces +
       current committed state fingerprint
    3. Immediate refetch (components remount queries)

    Does NOT invalidate other tabs or filter dictionaries.

12. **Initial hydration** — SSR hydrates state, not dashboard data. No
    data fetch is allowed to delay initial shell render.

    - Server parses URL → passes `initialState` to shell.
    - Shell renders immediately with skeletons.
    - TanStack Query hooks fire on mount, fetching from API routes.
    - Active tab queries first, filters in parallel, adjacent-tab
      prefetch after active tab is underway.

13. **Loading UX contract** —
    - Initial load: shell + skeletons immediately, sections populate
      independently.
    - Cached fresh tab: instant.
    - Cached stale tab: stale data + refreshing indicator.
    - Uncached tab: per-section skeletons (not full-tab overlay).
    - Filter/date apply: refreshing indicator over stale data, or
      skeletons if no stale data for new combination.
    - Closed-won page change: current page visible + refreshing.
    - Closed-won sort change: brief loading state (not stale rows).
    - Error: stale data + error banner, or full error + retry.
    - Clear cache: sections show loading states during refetch.
    - Layout stability: skeletons preserve approximate section height.

14. **Metric completeness** — All production data surfaces functional:
    all `TILE_CATALOG` tiles on correct tabs, trend charts, closed-won
    with pagination + sort, interactive filters. Verified by existing
    parity scripts + end-to-end manual testing.

    Visual/auth parity deferred to Phase 4b-4.

**Gate:** All production data surfaces functional with client-side state,
optimistic transitions, and TanStack Query caching. Performance maintained
(< 4s per tab). Architecture ready for visual polish in 4b-4.

#### Phase 4b-4: Visual Parity and Production Replacement

Makes the challenger a drop-in replacement for the production dashboard:

- shadcn/Tailwind styling matching production
- Overview scorecard card structure (hero/supporting/detail grouping)
- 2-column category layout (tile table + trend panel)
- next-auth authentication
- Production URL/routing parity

**Gate:** Visual and functional parity with production analytics-suite.
Drop-in replacement candidate.

---

## Architecture

```
Browser → Vercel (Next.js 15, streaming SSR)
              │
              ├─ Shell HTML streams immediately (~20ms TTFB)
              │
              ├─ Suspense: Overview Board
              │   └─ 5 categories × 2 windows = 10 executeMetricQuery calls
              │       └─ POST /api/v2/.../query/metric-query (submit)
              │       └─ GET /api/v2/.../query/{uuid} (poll until ready)
              │       └─ Lightdash compiles + executes BQ internally
              │
              └─ Suspense: Filter Dictionaries
                  └─ 16 × executeMetricQuery (one per filter dimension)
                      └─ POST /api/v2/.../query/metric-query (submit)
                      └─ GET /api/v2/.../query/{uuid} (poll until ready)
                      └─ Stays within semantic layer (no raw SQL)
```

**No BigQuery client, credentials, or `@google-cloud/bigquery` on Vercel.**
Lightdash is the sole data gateway.

---

## Data Layer

### Lightdash v2 Client

Standalone ~80-line module. One function:

```typescript
executeMetricQuery(request: {
  exploreName: string;
  metrics: string[];
  dimensions: string[];
  filters: MetricQueryFilters;
  sorts: MetricQuerySort[];
  limit: number;
}): Promise<QueryResultPage>
```

Follows the pattern:
1. `POST` to submit endpoint → receive `queryUuid`
2. `GET` poll endpoint with exponential backoff (250ms → 500ms → 1000ms cap)
   until status is `ready`
3. Return rows from the ready response

This matches Lightdash's own frontend implementation (verified from
`packages/frontend/src/hooks/useQueryResults.ts` and
`packages/frontend/src/features/queryRunner/executeQuery.ts` in the
Lightdash open source repo).

### Semantic Layer Reuse Strategy

**Phase 4a:** The challenger uses its own standalone v2 client and a minimal
`query-builder.ts` for the overview surface (5 `bookings_amount` metrics
with simple category filters). This is acceptable because the overview only
uses one measure per category with no extra filters or date normalization.

**Phase 4b-1: Shared tile spec extraction into `@por/dashboard-constants`.**

The existing `semantic-registry.ts` encodes ~50 tile-specific rules: per-tile
measure selection, date dimension selection, extra filters, `ytd_to_end` date
normalization, grouped snapshot queries, and trend dimension construction.
Both apps need these definitions. The extraction puts tile specs into the
shared package so both apps derive queries from the same source.

**What moves to `@por/dashboard-constants`:**

Data and types (no dependencies):
- `TILE_SPECS` record and `TileSemanticSpec` type (`measure`, `dateDimension`,
  `extraFilters`, `dateRangeStrategy`)
- Filter constant arrays: `CLOSED_WON_FILTERS`,
  `CLOSED_WON_POSITIVE_ACV_FILTERS`, `WON_POSITIVE_ACV_FILTERS`
- `CLOSED_WON_DIMENSIONS` array
- `SemanticFilter` type (just `{field, operator, values}` — no runtime dep)
- `DateRange` type (just `{startDate, endDate}` — currently in contracts.ts)
- `DashboardFilters` type (just `Partial<Record<GlobalFilterKey, string[]>>`)
- `getSemanticTileSpec()` lookup function
- `getEffectiveDateRange()` (pure date math, depends only on `DateRange`)
- `buildSemanticFilters()` (depends on `Category`, `DashboardFilters`,
  `FILTER_DIMENSIONS` — all in the shared package)
- `buildFilterSignature()` (pure JSON serialization of filter arrays)

Grouping logic (parameterized to remove catalog dependency):
- `getSnapshotGroups(tileIds: string[])` — accepts a list of tile IDs
  rather than calling `getCategoryTiles()` internally. Groups tiles by
  their `(dateDimension, dateRangeStrategy, extraFilters)` signature
  using `TILE_SPECS` lookups. This is the semantic contract that
  determines query shape — it must be shared. Each app provides its own
  tile ID list from its own catalog or equivalent.

  Current production signature: `getSnapshotGroups(category: Category)`
  calls `getCategoryTiles(category)` to get IDs.

  New shared signature: `getSnapshotGroups(tileIds: string[])` takes IDs
  directly. Production callers change from `getSnapshotGroups(category)`
  to `getSnapshotGroups(getCategoryTiles(category).map(t => t.tileId))`.

  The `SnapshotGroup` type's `tiles` array changes from
  `(TileDefinition & TileSemanticSpec)[]` to `(TileSemanticSpec & { tileId: string })[]`
  since the shared package doesn't know about display metadata. Callers
  that need labels/formatType join the group output with their own catalog.

**What stays in analytics-suite `semantic-registry.ts`:**

Thin wrapper that imports specs and grouping from the shared package and
builds `SemanticQueryRequest` objects for `@por/semantic-runtime`. Functions
`buildSnapshotGroupQuery()`, `buildTrendQuery()`, `buildClosedWonQuery()`,
`buildFilterDictionaryQuery()` stay because they produce the
`SemanticQueryRequest` shape specific to the production execution path. The
call to `getSnapshotGroups()` changes from passing a category to passing
tile IDs: `getSnapshotGroups(getCategoryTiles(category).map(t => t.tileId))`.

**What the challenger builds (`lib/v2-query-builder.ts`):**

Parallel set of query builders that import the same shared tile specs and
produce Lightdash `MetricQuery` objects:

- `buildV2SnapshotGroupQuery(category, filters, dateRange, group)` →
  `MetricQuery` with explore-prefixed field IDs
- `buildV2TrendQuery(category, tileId, filters, dateRange)` → `MetricQuery`
  with `_week` dimension suffix
- `buildV2ClosedWonQuery(category, filters, dateRange)` → `MetricQuery` with
  all 19 closed-won dimensions
- `buildV2FilterDictionaryQuery(key)` → `MetricQuery` for a single dimension

The translation between `SemanticFilter` format and Lightdash
`MetricQueryFilters` format is mechanical:
- `model` → `exploreName`
- `measures` → `metrics` (prefix with `{exploreName}_`)
- `dimensions` → same (prefix with `{exploreName}_`)
- `field` → `target.fieldId` (prefix with `{exploreName}_`)
- `between` → `inBetween`
- `equals`/`greaterThan` → same operator names

No changes to `@por/semantic-runtime` are required.

### Overview Loader

Loads 5 categories in parallel via `Promise.all`:

```typescript
async function loadOverviewBoard(): Promise<CategoryResult[]> {
  return Promise.all(
    CATEGORIES.map(async (category) => {
      const [current, previous] = await Promise.all([
        executeMetricQuery(buildCategoryQuery(category, currentDateRange)),
        executeMetricQuery(buildCategoryQuery(category, previousDateRange)),
      ]);
      return { category, current, previous };
    })
  );
}
```

Each `executeMetricQuery` call maps to the `MetricQuery` format Lightdash
expects: `exploreName`, field IDs prefixed with explore name
(`sales_dashboard_v2_opportunity_base_bookings_amount`), and filter rules
in Lightdash's `dimensions.and[]` format.

### Dictionary Loader

Filter dictionaries are loaded via 16 `executeMetricQuery` calls, one per
dimension — the same approach the production analytics-suite uses. Each call
requests a single dimension with `sorts` and `limit: 500`:

```typescript
async function loadFilterDictionaries(): Promise<DictionaryResult[]> {
  return Promise.all(
    GLOBAL_FILTER_KEYS.map(async (key) => {
      const dimension = FILTER_DIMENSIONS[key];
      const result = await executeMetricQuery({
        exploreName: DASHBOARD_V2_BASE_MODEL,
        dimensions: [buildFieldId(DASHBOARD_V2_BASE_MODEL, dimension)],
        metrics: [],
        filters: { dimensions: { id: 'root', and: [] } },
        sorts: [{ fieldId: buildFieldId(DASHBOARD_V2_BASE_MODEL, dimension), descending: false }],
        limit: 500,
      });
      return { key, options: extractDistinctValues(result) };
    })
  );
}
```

This stays **fully within the semantic layer**: Lightdash resolves table
names from model YAML (`sql_from`), applies dimension definitions, and
handles all SQL generation. No raw SQL, no hardcoded table references, no
`getModelTable()` helper. The constants imported (`DASHBOARD_V2_BASE_MODEL`,
`GLOBAL_FILTER_KEYS`, `FILTER_DIMENSIONS`) are the same model name and
field mappings the production app uses — they do not include warehouse
table paths.

**Trade-off:** 16 parallel `executeMetricQuery` calls add compile+execute
load to the Lightdash instance. This is the same cost the production app
pays today (via `compileQuery` + BQ). Mitigation: dictionaries run in their
own Suspense boundary (streaming SSR), so they don't block the overview.
The Render upgrade (R4) directly reduces per-call latency under concurrency.

---

## Page Structure

### File Layout

```
apps/challenger/
├── app/
│   ├── layout.tsx                 # Bare shell (Inter font, tailwind)
│   ├── page.tsx                   # Streaming SSR with Suspense (Phase 4a: overview)
│   └── dashboards/
│       └── sales-performance/
│           └── page.tsx           # Phase 4b: full dashboard with all tabs
├── lib/
│   ├── lightdash-v2-client.ts     # executeMetricQuery + poll
│   ├── overview-loader.ts         # 5 categories × 2 windows via executeMetricQuery
│   ├── dictionary-loader.ts       # 16 dictionaries via executeMetricQuery
│   ├── query-builder.ts           # Builds MetricQuery payloads (model name, field IDs, filters)
│   └── types.ts                   # v2 API response types
├── components/
│   ├── overview-board.tsx         # Async server component: 5 category cards
│   ├── category-card.tsx          # Current value, previous value, % change
│   └── filter-bar.tsx             # Renders dictionary options (read-only in 4a)
├── e2e/
│   └── benchmark.spec.ts         # Playwright harness (adapted from perf-sandbox)
├── package.json
├── playwright.config.ts
├── next.config.mjs
└── tsconfig.json
```

### Dependencies

Phase 4a/4b-1 dependencies:
```json
{
  "dependencies": {
    "next": "15.5.12",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.52.0",
    "typescript": "5.9.3"
  }
}
```

Phase 4b-2 adds:
```json
{
  "dependencies": {
    "recharts": "^2.15.0"
  }
}
```

Notably absent: `@google-cloud/bigquery`, `@por/semantic-runtime`,
`server-only`. External dependencies beyond Next.js/React are recharts
(trend charts, Phase 4b-2) and the Lightdash API (HTTP calls via `fetch`).

### SSR Page (Phase 4a)

```tsx
export default function Page() {
  return (
    <main>
      <h1>Sales Performance</h1>
      <Suspense fallback={<FilterBarSkeleton />}>
        <FilterBar />
      </Suspense>
      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewBoard />
      </Suspense>
    </main>
  );
}
```

`force-dynamic` ensures SSR on every request. Shell streams in ~20ms.
Each Suspense boundary resolves independently.

### SSR Page (Phase 4b-1: Data Layer Parity)

Single long page that streams all query results. No tabs, no client state.
Every section is a server component wrapped in its own Suspense boundary.

```tsx
export default function Page() {
  return (
    <main>
      <h1>Sales Performance — Full Data Parity</h1>

      <Suspense fallback="Loading filters...">
        <FilterBar />
      </Suspense>

      <Suspense fallback="Loading overview...">
        <OverviewBoard />
      </Suspense>

      {CATEGORY_ORDER.map((category) => (
        <section key={category}>
          <h2>{category}</h2>
          <Suspense fallback={`Loading ${category} scorecard...`}>
            <CategoryScorecard category={category} />
          </Suspense>
          <Suspense fallback={`Loading ${category} trend...`}>
            <CategoryTrend category={category} />
          </Suspense>
          <Suspense fallback={`Loading ${category} closed-won...`}>
            <ClosedWonTable category={category} />
          </Suspense>
        </section>
      ))}
    </main>
  );
}
```

This produces 1 (filters) + 1 (overview) + 15 (5 categories × 3 sections)
= 17 Suspense boundaries. Each streams independently as its queries resolve.

### Phase 4b-1 File Layout Additions

```
apps/challenger/
├── lib/
│   ├── v2-query-builder.ts      # Translates shared tile specs → MetricQuery
│   ├── scorecard-loader.ts      # Loads all tiles for a category via snapshot groups
│   ├── trend-loader.ts          # Loads default tile trend for a category
│   └── closed-won-loader.ts     # Loads closed-won opportunities for a category
├── components/
│   ├── category-scorecard.tsx   # Async server component: HTML table of all tiles
│   ├── category-trend.tsx       # Async server component: HTML table of weekly trend
│   └── closed-won-table.tsx     # Async server component: HTML table of opportunities
```

### Phase 4b-1 Query Volume

| Section | Queries per category | Total |
|---------|---------------------|-------|
| Overview (existing) | 2 (current + previous) | 10 |
| Category scorecard | ~2-4 snapshot groups × 2 windows | ~30 |
| Trend | 2 (current + previous window) | 10 |
| Closed-won | 1 | 5 |
| Filter dictionaries (existing) | — | 16 |
| **Total** | | **~71** |

All queries go through the existing `MAX_CONCURRENT=10` limiter, batched
into ~7 waves. Expected total load time: ~20-25s full-cold (all data on
one page). This is acceptable for 4b-1 validation — the performance gate
applies to 4b-2 where tabs reduce the per-page query count.

---

## Measurement

The challenger app reuses the benchmark infrastructure from `apps/perf-sandbox/`:

### Playwright Harness

Adapted from `apps/perf-sandbox/e2e/benchmark.spec.ts`:
- Runs against `next build` + `next start` (production build, not dev)
- Three run modes: full-cold (fresh process + no `unstable_cache`),
  production-cold (fresh process), warm (same process)
- 5 runs per mode = 15 total per benchmark suite
- Collects browser metrics via Performance API (TTFB, FCP, LCP)
- Collects server telemetry via `window.__CHALLENGER_TELEMETRY__`

### Statistical Analysis

Reuses `apps/perf-sandbox/lib/stats.ts`:
- `computeDistribution()` for per-mode metric distributions
- `bootstrapP50CI()` for significance testing (10K resamples, 95% CI)

### Run Mode Definitions

Same as the approved perf framework spec:

| Mode | Process | `unstable_cache` | Purpose |
|------|---------|-------------------|---------|
| Full cold | Fresh `next start` | Bypassed | Raw pipeline latency |
| Production cold | Fresh `next start` | Active | Post-deployment realistic |
| Warm | Same process | Active + populated | Steady state |

---

## Success Criteria

### Phase 4a Gate (Architecture Validation)

| Metric | Target | How measured |
|--------|--------|-------------|
| TTFB (full-cold p50) | < 50ms | Playwright harness, 5 full-cold runs |
| Total load (full-cold p50) | < 4s | Playwright harness, 5 full-cold runs |
| BQ credentials on Vercel | Zero | Verify package.json + env vars |
| Data correctness | Identical overview values | Compare to analytics-suite for same date range |
| CV for TTFB | < 20% | Same G1 gate as perf sandbox |

Phase 4a does NOT declare success for the overall 10x goal. It validates
that the v2 architecture achieves Lightdash-native performance for the
overview surface.

### Phase 4b-1 Gate (Data Layer Parity)

| Metric | Target | How measured |
|--------|--------|-------------|
| All tile queries execute | 50+ tiles return data | Automated page render |
| Data correctness | All tile values match analytics-suite | Side-by-side comparison for same date range |
| All query shapes covered | Snapshots, trends, closed-won, dictionaries | Each section renders without errors |
| Shared specs used | Zero tile specs duplicated | Code review: challenger imports from `@por/dashboard-constants` |
| Production tests pass | analytics-suite test suite green | `pnpm suite:test` after extraction refactor |

No performance gate for 4b-1. The full page renders ~71 queries which will
be slow (~20-25s). Performance is gated at 4b-2 where tabs reduce per-page
query count.

### Phase 4b-2 Gate (Streaming Architecture)

| Metric | Target | How measured |
|--------|--------|-------------|
| TTFB (full-cold p50) | < 50ms | Playwright harness |
| Total load per tab (full-cold p50) | < 4s | Playwright harness, all 6 tabs measured independently |
| All tabs functional | 6 tabs render correctly | Automated URL navigation |
| Interactive filters | Filter changes produce different values | Parity script smoke test |
| Closed-won pagination | Pages return correct subsets | Parity script page navigation |
| Trend charts render | recharts line chart visible | Playwright screenshot |
| Filter bar shell-then-data | Dropdowns disabled → enabled | Playwright timing |
| Telemetry waterfall | Report generated | Playwright extracts waterfall JSON |
| Metric completeness | All TILE_CATALOG tiles present | Parity script per-tab audit |

### Phase 4b-3 Gate (Client-Side Architecture)

| Metric | Target | How measured |
|--------|--------|-------------|
| Client-side state | All interactions client-driven | No full-page server re-renders on tab/filter/page/sort |
| Tab switch (cached) | < 100ms | TanStack Query cache hit, no network |
| Filter apply | Data refreshes without page reload | TanStack Query refetch via key change |
| Closed-won pagination | Page change without full re-render | Client-side fetch only |
| Draft filters | Apply/cancel works correctly | Draft does not affect data until applied |
| Performance maintained | < 4s per tab initial load | Playwright harness, all 6 tabs |
| Error resilience | Surface-local errors, stale data preserved | Manual verification |
| URL round-trip | Back/forward restores committed state | Manual verification |

### Phase 4b-4 Gate (Visual Parity — Satisfies Original Phase 4)

| Metric | Target | How measured |
|--------|--------|-------------|
| Visual parity | Matches production styling | Side-by-side comparison |
| Feature parity | All production features present | Feature checklist |
| Authentication | next-auth working | Login flow test |
| Performance maintained | < 4s per tab | Playwright harness |

Phase 4b-4 satisfies the original perf framework gate: "challenger app with
full dashboard" achieving target performance, feature, and visual parity.

---

## Phase Scope Boundaries

### What's NOT in Phase 4a

- No category tab navigation (overview only)
- No tile table, trend chart, or closed-won table
- No interactive filter changes (filter bar is read-only)
- No authentication
- No `@por/semantic-runtime` integration

### What's in Phase 4b-1 (Data Layer Parity)

- Extract shared tile specs into `@por/dashboard-constants`
- Refactor production `semantic-registry.ts` to import from shared package
- Build v2 query builder (`v2-query-builder.ts`)
- Category scorecards: all tiles per category as HTML tables
- Trend tables: default tile weekly trend per category as HTML tables
- Closed-won tables: opportunity rows per category as HTML tables
- Streaming SSR with per-section Suspense boundaries
- Data correctness validation against production

### What's NOT in Phase 4b-1

- No tabs or client-side navigation (single long page)
- No interactive filters (read-only filter bar from 4a)
- No charts or visualizations (HTML tables only)
- No URL state management
- No performance gate (deferred to 4b-2)

### What's in Phase 4b-2 (Streaming Architecture)

- Tab navigation via URL params (server re-render per tab change)
- Query priority manifest (scorecard → trend → closed-won → filters)
- Filter bar shell-then-data (layout immediate, options streamed last)
- Interactive filters via URL params (apply = navigate to new URL)
- Trend charts via recharts (client component receiving server data)
- Closed-won server-side pagination (v2 cursor-based, 50 rows/page)
- Closed-won column sorting via URL params
- Performance gate: < 4s per tab, < 50ms TTFB
- Telemetry waterfall visualization (per-query spans, dev-only route)
- Metric completeness audit (all TILE_CATALOG tiles on correct tabs)

### What's NOT in Phase 4b-2

- No client-side state management (URL is single source of truth)
- No optimistic updates (every interaction is a server round-trip)
- No prefetching of adjacent tabs
- No TanStack table (plain HTML table with sort links)
- No filter draft state (selections apply immediately)
- No production component naming conventions (own structure)

### What's in Phase 4b-3 (Client-Side Architecture)

- Client-side dashboard shell (useReducer + history API)
- URL contract (pushState for meaningful navigations, replaceState for micro-state)
- Data ownership boundaries (reducer / TanStack Query / derived)
- Query key normalization and cache identity rules
- API routes as BFF layer (batched scorecard, batched filters)
- TanStack Query for client-side fetching with stale-while-revalidate
- Instant tab switching for cached tabs, prefetch on hover
- Filter draft state with global apply/cancel
- Optimistic updates for navigational intent, surface-local errors
- TanStack Table for closed-won (controlled, server-side sort)
- Clear cache and refresh button (scoped purge + refetch)
- Shell-only SSR hydration (state, not data)
- Loading UX contract (skeletons, stale data, layout stability)
- Metric completeness verification

### What's NOT in Phase 4b-3

- No visual styling (shadcn, Tailwind parity with production)
- No overview scorecard card structure (hero/supporting/detail)
- No 2-column category layout (tile table + trend panel)
- No authentication (next-auth)
- No production URL/routing parity

These are all Phase 4b-4 scope.

### What's in Phase 4b-4 (Visual Parity)

- shadcn/Tailwind styling matching production
- Overview scorecard card structure
- 2-column category layout
- next-auth authentication
- Production URL/routing parity

### What IS in Phase 4a

- `unstable_cache` wrapping on all loaders (matching production patterns).
  Overview board: 60s revalidation. Dictionaries: 900s revalidation.
  This is required for the three run modes to be meaningful: full-cold
  bypasses `unstable_cache` via `cacheMode=off`, production-cold leaves
  it active, warm reuses populated cache. Without `unstable_cache`, the
  production-cold and warm modes collapse into full-cold, invalidating
  the benchmark contract.

---

## Environment Variables

```
LIGHTDASH_URL=https://lightdash-server-j1vx.onrender.com
LIGHTDASH_API_KEY=<api-key>
LIGHTDASH_PROJECT_UUID=0cfa36e8-0428-42d5-9cf3-26d1fd7fd1a4
```

No BigQuery variables. Three env vars total.

---

## Risks

- **Lightdash Render instance throughput:** 26 parallel `executeMetricQuery`
  calls (10 overview + 16 dictionaries) will hit the compile+execute
  bottleneck. Tail latency at 26 concurrent: ~2.8s (measured). Mitigation:
  streaming SSR means dictionaries don't block overview rendering; R4
  (Render upgrade) improves throughput. Future optimization: batch
  dictionary queries via `executeSqlQuery` if semantic-layer parity can
  be maintained through model metadata.
- **v2 poll latency:** Exponential backoff adds 250-1000ms per poll round.
  Most queries complete in 1-2 poll rounds based on measured execution times.
- **Lightdash API stability:** v2 endpoints are the current recommended path
  (v1 `runQuery` is deprecated), but API changes could break the client.
- **Data format differences:** v2 returns `{ value: { raw, formatted } }` per
  field, which differs from our current `SemanticFieldValue` shape. The
  challenger app handles this directly without compatibility layers.
- **Semantic constant drift:** Resolved by Phase 4b-1 extraction — both apps
  import tile specs from `@por/dashboard-constants`. No duplication.
- **Extraction refactor breaks production:** The analytics-suite's
  `semantic-registry.ts` refactor (importing from shared package instead of
  defining inline) must pass the existing test suite. Pure refactor — no
  behavioral change. Verified by `pnpm suite:test`.
- **Query volume on single page:** Phase 4b-1 renders ~71 queries on one page
  (all categories, all sections). This will be slow (~20-25s) but is
  acceptable for data validation. The concurrency limiter prevents server
  overload. Performance is addressed in 4b-2 via tab-based query scoping.
- **v2 MetricQuery format gaps:** Some production query shapes may not
  translate cleanly to v2 `MetricQuery` format (e.g., the `between` →
  `inBetween` operator mapping, field ID prefixing conventions). The 4b-1
  validation page exists specifically to catch these gaps before building
  the full UI on top.
