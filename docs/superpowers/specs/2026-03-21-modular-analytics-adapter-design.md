# Modular Analytics Adapter Design

Date: 2026-03-21
Status: Draft
Related design: `2026-03-20-situation-room-data-backend-roadmap-design.md`

## 1. Problem

Our analytics stack currently has tight coupling between the Next.js visualization
apps and Lightdash as the semantic layer. Lightdash-specific concepts (field ID
naming, filter operators, async polling, response envelopes) are embedded directly
in application code. Swapping to a different semantic layer would require rewriting
every data-fetching path in every app.

We need a system where Next.js dashboard apps communicate with the semantic layer
through a provider-agnostic adapter, so the semantic layer can be swapped without
touching visualization code.

## 2. Relationship to Existing Architecture

The roadmap design (`2026-03-20`) established an app-level adapter pattern for the
Situation Room:

```ts
interface ScorecardDataAdapter {
  getScorecardReport(filters): Promise<AdapterResult<ScorecardReportPayload>>;
  getFilterDictionary(key): Promise<AdapterResult<FilterDictionaryPayload>>;
}
```

This already has a working `BigQueryAdapter` implementation, with `AdapterResult`
metadata (`source`, `queryCount`, `bytesProcessed`) surfaced in HTTP response
headers for benchmarking.

This design does not replace that app-level adapter. It introduces a **lower
layer** beneath it: a generic, cross-app semantic layer client.

### Two-layer architecture

```
┌──────────────────────────────────────────────────────┐
│  App-level adapters (per app, report-specific)       │
│  e.g. ScorecardDataAdapter                           │
│  - domain-specific contracts (ScorecardReportPayload)│
│  - AdapterResult metadata (source, bytes, queryCount)│
│  - BigQueryAdapter (direct path, stays for benchmark)│
│  - LightdashAdapter (uses SemanticLayerClient)       │
└──────────────┬───────────────────────────────────────┘
               │ uses
┌──────────────▼───────────────────────────────────────┐
│  SemanticLayerClient (shared package, generic)       │
│  packages/analytics-adapter/                         │
│  - provider-agnostic query interface                 │
│  - measures, dimensions, filters in → rows out       │
│  - providers: lightdash.ts, cube.ts (future)         │
└──────────────────────────────────────────────────────┘
```

The **BigQuery direct path** from the roadmap remains untouched. It bypasses the
semantic layer entirely and queries dbt app-serving models directly. The
`SemanticLayerClient` is only used when data flows through a semantic layer
(Lightdash, Cube, etc.).

This means the Situation Room's `ScorecardDataAdapter` will have two
implementations:

1. `BigQueryAdapter` — direct to warehouse (existing, unchanged)
2. `LightdashAdapter` — delegates to `SemanticLayerClient` for queries, then
   shapes results into `ScorecardReportPayload`

Both return identical `AdapterResult<T>` with metadata. The benchmark comparison
from the roadmap works exactly as planned.

## 3. System Architecture

Three components with one swappable boundary:

```
┌─────────────┐     ┌───────────────────────┐     ┌──────────┐
│  Next.js    │────▶│  analytics-adapter     │────▶│ BigQuery  │
│  apps       │     │  (shared workspace pkg)│     │ (fixed)   │
└─────────────┘     └───────────────────────┘     └──────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Semantic Layer   │
                    │  (swappable)      │
                    └──────────────────┘
```

- **BigQuery** is the fixed warehouse. Not a swappable component.
- **Semantic Layer** (Lightdash, Cube, etc.) handles both metric/dimension
  definitions and query execution as a single unit. Each tool manages its own
  warehouse connection internally.
- **analytics-adapter** is a shared pnpm workspace package
  (`packages/analytics-adapter/`) imported in-process by each Next.js app. Zero
  extra network hops.
- **Next.js apps** consume data through the adapter's generic interface. They
  never interact with the semantic layer directly.

### Data authority

The semantic layer is the authority. It publishes a catalog of models, metrics,
dimensions, and filters. The Next.js app discovers what is available at
development time (by a human or agent inspecting the semantic models) and builds
visualizations against that catalog. The app cannot invent queries for entities
that do not exist in the semantic layer.

### Development workflow

1. Developer authors semantic models in the semantic layer tool (Lightdash YAML,
   Cube schemas, etc.)
2. Developer or Claude inspects the available models, metrics, and dimensions
3. Developer or Claude builds Next.js visualizations that query those entities
   through the adapter

## 4. Generic Interface Contract

### Core interface

```ts
interface SemanticLayerClient {
  query(params: MetricQuery): Promise<QueryResult>;
}
```

### Query types

