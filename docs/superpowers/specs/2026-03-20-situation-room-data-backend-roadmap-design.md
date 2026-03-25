# Situation Room Data Backend Roadmap Design

Date: 2026-03-20
Status: Draft
Related issue: `#38`
Related design: `2026-03-19-scorecard-situation-room-report-design.md`

## 1. Summary

This document defines a phased data-backend roadmap for the `Situation Room`
report UI.

The product goal from issue `#38` remains unchanged:

- build a polished board-facing Next.js report UI
- preserve governed analytics logic
- support all required filters
- achieve production-grade performance and presentation quality

What changes is the rollout strategy.

Instead of introducing `Lightdash` into the request path from day one, the
recommended sequence is:

1. build the application against `dbt`-built app-serving models queried
   directly from `BigQuery`
2. establish a real performance baseline with production-like caching and UX
3. insert `Lightdash` as a semantic layer over the same serving models
4. compare latency, cost, governance fit, and development ergonomics
5. decide whether the application should stay direct-to-BigQuery, move fully to
   Lightdash, or operate as a hybrid

This is the smart path because it isolates the true performance cost of adding a
semantic layer without wasting UI or serving-model work.

## 2. Problem

The current prototype proves UI direction and semantic intent, but it is too
slow to support a production-grade reporting experience.

This roadmap preserves the product commitments from issue `#38`:

- the experience is still a `situation room report`, not a dashboard
- the custom report UI remains the goal
- the five-category scorecard structure is preserved
- the project remains modular, code-first, and dbt-ready
- the visual bar remains board-facing and premium

What changes is the sequencing of the backend architecture, not the product
goal.

Observed behavior from local testing:

- report queries can take around `20s`
- filter option loading can take around `10s`

The current implementation shape explains that behavior:

- the browser triggers the main report load after render
- one report request fans out into multiple Lightdash async queries
- those category queries are executed sequentially
- the backend polls Lightdash for results with coarse one-second polling
- the query shape omits `category`, forcing one query per category
- there is no effective cache layer in the current request path
- the architecture is shaped like BI exploration, not like an application data
  contract

In short, the current implementation pays latency in every layer:

- client-side loading delay
- repeated API round trips
- repeated semantic query setup
- repeated BigQuery execution
- no stable response cache strategy

The performance target for the production solution is:

- initial page load: `<= 3s`
- filter change refresh: `<= 3s`
- filter values: effectively instantaneous, target `<= 300ms`

## 3. Goals

- Deliver the `Situation Room` UI with production-grade speed
- Keep `dbt Core` as the transformation and serving-model layer
- Preserve the option to introduce `Lightdash` later without reworking the UI
- Benchmark the direct path and the Lightdash path fairly
- Keep the architecture understandable by a small team
- Avoid premature infrastructure complexity

## 4. Non-Goals

- Direct browser access to `BigQuery`
- SQL embedded throughout React components or route handlers
- Generic BI exploration rebuilt in the application
- Premature warehouse physical optimization for small data volumes
- Mandatory Lightdash adoption before measuring its performance impact

## 5. Decision

Adopt a phased architecture with a stable adapter boundary.

The frontend must not know whether data came from:

- direct `BigQuery` queries over `dbt` app-serving models
- or `Lightdash` queries over the same models

All application screens must consume stable backend contracts such as:

- `getScorecardReport(filters)`
- `getFilterDictionary(name)`
- `getTrendBlock(filters)`

The implementation must provide those contracts through a server-side adapter
layer.

### 5.1 Adapter Contract

Both the direct adapter and the Lightdash adapter must satisfy the same
invariants.

The adapter layer owns:

- filter normalization
- default date-range semantics
- authorization context mapping
- payload shaping to the canonical app contracts
- error handling and timeout behavior

The adapters must return:

- identical payload shapes
- identical default-filter behavior
- identical ordering rules
- identical business date semantics
- identical null/empty-state behavior

The adapters must not contain:

- route-level SQL aggregations
- frontend-calculated business metrics
- ad hoc response reshaping that changes business meaning between providers

This is required so that benchmark comparisons remain valid.

## 6. Core Design Principles

### 6.1 Server-first

Primary analytics data is loaded server-side, not orchestrated by the browser.

