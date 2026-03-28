# 10x Analytics Suite Loading Performance — Experiment Framework Design

**Date:** 2026-03-28
**Status:** Draft
**Goal:** Reduce cold initial page load time by 10x through systematic measurement and experimentation.
**Scope:** Phase 1 — design the experimental framework, sandbox, and telemetry. No production code changes.

---

## 1. Loading Pipeline Map

The sales-performance dashboard is a Next.js 15 + React 19 SSR page that queries
BigQuery through a Lightdash semantic layer. The initial page load blocks on **all
data** before sending any HTML to the browser.

### Full SSR Critical Path

```
BROWSER REQUEST
  │
  ▼
NEXT.JS SSR (sales-performance/page.tsx)
  │
  ├─ [BLOCK] Conditional: Overview OR Category snapshot
  │   │
  │   ├─ Overview path: getDashboardV2OverviewBoard()
  │   │   └─ Promise.all(5 categories)
  │   │       └─ getDashboardV2CategorySnapshot() × 5
  │   │           └─ Promise.all(N tile groups per category)
  │   │               └─ Promise.all([currentWindow, previousWindow])
  │   │                   ├─ runTimedQuery() → runtime.runQuery()
  │   │                   │   ├─ [HTTP] Lightdash compileQuery POST
  │   │                   │   ├─ [HTTP] BigQuery createQueryJob
  │   │                   │   ├─ [HTTP] BigQuery getQueryResults
  │   │                   │   └─ [HTTP] BigQuery getMetadata
  │   │                   └─ runTimedQuery() (previous window, same path)
  │   │
  │   └─ Category path: getDashboardV2CategorySnapshot() (single)
  │
  ├─ [BLOCK] getDashboardV2TileTrend() (if category view)
  │   └─ runtime.runQuery() → same Lightdash → BQ path
  │
  ├─ [BLOCK] Promise.all(16 filter dictionaries)
  │   └─ getDashboardV2FilterDictionary() × 16
  │       └─ runtime.runQuery() × 16 → same path
  │
  ▼
  ALL DATA COLLECTED → Render React tree → Send complete HTML
  │
  ▼
BROWSER
  ├─ Parse HTML + CSS
  ├─ Download JS bundles
  ├─ Hydrate React (full tree, no Suspense)
  ├─ DashboardShell mounts → prefetch closed-won (staggered 75ms)
  └─ Interactive
```

### Key Architectural Observations

| Stage | What we know | What we don't know |
|-------|-------------|-------------------|
| Lightdash compileQuery | HTTP POST per query, no compilation caching | Actual latency per call |
| BigQuery execution | `useQueryCache: true`, 3 API calls per query | Cold vs warm times, bytes scanned |
| Next.js `unstable_cache` | 60s revalidation, SSR-only | Hit rate in practice |
| `SemanticResultCache` | Exists in package, **not wired up** in app | N/A — unused |
| `InFlightRequestDeduper` | Created internally by runtime but no persistent cache feeds it | Dedup rate |
| Filter dictionaries | 16 queries on SSR critical path | Could these be static? |
| Lightdash instance | Self-hosted, **no Lightdash-side result caching** | — |
| Page render | All data must resolve before any HTML ships | — |
| React 19 streaming | Available but not used (no Suspense boundaries) | — |

---

## 2. Bottleneck Hypotheses

Ranked by expected impact on cold initial page load. Priority order:
H1 → H3 → H4 → H9 → H5 → H7. (H2 dropped — see below.)

