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

### Phase 4a: Architecture Validation (Overview Tab)

Proves the v2 execution path works end-to-end with measurable performance:
- 5 category cards with bookings metrics
- Filter bar (read-only, proves dictionary loading)
- Streaming SSR with Suspense boundaries
- Benchmark harness from `apps/perf-sandbox/` adapted for the challenger

**Gate:** Phase 4a measurements collected. Architecture proven viable.

### Phase 4b: Full Parity

Achieves full feature parity with the production analytics-suite:
- All tabs: Overview + New Logo + Expansion + Migration + Renewal + Total
- Tile tables with all metrics per category
- Trend charts with weekly granularity
- Closed-won opportunities tables
- Interactive filter changes
- All 32+ chart tiles from the production dashboard

**Gate:** Full-cold total load < 4s for the complete 32-tile dashboard.
This satisfies the original Phase 4 gate from the perf framework spec.

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
                  └─ 1 executeSqlQuery call (batch: 16 dimensions)
                      └─ POST /api/v2/.../query/sql
                      └─ GET /api/v2/.../query/{uuid} (poll until ready)
```

**No BigQuery client, credentials, or `@google-cloud/bigquery` on Vercel.**
Lightdash is the sole data gateway.

---

## Data Layer

### Lightdash v2 Client

Standalone ~100-line module. Two functions:

```typescript
executeMetricQuery(request: {
  exploreName: string;
  metrics: string[];
  dimensions: string[];
  filters: MetricQueryFilters;
  sorts: MetricQuerySort[];
  limit: number;
}): Promise<QueryResultPage>

executeSqlQuery(sql: string): Promise<QueryResultPage>
```

Both follow the same pattern:
1. `POST` to submit endpoint → receive `queryUuid`
2. `GET` poll endpoint with exponential backoff (250ms → 500ms → 1000ms cap)
   until status is `ready`
3. Return rows from the ready response

This matches Lightdash's own frontend implementation (verified from
`packages/frontend/src/hooks/useQueryResults.ts` and
`packages/frontend/src/features/queryRunner/executeQuery.ts` in the
Lightdash open source repo).

### No `@por/semantic-runtime` integration

The challenger app uses its own standalone client. No changes to the shared
`@por/semantic-runtime` package. If the architecture proves out, the v2
execution path can be backported into the semantic-runtime as a new provider.

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

Filter dictionaries are loaded via a single `executeSqlQuery` call, but the
SQL is **generated dynamically from the semantic registry**, not hardcoded.

The dictionary loader imports the model name and filter dimension mapping
from shared constants that the production app also uses:

```typescript
import {
  DASHBOARD_V2_BASE_MODEL,
} from '@/lib/semantic-constants';
import {
  GLOBAL_FILTER_KEYS,
  FILTER_DIMENSIONS,
} from '@/lib/semantic-constants';

function buildBatchDictionarySQL(): string {
  const table = getModelTable(DASHBOARD_V2_BASE_MODEL);
  return GLOBAL_FILTER_KEYS
    .map((key) => {
      const col = FILTER_DIMENSIONS[key];
      return `SELECT '${col}' AS dim, CAST(${col} AS STRING) AS val FROM ${table} WHERE ${col} IS NOT NULL GROUP BY ${col}`;
    })
    .join('\nUNION ALL\n') + '\nORDER BY dim, val';
}
```

The `semantic-constants.ts` module is extracted from the existing analytics-
suite's `semantic-registry.ts` and `catalog.ts`. Both apps import from the
same source of truth. If models, table names, or filter dimensions change,
both apps see the update.

**Why raw SQL instead of 16 `executeMetricQuery` calls:** Each
`executeMetricQuery` triggers a full model compilation on the Lightdash
server (~400ms+ per call). 16 parallel calls saturate the single-CPU Render
instance. One `executeSqlQuery` call bypasses compilation entirely and
executes directly against BigQuery through Lightdash's warehouse adapter.

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
│   ├── lightdash-v2-client.ts     # executeMetricQuery + executeSqlQuery + poll
│   ├── overview-loader.ts         # 5 categories × 2 windows
│   ├── dictionary-loader.ts       # Batch SQL from semantic constants
│   ├── semantic-constants.ts      # Shared model/filter definitions (from analytics-suite)
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

### Phase 4b Gate (Full Parity — Satisfies Original Phase 4)

| Metric | Target | How measured |
|--------|--------|-------------|
| TTFB (full-cold p50) | < 50ms | Playwright harness |
| Total load (full-cold p50) | < 4s | Playwright harness, full 32-tile page |
| All tabs functional | 6 tabs render correctly | Manual + automated verification |
| Data correctness | All tiles match analytics-suite | Comparison script |
| Query count | ≤ baseline analytics-suite | Telemetry from Playwright |

Phase 4b satisfies the original perf framework gate: "challenger app with
full 32-tile page" achieving target performance.

---

## What's NOT in Phase 4a

- No category tab navigation (overview only)
- No tile table, trend chart, or closed-won table
- No interactive filter changes (filter bar is read-only)
- No authentication
- No `@por/semantic-runtime` integration
- No `unstable_cache` (measure raw v2 performance first)

These are all Phase 4b scope.

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

- **Lightdash Render instance throughput:** 10 parallel `executeMetricQuery`
  calls will hit the same compile+execute bottleneck we measured. Tail latency
  at 10 concurrent: ~1.5s. Mitigation: R3 (batch dictionaries) reduces to 10
  Lightdash calls; R4 (Render upgrade) improves throughput.
- **v2 poll latency:** Exponential backoff adds 250-1000ms per poll round.
  Most queries complete in 1-2 poll rounds based on measured execution times.
- **Lightdash API stability:** v2 endpoints are the current recommended path
  (v1 `runQuery` is deprecated), but API changes could break the client.
- **Data format differences:** v2 returns `{ value: { raw, formatted } }` per
  field, which differs from our current `SemanticFieldValue` shape. The
  challenger app handles this directly without compatibility layers.
- **Semantic constant drift:** The `semantic-constants.ts` module must stay in
  sync with the analytics-suite's `semantic-registry.ts`. If extracted as a
  shared module, both apps import from the same source. If duplicated, drift
  risk exists.
