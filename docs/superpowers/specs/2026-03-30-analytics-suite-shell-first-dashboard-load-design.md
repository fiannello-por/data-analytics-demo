# Analytics Suite Shell-First Dashboard Load Design

**Date:** 2026-03-30

## Goal

Make `apps/analytics-suite` open the sales performance dashboard immediately on
Vercel instead of blocking the first paint on overview or category queries.

The page should render the dashboard chrome right away, show intentional
loading states, and then hydrate the data panels through the existing client
refresh flow.

## Scope

This design covers:

- `apps/analytics-suite/app/dashboards/sales-performance/page.tsx`
- `apps/analytics-suite/components/dashboard/dashboard-shell.tsx`
- the existing overview, snapshot, trend, closed-won, and filter dictionary
  route handlers already used by the dashboard shell
- tests for the initial render and bootstrap refresh behavior

This design does not introduce a new dashboard architecture, change metric
definitions, or replace the current URL-driven dashboard state model.

## Current Problem

The dashboard page still waits for server-side data before returning any HTML.

Today, `page.tsx` parses the URL state and then awaits one of these expensive
loaders before rendering the shell:

- `getDashboardV2OverviewBoard(...)`
- `getDashboardV2CategorySnapshot(...)`

That means the user waits on Lightdash compile work and BigQuery execution
before seeing the page frame at all. Even after the recent Vercel-specific
optimizations, that creates a slow blank load and weak perceived performance.

## Recommended Approach

Use a shell-first initial render.

`page.tsx` should stop fetching overview or category snapshot data during the
initial server render. It should only:

1. resolve `searchParams`
2. derive the initial dashboard state
3. render `DashboardShell` immediately with empty initial data

`DashboardShell` should then bootstrap the first data request on mount using
the same client refresh model already used for tab changes, filter changes, and
trend selection.

## Why This Approach

This is the best fit for the current codebase:

- the dashboard state machine already lives in the client shell
- the shell already has working loading states and refresh orchestration
- the API routes already exist for overview, category, trend, closed-won, and
  dictionaries
- this avoids creating a second server-streaming data path that would duplicate
  behavior and increase correctness risk

The result is a faster-feeling page without changing the underlying reporting
logic.

## Loading Model

### Initial server render

The first response should render:

- page title and description
- theme toggle
- filter controls
- category tabs
- overview or category skeletons
- closed-won skeleton where applicable

The first response should not include overview metrics, category rows, trend
data, or closed-won rows unless some later optimization intentionally restores a
small cached SSR path.

### Initial client bootstrap

On mount, the shell should detect whether initial data is missing and trigger
exactly one bootstrap refresh for the current tab:

- overview tab:
  - fetch overview board
  - fetch closed won
- category tab:
  - fetch category snapshot
  - fetch closed won
- trend:
  - remain deferred until the user selects a tile

The current `refreshDashboard` path should stay the single source of truth for
request orchestration and error handling.

## Architecture Changes

### `page.tsx`

- Remove the initial await of overview and category snapshot loaders.
- Continue to parse URL state exactly as today.
- Pass `null` for:
  - `initialOverviewBoard`
  - `initialSnapshot`
  - `initialClosedWonOpportunities`
  - `initialTrend`
- Keep `initialDictionaries` empty.

### `dashboard-shell.tsx`

- Add a bootstrap effect that runs when the component mounts with missing
  initial overview or snapshot data.
- Reuse `refreshDashboard(...)` instead of inventing a separate first-load fetch
  implementation.
- Guard bootstrap execution so it does not double-fire or race with the current
  `closedWonOpportunities` bootstrap effect.
- Preserve current optimistic URL behavior for interactive changes.

### Loading states

The shell should continue to rely on existing skeleton components:

- `OverviewSkeleton`
- `TileTableSkeleton`
- `ClosedWonOpportunitiesTableSkeleton`

If necessary, the initial shell can add a lightweight first-load flag so the UI
copy distinguishes between first load and subsequent refreshes, but this is not
required for the first implementation.

## Error Handling

If the bootstrap request fails:

- keep the shell visible
- keep loading states cleared once the request settles
- surface the existing dashboard error alert
- do not regress to a blank page or a hard server failure

The user should always see a usable shell, even when data fails to load.

## Risks

### Behavioral risks

- bootstrap fetch could run more than once on mount
- bootstrap fetch could race with the current closed-won prefetch/effect logic
- category and overview tabs could disagree about whether data is already
  available

### Perceived UX risks

- if skeletons are too sparse, the immediate shell could feel incomplete rather
  than fast
- if the first client fetch is not kicked off early enough, the user may still
  perceive unnecessary delay

### Reporting correctness risks

Metric semantics should not change, but any divergence between SSR and client
data paths would be unacceptable. The bootstrap path must call the same API
routes and consume the same payload contracts already used after interactions.

## Validation Plan

Before shipping:

- add a page test proving the initial server render does not call overview or
  category snapshot loaders
- add a shell test proving missing initial data triggers the expected bootstrap
  fetch path
- verify overview renders skeletons first, then cards
- verify category renders table skeleton first, then rows
- verify trend remains deferred until tile selection
- run the targeted analytics-suite tests and production build

## Acceptance Criteria

- the dashboard shell appears immediately on first request
- first paint no longer waits on overview or category server loaders
- overview data loads after first paint through the existing API path
- category snapshot data loads after first paint through the existing API path
- trend stays on-demand
- closed-won data still loads correctly
- no metric values or URL semantics change