| # | Hypothesis | Category | Evidence | Expected Impact | Confidence |
|---|-----------|----------|----------|----------------|------------|
| **H1** | SSR blocks on ALL data before sending any HTML | Server | `page.tsx` awaits overview+trend+dictionaries, no Suspense | -60% to -80% TTFB | High |
| **H3** | In-memory semantic cache + deduper not wired up | Caching | `createMemorySemanticResultCache()` and `createInFlightRequestDeduper()` exist in package but app doesn't use them | -20% to -40% on warm loads | High |
| **H4** | Filter dictionaries are 16 separate queries on the critical path | Network | `Promise.all(16 × runtime.runQuery())` each hits Lightdash compile + BQ | -15% to -30% total SSR time | High |
| **H9** | Lightdash v2 `executeMetricQuery` eliminates network hops | Semantic | Current: compileQuery + BQ (4 calls). v2: submit + poll (2 calls). Self-hosted = no LH cache, so benefit is hop reduction only | -10% to -25% per query | Medium |
| ~~**H2**~~ | ~~Redundant Lightdash compile calls for identical query shapes~~ | ~~Semantic~~ | **Dropped.** `compileQuery` includes full filter values (category, date range) in the compilation request. Each category produces distinct SQL. A "shape-based" cache would serve wrong SQL; a correct cache key eliminates cross-category sharing. See `lightdash.ts:166`, `semantic-registry.ts:417`. | N/A | N/A |
| **H5** | BigQuery cold-start latency per job | Warehouse | 3 sequential API calls per query (createJob → getResults → getMetadata) | -10% to -25% per query | Medium |
| **H7** | Client hydration cost for full component tree | Client | No code splitting, no dynamic imports, full DashboardShell hydrates at once | -5% to -15% TTI | Medium |

---

## 3. Sandbox Architecture

A minimal Next.js app that exercises the real pipeline with full telemetry. No
styling, no auth, no dashboard filters. Focused entirely on measuring data
pipeline performance.

### Directory Structure

```
apps/perf-sandbox/
├── app/
│   ├── layout.tsx              # Bare-bones shell
│   ├── page.tsx                # Experiment selector + results viewer
│   ├── api/
│   │   ├── benchmark/route.ts  # Runs N iterations, returns stats
│   │   └── telemetry/route.ts  # Accepts + stores telemetry events
│   └── results/page.tsx        # Waterfall visualization
├── e2e/
│   └── benchmark.spec.ts       # Playwright harness for browser metrics
├── experiments/
│   ├── baseline.ts             # Current architecture (control)
│   ├── streaming-ssr.ts        # E1: Suspense boundaries
│   ├── wired-cache.ts          # E3: SemanticResultCache + deduper
│   ├── dicts-off-critical.ts   # E4: Filter dicts loaded after shell
│   ├── lh-execute-metric.ts    # E2a: v2 executeMetricQuery (requires provider work)
│   ├── bq-call-optimize.ts     # E5: BQ single-call or parallel metadata
│   └── combined-winner.ts      # E6: Best variants stacked
├── lib/
│   ├── telemetry.ts            # Hierarchical span collector
│   ├── stats.ts                # Statistical summary
│   ├── browser-harness.ts      # Playwright-based browser metric collection
│   └── experiment-registry.ts  # Registry + standard interface
├── package.json
├── playwright.config.ts
└── next.config.mjs
```

### Design Principles

1. **Real pipeline, not mocks.** Imports `@por/semantic-runtime`, connects to
   the same Lightdash instance + BigQuery warehouse.

2. **Experiment as a module.** Standard interface:
   ```typescript
   type Experiment = {
     id: string;
     name: string;
     hypothesis: string;
     run: (ctx: ExperimentContext) => Promise<ExperimentResult>;
   };
   ```

3. **3-5 tiles only.** Fixed subset (one per category) to keep runs fast while
   exercising all code paths.

4. **Cold and warm runs tracked explicitly.** Every run is tagged `isCold` or
   `isWarm`. Cold runs clear all caches first. Both distributions are reported
   separately. Cold is the primary metric.

5. **Benchmark runner modes:**
   - `all-cold`: Clear caches before every run (N cold-start measurements)
   - `cold-then-warm`: One cold run, then N-1 warm runs
   - `all-warm`: Pre-warm caches, then N warm runs

6. **A/B within a single session.** Benchmark route runs baseline + variant
   back-to-back and returns comparison with absolute and percentage deltas.

---

## 4. Experiment Catalog

Each experiment targets one hypothesis, has a clear control/variant, and defines
success as a measurable assertion written before the code (TDD-style).

### Experiment Definitions

