# Situation Room Dashboard Definition Design

Date: 2026-03-21
Status: Draft
Related issue: `#38`
Related designs:

- `2026-03-19-scorecard-situation-room-report-design.md`
- `2026-03-20-situation-room-data-backend-roadmap-design.md`

For v1 dashboard-definition work, this spec overrides the earlier backend
roadmap wherever the two documents disagree about the serving layer. The active
v1 decision is direct reads from the existing Opportunity-based BigQuery table
to establish the baseline before dbt is in place.

## 1. Summary

This document defines the first real `Situation Room` dashboard as a fixed
executive product.

The dashboard will no longer inherit the old Lightdash-driven scorecard shape.
Instead, it will be defined around a curated set of business metrics and a
simple interaction model that is optimized for direct BigQuery benchmarking.

The first version is:

- a fixed executive product
- organized around five fixed category tabs:
  - `New Logo`
  - `Expansion`
  - `Migration`
  - `Renewal`
  - `Total`
- each tab shows a table of curated metric rows
- each row is a logical `tile`
- selecting a row shows a two-line trend chart on the right
- the first implementation uses direct BigQuery reads from the existing
  Opportunity-based table

The dashboard must be designed so that:

- metric logic is explicit and curated
- the UI is fast enough to benchmark honestly
- Lightdash can later be inserted as a semantic layer without redefining the
  product

## 2. Problem

Earlier dashboard work was shaped by Lightdash visualization constraints,
especially the need to compress many scorecards into a small number of tiles.
That produced a denormalized reporting model that solved a Lightdash layout
problem, not the product definition problem for a custom Next.js application.

That shape is now the wrong starting point because:

- the new dashboard is not constrained by a BI tile grid
- the app can define its own data contracts
- the team needs a trustworthy direct-to-BigQuery baseline before inserting any
  semantic layer

The correct question is no longer "how do we render the Lightdash report in
Next.js?" It is "what is the cleanest executive product we actually want, and
what is the fastest way to serve it?"

## 3. Goals

- Define the Situation Room as a fixed executive product
- Preserve the five existing business categories
- Keep metric labels, ordering, and defaults curated by the team
- Use direct BigQuery reads in v1 for honest performance measurement
- Make performance measurable in the Analytics Lab
- Keep the architecture compatible with later dbt optimization or Lightdash
  insertion
- Keep the UI behavior deterministic and simple for executives

## 4. Non-Goals

- Recreating the previous Lightdash dashboard structure
- Building a flexible BI workspace or report builder
- Discovering metrics dynamically from the warehouse
- Supporting mixed time grains in v1
- Supporting tile-specific comparison-window logic in v1
- Recomputing filter dictionaries from current filter context in v1
- Introducing a new physical serving table by default

## 5. Product Definition

The dashboard is a fixed executive product with this interaction model:

- five tabs in fixed order:
  - `New Logo`
  - `Expansion`
  - `Migration`
  - `Renewal`
  - `Total`
- each tab contains a fixed, curated set of metric rows
- each metric row is called a `tile`
- each tile shows:
  - metric label
  - current window value
  - previous window value
  - percent change
- one tile is selected at a time
- selecting a tile updates the chart on the right
- the chart always shows:
  - one current-window line
  - one previous-window line
  - one shared weekly grain for all metrics

This is not a generic report viewer. It is a controlled product with a known
set of tabs, a known set of metrics, and known interactions.

## 6. Core Decisions

### 6.1 Tile model

The dashboard is modeled around `tiles`.

A tile is a logical KPI unit, not a visual card. In the UI, each tile is
rendered as one table row.

Why this matters:

- business identity belongs to the metric row
- trend behavior belongs to the selected metric row
- future execution can change without changing product definitions

### 6.2 One query per tile

For v1, tile snapshots are defined as one query unit per tile.

When a tab loads, the server executes all visible tile snapshot queries in
parallel and returns the full table payload only after every tile result is
available.

This gives the team:

- clean per-tile measurement
- clean future backend comparisons
- direct visibility into which metrics are expensive

The frontend must not call one endpoint per row from the browser. Fan-out is a
server concern, not a client concern.

### 6.3 All-at-once table rendering

Even though tiles are computed independently, the table should render all rows
at once, not incrementally row by row.