```ts
interface MetricQuery {
  model: string;
  measures: string[];
  dimensions: string[];
  filters?: Filter[];
  sorts?: Sort[];
  limit?: number;
}

interface Filter {
  field: string;
  operator: FilterOperator;
  values?: (string | number | boolean)[];
}

type FilterOperator =
  | 'equals' | 'notEquals'
  | 'contains' | 'notContains'
  | 'greaterThan' | 'lessThan'
  | 'between'
  | 'currentYear' | 'currentMonth' | 'currentWeek'
  | 'pastYears' | 'pastMonths' | 'pastDays'
  | 'isTrue' | 'isFalse'
  | 'isNull' | 'isNotNull';

interface Sort {
  field: string;
  descending: boolean;
}
```

### Result types

```ts
interface QueryResult {
  rows: Row[];
  meta?: {
    queryCount: number;
    bytesProcessed?: number;
  };
}

type Row = Record<string, {
  raw: unknown;
  formatted: string;
}>;
```

### Design decisions

- **`model`** scopes each query to a semantic model. Maps to Lightdash's
  `exploreName`, Cube's cube name, etc.
- **`FilterOperator`** is a canonical set covering common cases across providers.
  Each provider translates these into its own syntax.
- **`Row` preserves both `raw` and `formatted`** so model-defined formatting
  (currency, percentages) is available to the frontend. Providers without
  server-side formatting set `formatted` to a string coercion of `raw`.
- **`meta`** carries instrumentation data (query count, bytes processed) so
  app-level adapters can include it in their `AdapterResult` for benchmarking.
- **Flat filter array** with implicit AND. No nested AND/OR groups initially.
  Extensible later if needed.
- **`between`** requires exactly two values (inclusive on both ends).

## 5. Provider Implementation

Each provider is a class implementing `SemanticLayerClient`.

### Lightdash provider responsibilities

1. **Field name translation** — generic `'total_revenue'` becomes
   `'{explore}_total_revenue'` per Lightdash's naming convention
2. **Filter translation** — `{ operator: 'currentYear' }` becomes
   `{ operator: 'inTheCurrent', values: [1], settings: { unitOfTime: 'years' } }`
3. **Query body construction** — builds the Lightdash metric-query payload with
   `exploreName`, dimensions, metrics, nested filter group
4. **HTTP request** — POSTs to `/api/v2/projects/{uuid}/query/metric-query`
5. **Async polling** — handles Lightdash's submit-then-poll pattern
6. **Response normalization** — strips explore prefix from field keys, maps
   Lightdash's `{ value: { raw, formatted } }` into generic `Row` format

### Factory

```ts
function createClient(config: AdapterConfig): SemanticLayerClient {
  switch (config.provider) {
    case 'lightdash':
      return new LightdashProvider(config.lightdash);
    case 'cube':
      return new CubeProvider(config.cube);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}
```

### Usage in an app-level adapter

The `SemanticLayerClient` is not called directly by API routes. It is used by
app-level adapter implementations. For example, a `LightdashAdapter` for the
Situation Room would look like:

```ts
import { createClient } from '@por/analytics-adapter';

class LightdashScorecardAdapter implements ScorecardDataAdapter {
  private client = createClient({ provider: 'lightdash', ... });

  async getScorecardReport(filters) {
    const result = await this.client.query({
      model: 'scorecard_daily',
      measures: ['current_period', 'previous_period', 'pct_change'],
      dimensions: ['sort_order', 'metric_name', 'category'],
      filters: this.translateFilters(filters),
    });

    // Shape generic rows into ScorecardReportPayload
    return {
      data: this.buildPayload(result.rows, filters),
      meta: {
        source: 'lightdash',
        queryCount: result.meta?.queryCount ?? 1,
        bytesProcessed: result.meta?.bytesProcessed,
      },
    };
  }

  // ...
}
```

### Filter dictionaries

Filter dictionaries are precomputed in dbt and served from BigQuery. They do not
flow through the semantic layer — they are a warehouse-level concern. The
`BigQueryAdapter.getFilterDictionary()` method handles this directly and will
continue to do so regardless of which semantic layer provider is active.

If a future semantic layer provides a filter introspection API, a provider-level
`getDistinctValues()` method can be added to `SemanticLayerClient` as an optional
extension.

## 6. Package Structure

```
packages/
  analytics-adapter/
    src/
      index.ts              # exports createClient, types
      interface.ts           # SemanticLayerClient, MetricQuery, QueryResult, etc.
      factory.ts             # createClient(config)
      providers/
        lightdash.ts         # LightdashProvider
    package.json             # name: "@por/analytics-adapter"
    tsconfig.json
```

