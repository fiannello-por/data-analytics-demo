# Challenger App — Lightdash v2 Architecture

**Date:** 2026-03-28
**Status:** Draft
**Goal:** Build a challenger dashboard app that matches Lightdash's native dashboard performance (~4s full load) by using the same v2 API execution path Lightdash's own UI uses, with streaming SSR and no BigQuery client on Vercel.
**Scope:** Overview tab only (5 category cards + filter bar). Proves the architecture before full parity.
**Prerequisite:** Performance analysis from [issue #72](https://github.com/fiannello-por/data-analytics-demo/issues/72).

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
                  └─ 1 executeSqlQuery call (batch: 16 dimensions in one query)
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

Single SQL query via `executeSqlQuery`:

```sql
SELECT 'division' AS dim, CAST(division AS STRING) AS val
FROM `data-analytics-306119.scorecard_test.sales_dashboard_v2_opportunity_base`
WHERE division IS NOT NULL
GROUP BY division
UNION ALL
SELECT 'owner' AS dim, CAST(owner AS STRING) AS val
FROM `data-analytics-306119.scorecard_test.sales_dashboard_v2_opportunity_base`
WHERE owner IS NOT NULL
GROUP BY owner
UNION ALL
... (16 dimensions total)
ORDER BY dim, val
```

One Lightdash API call. No semantic compilation. Raw SQL executed by
Lightdash's warehouse adapter.

---

## Page Structure

### File Layout

```
apps/challenger/
├── app/
│   ├── layout.tsx                 # Bare shell (Inter font, tailwind)
│   └── page.tsx                   # Streaming SSR with Suspense
├── lib/
│   ├── lightdash-v2-client.ts     # executeMetricQuery + executeSqlQuery + poll
│   ├── overview-loader.ts         # 5 categories × 2 windows
│   ├── dictionary-loader.ts       # Batch SQL for 16 dictionaries
│   └── types.ts                   # v2 API response types
├── components/
│   ├── overview-board.tsx         # Async server component: 5 category cards
│   ├── category-card.tsx          # Current value, previous value, % change
│   └── filter-bar.tsx             # Renders dictionary options (read-only)
├── package.json
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
  }
}
```

Notably absent: `@google-cloud/bigquery`, `@por/semantic-runtime`,
`server-only`. The only external dependency beyond Next.js/React is the
Lightdash API (HTTP calls via `fetch`).

### SSR Page

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

## What's NOT in the MVP

- No category tab navigation (overview only)
- No tile table, trend chart, or closed-won table
- No interactive filter changes (filter bar is read-only)
- No authentication
- No `@por/semantic-runtime` integration
- No telemetry/budget tracking
- No `unstable_cache` (measure raw v2 performance first)

---

## Success Criteria

| Metric | Target | Rationale |
|--------|--------|-----------|
| TTFB | < 50ms | Streaming shell, proven in sandbox |
| Full-cold total load | < 4s | Match Lightdash native dashboard |
| BigQuery credentials on Vercel | Zero | Lightdash handles all execution |
| Data correctness | Identical values to analytics-suite | Same model, same date range |

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
