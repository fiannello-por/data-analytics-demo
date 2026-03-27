# Repository Cleanse Design

Date: 2026-03-27
Status: Draft
Related issues:

- none

## 1. Summary

This document defines the first-stage repository cleanse for the
`point-of-rental/data-analytics-demo` monorepo.

The goal is not a stylistic tidy-up. The goal is to reduce the repository to
the smallest coherent working system that still supports the current intended
outputs and workflows.

The cleanse is intentionally aggressive:

- remove code, apps, packages, docs, tooling, and historical scaffolding unless
  they are directly required
- preserve only the current intended product surfaces and the process tooling
  that is still actively useful
- finish with a repo that validates cleanly from an isolated branch and
  worktree

This design covers the cleanup boundary only. Structural hardening and repo
reorganization happen after the cleanse is complete.

## 2. Approved Repository Boundary

The following product surfaces are the only app-level outputs that should
survive the cleanse:

- `apps/analytics-suite`
- `apps/pdr`
- `apps/changelog-site`

The following non-app systems also stay:

- `lightdash/` content and its supporting configuration
- Lightdash validation code and Lightdash preview/deploy workflows
- changelog generation automation
- general CI for formatting, linting, validation, tests, and builds
- useful process tooling that is still actively used by the kept repo

The following items are explicitly targeted for removal:

- all other apps under `apps/`
- the AI PR review bot
- `dbt` runtime usage, `dbt` commands, and `dbt` dependencies unless a live
  retained workflow proves they are still necessary
- code, packages, workflows, documents, and scaffolding not directly required
  by the kept set
- historical repo artifacts, including aggressive cleanup of stale specs, plans,
  and agent scaffolding when they are not part of current execution

## 3. Decision Rules

### 3.1 Keep Rule

An item stays only if at least one of the following is true:

- it is part of `analytics-suite`, `pdr`, or `changelog-site`
- it is required to build, test, validate, or deploy one of those apps
- it is required by Lightdash content or retained Lightdash workflows
- it is required by retained changelog automation
- it is required by retained general CI

### 3.2 Remove Rule

An item is removed if it fails the keep rule, even if it was recently added,
has partial implementation, or may be useful later.

Planned future use is not enough to justify keeping code in this cleanse.

### 3.3 dbt Rule

The repository is currently intended to operate without `dbt`.

That means:

- `dbt` is treated as future-facing scaffolding, not as a protected dependency
- `dbt` should be removed if Lightdash and retained CI can operate without it
- future `dbt` adoption can be documented, but current `dbt` execution should
  not remain as noise

### 3.4 Historical Artifact Rule

Old planning artifacts, stale specs, dormant architecture experiments, vendored
agent scaffolding, and other historical traces do not receive special
protection.

If they are not required for present repo behavior, they are cleanup
candidates.

## 4. Starting Baseline

The cleanse will be executed from:

- branch: `codex/repo-cleanse`
- isolated worktree:
  `.worktrees/codex-repo-cleanse`
- clean base ref: `origin/main`

Before cleanup work begins, the retained baseline must validate successfully in
the isolated worktree.

Current baseline verification command:

```bash
pnpm validate
```

Current result at design time:

- `pnpm validate` passed from the isolated worktree
- this includes formatting checks, markdown lint, YAML lint, current `dbt`
  parse, Python lint/typecheck/tests, Lightdash validators, and changelog-site
  build

This clean baseline is important because it separates existing repo health from
cleanup regressions.

## 5. Recommended Cleanup Strategy

The cleanse should follow a reachability-first approach.

### 5.1 Why not delete-first

Direct deletion is attractive because several removal targets are obvious:

- `apps/architecture-explainer`
- `apps/situation-room`
- AI PR review workflow and code
- `dbt` commands and dependencies

But the repository mixes multiple concerns:

- Node.js workspaces
- Python automation and validators
- Lightdash metadata and workflows
- documentation sites
- CI orchestration

Without first mapping retained dependencies, a delete-first pass risks removing
pieces that still support the retained workflows.

### 5.2 Reachability-first approach

The recommended approach is:

1. classify the repo against the keep rule
2. remove obvious non-reachable systems in controlled waves
3. repair manifests, scripts, and workflows after each wave
4. re-run verification after each meaningful cut

This yields a smaller repo without turning the cleanup itself into a debugging
exercise.