This keeps the executive experience clean and makes performance easier to judge.

### 6.4 One trend query for the selected tile

The trend chart should always be powered by one dedicated query for the
currently selected tile.

This avoids loading trend data for every tile on every tab load and keeps the
chart contract narrow.

### 6.5 One global dashboard date selector

The dashboard has one global date selector.

All tiles respond to that same selector.

### 6.6 Same previous-window rule for all tiles

All tiles use the same previous-window comparison rule in v1.

Example:

- current window: `2026-01-01` to `2026-03-31`
- previous window: `2025-01-01` to `2025-03-31`

This keeps the product coherent and prevents the table from mixing incompatible
comparison semantics.

### 6.7 Same grain for all charts

All trend charts use the same weekly grain in v1.

This keeps the chart contract standardized across all tiles and simplifies
benchmarking.

### 6.8 Global filter dictionaries

Filter dictionaries are global in v1.

That means filter option lists do not shrink based on the current active filter
state. They are loaded independently and cached aggressively.

This is a deliberate tradeoff in favor of speed and simplicity.

### 6.9 Direct BigQuery source in v1

The first implementation should query the existing Opportunity-based BigQuery
table directly.

This is a deliberate baseline decision. dbt is expected to land soon, and the
future dbt-built serving tables are expected to be very similar in shape to the
current source table. For v1 benchmarking, the app should read from the current
table so the team can measure the true direct-to-BigQuery baseline without
blocking on dbt readiness.

## 7. Logical Architecture

The v1 architecture is:

```text
Opportunity-based BigQuery table
        ->
Curated dashboard definition
        ->
Server-side tile snapshot queries + server-side tile trend query
        ->
Next.js dashboard UI
        ->
Analytics Lab benchmarks
```

The dashboard definition is the important middle layer.

It owns:

- category order
- tile order
- labels
- formatting
- default selections
- metric-specific source filters

The server query layer owns:

- applying the global dashboard filter state
- deriving current and previous windows
- executing tile snapshot queries
- executing the selected-tile trend query
- returning stable payloads to the UI

## 8. Dashboard State Model

The runtime dashboard state is:

- `activeCategory`
- `selectedTileId`
- `globalFilters`
- `dateWindow`
- `previousDateWindow`
- `trendGrain`

Rules:

- `dateWindow` defaults to `current year`
- `previousDateWindow` is always the same period in the previous year
- `trendGrain` is always `weekly`
- `selectedTileId` always belongs to the active category
- the default selected tile is the first tile in the curated order

## 9. Tile Catalog Definition

The dashboard needs a curated tile catalog.

Each tile definition should include:

- `tile_id`
- `category`
- `label`
- `sort_order`
- `format_type`
- `source_view`
- `row_filter_sql` or equivalent scoped filter definition
- `value_expression_sql`

The tile catalog intentionally does not define:

- custom previous-window rules
- custom chart grains
- contextual filter dictionary rules

Those are global dashboard behaviors in v1.

The tile catalog is the authoritative product definition for the rows shown in
the executive table.

### 9.1 Initial v1 tile catalog

The initial v1 tile catalog is extracted from
`data-analytics-306119.scorecard_test.scorecard_daily`.

The current `metric_name` values are the default v1 user-facing labels.
The current `sort_order` values are only a bootstrap signal for the initial
catalog order; the curated tile catalog becomes the long-term authority once it
is checked into code.

Default v1 format rules:

- labels ending with `$` or containing `Revenue` or `Deal` use `currency`
- labels ending with `#`, or equal to `SQL`, `SQO`, `SAL`, `SQO Users`,
  `SDR Points`, or `Gate 1 Complete` use `number`
- `Close Rate` uses `percent`
- `Avg Age` uses `days`

Initial category contents:

- `New Logo`
  - `new_logo_bookings_amount` -> `Bookings $` -> `currency`
  - `new_logo_bookings_count` -> `Bookings #` -> `number`
  - `new_logo_annual_pacing_ytd` -> `Annual Pacing (YTD)` -> `number`
  - `new_logo_close_rate` -> `Close Rate` -> `percent`
  - `new_logo_avg_age` -> `Avg Age` -> `days`
  - `new_logo_avg_booked_deal` -> `Avg Booked Deal` -> `currency`
  - `new_logo_avg_quoted_deal` -> `Avg Quoted Deal` -> `currency`
  - `new_logo_pipeline_created` -> `Pipeline Created` -> `number`
  - `new_logo_sql` -> `SQL` -> `number`
  - `new_logo_sqo` -> `SQO` -> `number`
  - `new_logo_gate_1_complete` -> `Gate 1 Complete` -> `number`
  - `new_logo_sdr_points` -> `SDR Points` -> `number`
  - `new_logo_sqo_users` -> `SQO Users` -> `number`
- `Expansion`
  - `expansion_bookings_amount` -> `Bookings $` -> `currency`
  - `expansion_bookings_count` -> `Bookings #` -> `number`
  - `expansion_annual_pacing_ytd` -> `Annual Pacing (YTD)` -> `number`
  - `expansion_close_rate` -> `Close Rate` -> `percent`
  - `expansion_avg_age` -> `Avg Age` -> `days`
  - `expansion_avg_booked_deal` -> `Avg Booked Deal` -> `currency`
  - `expansion_avg_quoted_deal` -> `Avg Quoted Deal` -> `currency`
  - `expansion_pipeline_created` -> `Pipeline Created` -> `number`
  - `expansion_sql` -> `SQL` -> `number`
  - `expansion_sqo` -> `SQO` -> `number`
- `Migration`
  - `migration_bookings_amount` -> `Bookings $` -> `currency`
  - `migration_bookings_count` -> `Bookings #` -> `number`
  - `migration_annual_pacing_ytd` -> `Annual Pacing (YTD)` -> `number`
  - `migration_close_rate` -> `Close Rate` -> `percent`
  - `migration_avg_age` -> `Avg Age` -> `days`
  - `migration_avg_booked_deal` -> `Avg Booked Deal` -> `currency`
  - `migration_avg_quoted_deal` -> `Avg Quoted Deal` -> `currency`
  - `migration_pipeline_created` -> `Pipeline Created` -> `number`
  - `migration_sql` -> `SQL` -> `number`
  - `migration_sqo` -> `SQO` -> `number`
  - `migration_sal` -> `SAL` -> `number`
  - `migration_avg_users` -> `Avg Users` -> `number`
- `Renewal`
  - `renewal_bookings_amount` -> `Bookings $` -> `currency`
  - `renewal_bookings_count` -> `Bookings #` -> `number`
  - `renewal_annual_pacing_ytd` -> `Annual Pacing (YTD)` -> `number`
  - `renewal_close_rate` -> `Close Rate` -> `percent`
  - `renewal_avg_age` -> `Avg Age` -> `days`
  - `renewal_avg_booked_deal` -> `Avg Booked Deal` -> `currency`
  - `renewal_avg_quoted_deal` -> `Avg Quoted Deal` -> `currency`
  - `renewal_pipeline_created` -> `Pipeline Created` -> `number`
  - `renewal_sql` -> `SQL` -> `number`
- `Total`
  - `total_bookings_amount` -> `Bookings $` -> `currency`
  - `total_bookings_count` -> `Bookings #` -> `number`
  - `total_annual_pacing_ytd` -> `Annual Pacing (YTD)` -> `number`
  - `total_one_time_revenue` -> `One-time Revenue` -> `currency`

## 10. Query Contracts

The frontend should not know about SQL or warehouse structure. It should depend
on a small number of explicit server contracts.

### 10.1 `getCategoryTiles(category)`

Returns the fixed tile metadata for the category:

- `category`
- `tiles[]`
  - `tile_id`
  - `label`
  - `sort_order`
  - `format_type`

This is metadata, not warehouse output.

### 10.2 `getCategorySnapshot(category, filters, dateWindow)`

Returns the full table payload for the active category:

- `category`
- `current_window_label`
- `previous_window_label`
- `last_refreshed_at`
- `rows[]`
  - `tile_id`
  - `label`
  - `sort_order`
  - `current_value`
  - `previous_value`
  - `pct_change`
  - `format_type`

Execution rule:

- server fans out to one snapshot query per tile in parallel
- client receives one aggregated table payload
- table renders only after the aggregated payload is complete

### 10.3 `getTileTrend(category, tileId, filters, dateWindow)`

