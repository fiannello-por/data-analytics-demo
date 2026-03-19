# Scorecard Situation Room Report Design

Date: 2026-03-19
Status: Draft approved in chat, pending written review
Related issue: `#38`
Source dashboard: `Scorecard Grid Prototype` (`61e04714-d97f-4f0a-9624-fadf676ae2eb`)

## 1. Summary

Build a new board-facing UI layer on top of Lightdash that presents the
`Scorecard Grid Prototype` as a polished web app report rather than as a
dashboard grid. The new experience will use:

- `shadcn/ui` as the primary UI foundation
- Lightdash as the only query backend
- `Chart.js` as the first charting library for the MVP
- Impeccable-style visual quality as an explicit acceptance requirement

The MVP is a single end-to-end production-style report page that preserves the
dashboard's business logic while intentionally abandoning Lightdash's visual
structure and tile constraints.

## 2. Problem

The current Lightdash prototype proves the semantic and reporting logic, but it
does not satisfy stakeholder expectations for presentation quality. In
particular:

- the UI is constrained by dashboard/tile composition
- the current scorecard prototype explores visual variants, but still reads like
  BI content rather than a premium executive report
- leadership-facing reporting needs higher information design standards than a
  generic analytics dashboard can provide

The goal is not to visually replicate Lightdash. The goal is to keep governed
metrics and filters while replacing the presentation layer with a custom report
experience.

## 3. Goals

- Build a custom report-style UI on top of Lightdash queries only
- Present the `Scorecard Grid Prototype` logic as a situation room report
- Include all filters currently exposed in the Lightdash dashboard
- Support five categories:
  - `New Logo`
  - `Expansion`
  - `Migration`
  - `Renewal`
  - `Total`
- Use `shadcn/ui` as the primary UI system
- Start with `Chart.js` where charting is needed
- Deliver production-grade visual polish for both light and dark themes
- Achieve a board-of-directors presentation standard

## 4. Non-Goals

- Reproduce the Lightdash layout or tile system
- Rebuild all four prototype visual variants in the MVP
- Query BigQuery directly from the new UI
- Build a generic report builder or BI platform
- Commit to D3 or other chart libraries before real `Chart.js` limitations
  appear
- Rebuild full Lightdash self-serve exploration in the first cut

## 5. Source Logic To Preserve

The source dashboard is `Scorecard Grid Prototype`, which currently contains:

- four tabs representing visual variants:
  - `Responsive Cards`
  - `Tinted Cards`
  - `Compact Cards`
  - `Border Tint`
- twenty linked charts, all Lightdash `custom` charts
- the same logical scorecard pattern repeated across five categories
- query source `scorecard_daily`
- dimensions:
  - `scorecard_daily_sort_order`
  - `scorecard_daily_metric_name`
- metrics:
  - `scorecard_daily_current_period`
  - `scorecard_daily_previous_period`
  - `scorecard_daily_pct_change`

The MVP must preserve this logic and category structure, but it must not copy
the visual design or the tabbed prototype framing.

## 6. Recommended Product Framing

Frame the MVP as a `situation room report`, not a dashboard.

The reading model should be:

1. executive context
2. active filter state
3. key takeaways and repeated metrics
4. category-by-category analysis
5. supporting detail

This is a report for strategic review, not a canvas of independent tiles.

## 7. Information Architecture

The MVP should be one single report page with these sections.

### 7.1 Report Header

Includes:

- report title
- reporting period
- last refreshed indicator
- concise description of what the report covers
- compact summary of active filters

Tone should feel editorial and operational, closer to a high-end strategy
briefing than a dashboard shell.

### 7.2 Global Filter Rail

All filters currently available in the Lightdash dashboard should be exposed in
the custom UI.

Use `shadcn/ui` primitives for:

- date controls
- single-selects
- multi-selects
- applied filter chips
- reset / clear affordances

Filter state must be global and URL-driven so the report is shareable and
reproducible.

### 7.3 Executive Snapshot

A compact top section showing the most decision-relevant repeated metrics across
the five categories.

This section should privilege clarity and comparison over decoration. It may
contain a limited number of charts, but should primarily establish the state of
the business in a few high-confidence signals.

### 7.4 Five Category Sections

Each of the five categories gets its own section:

- `New Logo`
- `Expansion`
- `Migration`
- `Renewal`
- `Total`

Each section should contain:

- a section heading and short framing sentence
- repeated metrics presented consistently across sections
- any category-specific metrics or emphasis
- optional chart area if the information benefits from graphical display
- supporting comparison or detail rows where useful

The categories should read like chapters in a report, not cards on a grid.

