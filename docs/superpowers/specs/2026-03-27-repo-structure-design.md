# Repository Structure Reorganization Design

Date: 2026-03-27
Status: Draft
Related issues:

- none

## 1. Summary

This document defines the next structural phase for the analytics team
repository after the cleanup work.

The goal is to reorganize the repository so its folder layout reflects the
actual long-term architecture:

- deployable applications live together
- semantic-layer assets live together
- shared runtime packages live together
- internal engineering tooling lives together
- each major area owns its own tests

This is a folder-structure design first. Code moves may follow, but only if the
approved target layout requires them.

## 2. Design Principles

The structure should optimize for:

- modular ownership by major repo surface
- clear distinction between deployable apps and platform/configuration assets
- clear distinction between product/runtime code and internal tooling
- future compatibility with `dbt`-defined Lightdash semantics
- low cognitive load for navigation and onboarding

The repository itself is already the analytics team home. Because of that, the
structure should not introduce a redundant top-level `analytics/` wrapper.

## 3. Approved Organizing Model

The repository should be organized by top-level capability, not by a redundant
team-name wrapper and not by pure technical-layer grouping.

### 3.1 Applications

All deployable or user-facing web applications should live under `apps/`.

That includes:

- reporting applications
- documentation sites
- changelog/public-facing sites
- future utility applications such as alerts

### 3.2 Semantic Layer

Semantic-layer assets should live outside `apps/` because they are platform and
configuration assets, not applications.

The semantic area must support both:

- current standalone Lightdash YAML
- future `dbt`-defined Lightdash semantics

### 3.3 Tooling

Internal validators, automation, and related engineering code should live under
`tooling/`, not under a generic root `src/`.

`tooling/` should be treated as real maintained software.

### 3.4 Tests

Each major top-level area should own its own tests.

That means:

- app tests live with apps
- tooling tests live under `tooling/tests/`
- package tests live with the package owner when needed

There should not be a generic root `tests/` directory after the reorganization.

## 4. Approved Target Layout

The approved target structure is:

```text
.
├── .github/
├── apps/
│   ├── analytics-suite/
│   ├── changelog/
│   ├── docs-site/
│   └── alerts/                     # future
├── semantic/
│   ├── dbt/                        # future reserved location
│   └── lightdash/
├── packages/
│   └── semantic-runtime/
├── tooling/
│   ├── pyproject.toml
│   ├── src/
│   │   └── por_tooling/
│   │       ├── automation/
│   │       ├── lib/
│   │       └── validators/
│   └── tests/
├── docs/
└── package.json
```

## 5. Naming Decisions

The following renames are part of the approved structure:

- `apps/pdr` becomes `apps/docs-site`
- `apps/changelog-site` becomes `apps/changelog`
- `lightdash/` moves under `semantic/lightdash/`
- root Python operational code under `src/por_analytics/` moves under
  `tooling/src/por_tooling/`
- root Python tests under `tests/` move under `tooling/tests/`

The following areas remain conceptually stable:

- `apps/analytics-suite`
- `packages/semantic-runtime`
- `docs/` for repository documentation, not deployable sites

## 6. Why This Layout

### 6.1 Why not `analytics/` at the root

The whole repository already belongs to the analytics team.

Adding a top-level `analytics/` wrapper would make paths longer without adding
new information. It would create `analytics inside analytics` naming and reduce
clarity rather than improve it.

### 6.2 Why docs and changelog stay under `apps/`

The documentation site and changelog site are still deployable applications.

They should therefore be grouped with other applications, even though they
serve different purposes from the reporting suite.

`apps/` should represent deployable surfaces, not a narrow definition of
dashboard products only.

### 6.3 Why `semantic/` is separate

The semantic layer is central platform/configuration, not a web application.

Separating it from `apps/` makes the dependency direction clearer:

- semantics define the platform contract
- applications consume that contract

It also creates a natural future home for `dbt`.

### 6.4 Why `tooling/` stands alone

The validator and automation code in this repo is not one-off script glue.

It has:

- tests
- shared libraries
- entrypoints
- long-term operational ownership

That should be represented as maintained tooling, not miscellaneous glue.

## 7. Structural Boundaries

After reorganization, the expected ownership boundaries are:

- `apps/`: deployable UI and site surfaces
- `semantic/`: analytics semantic definitions and future `dbt` home
- `packages/`: reusable runtime libraries consumed by applications
- `tooling/`: internal operational code such as validation and automation
- `docs/`: repository documentation and design artifacts

## 8. Migration Constraints

This phase should proceed in two layers:

### 8.1 Layer 1: Folder Structure

First:

- create the approved folder destinations
- move directories into the approved layout
- update workspace config and package manifests
- update Python packaging paths
- update test discovery paths

### 8.2 Layer 2: Code Moves Only If Required

Only after the folder structure is in place should we decide whether deeper
code moves are needed to align imports, naming, or boundaries.

This avoids mixing structural decisions with opportunistic refactors.

## 9. Risks

### 9.1 Risk: path churn breaks builds

Mitigation:

- update workspace configuration and package names deliberately
- run full validation after each structural wave

### 9.2 Risk: Python tooling packaging becomes inconsistent

Mitigation:

- give `tooling/` its own conventional `src/` layout
- move tests with the tooling package rather than leaving them at repo root

### 9.3 Risk: semantic assets get mixed with applications

Mitigation:

- keep `semantic/` separate from `apps/`
- reserve `semantic/dbt/` now even if empty

### 9.4 Risk: site renames create unnecessary drift

Mitigation:

- rename only the two approved app directories now:
  - `pdr` -> `docs-site`
  - `changelog-site` -> `changelog`

## 10. Acceptance Criteria

The reorganization is successful when:

- the repository top level matches the approved layout
- `docs-site` and `changelog` use the approved app names
- Lightdash content lives under `semantic/lightdash/`
- tooling code lives under `tooling/` with its own `src/` and `tests/`
- root `tests/` is gone
- workspace, packaging, and validation commands all pass after the move

## 11. Out Of Scope

This design does not yet define:

- semantic-layer implementation changes
- `dbt` introduction itself
- architectural refactors inside moved code
- CI policy redesign beyond whatever path updates are required

Those can follow once the folder structure is in place and validated.