Returns the chart payload for the selected tile:

- `category`
- `tile_id`
- `label`
- `grain`
- `current_window_label`
- `previous_window_label`
- `points[]`
  - `bucket_key`
  - `bucket_label`
  - `current_value`
  - `previous_value`

### 10.4 `getGlobalFilterDictionary(filterKey)`

Returns:

- `filter_key`
- `options[]`
  - `value`
  - `label`
  - `sort_order`

Rules:

- independent of dashboard filter state
- loaded and cached separately
- not recomputed on every filter change

## 11. Date and Trend Semantics

The date model must be explicit so the chart is always interpretable.

### 11.1 Global date selector

The dashboard date selector is a custom date range picker.

Rules:

- default range is `current year`
- user selects `start date` and `end date`
- the selected range becomes the current reporting window for all tiles

### 11.2 Shared previous window

The previous window is always derived from the current window using one common
comparison rule: `same period previous year`.

This rule is shared across all tiles.

### 11.3 Bucket alignment

Trend charts compare current and previous windows using the same bucket index
and the same shared weekly grain.

That means:

- bucket 1 in current window aligns to bucket 1 in previous window
- bucket 2 aligns to bucket 2
- and so on

The chart contract always returns both series already aligned, so the frontend
does not need to perform time-series reconciliation.

## 12. Global Filter Set

The v1 dashboard uses the same filter set as the current Lightdash scorecard
dashboard, but with application-native behavior.

Rules:

- `Date Range` is the global custom date selector described above
- every non-date filter is global
- every non-date filter is multi-select
- filter dictionaries are global, not contextual

The locked v1 non-date filters are:

- `Division`
- `Owner`
- `Segment`
- `Region`
- `SE`
- `Booking Plan Opp Type`
- `Product Family`
- `SDR Source`
- `SDR`
- `POR v R360`
- `Account Owner`
- `Owner Department`
- `Strategic Filter`
- `Accepted`
- `Gate 1 Criteria Met`
- `Gate Met or Accepted`

## 13. Query Execution Strategy

### 13.1 Snapshot execution

For an active tab:

- resolve the tile list from the catalog
- build one snapshot query per tile
- execute them in parallel on the server
- aggregate results into one table payload
- return only when all rows are ready

This satisfies both goals:

- tile-level measurement is preserved
- the UI still behaves like one coherent report load

### 13.2 Trend execution

For the selected tile:

- derive current and previous windows from the global selector
- build the selected tile's trend query
- return one aligned two-line series

### 13.3 Filter dictionary execution

Filter dictionaries are executed independently from snapshot and trend queries.

They should be cached aggressively because they are global and stable in v1.

## 14. Performance and Measurement

The important performance units in v1 are:

- one active-category snapshot load
- one selected-tile trend load
- one global filter dictionary load

The Analytics Lab should measure:

- total active-category load time
- per-tile snapshot timings inside the category load
- selected-tile trend timing
- global filter dictionary timing
- behavior with `cache=auto`
- behavior with `cache=off`

This will tell the team:

- whether direct BigQuery is fast enough
- which tiles are expensive
- whether the trend path is acceptable
- whether a later semantic layer adds unacceptable latency

## 15. Evolution Path

If direct BigQuery performs well enough:

- keep the contracts
- keep the tile catalog
- improve the UI and add more product polish

If direct BigQuery is too slow:

- move some query logic into dbt views
- materialize selected serving models
- keep the same frontend contracts

If Lightdash is inserted later:

- map the same curated tile concepts into the semantic layer
- keep the same dashboard product definition
- benchmark the latency delta against the direct baseline

If per-tile fan-out becomes too expensive:

- keep the tile model
- change execution later so multiple tiles can be bundled behind the same server
  contract

The product model should stay stable even if execution strategy evolves.

## 16. Next Steps

1. Write the tile catalog for all five categories.
2. Define the global filter set.
3. Define the allowed dashboard date selector options.
4. Implement server contracts for:
   - `getCategoryTiles`
   - `getCategorySnapshot`
   - `getTileTrend`
   - `getGlobalFilterDictionary`
5. Add those contracts to the Analytics Lab as benchmarkable paths.
6. Measure direct BigQuery performance before introducing Lightdash.