| # | Hypothesis | Control | Variant | Primary Metric | Guardrails | Expected Impact | Deps |
|---|-----------|---------|---------|---------------|------------|-----------------|------|
| **E1** | SSR blocks on all data | Current `page.tsx`: await all → render | Suspense per tile group; shell streams, tiles fill progressively | TTFB p50 | LCP, total fetch time unchanged | -60% to -80% TTFB | None |
| **E2a** | Lightdash v2 executeMetricQuery eliminates hops | `compileQuery` → BQ client (4 calls) | v2 `executeMetricQuery` submit + poll (2 calls) | Per-query wall-clock p50 | Row correctness, budget observability | -10% to -25% per query | E2a-prereq |
| **E3** | App-level semantic cache not wired up | No `SemanticResultCache` or persistent `InFlightRequestDeduper` | Wire both into `createSemanticRuntime()` with semantic version key | Cold→warm ratio, cache hit rate | Memory usage | -20% to -40% warm loads | None |
| **E4** | 16 filter dictionaries on SSR critical path | 16 `runQuery` calls block SSR | Move dictionaries off the critical path: load after shell renders via streaming SSR or client-side fetch on mount | Cold SSR total time, TTFB | Filter UX responsiveness (dictionaries still available before user interacts) | -15% to -30% cold SSR | None |
| **E5** | BigQuery 3-call overhead per job | `createJob` → `getResults` → `getMetadata` | (a) `Promise.all([getResults, getMetadata])`; (b) BQ `query()` single-call | Per-query BQ time | `bytesProcessed` still captured | -10% to -25% | Skip if E2a wins |
| **E6** | Combined winners | Baseline | Stack top 2-3 winning variants | Cold total page load p50 | No regressions | Target: 10x | E1-E5 results |

**Dropped experiments:**
- ~~E5 (compile cache)~~: Lightdash `compileQuery` includes full filter values
  (category, date range) in the compilation request, producing category-specific
  SQL. A shape-based cache would return SQL compiled for wrong filters. A correct
  cache key eliminates cross-category sharing. See `lightdash.ts:166`,
  `semantic-registry.ts:417`.
- ~~E4a (longer dictionary TTL)~~: Filter dictionaries already use
  `unstable_cache` with `revalidate: 900` (15 min). "Longer TTL" is already the
  baseline. Cold runs bypass `unstable_cache` entirely, so TTL changes cannot
  improve the primary cold metric. Only "move off critical path" survives as E4.
  See `get-dashboard-filter-dictionary.ts:49`.

### E2a Prerequisite: New Runtime/Provider Contract

E2a is **not** a simple transport swap. The current `SemanticProvider` interface
only exposes `compileQuery() → CompiledSemanticQuery` (SQL string + aliases),
and `SemanticRuntime` chains that to a separate `SemanticQueryExecutor`. There is
no type, interface, or code path for "Lightdash executes and returns results."

Before E2a can run as an experiment, the following must be designed and built:

1. New `SemanticProvider` method (e.g., `executeQuery`) or alternative provider
   type that wraps the v2 `executeMetricQuery` submit + poll pattern
2. New result type bridging the v2 paginated response to `SemanticQueryResult`
3. New execution path in `runtime.ts` that bypasses the `executeQuery` executor
4. Telemetry fields for the async flow (`submitMs`, `pollMs`, `totalRoundTrips`)
5. Decision on `bytesProcessed` — v2 does not expose it; either accept the loss
   or run periodic observability-only queries through the direct BQ path

This makes E2a higher effort than other experiments. It should be designed as a
sub-project, not a simple toggle.

### Execution Order

```
E1 (streaming SSR) ─────────────────┐
E3 (wire cache + deduper) ──────────┼── independent, run in parallel
E4 (dictionaries off critical path) ┘
        │
        ▼
E2a (LH executeMetricQuery) ── requires provider contract work first
E5 (BQ call optimization) ──── only if E2a doesn't win decisively
        │
        ▼
E6 (combined winners) ───── stacks best variants
```

### TDD-Style Assertions

```typescript
// E1: Streaming SSR
expect(variant.cold.ttfbMs.p50).toBeLessThan(baseline.cold.ttfbMs.p50 * 0.4);

// E2a: Lightdash executeMetricQuery
expect(variant.cold.perQueryMs.p50).toBeLessThan(baseline.cold.perQueryMs.p50 * 0.75);

// E3: Cache + deduper (warm runs)
expect(variant.warm.ssrDataFetchMs.p50).toBeLessThan(baseline.warm.ssrDataFetchMs.p50 * 0.6);

// E4: Dictionaries off critical path
expect(variant.cold.ttfbMs.p50).toBeLessThan(baseline.cold.ttfbMs.p50 * 0.85);

// E6: Combined — the 10x target
expect(combined.cold.totalPageLoadMs.p50).toBeLessThan(baseline.cold.totalPageLoadMs.p50 * 0.1);
```