### 6.2 Canonical contracts

Every important screen consumes a small number of explicit payload contracts.

### 6.3 Precompute before querying

Repeated expensive computation belongs in `dbt`, not in request-time query
assembly.

### 6.4 Filters are dictionaries

Dropdown values are precomputed and cacheable. They are not live analytical
queries.

### 6.5 Benchmark apples-to-apples

The direct path and the Lightdash path must be tested against the same:

- UI
- payload contracts
- filter model
- dbt serving models
- cache policy

## 7. Target Responsibilities By Layer

### 7.1 dbt Core

`dbt Core` owns:

- curated marts
- app-serving rollups
- precomputed filter dictionary models
- optional snapshot/preset tables for common report states

`dbt` is the layer for:

- expensive joins
- repeated aggregations
- denormalized app-serving tables
- scheduled refreshes

### 7.2 BigQuery

`BigQuery` is the execution engine.

It owns:

- raw storage
- marts storage
- app-serving dataset storage
- warehouse execution over app-serving models
- optional warehouse-native acceleration such as materialized views later

For phase 1, table partitioning and clustering are explicitly treated as
evolutionary optimizations, not mandatory starting requirements.

Metric correctness rule:

- phase-1 payloads may read only from dbt-built app-serving models
- those models must already encode the business logic needed by the app
- route handlers and frontend code may not compute business metrics from raw
  warehouse columns

### 7.3 Lightdash

`Lightdash` owns:

- governed metric definitions
- business-friendly labels and descriptions
- semantic exposure of app-serving models
- access control / row-level access logic
- a stable query contract for the application
- internal exploration for the team

Lightdash should be treated as a thin governed API over pre-shaped models, not
as the place where app payloads are assembled through repeated generic BI
queries.

Phase-2 parity rule:

- if access control is in scope for the benchmark, both adapters must enforce
  the same business/security predicates
- if access control is not yet in scope, phase 1 is explicitly limited to an
  internal single-role application benchmark

Phase-1 decision:

- phase 1 is explicitly scoped as an internal single-role benchmark
- access-control parity is deferred until after the baseline and Lightdash
  insertion benchmark are complete

### 7.4 Next.js

`Next.js` owns:

- server-side orchestration
- contract-to-component mapping
- URL-driven filter state
- request normalization
- error handling
- cache revalidation
- final response shaping for the UI

### 7.5 Vercel

`Vercel` owns:

- response caching
- CDN delivery
- fast delivery of repeated report/filter states

## 8. Required Data Contracts

### 8.1 Main report payload

The scorecard page should consume one canonical payload with:

- report metadata
- active filter summary
- last refreshed timestamp
- five category blocks
- ordered metric rows per category
- optional supporting analysis sections

### 8.2 Filter dictionary payloads

Each filter uses a dedicated precomputed dictionary contract containing:

- filter key
- value
- label
- sort order
- optional active flag
- optional count

These payloads may be slightly stale. A `15-minute` freshness target is
acceptable.

### 8.3 Supporting detail payloads

Drill or supporting detail is loaded separately and must not block the main
report render.

## 9. Non-Negotiable Design Rules

- No client-triggered query orchestration for primary page data
- No sequential fan-out by category
- No live-loading dropdown options from heavy analytical queries
- No app page should depend on generic BI-shaped queries when a narrower
  app-serving contract can exist

These rules exist to prevent the final product from behaving like a slow BI
proxy instead of a fast application.

## 10. Phase 0: Foundations

Goal:
Create the boundaries that keep later Lightdash insertion cheap.

Work:

- define canonical report and filter contracts
- add a server-side backend adapter layer in the app
- define app-serving model naming conventions in `dbt`
- define benchmark scenarios and latency targets
- define cache key normalization rules

Deliverables:

- contract definitions
- adapter interface
- benchmark matrix
- serving-model naming rules

Exit criteria:

- the UI can depend only on stable contract functions, not raw query logic

## 11. Phase 1: Direct Fast Baseline

Architecture:

```text
BigQuery raw -> dbt marts -> dbt app-serving models -> Next.js server adapter -> Vercel cache -> browser
```

Goal:
Prove the product experience and establish the true direct-path latency
baseline.

