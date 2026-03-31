# Analytics Suite Performance Notes

## Baseline Measurement Procedure

Use this procedure when comparing the current baseline against any optimization branch.

### First paint vs hydrated data

The sales-performance route now uses a shell-first load model:

- the initial HTML response renders the dashboard shell immediately
- overview or category data then load after first paint through the client
  refresh flow

When comparing performance, treat these as separate measurements:

- shell response time: how quickly the page frame appears
- dashboard hydration time: how long it takes the first overview or category
  payload to replace the skeletons

### Local production-mode check

Run from the repo root:

```bash
pnpm --filter @point-of-rental/analytics-suite build
pnpm --filter @point-of-rental/analytics-suite start
```

Then measure these URLs in a clean browser session:

- `http://localhost:3300/dashboards/sales-performance`
- `http://localhost:3300/api/dashboard-v2/overview?cache=off`
- `http://localhost:3300/api/dashboard-v2/category/New%20Logo?cache=off`
- `http://localhost:3300/api/dashboard-v2/filter-dictionaries/Division?cache=off`

For each run, capture:

- `x-analytics-suite-query-count`
- `x-analytics-suite-bytes-processed`
- `x-analytics-suite-compile-ms`
- `x-analytics-suite-execution-ms`
- `x-analytics-suite-cache-status`
- `x-analytics-suite-server-ms`

### Vercel preview check

Deploy the branch to the isolated `analytics-suite-main-verify` project and repeat the same route probes against the preview or production URL for that isolated project.

Use:

- `/api/dashboard-v2/overview?cache=off`
- `/api/dashboard-v2/category/New%20Logo?cache=off`
- `/api/dashboard-v2/filter-dictionaries/Division?cache=off`

Compare:

- shell-first paint timing separately from post-paint hydration timing
- cold request behavior
- warm request behavior
- compile time vs execution time
- bytes processed
- cache status changes between first and second request

## Vercel Runtime Policy

- Runtime: `nodejs`
- Preferred region: `pdx1`
- Max duration: `300`
- Fluid Compute: enabled in `apps/analytics-suite/vercel.json`

Why this app is not an Edge candidate:

- the dashboard execution path uses the BigQuery Node client in `apps/analytics-suite/lib/server/v2/semantic-runtime.ts`
- backend trace helpers use `node:fs` and `node:child_process` in `apps/analytics-suite/lib/server/v2/tile-backend-trace.ts`
- the workload is long-lived compile + BigQuery orchestration, which matches Node functions better than Edge isolates

## Current Query Fanout

These counts reflect the current code paths and `queryCount` metadata in the
`v2` loaders.

- Overview board first render: `52` semantic queries total
  - `New Logo`: `12`
  - `Expansion`: `14`
  - `Migration`: `12`
  - `Renewal`: `8`
  - `Total`: `6`
- Category snapshot route: `2 * getSnapshotGroups(category)`
  - `New Logo`: `12`
  - `Expansion`: `14`
  - `Migration`: `12`
  - `Renewal`: `8`
  - `Total`: `6`
- Trend route: `2` semantic queries
  - one current-window request
  - one previous-window request
- Filter dictionary route: `1` semantic query per opened filter
- Closed won route: `1` semantic query per category refresh

## Current Safe Reduction

The category page no longer performs the initial SSR trend fetch. The trend
panel is hidden until the user selects a tile, so the server-side trend call
added two non-critical compile+BigQuery cycles to the first category render
without improving the first paint.

The page entrypoint also no longer blocks the initial response on overview or
category snapshot loaders. First-load overview and snapshot data now arrive
through the dashboard shell after the initial paint, which improves perceived
performance on Vercel even when the underlying compile+BigQuery work remains
expensive.

### Notes

- Treat Lightdash compile time and BigQuery execution time as separate bottlenecks.
- Prefer production-mode `build + start` or Vercel preview/prod measurements over `pnpm dev`.
- Keep `cache=off` probes for raw uncached timing, and repeat the same routes without `cache=off` for cache behavior.