---

## 5. Telemetry Schema

### Span Structure

Every async boundary emits a span. Spans nest hierarchically.

```typescript
type TelemetrySpan = {
  id: string;
  name: string;
  parentId?: string;
  startMs: number;      // relative to page request start
  durationMs: number;
  metadata?: Record<string, unknown>;
};
```

### Span Tree (Cold Page Load)

```
page_request
├── ssr_data_fetch
│   ├── overview_board
│   │   ├── category_snapshot [New Logo]
│   │   │   ├── group_0
│   │   │   │   ├── query_current
│   │   │   │   │   ├── semantic_cache_lookup
│   │   │   │   │   ├── lightdash_compile
│   │   │   │   │   ├── bigquery_execute
│   │   │   │   │   └── semantic_cache_store
│   │   │   │   └── query_previous
│   │   │   │       └── (same children)
│   │   │   └── group_1 ...
│   │   ├── category_snapshot [Expansion] ...
│   │   ├── category_snapshot [Migration] ...
│   │   ├── category_snapshot [Renewal] ...
│   │   └── category_snapshot [Total] ...
│   ├── tile_trend
│   │   └── query → ...
│   └── filter_dictionaries
│       ├── dict_Division
│       ├── dict_Owner
│       └── ... (14 more)
├── react_render
├── html_transfer
├── js_download
└── client_hydration
```

### Per-Span Metadata

| Span type | Metadata fields |
|-----------|----------------|
| `page_request` | `experimentId`, `runIndex`, `isCold`, `variant` |
| `category_snapshot` | `category`, `groupCount`, `tileCount` |
| `query_current/previous` | `model`, `measures[]`, `filterCount` |
| `semantic_cache_lookup` | `cacheKey`, `hit: boolean` |
| `lightdash_compile` | `model`, `sqlLength` |
| `lightdash_execute` | `model`, `queryUuid` (v2 metric query) |
| `bigquery_execute` | `bytesProcessed`, `slotMs`, `cacheHit` |
| `filter_dictionaries` | `count`, `totalDurationMs` |
| `react_render` | `componentCount` (if measurable) |
| `client_hydration` | `bundleSizeKb`, `hydrateMs` |

### Aggregated Run Metrics

```typescript
type ExperimentRunMetrics = {
  // Primary (optimizing these)
  ttfbMs: number;
  fcpMs: number;
  lcpMs: number;
  totalPageLoadMs: number;

  // Pipeline breakdown
  ssrDataFetchMs: number;
  totalCompileMs: number;
  totalExecuteMs: number;
  totalQueryCount: number;
  totalBytesProcessed: number;
  filterDictionaryMs: number;

  // Cache
  semanticCacheHits: number;
  semanticCacheMisses: number;

  // Client
  jsDownloadMs: number;
  hydrationMs: number;

  // Context
  experimentId: string;
  isCold: boolean;
  runIndex: number;
  timestamp: string;
};
```

### Statistical Summary

```typescript
type MetricDistribution = {
  mean: number;
  p50: number;
  p95: number;
  stddev: number;
  min: number;
  max: number;
  n: number;
};

type ExperimentSummary = {
  experimentId: string;
  cold: Record<keyof ExperimentRunMetrics, MetricDistribution>;
  warm: Record<keyof ExperimentRunMetrics, MetricDistribution>;
  comparison?: {
    metric: string;
    baselineP50: number;
    variantP50: number;
    absoluteDelta: number;
    percentDelta: number;
    significant: boolean;
  }[];
};
```

### Browser Metrics Collection

Server-side spans (SSR data fetch, compile, execute) are collected by
in-process instrumentation. Browser metrics (TTFB, FCP, LCP, JS download,
hydration) **cannot** be measured by a server-side benchmark route alone.

**Design: Playwright harness** (`e2e/benchmark.spec.ts`)