Work:

- build the polished Next.js dashboard/report
- fetch main payloads server-side
- query `BigQuery` directly against app-serving models
- implement cached filter dictionaries
- add response caching for main report states
- instrument latency and bytes processed

Important constraints:

- no direct BigQuery access from the browser
- no SQL in React components
- no duplicated metric logic in UI code
- no route-level SQL aggregations over raw-like marts
- no frontend-calculated business metrics

Initial backlog:

- one canonical `scorecard_report_payload` serving model
- one `scorecard_filter_dictionary` family of models
- one server-side `BigQueryAdapter`
- one canonical filter normalizer
- one benchmark harness for cold/warm load, filter changes, and dropdown speed

Exit criteria:

- initial page load meets target or is close enough to tune
- filter dictionaries are effectively instantaneous
- repeated requests show real cache wins
- benchmark baseline is captured and reproducible

## 12. Phase 2: Lightdash Insertion

Architecture:

```text
BigQuery raw -> dbt marts -> dbt app-serving models -> Lightdash semantic layer -> Next.js server adapter -> Vercel cache -> browser
```

Goal:
Measure the real cost and value of introducing `Lightdash` over the same
serving models.

Work:

- define app-facing Lightdash explores over the app-serving models
- implement a `LightdashAdapter` for the same app contracts
- keep the direct adapter available for comparison
- run the same benchmark suite against both adapters

Measured outcomes:

- p50 / p95 latency delta
- cache hit behavior
- BigQuery bytes scanned
- development ergonomics
- semantic/governance benefits
- fit for agent consumption

Exit criteria:

- the team can make a data-backed decision about using Lightdash in the request
  path
- the Lightdash path still satisfies the `<= 3s` SLO
- the Lightdash path adds no more than `750ms` p95 overhead to the main report
  payload on cold paths
- the Lightdash path adds no more than `300ms` p95 overhead on warm cached
  paths
- the Lightdash path does not force live dropdown distinct queries

## 13. Phase 3: Backend Decision

After benchmarking, choose one of three supported outcomes.

### 13.1 Full Lightdash path

Choose this if:

- latency remains within target
- governance and semantic benefits are meaningful
- access control and agent-readiness improve materially

### 13.2 Hybrid path

Choose this if:

- Lightdash works well for most governed analytical payloads
- but some critical report paths perform better through the direct adapter

### 13.3 Stay direct for now

Choose this if:

- Lightdash degrades latency beyond acceptable limits
- governance benefits do not yet justify the extra hop
- the team needs to preserve maximum simplicity for now

## 14. Cache Strategy

### 14.1 Filter dictionaries

- long-lived cache
- precomputed in dbt
- target: effectively instantaneous UX
- initial mechanism: `unstable_cache` around the server-side dictionary loader
- initial TTL: `15 minutes`
- initial revalidation tag: `filter-dictionaries`

### 14.2 Main report payloads

- cached by normalized filter state
- time-based revalidation initially
- optional tag-based revalidation later
- initial mechanism: `unstable_cache` around the canonical payload loader
- initial TTL: `60 seconds`
- initial revalidation tag: `report-payload`

### 14.3 Drill/detail payloads

- separate cache policy
- must never block the main report path

### 14.4 Invalidation

Initial strategy:

- rely on TTL-based freshness in phase 1
- add explicit `revalidateTag` calls after dbt refresh completion when the
  pipeline supports it
- if explicit revalidation is not available on day one, correctness comes from
  short report TTLs and longer dictionary TTLs

## 15. Performance Plan

### 15.1 SLOs

- initial report load: `p95 <= 3s`
- filter change refresh: `p95 <= 3s`
- filter option loading/opening: `p95 <= 300ms`
- warm cache response for common report states: target `< 1s`

### 15.2 Benchmark scenarios

- cold load with default filters
- warm load with default filters
- filter change on common presets
- opening each dropdown
- changing multiple filters together
- optional drill/detail interaction

### 15.3 Measurement layers

- Next.js request duration and cache hit/miss behavior
- adapter-level query count and timing
- BigQuery duration and bytes processed
- browser-perceived time to usable content

### 15.4 Structural success criteria