Note: `packages/*` must be added to `pnpm-workspace.yaml` (currently only
`apps/*` is registered).

### Impact on existing Situation Room app

Files unchanged:

- `lib/contracts.ts` — canonical app-level types (`ScorecardRow`, `CategoryData`,
  `ScorecardReportPayload`, `ScorecardFilters`)
- `lib/data-adapters/types.ts` — `ScorecardDataAdapter` interface, `AdapterResult`,
  `AdapterMeta`
- `lib/data-adapters/bigquery-adapter.ts` — direct path, kept for benchmarking
- `lib/data-adapters/index.ts` — factory, updated to support provider selection
- `app/api/report/route.ts` — unchanged, still calls `getScorecardReport()`
- All frontend components, URL state management (nuqs), Chart.js rendering

Files removed:

- `lib/lightdash-client.ts` — replaced by `@por/analytics-adapter`
- `lib/queries.ts` — `FILTER_FIELD_MAP` and Lightdash query building move into
  the adapter's Lightdash provider
- `lib/scorecard-parser.ts` — Lightdash response normalization moves into the
  adapter's Lightdash provider
- `lib/types.ts` — `LightdashFilterRule` type no longer needed (legacy duplicate
  of contracts in `contracts.ts`)

Files added:

- `lib/data-adapters/lightdash-adapter.ts` — implements `ScorecardDataAdapter`
  using `SemanticLayerClient`, shapes results into `ScorecardReportPayload`

## 7. Performance Strategy

Charts must feel instant. No loading screens.

### Caching layers (top to bottom)

1. **Next.js route cache (ISR)** — dashboard pages set a `revalidate` interval.
   After first render, the fully rendered page is served from cache (~30ms).
   Zero queries hit the semantic layer.
2. **Next.js data cache** — individual query results cached via
   `next: { revalidate, tags }` inside the provider. Fine-grained invalidation
   per query.
3. **Semantic layer cache** — whatever the provider offers (Cube pre-aggregations,
   Lightdash query cache). A bonus, not a dependency.
4. **BigQuery query cache** — automatic for identical queries within 24h.

### Streaming and progressive rendering

- Each chart is an independent async Server Component wrapped in `<Suspense>`
- Page shell renders immediately; charts stream in as queries resolve
- Fastest chart appears first; no waiting for the slowest query

### Partial Prerendering (PPR)

- Static shell (layout, navigation, filter bar, chart skeletons) prerendered and
  served from CDN edge (<100ms)
- Dynamic chart data streams in behind it

### User experience

1. Page loads — layout and skeletons appear instantly (~100ms)
2. Charts stream in as queries resolve (~200-500ms first load)
3. Subsequent visits within revalidation window — fully rendered from cache (~30ms)
4. Filter change — new queries fire, charts stream in with skeleton fallbacks

## 8. Error Handling

The adapter throws typed errors for uniform handling:

```ts
class SemanticLayerError extends Error {
  constructor(
    message: string,
    public code: 'CONNECTION' | 'QUERY' | 'TIMEOUT' | 'AUTH' | 'MODEL_NOT_FOUND',
  ) {
    super(message);
  }
}
```

Each provider catches its own error types (Lightdash HTTP errors, Cube
`continueWait` timeouts, etc.) and wraps them in `SemanticLayerError`. The app
handles one error type regardless of provider.

## 9. Swapping Providers

To swap from Lightdash to Cube (or any other semantic layer):

1. Write `providers/cube.ts` implementing `SemanticLayerClient`
2. Build the semantic models in Cube (cube schemas pointing at BigQuery)
3. Write a `CubeScorecardAdapter` implementing `ScorecardDataAdapter` (or update
   the existing `LightdashScorecardAdapter` to use the new provider)
4. Change environment variables: `SEMANTIC_LAYER_PROVIDER=cube`, add Cube
   connection config
5. Deploy

The Next.js app route handlers and frontend components require no changes. Only
the adapter package gains a new provider, and the app-level adapter wiring
changes.

Parallel testing is possible: run two instances of the same dashboard app pointed
at different providers via env vars and compare results — exactly as the roadmap
prescribes for the BigQuery vs Lightdash benchmark.

## 10. Future Extensions

These are not in scope for v1 but noted as natural extension points:

- **`AbortSignal` on `query()`** — for cancelling in-flight queries when users
  change filters rapidly
- **`listModels()` introspection** — for programmatic discovery of available
  models/metrics/dimensions (development workflow automation)
- **`totalRowCount` on `QueryResult`** — for pagination awareness
- **Nested AND/OR filter groups** — extend `Filter` to support a `group` variant
