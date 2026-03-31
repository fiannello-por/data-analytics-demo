# Analytics Suite Progressive Snapshot Group Loading Design

**Date:** 2026-03-30

## Goal

Make the active category tab in `apps/analytics-suite` reveal its main-metric
rows progressively instead of waiting for the full category snapshot to finish.

The table should keep its final shape from the start, preserve row positions,
and replace per-row skeletons with real values as each backend snapshot group
finishes.

## Scope

This design covers:

- `apps/analytics-suite/components/dashboard/dashboard-shell.tsx`
- `apps/analytics-suite/components/dashboard/tile-table.tsx`
- `apps/analytics-suite/lib/server/v2/get-dashboard-category-snapshot.ts`
- a new category snapshot group route under
  `apps/analytics-suite/app/api/dashboard-v2/category/[category]/groups/...`
- shared snapshot group contracts and helpers
- tests for group ordering, partial snapshot merging, and partial-row rendering

This design does not change metric semantics, hidden-tab warmup policy, trend
loading, or the overview board architecture.

## Current Problem

The active category tab still waits for the entire category snapshot payload
before showing any metric rows.

Today:

- `getDashboardV2CategorySnapshot(...)` runs all snapshot groups with
  `Promise.all(...)`
- the route returns only a full `CategorySnapshotPayload`
- `dashboard-shell.tsx` stores the snapshot only after the whole payload arrives
- `tile-table.tsx` can only render either:
  - a full table skeleton, or
  - a fully materialized row set

That means one slow group blocks all the metric rows in the active tab.

## Recommended Approach

Load the active tab snapshot group-by-group, with fixed skeleton rows.

The architecture becomes:

1. the dashboard still prioritizes the active tab over all hidden tabs
2. when the active tab is a category tab, its snapshot groups load sequentially
3. each finished group merges into a partial category snapshot in the shell
4. `tile-table.tsx` renders loaded rows immediately and keeps skeleton cells for
   unloaded rows
5. hidden-tab warmup resumes only after the active tab snapshot is complete
6. filter dictionaries still remain last

This preserves the current active-tab-first model while making the active tab
itself feel progressively faster.

## Why Group-Level Loading

The current backend already defines query groups in
`lib/dashboard-v2/semantic-registry.ts`.

Those groups are the right granularity because:

- they already reflect real query boundaries
- multiple rows already share one backend query by design
- splitting to one request per row would increase query count and orchestration
  overhead
- fake staggered row animation after full payload would improve appearance only,
  not actual wait time

So the correct trade-off is real progressive loading by query group, not fake
animation and not one request per row.

## Loading Model

### Active category tab

When the active tab is a category:

- the shell creates an empty partial snapshot for that category immediately
- the table renders all metric labels in their final positions
- value cells remain skeletons until their group arrives
- groups are fetched one at a time in a stable business order
- as each group finishes, its rows replace skeletons in-place

### Overview tab

The overview tab is unchanged in this design. It still loads as an overview
board, not as a progressive category table.

### Hidden-tab warmup

Hidden tabs still warm in the background only after the active tab is ready.
Those background requests can continue using the existing full category route,
because the progressive behavior is only needed for the visible category tab.

## Group Ordering

The progressive order should follow the existing snapshot group order derived
from the tile catalog and semantic grouping logic.

That gives a stable, business-relevant reveal order without inventing a second
hand-maintained priority map. The first visible rows will typically include the
highest-signal bookings metrics because those tiles appear first in each
category catalog.

If product feedback later shows a better manual priority order is needed, that
can be added on top of this design without changing the rest of the
architecture.

## Architecture Changes

### Shared contracts and helpers

Add a group payload contract that represents one resolved snapshot group:

- category
- group id
- current/previous window labels
- last refreshed timestamp
- resolved rows for that group
- tile timings for that group

Add shared helpers for:

- determining whether a category snapshot is complete
- building/merging partial category snapshots
- exposing stable group manifests for a category

### Server loader

Refactor `get-dashboard-category-snapshot.ts` so the current group execution
logic is extracted into a reusable per-group loader.

Then:

- the existing full snapshot loader can continue building a complete payload by
  running all groups
- the new group route can call the same extracted logic for just one group

This avoids duplicating metric formatting, timing, and backend trace logic.

### New category group route

Add a route like:

- `/api/dashboard-v2/category/[category]/groups/[groupId]`

The route should:

- validate category and group id
- parse dashboard filter/date inputs the same way as the full category route
- return the group payload as JSON
- preserve probe headers so performance debugging still works

### Dashboard shell

Change the active category snapshot path in `dashboard-shell.tsx` so:

- foreground category refreshes use progressive group loading
- partial snapshots are stored in `snapshotByCategory`
- snapshot completeness, not snapshot presence, drives warmup decisions
- changing filters/date/category invalidates partial active-tab snapshot state
- hidden-tab warmup waits until the active category snapshot is complete

### Tile table

Change `tile-table.tsx` so it can render:

- loaded rows with real values
- unloaded rows with skeleton cells

The row order must always come from the category tile catalog, not from the
currently loaded subset of snapshot rows.

## Risks

### State-management risks

- partial snapshots could be mistaken for fully cached snapshots
- background warmup could start too early if completeness checks are wrong
- category switches could reuse stale partial rows across filter/date changes

### UX risks

- if the partial table collapses or reorders rows, the result will feel worse,
  not better
- if group requests are still fired in parallel, the UI may not reveal
  predictably

### Contract risks

- the new group route must preserve the same metric formatting and backend trace
  behavior as the full snapshot loader
- the full snapshot route must not regress, because overview and hidden-tab
  warmup still depend on it

## Validation Plan

Before shipping:

- add a failing test for snapshot group manifests / ordering
- add a failing test for partial snapshot merging and completion checks
- add a failing test for tile-table display rows with skeleton placeholders
- run the targeted analytics-suite tests
- run `pnpm format:check`
- run an analytics-suite production build

## Acceptance Criteria

- active category tabs start rendering table rows before the whole category
  snapshot completes
- unloaded rows stay in their final positions as skeleton placeholders
- loaded rows replace skeletons in-place without reordering the table
- hidden tabs still warm only after the active tab snapshot is complete
- filters still load after tab warmup
- overview behavior does not regress
- metric values and URL behavior do not change
