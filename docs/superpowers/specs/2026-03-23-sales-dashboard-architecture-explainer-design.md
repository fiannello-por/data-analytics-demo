# Sales Dashboard Architecture Explainer Design

Date: 2026-03-23
Status: Draft
Related designs:
- `2026-03-21-situation-room-dashboard-definition-design.md`
- `2026-03-23-situation-room-overview-tab-design.md`

## 1. Summary

This document defines a separate application whose job is to explain how the
`Sales Performance Dashboard` works.

The new application is not part of the dashboard content itself. It is a
dedicated interactive architecture explainer that helps a non-specialist
understand:

- which concrete components make up the dashboard
- how requests move from the UI to BigQuery and back
- how data is transformed before it is rendered
- where time is spent during a refresh
- how the current architecture differs from future semantic-layer designs

The v1 product is a graph-first explainer application:

- a visual canvas showing the system as connected components
- a side inspector for the selected component
- per-component timing information rendered as a small waterfall
- per-component comments attributed to signed-in users
- a link into the app from a metadata side panel inside the dashboard

The app must prioritize comprehension over raw developer ergonomics. It should
be technical enough to be truthful and useful, but structured and styled so
that a non-technical stakeholder can still follow the flow.

## 2. Problem

The current dashboard prototype is strong enough to benchmark and refine, but
the architecture behind it is still mostly implicit.

Today, if someone asks:

- where a number in the UI comes from
- which function generates the SQL
- which route triggers the server loader
- where time is lost between refresh and render

the answer lives across code, tests, and tacit team knowledge.

That creates three problems:

1. the architecture is hard to explain to non-specialists
2. opportunities for improvement are harder to spot visually
3. it will be difficult to compare the current direct-to-BigQuery architecture
   with a future semantic-layer architecture in a disciplined way

The team needs an interactive, visual, repeatable explanation layer.

## 3. Goals

- Create a separate application dedicated to architecture explanation
- Make the current dashboard architecture visually navigable
- Represent the system at concrete component/function/route granularity
- Show the lineage from UI component to BigQuery execution path
- Show timing per component in a clear and intuitive way
- Support comments on each component with author identity from Google OAuth
- Keep the model explicit and version-controlled
- Provide an entry point from the `Sales Performance Dashboard`
- Prepare the structure for future comparison with semantic-layer
  architectures

## 4. Non-Goals

- Replacing the existing dashboard UI
- Building a generic observability product in v1
- Automatically inferring the full architecture from code
- Adding number-first navigation in v1
- Building architecture diff mode in v1
- Generating optimization suggestions automatically in v1
- Embedding the full explainer directly inside the dashboard page

## 5. Product Definition

The new product is a separate app focused on one documented system in v1:

- documented system: `Sales Performance Dashboard`

The entry point from the dashboard is a shadcn side panel of meta-actions.
That side panel may later include actions such as:

- alerts
- semantic layer exploration
- performance reports
- architecture explainer

For v1, the only required integration is:

- a button inside the dashboard side panel that navigates to the architecture
  explainer app

The explainer app is not a static document site. It is an interactive tool
whose default mode is visual navigation, with text available as supporting
detail in the inspector.

## 6. Core Product Decisions

### 6.1 Separate app, not embedded dashboard content

The architecture explainer must be a separate application.

Why:

- it keeps the dashboard product focused
- it allows the explainer to have its own navigation and information density
- it makes future comparison scenarios easier to support

### 6.2 System-components-first navigation

The application should be organized around concrete system components first,
not around KPI numbers first.

This means the graph must expose real steps such as:

- `DashboardShell`
- request URL builders
- API routes
- server loaders
- SQL builders
- BigQuery execution
- response shaping
- render targets

Number-first navigation may be added later as a secondary entry mode, but not
as the primary structure in v1.

### 6.3 High granularity

The graph should use a high level of detail.

V1 must prefer concrete components/functions/routes over broad abstract boxes.

Example:

- preferred:
  - `buildCategorySnapshotRequestUrl`
  - `/api/dashboard/category/[category]/route.ts`
  - `getDashboardCategorySnapshot`
  - `buildCategorySnapshotQuery`
  - `runBigQuery`
- not preferred:
  - `snapshot pipeline`

High granularity is important because the app must support real diagnosis, not
just storytelling.

### 6.4 Graph-first interaction model

The primary interface is:

- center: interactive graph canvas
- right: side inspector
- top: filters and view controls

This is the correct shape for a technical explainer because it preserves system
context while still allowing node-level depth.

### 6.5 Explicit model, not automatic inference

The architecture graph must be defined explicitly via a manifest.

The app must not rely on fully automatic code inference to discover nodes and
relationships.

Why:

- explicit graphs are more trustworthy
- they are easier to version
- they make future architecture comparisons easier
- they let the team encode semantic relationships that code scanning alone
  would miss

## 7. UX Structure

### 7.1 Main layout

The application layout is:

- header
- graph canvas
- side inspector

The header contains:

- system title
- quick pipeline filters
- graph reset / full-graph controls

The graph canvas occupies the primary visual space.

The side inspector is always present on desktop and becomes the detail surface
for the currently selected node.

### 7.2 Default graph state

The graph opens in `full system graph` mode by default.

This means the user immediately sees the full dashboard architecture, including
the major flows for:

- overview board
- category snapshots
- trend refresh
- closed won table
- filter dictionaries

However, the header must provide quick isolation filters so the user can focus
on a subset of the graph:

- `All`
- `Overview`
- `Snapshot`
- `Trend`
- `Closed Won`
- `Filters`

This is the correct compromise between system comprehension and local clarity.

### 7.3 Node interaction

Node interaction rules:

- `hover`
  - show a short tooltip
- `single click`
  - select the node
  - populate the inspector
- `Focus connections` button in the inspector
  - isolate the selected node, its direct dependencies, and its direct
    consumers
- `Back to full graph`
  - restores the whole graph view

The explainer must not rely on double-click gestures for important behaviors.
The controls must remain obvious to non-technical users.

## 8. Inspector Design

The inspector is the explanatory surface for the selected node.

V1 sections:

1. `What this does`
   - short, plain-language explanation

2. `Inputs / Outputs`
   - the data or events the node receives
   - the data or effects the node produces

3. `Code references`
   - file path
   - function/component/route name
   - endpoint shape where relevant

4. `Timing`
   - total duration
   - a mini waterfall showing time distribution

5. `Comments`
   - linear comment list for the node
   - author identity
   - timestamp
   - freeform body

The inspector must not include auto-generated optimization ideas in v1.
Objective documentation and human-authored comments should remain distinct.

## 9. Timing Model

Timing is a first-class part of the explainer because the product goal includes
understanding where time is lost between refresh and render.

The selected node should show a `mini waterfall` rather than only raw numbers.

The waterfall is a small horizontal segmented bar that can represent timing
breakdown categories such as:

- network
- server
- BigQuery
- transform
- render

This is enough for a strong v1 explanation experience without becoming a full
tracing UI.

The graph itself may later gain timing overlays, but v1 only requires the mini
waterfall in the inspector.

## 10. Comments Model

Each node supports comments.

Comment rules:

- comments are linear, not threaded
- every comment belongs to exactly one node
- every comment has:
  - `author`
  - `createdAt`
  - `body`
- author identity is resolved via Google OAuth

This creates a collaborative architecture review surface without introducing a
full discussion system in v1.

Future additions such as resolved states, tags, or threaded replies are out of
scope.

## 11. Technical Architecture

The application should be built around four layers.

### 11.1 Architecture manifest

This is the structural source of truth.

It defines:

- nodes
- edges
- pipeline grouping
- labels
- human summaries
- code references
- input/output metadata

This manifest is version-controlled and should be easy to review in git.

### 11.2 Probe/report artifact

This is a separate artifact from the manifest.

It defines:

- timing measurements
- timing breakdowns
- run identity
- capture timestamp