### 7.5 Supporting Analysis

If some logic is better shown in shared analytical views than in category
sections, place those blocks after the main category narrative. They should
support the report, not interrupt the top-to-bottom read.

## 8. UI And Design Standard

This MVP must be visually polished enough to present to the board of directors.
The target bar is a product that feels like it was designed and shipped by a
top-tier design and engineering team.

### 8.1 Design Principles

- premium
- calm
- editorial
- precise
- trustworthy
- high-contrast where needed, never noisy
- information-dense without feeling cluttered

### 8.2 Explicit Requirements

- support both light and dark themes
- both themes must feel intentional, not token inversions
- avoid tile-based UI composition
- avoid generic AI-dashboard aesthetics
- avoid default component-library appearance

### 8.3 Role Of `shadcn/ui`

`shadcn/ui` is the foundation, not the finished look.

Use it for:

- interaction primitives
- accessibility baseline
- form controls
- layout building blocks
- composable structure

Then apply custom styling and composition so the final page does not look like a
default `shadcn` demo.

### 8.4 Impeccable Requirement

Impeccable-style design guidance is part of the acceptance bar. The work should
explicitly use the available design skills to avoid default agent-generated UI
patterns and to push the final result toward a board-grade report aesthetic.

## 9. Technical Direction

### 9.1 Architecture

Recommended architecture:

```text
Custom Report UI (Next.js + shadcn/ui + Chart.js)
            |
            v
Lightdash API
            |
            v
Lightdash semantic layer + warehouse execution
```

### 9.2 Query Source

The MVP must use Lightdash as the only data/query interface.

That means:

- no direct BigQuery access from the custom UI
- no duplicated metric logic in frontend code
- no hand-written SQL for report calculations already modeled in Lightdash

### 9.3 UI System First

Most of the MVP surface is not charting. It is:

- report composition
- filter UX
- metric presentation
- section hierarchy
- layout rhythm
- table and comparison design
- theme quality

`shadcn/ui` should own that surface. `Chart.js` should be used selectively and
only where charts materially improve understanding.

### 9.4 Chart Strategy

The MVP should start with `Chart.js` for:

- trend views
- comparison views
- composition views

Do not overbuild a chart abstraction layer. A lightweight wrapper boundary is
enough for the MVP so a later chart-library experiment does not require a full
rewrite.

### 9.5 Data Composition

Prefer a small number of explicit query modules rather than one giant page-load
query.

Possible split:

- header / executive summary queries
- one query module per category section where useful
- shared supporting analysis queries

This keeps the report understandable, testable, and easier to maintain.

## 10. MVP Scope

The MVP includes:

- one end-to-end production-style report page
- the full `Scorecard Grid Prototype` business logic
- all existing dashboard filters
- five category sections
- Lightdash-only data sourcing
- custom UI based on `shadcn/ui`
- `Chart.js` for first-pass charting needs
- polished light and dark themes

The MVP explicitly excludes:

- four separate visual mode variants
- D3/custom-graphics work before necessity is proven
- direct warehouse querying
- generalized dashboard/report builders
- a full exploration workflow

## 11. Acceptance Criteria

The MVP is done when:

- the report preserves the logic of `Scorecard Grid Prototype`
- all displayed numbers are sourced only from Lightdash queries
- all Lightdash dashboard filters are represented in the custom UI
- the experience reads like a situation room report, not a dashboard grid
- the visual quality is board-ready in both light and dark themes
- the result clearly exceeds the Lightdash prototype in presentation quality
- the page is responsive and production-grade

## 12. Validation Strategy

Validation should cover:

- logical parity with the prototype's category and metric structure
- filter correctness against Lightdash-backed queries
- responsive behavior
- light theme review
- dark theme review
- accessibility and interaction quality
- visual polish review against the board-facing standard

## 13. Risks

### 13.1 Scope Inflation

There is a risk of turning this into a general BI frontend. Avoid that by
shipping one report page first.

### 13.2 Chart-Library Premature Optimization

There is a risk of debating libraries too early. Start with `Chart.js`, observe
real limitations, then decide whether another library is warranted.

### 13.3 Semantic Drift

If frontend logic starts re-implementing Lightdash logic, the whole architecture
degrades. Keep Lightdash as the source of truth.

### 13.4 UI Quality Risk

A custom report without strong design discipline can still become a generic
dashboard. This is why the visual standard and Impeccable-guided quality bar
must be explicit.

## 14. Next Step

The next planning step after this spec is a concrete implementation plan for:

- app structure
- Lightdash API integration surface
- filter model
- report section composition
- theme system
- chart insertion points
- verification workflow
