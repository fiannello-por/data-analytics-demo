# v2 Dashboard Spec Migration Design

## Goal

Refactor Situation Room `v2` so dashboard composition, visualization, and data binding are expressed through reusable declarative contracts instead of app-local React composition and chart-library-specific wrappers.

This migration is intended to solve two problems at once:

1. Make future dashboards easier to build without re-inventing layout and rendering decisions.
2. Remove opaque layout coupling that makes basic visualization changes, like chart width and aspect behavior, harder than they should be.

The target is not a Situation Room-specific abstraction. The target is a reusable dashboard platform that Situation Room consumes first.

## Non-goals

- Replace Lightdash, BigQuery, or the current semantic runtime.
- Rebuild the traceability inspector in this first migration phase.
- Rework the app shell, filters, or page-level navigation.
- Support every conceivable chart type on day one.

## Desired Properties

- Declarative dashboard definitions.
- Reusable layout and tile chrome across dashboards.
- Visualization library independence at the dashboard-definition level.
- Explicit layout ownership for width, height, aspect, and composition.
- Incremental migration path that can coexist with current `v2`.

## Package Architecture

### `packages/dashboard-spec`

The shared declarative language for dashboards.

Responsibilities:

- Tile spec types
- Visualization spec types
- Layout spec types
- Data binding contracts
- Runtime validators
- Normalizers and safe defaults
- Renderer registry interfaces

Explicitly excluded:

- React rendering
- Recharts implementations
- Situation Room-specific traceability logic

### `packages/dashboard-layout`

Reusable dashboard composition and tile chrome.

Responsibilities:

- `TileFrame` and shared tile shell
- Shared headers, subtitles, actions slots
- Shared `loading`, `empty`, and `error` states
- Layout primitives for `split`, `grid`, `stack`, and single-tile containers
- Shared sizing rules and composition behavior

This package owns the visual grammar of dashboards and should produce a common experience across apps.

### `packages/dashboard-visualization-recharts`

Reusable visualization implementations built on Recharts.

Responsibilities:

- Concrete renderers for supported visualization types
- Recharts-backed renderer registry implementation
- Visualization-specific annotations, legends, axes, and point markers

This package does not own tile shell or dashboard composition.

### `apps/situation-room`

First consumer of the new system.

Responsibilities:

- Declaring dashboard specs
- Binding semantic/runtime data into shared tile data shapes
- Supplying traceability adapters
- Wiring app state into declarative tiles

## Tile Model

The initial tile model supports four kinds:

- `metric`
- `table`
- `chart`
- `composite`

`single` is not a technical kind. `metric`, `table`, and `chart` are naturally single tiles. `composite` is the only composed tile kind.

### Base Tile Shape

Every tile spec should share a common base:

- `id`
- `kind`
- `title`
- `description`
- `data`
- `layout`
- `interactions`

## Visualization Model

Visualization is separate from tile kind so the system can evolve without creating too many top-level tile types.

Initial supported visualizations for the migration:

- `metric.headline`
- `table.standard`
- `chart.line-comparison`

`composite` tiles do not have a visualization spec. They are defined by layout and child tiles.

## Layout Model

Layout must be declarative and separate from the visualization renderer.

Initial layout primitives:

- `free`
- `split`
- `grid`
- `stack`

These primitives are enough to model the current `v2` dashboard without inventing a general-purpose layout engine.

### Key rule

Layout owns structural space. Renderers fill the space they are given. Renderers do not decide global width, height, or composition.

This rule exists specifically to avoid repeating the current chart-width problem.

## Data Binding Model

Specs do not point directly at app loaders or query builders.

Each tile references a stable logical binding key. Situation Room resolves that key through an adapter layer into:

- runtime execution
- standardized tile data shapes
- optional traceability payloads

This keeps the spec reusable while preserving the current semantic/runtime backend.

## Traceability Boundary

Traceability is intentionally not part of the first shared core spec.

The first migration keeps traceability as a separate Situation Room layer that can consume:

- semantic request payloads
- SQL
- semantic YAML snippets
- external links

This avoids inflating the shared spec before the core layout and rendering model is proven.

## Migration Strategy

### Phase 1: Shared foundations

Create:

- `packages/dashboard-spec`
- `packages/dashboard-layout`
- `packages/dashboard-visualization-recharts`

Deliverables:

- Initial spec types
- Runtime validation
- Normalization
- Shared tile shell and states
- Initial renderers for `headline`, `standard table`, and `line comparison`

### Phase 2: Situation Room adapters

Create Situation Room-specific adapters for:

- binding registry
- semantic/runtime transformations
- traceability bridge

This phase keeps current backend behavior while changing the dashboard-definition model.

### Phase 3: Pilot slice migration

Migrate the current `Main Metrics + selected trend` area first.

Why this slice:

- It mixes `table`, `chart`, and `composite`.
- It contains the layout pain that triggered this refactor.
- It is complex enough to validate the architecture without migrating all of `v2`.

### Phase 4: Remaining `v2`

After the pilot is stable:

- overview scorecards
- closed won table
- remaining trend-capable tiles
- other composite sections

### Phase 5: Consolidation

- Remove superseded wrappers and local composition hacks
- Document how to add a new dashboard under the new model
- Keep traceability aligned with the new tile runtime

## Success Criteria

The migration is successful when:

1. `Main Metrics + selected trend` is visually at least as good as today.
2. Chart width and height behavior are predictable and owned by layout.
3. Adding another chart or table tile no longer requires app-local wrapper invention.
4. Situation Room consumes reusable packages instead of acting as the framework.
5. Traceability still works on migrated tiles without bespoke hacks.

## Risks

### Over-design

If the shared spec tries to solve every future dashboard problem immediately, the migration will stall.

Mitigation:

- start with only the tile kinds and visualization types needed for `v2`

### Accidental Situation Room coupling

If app-specific assumptions leak into the shared packages, reuse will fail quickly.

Mitigation:

- keep semantic/runtime bindings and traceability adapters in the app

### Renderer leakage into layout

If Recharts-specific assumptions creep into `dashboard-layout`, swapping visualization libraries later becomes expensive.

Mitigation:

- treat visualization packages as pluggable renderers only

## Recommendation

Proceed with the migration on a single branch using this spec as the source of truth, then write an implementation plan and execute in phases beginning with the `Main Metrics + selected trend` pilot slice.

## Implementation Status

As of 2026-03-25, the pilot slice is implemented on `codex/v2-dashboard-spec-migration`:

- shared packages exist for spec contracts, layout primitives, and a Recharts-backed visualization registry
- Situation Room `v2` exposes app-local binding adapters for `mainMetricsSnapshot` and `selectedMetricTrend`
- `Main Metrics + selected trend` now runs through a declarative spec, a shared split layout primitive, and shared chart renderer wiring
- traceability remains outside the shared core and continues to work on the migrated pilot

The current deviation from the target architecture is deliberate: the pilot still uses app-local adapters around the shared visualization/runtime boundary so Situation Room can preserve its tuned traceability and interaction affordances while the reusable contracts settle.