Separating structure from measurements is important because the graph of the
system changes less often than timing results.

This separation also creates the correct foundation for a later idempotent and
replicable performance report workflow.

### 11.3 Explainer renderer

The renderer loads:

- the architecture manifest
- the selected probe/report artifact

It is responsible for:

- graph rendering
- node selection
- focus-connections mode
- pipeline filtering
- inspector composition
- timing visualization

### 11.4 Dashboard entry point

The dashboard owns the entry affordance only.

It must include:

- a shadcn side panel of meta-actions
- a button linking to the architecture explainer app

The dashboard does not need to embed the explainer itself.

## 12. Data Model

### 12.1 `ArchitectureNode`

Each node should contain at least:

- `id`
- `kind`
- `title`
- `summary`
- `pipeline`
- `codeRefs[]`
- `inputs[]`
- `outputs[]`

Recommended `kind` values:

- `ui`
- `client-state`
- `request-builder`
- `api-route`
- `server-loader`
- `sql-builder`
- `bigquery`
- `transformer`
- `render-target`

### 12.2 `ArchitectureEdge`

Each edge should contain:

- `from`
- `to`
- `label`
- `type`

Recommended `type` values:

- `data`
- `trigger`
- `transform`
- `render`

### 12.3 `ArchitectureProbeReport`

The report should contain:

- `runId`
- `capturedAt`
- `nodes[]`

Each node timing record should contain:

- `nodeId`
- `durationMs`
- `breakdown[]`

### 12.4 `NodeComment`

Each comment should contain:

- `nodeId`
- `author`
- `createdAt`
- `body`

## 13. UI Technology Choices

### 13.1 Shell and inspector

The explainer app should make strong use of shadcn components for:

- structural layout
- cards
- separators
- tabs
- tooltips
- scroll areas
- sheets/drawers for mobile

The explainer must look polished and product-grade, not like an internal admin
tool with default chrome.

### 13.2 Graph rendering

The graph canvas should use `React Flow`.

Reasoning:

- it is a strong fit for interactive node-edge visualization
- it supports graph-first interfaces well
- it is much more maintainable than building a custom graph canvas from raw
  divs or SVG interaction code

`React Flow` is the recommended v1 graph engine.

## 14. Initial Node Scope

V1 should document the current dashboard architecture at a high-detail level,
including nodes from at least these domains:

- dashboard shell orchestration
- overview pipeline
- category snapshot pipeline
- trend pipeline
- closed won opportunities pipeline
- filter dictionary pipeline
- BigQuery execution layer
- response shaping layer
- render targets in the UI

The node set should cover the real current system, not a simplified diagram.

## 15. Future Evolution

The app should be designed so that these later additions are natural:

- number-first navigation
- architecture comparison mode
- observability-first overlays
- deeper timing/tracing views
- semantic-layer-inserted architecture variants

These are not required for v1, but the model and layout should not block them.

## 16. Testing Strategy

V1 testing should cover:

- manifest validity
  - all node ids unique
  - all edges reference existing nodes
  - pipeline labels valid
- renderer behavior
  - selection
  - focus-connections mode
  - full-graph reset
  - pipeline filtering
- inspector behavior
  - correct node detail rendering
  - correct timing binding
  - correct comment display
- dashboard integration
  - architecture-app entry action appears in the dashboard side panel

## 17. Recommended Delivery Scope

V1 must include:

- separate architecture explainer app
- graph canvas
- side inspector
- explicit architecture manifest
- timing report artifact support
- comments per node
- pipeline filters
- focus-connections mode
- dashboard side-panel link to the app

V1 must not include:

- architecture diff mode
- number-first navigation
- generated optimization advice
- advanced tracing views
- generic multi-dashboard platform support

## 18. Open Follow-Up Work

After this explainer app is in place, the next logical work item is the
replicable and idempotent performance report that feeds timing data into the
application.

That should be treated as a separate follow-up project built on top of the
manifest/report separation defined here.
