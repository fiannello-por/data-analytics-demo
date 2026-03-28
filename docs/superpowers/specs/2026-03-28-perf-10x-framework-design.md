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
H1 → H3 → H4 → H9 → H2 → H5 → H7.

| # | Hypothesis | Category | Evidence | Expected Impact | Confidence |
|---|-----------|----------|----------|----------------|------------|
| **H1** | SSR blocks on ALL data before sending any HTML | Server | `page.tsx` awaits overview+trend+dictionaries, no Suspense | -60% to -80% TTFB | High |
| **H3** | In-memory semantic cache + deduper not wired up | Caching | `createMemorySemanticResultCache()` and `createInFlightRequestDeduper()` exist in package but app doesn't use them | -20% to -40% on warm loads | High |
| **H4** | Filter dictionaries are 16 separate queries on the critical path | Network | `Promise.all(16 × runtime.runQuery())` each hits Lightdash compile + BQ | -15% to -30% total SSR time | High |
| **H9** | Lightdash v2 `executeMetricQuery` eliminates network hops | Semantic | Current: compileQuery + BQ (4 calls). v2: submit + poll (2 calls). Self-hosted = no LH cache, so benefit is hop reduction only | -10% to -25% per query | Medium |
| **H2** | Redundant Lightdash compile calls for identical query shapes | Semantic | No compilation cache; overview fetches 5 categories that may share shapes | -30% to -50% compile time | Medium |
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
├── experiments/
│   ├── baseline.ts             # Current architecture (control)
│   ├── streaming-ssr.ts        # E1: Suspense boundaries
│   ├── wired-cache.ts          # E3: SemanticResultCache + deduper
│   ├── static-dictionaries.ts  # E4: Filter dicts cached longer
│   ├── lh-execute-metric.ts    # E2a: v2 executeMetricQuery
│   ├── compile-cache.ts        # E5: Compile-result caching
│   └── combined-winner.ts      # E7: Best variants stacked
├── lib/
│   ├── telemetry.ts            # Hierarchical span collector
│   ├── stats.ts                # Statistical summary
│   └── experiment-registry.ts  # Registry + standard interface
├── package.json
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
| **E2a** | Lightdash v2 executeMetricQuery eliminates hops | `compileQuery` → BQ client (4 calls) | v2 `executeMetricQuery` submit + poll (2 calls) | Per-query wall-clock p50 | Row correctness, budget observability | -10% to -25% per query | None |
| **E3** | App-level semantic cache not wired up | No `SemanticResultCache` or persistent `InFlightRequestDeduper` | Wire both into `createSemanticRuntime()` with semantic version key | Cold→warm ratio, cache hit rate | Memory usage | -20% to -40% warm loads | None |
| **E4** | 16 filter dictionaries on critical path | 16 `runQuery` calls in SSR `Promise.all` | (a) Longer TTL (5min+); (b) Move off critical path (load after shell) | SSR total time, TTFB | Filter UX responsiveness | -15% to -30% SSR | None |
| **E5** | Redundant Lightdash compile calls | Each group compiles independently | Compile-result cache keyed on `{model, measures, dimensions, filters}` hash | Total compile time | Correctness | -30% to -50% compile | None |
| **E6** | BigQuery 3-call overhead per job | `createJob` → `getResults` → `getMetadata` | (a) `Promise.all([getResults, getMetadata])`; (b) BQ `query()` single-call | Per-query BQ time | `bytesProcessed` still captured | -10% to -25% | Skip if E2a wins |
| **E7** | Combined winners | Baseline | Stack top 2-3 winning variants | Cold total page load p50 | No regressions | Target: 10x | E1-E6 results |

### Execution Order

```
E1 (streaming SSR) ─────────────────┐
E2a (LH executeMetricQuery) ────────┤
E3 (wire cache + deduper) ──────────┼── all independent, run in parallel
E4 (dictionary optimization) ───────┤
E5 (compile cache) ─────────────────┘
        │
        ▼
E6 (BQ call optimization) ── only if E2a doesn't win decisively
        │
        ▼
E7 (combined winners) ───── stacks best variants
```

### TDD-Style Assertions

```typescript
// E1: Streaming SSR
expect(variant.cold.ttfbMs.p50).toBeLessThan(baseline.cold.ttfbMs.p50 * 0.4);

// E2a: Lightdash executeMetricQuery
expect(variant.cold.perQueryMs.p50).toBeLessThan(baseline.cold.perQueryMs.p50 * 0.75);

// E3: Cache + deduper (warm runs)
expect(variant.warm.ssrDataFetchMs.p50).toBeLessThan(baseline.warm.ssrDataFetchMs.p50 * 0.6);

// E4: Dictionary optimization
expect(variant.cold.ssrDataFetchMs.p50).toBeLessThan(baseline.cold.ssrDataFetchMs.p50 * 0.85);

// E5: Compile cache
expect(variant.cold.totalCompileMs.p50).toBeLessThan(baseline.cold.totalCompileMs.p50 * 0.5);

// E7: Combined — the 10x target
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

10x improvement in cold initial page load time.

### Quantitative Thresholds

| Metric | Baseline | Target (10x) | Stretch (20x) |
|--------|----------|--------------|----------------|
| Cold TTFB p50 | TBD | baseline / 10 | baseline / 20 |
| Cold total page load p50 | TBD | baseline / 10 | baseline / 20 |
| Cold SSR data fetch p50 | TBD | baseline / 10 | — |

Baseline numbers will be established by the sandbox's first benchmark run.

### Declaration Criteria

"10x achieved" requires **all three**:

1. Cold TTFB p50 ≤ 10% of baseline cold TTFB p50
2. Cold total page load p50 ≤ 10% of baseline cold total page load p50
3. No correctness regressions — variant produces identical row values as baseline

### Guardrails (Must Not Regress)

- Warm load performance stays same or better
- `bytesProcessed` per session within budget (sales-performance: 600 target, 900 degrade)
- Query count per session within budget (2 target, 3 degrade)
- No new runtime dependencies inflating bundle size >10%

### Statistical Requirements

- Minimum 5 cold runs and 5 warm runs per experiment
- p50 improvement must exceed 2x combined stddev to be significant
- Full distributions reported, not just averages

### Phase Gates

| Gate | Criteria | Unlocks |
|------|----------|---------|
| **G1** | Baseline: 5+ cold runs, CV < 20% | Proceed to experiments |
| **G2** | Each experiment: 5+ runs, comparison computed | Proceed to E7 (combined) |
| **G3** | Combined variant meets 10x criteria | Proceed to Phase 4 (challenger app) |
| **G3-alt** | Combined < 10x | Reassess hypotheses, add experiments, or revise target |

---

## Constraints and Assumptions

- **Self-hosted Lightdash** without Lightdash-side result caching. All caching
  must be implemented at the application level.
- **Lightdash v2 API** is the only supported query execution path. v1 `runQuery`
  is deprecated and must not be used.
- Sandbox requires real Lightdash + BigQuery credentials to run.
- Experiments must be independently runnable and togglable.
- The sandbox is local-dev only — no deployment.
