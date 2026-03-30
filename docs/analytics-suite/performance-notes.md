# Analytics Suite Performance Notes

## Baseline Measurement Procedure

Use this procedure when comparing the current baseline against any optimization branch.

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

- cold request behavior
- warm request behavior
- compile time vs execution time
- bytes processed
- cache status changes between first and second request

### Notes

- Treat Lightdash compile time and BigQuery execution time as separate bottlenecks.
- Prefer production-mode `build + start` or Vercel preview/prod measurements over `pnpm dev`.
- Keep `cache=off` probes for raw uncached timing, and repeat the same routes without `cache=off` for cache behavior.