The architecture is only acceptable if it also satisfies these lower-level
conditions:

- one main payload request per page load
- zero sequential category queries in the primary report path
- zero live distinct/filter-option queries against large analytical models
- zero business-metric recomputation in route handlers or frontend code
- stable normalized cache keys for identical logical filter states

## 16. Risks

### 16.1 Frontend business logic drift

Risk:
Metric semantics leak into route handlers or components.

Mitigation:
Strict adapter contracts and semantic ownership boundaries.

### 16.2 dbt serving-model sprawl

Risk:
Too many app-specific models create maintenance overhead.

Mitigation:
Formal `app_serving` layer conventions and explicit ownership.

### 16.3 Weak cache hit rates

Risk:
Filter keys are too unconstrained and cache normalization is poor.

Mitigation:
Canonical filter serialization and common presets.

### 16.4 Lightdash adds too much latency

Risk:
Semantic-layer insertion breaks the `<= 3s` target.

Mitigation:
Keep the direct adapter available and decide with benchmark evidence.

## 17. Recommendation

Proceed with the phased roadmap.

The recommended implementation order is:

1. build the beautiful, fast Next.js application on top of direct reads from
   `dbt` app-serving models
2. establish a rigorous benchmark baseline
3. introduce `Lightdash` over the same models and compare results fairly
4. decide whether the final production architecture should be direct,
   Lightdash-backed, or hybrid

This approach avoids wasted work because the durable investments are made up
front:

- UI and UX
- server-side delivery layer
- filter model
- cache strategy
- dbt app-serving models
- benchmark harness
- stable application contracts

Only the backend adapter changes during the Lightdash evaluation phase.

## 18. Next Step

After this spec is approved, write a concrete implementation plan covering:

- contract interfaces
- dbt app-serving model backlog
- direct adapter implementation
- cache implementation
- benchmark harness
- Lightdash adapter insertion plan

## Appendix A: Phase-1 Contract Definitions

### A.1 `getScorecardReport(filters)`

Request shape:

```ts
type ScorecardFilters = {
  DateRange?: string[];
  Division?: string[];
  Owner?: string[];
  Segment?: string[];
  Region?: string[];
  SE?: string[];
  BookingPlanOppType?: string[];
  ProductFamily?: string[];
  SDRSource?: string[];
  SDR?: string[];
  OppRecordType?: string[];
  AccountOwner?: string[];
  OwnerDepartment?: string[];
  StrategicFilter?: string[];
  Accepted?: string[];
  Gate1CriteriaMet?: string[];
  GateMetOrAccepted?: string[];
};
```

Response shape:

```ts
type Category =
  | 'New Logo'
  | 'Expansion'
  | 'Migration'
  | 'Renewal'
  | 'Total';

type ScorecardRow = {
  sortOrder: number;
  metricName: string;
  currentPeriod: string;
  previousPeriod: string;
  pctChange: string;
};

type CategoryData = {
  category: Category;
  rows: ScorecardRow[];
};

type ScorecardReportPayload = {
  reportTitle: string;
  reportPeriodLabel: string;
  lastRefreshedAt: string;
  appliedFilters: ScorecardFilters;
  categories: CategoryData[];
};
```

Contract invariants:

- categories are always returned in this order:
  `New Logo`, `Expansion`, `Migration`, `Renewal`, `Total`
- rows inside each category are always ordered by `sortOrder`
- empty filters are omitted from cache keys and payload summaries
- default date semantics are identical across adapters

### A.2 `getFilterDictionary(name)`

Supported dictionary keys in phase 1:

- `Division`
- `Owner`
- `Segment`
- `Region`
- `SE`
- `BookingPlanOppType`
- `ProductFamily`
- `SDRSource`
- `SDR`
- `OppRecordType`
- `AccountOwner`
- `OwnerDepartment`
- `StrategicFilter`
- `Accepted`
- `Gate1CriteriaMet`
- `GateMetOrAccepted`

Response shape:

```ts
type FilterDictionaryOption = {
  value: string;
  label: string;
  sortOrder: number;
  isActive?: boolean;
  count?: number;
};

type FilterDictionaryPayload = {
  key: string;
  refreshedAt: string;
  options: FilterDictionaryOption[];
};
```
