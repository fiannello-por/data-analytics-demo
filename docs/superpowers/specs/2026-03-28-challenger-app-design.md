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

2. **Query priority system** — Declarative per-tab manifest controls the
   order loaders are submitted to the FIFO concurrency limiter. No limiter
   changes needed — submission order is the priority mechanism.

   Overview tab: overview board (1) → filters (2).
   Category tabs: scorecard (1) → trend (2) → closed-won (3) → filters (4).

   The manifest is a plain config array. Reordering for 4b-3 is changing a
   number. The page starts loaders in manifest order; Suspense boundaries
   render independently as data arrives.

3. **Filter bar shell-then-data** — The filter bar layout (labels +
   disabled dropdown buttons) renders synchronously as part of the shell
   HTML. A nested Suspense loads the 16 dictionary queries at lowest
   priority. Dropdowns become enabled when options arrive. No "Loading..."
   text — just inactive UI that comes alive.

4. **Interactive filters** — Filter selections serialize into URL params
   (`?tab=New+Logo&Division=East,West`). Applying filters navigates to
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
   | Total load per tab (full-cold p50) | < 4s | Playwright, overview + one category tab |
   | Tab content complete | All Suspense resolved | Playwright waits for data-testid markers |
   | Filter dictionaries populated | All 16 | Playwright checks dropdown option counts |

   5 runs per mode × 2 tabs = 10 runs minimum. Both tabs must independently
   meet the < 4s gate.

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

#### Phase 4b-3: Full UI Parity

Matches the production dashboard experience:

- Client-side state management with optimistic updates
- URL-driven navigation with history support
- TanStack table for closed-won drilldown
- Filter draft state with apply/cancel
- Prefetching and request deduplication

**Gate:** Feature parity with production analytics-suite. Drop-in
replacement candidate.

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

Notably absent: `@google-cloud/bigquery`, `@por/semantic-runtime`,
`server-only`. The only external dependency beyond Next.js/React is the
Lightdash API (HTTP calls via `fetch`).

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
| Total load per tab (full-cold p50) | < 4s | Playwright harness, overview + one category tab |
| All tabs functional | 6 tabs render correctly | Automated URL navigation |
| Interactive filters | Filter changes produce different values | Parity script smoke test |
| Closed-won pagination | Pages return correct subsets | Parity script page navigation |
| Trend charts render | recharts line chart visible | Playwright screenshot |
| Filter bar shell-then-data | Dropdowns disabled → enabled | Playwright timing |
| Telemetry waterfall | Report generated | Playwright extracts waterfall JSON |
| Metric completeness | All TILE_CATALOG tiles present | Parity script per-tab audit |

### Phase 4b-3 Gate (Full UI Parity — Satisfies Original Phase 4)

| Metric | Target | How measured |
|--------|--------|-------------|
| Feature parity | All production features present | Feature checklist comparison |
| Performance maintained | < 4s total load per tab | Playwright harness |
| Query count | ≤ baseline analytics-suite per tab | Telemetry from Playwright |

Phase 4b-3 satisfies the original perf framework gate: "challenger app with
full dashboard" achieving target performance and feature parity.

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
