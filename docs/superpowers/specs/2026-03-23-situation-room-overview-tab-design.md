# Situation Room Overview Tab Design

Date: 2026-03-23
Status: Draft
Related designs:
- `2026-03-21-situation-room-dashboard-definition-design.md`

## 1. Summary

This document defines a new `Overview` mode for the `Situation Room`
dashboard.

The overview is a separate presentation layer inside the existing dashboard,
represented by a `LayoutGrid` tab. It is not another table tab. It is a
scan-first board of executive scorecards that summarizes all business
categories at once.

The overview tab must:

- use the same global filters and date context as the rest of the dashboard
- avoid the table-and-trend layout used by the category tabs
- present all categories as KPI scorecards with stronger visual hierarchy
- keep `Total` as a distinct wide summary card because its metric coverage is
  smaller than the other categories

## 2. Problem

The current dashboard only supports one presentation mode:

- category tab
- table of metric rows
- selected-row trend panel

That is good for detailed analysis, but it is not ideal for quick executive
scanning.

Executives need a higher-level view that:

- shows every category at once
- emphasizes the most important KPIs visually
- avoids making the user step through each category tab to build a mental model

Reusing the existing table cards would not solve this. The new mode needs a
different visual grammar.

## 3. Goals

- Add an `Overview` tab to the existing dashboard
- Use `LayoutGrid` as the visible tab treatment
- Show all categories in a board layout instead of a table layout
- Preserve the current global filter and date model
- Reuse the current dashboard data contracts as much as possible
- Keep the board trustworthy and semantically aligned with the existing metric
  catalog

## 4. Non-Goals

- Replacing the existing category tabs
- Adding trends or drilldowns to the overview in v1
- Reintroducing row selection inside the overview
- Creating a separate backend product for the overview unless needed later
- Forcing `Total` into the same metric structure as the other categories

## 5. Product Definition

The dashboard will gain one additional tab:

- internal name: `Overview`
- visible label treatment: `LayoutGrid` icon
- accessible label: `Overview`

The overview tab is a read-only summary board.

It uses:

- the same global filters
- the same date range
- the same prior-year comparison rule

It does not use:

- the table row interaction model
- the right-side trend panel

## 6. Layout

The overview tab layout is:

- a grid of four category scorecards:
  - `New Logo`
  - `Expansion`
  - `Migration`
  - `Renewal`
- one distinct wider `Total` summary card below the grid

This layout is intentionally different from the existing category tabs so that
the `LayoutGrid` mode reads as a true overview mode rather than another flavor
of detail view.

The visual direction is the `Balanced Grid` option:

- all non-total categories have comparable visual weight
- no single category dominates the whole board
- `Total` receives a wider summary treatment because it has fewer metrics and a
  different semantic role

## 7. Category Scorecard Grammar

Each non-`Total` category card has three internal sections.

### 7.1 Section A

Primary bookings section:

- hero KPI: `Bookings $`
- supporting KPI: `Bookings #`

`Bookings $` is the primary entry point for the card.

### 7.2 Section B

Operational quality section:

- `Annual Pacing (YTD)`
- `Close Rate`
- `Avg Age`

All three KPIs have equal visual weight.

### 7.3 Section C

Pipeline economics section:

- `Pipeline Created`
- `Avg Booked Deal`
- `Avg Quoted Deal`

These are rendered as three equal KPI blocks side by side.

Under this section, each category may render a quieter supporting row for
category-specific metrics such as:

- `SQL`
- `SQO`
- `Gate 1 Complete`
- `SAL`
- `Avg Users`

The support row is visibly secondary.

### 7.4 Section C fallback rule

If a category card becomes too dense in practice, `Pipeline Created` may become
the visual hero of Section C while the other two primary KPIs become secondary.

This is a fallback only, not the default composition.

## 8. Total Card

`Total` should not mimic the three-section category structure.

Instead, it should be a curated executive summary built from the metrics that
actually exist for `Total`.

Recommended structure:

- hero area:
  - `Bookings $`
  - supporting `Bookings #`
- secondary KPI row:
  - `Annual Pacing (YTD)`
  - `One-time Revenue`

If a small supporting summary line helps the composition, it may be added, but
the card must not invent missing metrics or create fake empty sections.

## 9. Visual Direction

The overview should take inspiration from the provided KPI reference image, but
adapted to the established dashboard style.

Key visual rules:

- dark, low-glare scorecard surfaces
- quiet category labels
- strong, large metric typography
- subtle deltas, not loud pills
- little visual chrome
- spacing-based hierarchy before borders

The overview must not look like:

- a table in disguise
- a BI tile grid
- a set of generic cards with identical repeated chrome

### 9.1 Delta treatment

Most KPIs should show a prior-year delta, but quietly.

Delta rules:

- positive: soft green
- negative: soft red
- neutral: muted

Delta should be presented as secondary information near the metric, not as a
dominant outlined pill.

## 10. Behavior

The overview tab is read-only and scan-first.

Behavior rules:

- selecting the `Overview` tab swaps the main dashboard content immediately
- the overview does not render the right-side trend panel
- the overview does not support row selection
- the overview does not contain nested tabs
- the overview does not contain chart drilldowns in v1

Future extension:

- clicking a category scorecard may later navigate to that category tab

That interaction is intentionally out of scope for v1.

## 11. Loading and Missing Data

### 11.1 Loading

When the overview tab is loading, the UI should render board-shaped skeletons
that match the scorecard layout:

- category scorecard skeletons for the 2x2 grid
- one wide total-card skeleton

The overview must not reuse the table skeleton.

### 11.2 Missing metrics

If a metric does not exist for a category:

- omit the KPI block cleanly
- do not render fake zeros
- do not force symmetry at the cost of semantic honesty

`Total` is expected to be structurally different and should remain so.

## 12. Data Architecture

The overview should be implemented as a new presentation mode on top of the
existing dashboard contracts.

Recommended approach:

- keep the current snapshot query contract
- add an overview transformer that maps category snapshot data into:
  - category scorecard sections
  - total scorecard summary

Recommended component split:

- `overview-tab.tsx`
- `category-scorecard.tsx`
- `total-scorecard.tsx`
- `scorecard-section.tsx`

This keeps the overview aligned with the existing curated dashboard definition
layer and avoids unnecessary backend divergence in v1.

If the current snapshot payload later proves too table-shaped for clean
transformation, the team may introduce a dedicated overview payload. That is a
future optimization, not the default starting point.

## 13. Accessibility

- the new icon tab must expose the accessible text label `Overview`
- scorecard structure must preserve semantic headings and readable value labels
- deltas must not rely on color alone
- compact supporting rows must remain readable at executive dashboard sizes

## 14. Testing

The implementation should verify:

- the `Overview` tab appears in the dashboard tab model
- switching to the icon tab swaps the content mode correctly
- the overview renders all four category cards plus the wide total card
- the right-side trend panel is absent in overview mode
- overview loading uses scorecard skeletons instead of table skeletons
- missing metrics are omitted cleanly

## 15. Recommendation

Implement the overview as a new board-style dashboard mode using the existing
data contracts and a dedicated presentation layer.

This provides a stronger executive scanning experience without changing the
semantic meaning of the existing dashboard or introducing unnecessary backend
complexity in the first pass.