The harness uses Playwright to:
1. Start the sandbox dev server
2. For each experiment run:
   a. Clear caches (if cold run): restart dev server process, set `cacheMode=off`
      query param, optionally disable BigQuery query cache
   b. Navigate to the sandbox page with a `runId` query param
   c. Collect `PerformanceObserver` entries via `page.evaluate()`:
      - `performance.timing.responseStart` → TTFB
      - `largest-contentful-paint` entry → LCP
      - `first-contentful-paint` entry → FCP
      - `performance.getEntriesByType('resource')` filtered to JS → bundle download
   d. Read a `window.__SANDBOX_TELEMETRY__` global that the sandbox page populates
      with server-side span data (injected via a `<script>` tag in the HTML)
   e. Merge server spans + browser metrics into a single `ExperimentRunMetrics`
   f. Write to results JSON

This gives us end-to-end timing from a real browser, correlated with server
spans via the shared `runId`.

### Output Format

```
apps/perf-sandbox/results/
├── baseline_cold_001.json
├── baseline_cold_002.json
├── baseline_warm_001.json
├── streaming-ssr_cold_001.json
└── summary.json              # aggregated ExperimentSummary[]
```

---

## 6. Success Criteria

### Primary Goal

10x improvement in cold initial page load time, measured in the sandbox.

The sandbox is a **reduced surrogate** (3-5 tiles) exercising the same code
paths as the production page (32 tiles). Success criteria are stated in terms
of the sandbox. The claim that improvements transfer to the full page is a
hypothesis to be validated in Phase 4 (challenger app), not proven by the
sandbox alone.

### Definition of "Cold"

A cold run means **all three cache layers are cleared**:

1. **Next.js `unstable_cache`**: bypassed via `cacheMode=off` query parameter
2. **Node.js process state**: fresh dev server process (kills the module-level
   `cachedRuntime` singleton and any in-memory caches)
3. **BigQuery query cache**: `useQueryCache: false` on the BigQuery job config

If any layer is warm, the run is tagged `isWarm` and reported separately.
Partial-warm states (e.g., BQ cache warm but Next.js cold) are not part of the
primary measurement — they are noise to be eliminated, not measured.

### Quantitative Thresholds

| Metric | Baseline | Target (10x) | Stretch (20x) |
|--------|----------|--------------|----------------|
| Sandbox cold TTFB p50 | TBD | baseline / 10 | baseline / 20 |
| Sandbox cold total page load p50 | TBD | baseline / 10 | baseline / 20 |
| Sandbox cold SSR data fetch p50 | TBD | baseline / 10 | — |

Baseline numbers will be established by the sandbox's first benchmark run.

### Declaration Criteria

"10x achieved" requires **all three**:

1. Sandbox cold TTFB p50 ≤ 10% of baseline cold TTFB p50
2. Sandbox cold total page load p50 ≤ 10% of baseline cold total page load p50
3. No correctness regressions — variant produces identical row values as baseline

### Guardrails (Must Not Regress)

- Warm load performance stays same or better
- `bytesProcessed` per session: variant must not exceed baseline (relative, not
  absolute budget — the declared budget values in `budgets.ts` are aspirational
  and do not match actual page query volume)
- Total query count per session: variant must not exceed baseline
- No new runtime dependencies inflating bundle size >10%

### Statistical Requirements

- Minimum 5 cold runs and 5 warm runs per experiment
- p50 improvement must exceed 2x combined stddev to be significant
- Full distributions reported, not just averages

### Phase Gates

| Gate | Criteria | Unlocks |
|------|----------|---------|
| **G1** | Baseline: 5+ cold runs, CV < 20% | Proceed to experiments |
| **G2** | Each experiment: 5+ runs, comparison computed | Proceed to E6 (combined) |
| **G3** | Combined variant meets 10x criteria in sandbox | Proceed to Phase 4 (challenger app with full 32-tile page) |
| **G3-alt** | Combined < 10x in sandbox | Reassess hypotheses, add experiments, or revise target |

---

## Constraints and Assumptions

- **Self-hosted Lightdash** without Lightdash-side result caching. All caching
  must be implemented at the application level.
- **Lightdash v2 API** is the only supported query execution path. v1 `runQuery`
  is deprecated and must not be used.
- Sandbox requires real Lightdash + BigQuery credentials to run.
- Experiments must be independently runnable and togglable.
- The sandbox is local-dev only — no deployment.