## 6. Cleanup Phases

### 6.1 Phase 1: Classification

Produce a repo-wide classification matrix for at least these surfaces:

- top-level directories
- every app in `apps/`
- every package in `packages/`
- root scripts in `package.json`
- Python entrypoints in `pyproject.toml`
- workflows in `.github/workflows/`
- docs subtrees
- repo-local agent scaffolding

Each item must be labeled as one of:

- `keep`
- `remove`
- `review`

Every label needs a short reason tied to the approved boundary.

The expectation is that the number of `review` items should be small.

### 6.2 Phase 2: Obvious Removals

Remove the most clearly disallowed systems first.

Expected candidates include:

- `apps/architecture-explainer`
- `apps/situation-room`
- AI PR review code under `src/por_analytics/agents/review_pr.py`
- supporting PR review helpers if no longer used elsewhere
- workflow `.github/workflows/codex-review.yml`
- root scripts that target removed apps

This phase should also remove corresponding tests and docs that only describe
the removed systems.

### 6.3 Phase 3: dbt Extraction

Remove current `dbt` execution unless a retained workflow still depends on it.

Expected work includes:

- remove `dbt/` directory
- remove `dbt:*` root scripts
- remove `dbt` from `validate`
- remove `dbt-core` and `dbt-bigquery` from Python dependencies
- update docs that currently describe the repo as if `dbt` execution is active

Future `dbt` adoption may remain documented as a future path, but the live repo
should stop acting as if `dbt` is present today.

### 6.4 Phase 4: Shared Code and Package Reduction

Review shared packages and Python modules against the retained boundary.

Any package or library code that only served removed apps or removed process
tooling should be deleted.

This phase is where dead shared abstractions are expected to disappear.

### 6.5 Phase 5: Historical Artifact Purge

Aggressively remove stale planning and historical scaffolding not required for
current repo behavior.

Expected candidates include:

- stale `docs/superpowers/specs/`
- stale `docs/superpowers/plans/`
- dormant repo-local agent snapshots
- documentation focused on removed apps or removed experiments

The goal is not to preserve archaeology inside the working repository.

### 6.6 Phase 6: Final Consistency Repair

After deletions, repair the remaining repo so it reads as intentionally scoped
rather than partially amputated.

This includes:

- workspace definitions
- root scripts
- dependency manifests and lockfiles
- CI change filters
- README and contribution guidance
- references to removed apps, removed commands, and removed workflows

## 7. Verification Requirements

The cleanse is not complete until the retained repo validates cleanly.

At minimum, final verification should cover:

- retained root validation command
- Lightdash validators
- changelog-site typecheck and build
- analytics-suite build and test path if still defined
- pdr build path if still defined
- CI workflow coherence after path and script cleanup

Verification should be run incrementally during cleanup, not only at the end.

## 8. Risks and Controls

### 8.1 Risk: accidental removal of retained support code

Control:

- classify before deletion
- verify after each wave
- keep deletion commits logically grouped

### 8.2 Risk: repo still mentions removed systems everywhere

Control:

- reserve an explicit consistency-repair phase
- treat documentation and workflow updates as first-class cleanup work

### 8.3 Risk: `dbt` removal exposes hidden coupling

Control:

- scan all references before deletion
- remove `dbt` only after confirming retained Lightdash and CI paths still work

### 8.4 Risk: historical artifact purge removes something still relied upon by

humans

Control:

- keep this design doc and implementation plan as the canonical record for the
  cleanse itself
- aggressively remove old artifacts only after their dependencies are checked

## 9. Out of Scope

This design does not yet define the post-cleanse repo structure.

After cleanup is complete, a separate hardening and restructuring effort should
address:

- monorepo ownership boundaries
- clearer package and app layering
- long-term process hardening
- stronger CI and validation ergonomics
- better conventions for mixed Node.js, Python, and Lightdash code

## 10. Success Criteria

The cleanse succeeds when all of the following are true:

- only `analytics-suite`, `pdr`, and `changelog-site` remain as apps
- Lightdash remains fully functional and supported by validation/deploy tooling
- changelog automation still works
- the AI PR review bot is gone
- `dbt` is gone unless a retained live dependency proves otherwise
- dead packages, dead docs, and stale scaffolding are removed aggressively
- the remaining repository validates cleanly from the isolated worktree
- the repo reads as intentionally small rather than historically accumulated
