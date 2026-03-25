# Situation Room Direct BigQuery Baseline

Date: 2026-03-22

Environment:
- app server: `next start --port 3102`
- dataset: `data-analytics-306119.scorecard_test`
- backend: direct BigQuery
- benchmark runner: `apps/situation-room/scripts/benchmark-report.mjs`

Methodology:
- `coldMs` is the first request for a path within the current app process
- `warmP50Ms` and `warmP95Ms` are the next 6 requests in the same process
- `cache=auto` allows the dashboard loader cache and BigQuery query cache
- `cache=off` bypasses the dashboard loader cache and sets `useQueryCache: false`

## Results

### `cache=auto`

| Path | Cold | Warm p50 | Warm p95 | Avg bytes processed |
| --- | ---: | ---: | ---: | ---: |
| `/api/probe/ping` | 1820.21 ms | 1071.20 ms | 1247.89 ms | 0 |
| `/api/probe/summary` | 1249.49 ms | 1027.97 ms | 1653.28 ms | 0 |
| `/api/probe/filter-options/Division` | 1019.86 ms | 971.36 ms | 1015.81 ms | 0 |
| `/api/dashboard/category/New Logo` | 1526.21 ms | 2.17 ms | 4.79 ms | 38,291,071 |
| `/api/dashboard/trend/new_logo_bookings_amount` | 1178.24 ms | 2.06 ms | 3.79 ms | 2,464,601 |
| `/api/dashboard/filter-dictionaries/Division` | 1181.35 ms | 2.56 ms | 7.64 ms | 313,920 |

### `cache=off`

| Path | Cold | Warm p50 | Warm p95 | Avg bytes processed |
| --- | ---: | ---: | ---: | ---: |
| `/api/probe/ping` | 1815.94 ms | 1175.25 ms | 1240.03 ms | 0 |
| `/api/probe/summary` | 1519.94 ms | 1160.85 ms | 1281.58 ms | 11,901,264 |
| `/api/probe/filter-options/Division` | 1068.24 ms | 1031.46 ms | 1101.11 ms | 3,967,088 |
| `/api/dashboard/category/New Logo` | 1351.99 ms | 1296.77 ms | 1721.34 ms | 38,291,071 |
| `/api/dashboard/trend/new_logo_bookings_amount` | 1050.83 ms | 1029.70 ms | 1196.85 ms | 2,464,601 |
| `/api/dashboard/filter-dictionaries/Division` | 849.61 ms | 914.85 ms | 1110.34 ms | 313,920 |

## Findings

1. The new dashboard endpoints are structurally fast enough for a direct-BigQuery baseline.
   - uncached category snapshot: about `1.30s` p50
   - uncached trend query: about `1.03s` p50
   - uncached filter dictionary: about `0.91s` p50

2. The dashboard loader cache is doing the expected job.
   - category snapshot drops from about `1.30s` uncached to about `2-5ms` warm
   - trend query drops from about `1.03s` uncached to about `2-4ms` warm
   - filter dictionary drops from about `0.91s` uncached to about `3-8ms` warm

3. The legacy probe routes remain warehouse-shaped even with `cache=auto`.
   - warm probe latencies stay around `1.0-1.2s`
   - this is expected because those routes intentionally benchmark direct execution rather than a cached app-serving contract

4. The current category snapshot cost is dominated by tile fan-out.
   - the `New Logo` snapshot averages about `38.3 MB` scanned
   - the cold tile timing breakdown shows most tiles completing in roughly `1.0-1.5s`
   - the overall category response time is close to the slowest tile because the fan-out runs in parallel

5. The direct baseline is strong enough to justify the next experiment.
   - the app-serving contract is not inherently slow without a semantic layer
   - this gives a credible control group for measuring the marginal latency of inserting Lightdash later

## Next Steps

1. Keep using this benchmark flow for every backend insertion experiment.
2. Add one benchmark capture after connecting the dashboard routes through Lightdash.
3. Compare:
   - uncached category snapshot p50/p95
   - uncached trend p50/p95
   - filter dictionary p50/p95
   - bytes processed
   - cache hit behavior for warm app requests
