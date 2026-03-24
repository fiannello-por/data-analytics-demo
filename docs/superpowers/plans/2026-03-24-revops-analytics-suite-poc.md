# RevOps Analytics Suite PoC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the current Lightdash-backed `Sales Performance Dashboard v2` into a reusable RevOps Analytics Suite PoC with a shared suite shell, multiple dashboard modules, shared caching and deduplication, dashboard-level performance controls, and a hierarchical semantic-system visualization.

**Architecture:** Build a new shared suite application on top of the existing semantic runtime instead of reworking the current `situation-room` app in place. Keep dashboard-specific intent local to dashboard modules while centralizing semantic execution, caching, instrumentation, and platform contracts in reusable packages. Reuse the existing v2 implementation as the first module and add at least one dummy dashboard to prove the multi-dashboard pattern.

**Tech Stack:** Next.js App Router, TypeScript, Lightdash, BigQuery, dbt, Vitest, React, shadcn/ui

---

## File Structure

### New app-level areas
- Create: `apps/analytics-suite/`
  - Shared internal suite shell and routes
  - Hosts multiple dashboard modules in one deployment
- Create: `apps/analytics-suite/app/`
  - Suite routes, layout, navigation, dashboard entry pages, semantic explorer entry points
- Create: `apps/analytics-suite/lib/suite/`
  - Suite-level contracts, module registry, shared cache access, budget policies
- Create: `apps/analytics-suite/dashboards/sales-performance/`
  - Sales dashboard module wiring reused from `situation-room` semantic v2 path
- Create: `apps/analytics-suite/dashboards/<dummy-dashboard>/`
  - Minimal second dashboard proving the module pattern

### Shared package areas
- Modify: `packages/analytics-adapter/src/`
  - Add shared cache/dedupe interfaces
  - Add semantic catalog helpers suitable for future explorer use
  - Add dashboard-budget instrumentation hooks
- Create: `packages/analytics-adapter/src/cache.ts`
  - Semantic request signature generation, semantic-version-aware cache keys, namespacing, in-flight deduplication
- Create: `packages/analytics-adapter/src/budgets.ts`
  - Budget config types, evaluation logic, rate-control hooks, policy results
- Create: `packages/analytics-adapter/src/catalog.ts`
  - Catalog retrieval and normalization for semantic explorer and registry validation

### Visualization and architecture areas
- Create or modify: `apps/architecture-explainer/`
  - Add hierarchical semantic-system visualization mode or create a dedicated suite-aware explainer route
- Create: `apps/architecture-explainer/lib/semantic-system-manifest.ts`
  - Hierarchical model for dashboard modules, registries, runtime subsystem, Lightdash, BigQuery, and serving entities

### Shared tests
- Create: `packages/analytics-adapter/__tests__/cache.test.ts`
- Create: `packages/analytics-adapter/__tests__/budgets.test.ts`
- Create: `packages/analytics-adapter/__tests__/catalog-runtime.test.ts`
- Create: `apps/analytics-suite/__tests__/suite-shell.test.tsx`
- Create: `apps/analytics-suite/__tests__/sales-dashboard-module.test.tsx`
- Create: `apps/analytics-suite/__tests__/dummy-dashboard-module.test.tsx`
- Create: `apps/analytics-suite/__tests__/suite-cache-behavior.test.ts`
- Create: `apps/analytics-suite/__tests__/budget-policy.test.ts`

## Task 1: Scaffold the Analytics Suite app

**Files:**
- Create: `apps/analytics-suite/package.json`
- Create: `apps/analytics-suite/tsconfig.json`
- Create: `apps/analytics-suite/next.config.mjs`
- Create: `apps/analytics-suite/app/layout.tsx`
- Create: `apps/analytics-suite/app/page.tsx`
- Create: `apps/analytics-suite/components/`
- Modify: `pnpm-workspace.yaml`
- Modify: root `package.json`
- Test: `apps/analytics-suite/__tests__/suite-shell.test.tsx`

- [ ] **Step 1: Write the failing shell test**

Create a test that renders the suite layout and asserts:
- a shared shell exists
- the navigation includes at least two dashboards
- the default landing page links into the first dashboard

- [ ] **Step 2: Run the suite-shell test to verify it fails**

Run: `pnpm --filter @point-of-rental/analytics-suite exec vitest run __tests__/suite-shell.test.tsx`

Expected: FAIL because the app and shell do not exist yet.

- [ ] **Step 3: Scaffold the app with minimal shell**

Implement:
- one shared top-level layout
- a left or top navigation
- routes for `Sales Performance` and one dummy dashboard
- shared theme and suite framing

- [ ] **Step 4: Run the shell test to verify it passes**

Run: `pnpm --filter @point-of-rental/analytics-suite exec vitest run __tests__/suite-shell.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/analytics-suite pnpm-workspace.yaml package.json
git commit -m "feat: scaffold analytics suite shell"
```

## Task 2: Define formal dashboard module boundaries

**Files:**
- Create: `apps/analytics-suite/dashboards/sales-performance/module.ts`
- Create: `apps/analytics-suite/dashboards/sales-performance/registry.ts`
- Create: `apps/analytics-suite/dashboards/sales-performance/mappers.ts`
- Create: `apps/analytics-suite/dashboards/<dummy-dashboard>/module.ts`
- Create: `apps/analytics-suite/lib/suite/modules.ts`
- Test: `apps/analytics-suite/__tests__/sales-dashboard-module.test.tsx`
- Test: `apps/analytics-suite/__tests__/dummy-dashboard-module.test.tsx`

- [ ] **Step 1: Write failing module-boundary tests**

Add tests asserting:
- each dashboard module exports a metadata contract
- each dashboard module provides a local registry
- the suite can enumerate dashboard modules without importing UI internals directly

- [ ] **Step 2: Run the tests to verify failure**

Run:
- `pnpm --filter @point-of-rental/analytics-suite exec vitest run __tests__/sales-dashboard-module.test.tsx`
- `pnpm --filter @point-of-rental/analytics-suite exec vitest run __tests__/dummy-dashboard-module.test.tsx`

- [ ] **Step 3: Implement module contracts**

Create a stable module interface with:
- module id
- title
- dashboard route
- registry factory
- mapper entry point
- render entry point
- budget policy reference

- [ ] **Step 4: Adapt Sales Performance v2 into the module shape**

Lift the existing `situation-room` v2 logic into a reusable module boundary rather than directly coupling it to one app route.

- [ ] **Step 5: Add a minimal dummy dashboard**

Keep it intentionally small:
- one page
- one registry
- one or two semantic queries
- enough to prove the platform pattern

- [ ] **Step 6: Run tests to verify pass**

Run the same module tests again and expect PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/analytics-suite/dashboards apps/analytics-suite/lib/suite/modules.ts
git commit -m "feat: add suite dashboard module boundaries"
```

## Task 3: Generalize the shared analytics runtime for multi-dashboard reuse

**Files:**
- Modify: `packages/analytics-adapter/src/index.ts`
- Modify: `packages/analytics-adapter/src/runtime.ts`
- Modify: `packages/analytics-adapter/src/types.ts`
- Create: `packages/analytics-adapter/src/catalog.ts`
- Test: `packages/analytics-adapter/__tests__/catalog-runtime.test.ts`

- [ ] **Step 1: Write failing tests for multi-dashboard runtime behavior**

Add tests covering:
- catalog retrieval from Lightdash through the shared runtime
- runtime invocation from two different dashboard namespaces
- metadata retaining dashboard and query identity

- [ ] **Step 2: Run the tests to verify failure**

Run: `pnpm --filter @por/analytics-adapter exec vitest run __tests__/catalog-runtime.test.ts`

- [ ] **Step 3: Implement shared runtime extensions**

Add support for:
- dashboard namespace in request execution metadata
- normalized catalog retrieval APIs
- platform-safe metadata fields for later reporting

- [ ] **Step 4: Run the test to verify pass**

Run the same test and expect PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/analytics-adapter/src packages/analytics-adapter/__tests__/catalog-runtime.test.ts
git commit -m "feat: generalize analytics runtime for suite reuse"
```

## Task 4: Add shared semantic request caching and in-flight deduplication

**Files:**
- Create: `packages/analytics-adapter/src/cache.ts`
- Modify: `packages/analytics-adapter/src/runtime.ts`
- Create: `packages/analytics-adapter/__tests__/cache.test.ts`
- Create: `apps/analytics-suite/__tests__/suite-cache-behavior.test.ts`

- [ ] **Step 1: Write failing cache tests**

Cover:
- semantic request signature generation
- semantic version inclusion in persistent cache keys
- cache namespace separation by dashboard
- in-flight deduplication for identical requests
- no dedupe for materially different signatures
- persistent cache invalidation when semantic version changes

- [ ] **Step 2: Run the cache tests to verify failure**

Run:
- `pnpm --filter @por/analytics-adapter exec vitest run __tests__/cache.test.ts`
- `pnpm --filter @point-of-rental/analytics-suite exec vitest run __tests__/suite-cache-behavior.test.ts`

- [ ] **Step 3: Implement cache and dedupe layer**

Introduce:
- a stable request-signature builder
- a semantic-version-aware persistent cache key builder
- a shared in-memory request dedupe map for the PoC
- cache hooks that can later be swapped for a distributed store
- dashboard-aware cache namespaces

- [ ] **Step 4: Integrate the cache into runtime execution**

Ensure the runtime:
- checks cache before compile/execute
- coalesces identical concurrent requests
- annotates metadata with cache hit or miss
- treats in-flight dedupe and persistent cache as separate mechanisms
- invalidates persistent cache entries when the semantic version changes

- [ ] **Step 5: Run the tests to verify pass**

Run the same tests again and expect PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/analytics-adapter/src/cache.ts packages/analytics-adapter/src/runtime.ts packages/analytics-adapter/__tests__/cache.test.ts apps/analytics-suite/__tests__/suite-cache-behavior.test.ts
git commit -m "feat: add shared semantic request caching"
```

## Task 5: Add dashboard-level budgets and soft traffic controls

**Files:**
- Create: `packages/analytics-adapter/src/budgets.ts`
- Modify: `packages/analytics-adapter/src/runtime.ts`
- Create: `apps/analytics-suite/lib/suite/budgets.ts`
- Create: `packages/analytics-adapter/__tests__/budgets.test.ts`
- Create: `apps/analytics-suite/__tests__/budget-policy.test.ts`

- [ ] **Step 1: Write failing budget-policy tests**

Cover:
- dashboard-level budget declarations
- query count tracking
- bytes processed aggregation
- execution-time aggregation
- policy result generation
- soft isolation states such as warning or degrade mode

- [ ] **Step 2: Run the tests to verify failure**

Run:
- `pnpm --filter @por/analytics-adapter exec vitest run __tests__/budgets.test.ts`
- `pnpm --filter @point-of-rental/analytics-suite exec vitest run __tests__/budget-policy.test.ts`

- [ ] **Step 3: Implement shared budget types and evaluation**

Add:
- budget config schema
- runtime accumulation of budget metrics
- soft policy evaluation result
- dashboard namespace tagging

- [ ] **Step 4: Implement suite-level budget declarations**

Each dashboard module should declare:
- max query count per load
- target latency
- target bytes processed
- optional degradation thresholds

- [ ] **Step 5: Expose budget state for reporting**

Return enough metadata so the suite can compare dashboards against their budget.

- [ ] **Step 6: Run the tests to verify pass**

Run the same tests and expect PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/analytics-adapter/src/budgets.ts packages/analytics-adapter/src/runtime.ts apps/analytics-suite/lib/suite/budgets.ts packages/analytics-adapter/__tests__/budgets.test.ts apps/analytics-suite/__tests__/budget-policy.test.ts
git commit -m "feat: add dashboard budget controls"
```

## Task 6: Build the suite-level reporting surface for platform behavior

**Files:**
- Create: `apps/analytics-suite/app/platform/page.tsx`
- Create: `apps/analytics-suite/components/platform/`
- Modify: `apps/analytics-suite/lib/suite/`
- Test: `apps/analytics-suite/__tests__/platform-page.test.tsx`

- [ ] **Step 1: Write the failing reporting-page test**

Assert that the suite exposes:
- dashboard budget summaries
- cache hit/miss indicators
- query count and bytes processed summaries

- [ ] **Step 2: Run the test to verify failure**

Run: `pnpm --filter @point-of-rental/analytics-suite exec vitest run __tests__/platform-page.test.tsx`

- [ ] **Step 3: Implement the lightweight platform page**

Keep it PoC-focused:
- dashboard cards or rows
- budget status
- cache effectiveness
- request and cost-oriented metadata

- [ ] **Step 4: Run the test to verify pass**

Run the same test and expect PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/analytics-suite/app/platform apps/analytics-suite/components/platform apps/analytics-suite/__tests__/platform-page.test.tsx
git commit -m "feat: add suite platform reporting page"
```

## Task 7: Add hierarchical semantic-system visualization

**Files:**
- Modify: `apps/architecture-explainer/`
- Create: `apps/architecture-explainer/lib/semantic-system-manifest.ts`
- Create: `apps/architecture-explainer/components/semantic-system/`
- Test: `apps/architecture-explainer/__tests__/semantic-system-page.test.tsx`

- [ ] **Step 1: Write failing visualization tests**

Assert that the architecture visualization can represent:
- dashboard module containers
- local registries within modules
- shared runtime as a subsystem
- nested runtime stages for Lightdash compile and BigQuery execute

- [ ] **Step 2: Run the test to verify failure**

Run: `pnpm --filter @point-of-rental/architecture-explainer exec vitest run __tests__/semantic-system-page.test.tsx`

- [ ] **Step 3: Implement the hierarchical semantic-system visualization**

Do not rely on flat graph assumptions.

Add:
- grouped subsystem containers
- nested runtime stages
- dashboard module grouping
- serving-layer and source-entity grouping

- [ ] **Step 4: Run the test to verify pass**

Run the same test and expect PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/architecture-explainer
git commit -m "feat: add hierarchical semantic system visualization"
```

## Task 8: Wire Sales Performance and dummy dashboards into the suite app

**Files:**
- Modify: `apps/analytics-suite/app/page.tsx`
- Create: `apps/analytics-suite/app/dashboards/sales-performance/page.tsx`
- Create: `apps/analytics-suite/app/dashboards/<dummy-dashboard>/page.tsx`
- Modify: `apps/analytics-suite/lib/suite/modules.ts`
- Test: `apps/analytics-suite/__tests__/sales-dashboard-module.test.tsx`
- Test: `apps/analytics-suite/__tests__/dummy-dashboard-module.test.tsx`

- [ ] **Step 1: Write failing route tests**

Assert that:
- the suite route loads dashboard modules through the module registry
- Sales Performance renders through the shared suite shell
- the dummy dashboard renders through the same shell and shared runtime shape

- [ ] **Step 2: Run the route tests to verify failure**

Run the relevant module tests and expect failure.

- [ ] **Step 3: Implement route wiring**

Ensure:
- shared shell around every dashboard
- dashboard modules are resolved from one registry
- Sales Performance uses the semantic platform path rather than direct bespoke wiring

- [ ] **Step 4: Run the tests to verify pass**

Run the module tests again and expect PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/analytics-suite/app apps/analytics-suite/lib/suite/modules.ts
git commit -m "feat: wire dashboards into analytics suite"
```

## Task 9: Validate semantic coverage and platform contracts

**Files:**
- Create: `apps/analytics-suite/__tests__/semantic-coverage.test.ts`
- Modify: `packages/analytics-adapter/__tests__/catalog-runtime.test.ts`
- Modify: dashboard module tests as needed

- [ ] **Step 1: Write failing semantic coverage tests**

Assert that:
- every dashboard registry references semantic entities that exist
- dashboard-local intent stays outside UI files
- shared runtime remains provider-focused and not dashboard-specific

- [ ] **Step 2: Run the tests to verify failure**

Run: `pnpm --filter @point-of-rental/analytics-suite exec vitest run __tests__/semantic-coverage.test.ts`

- [ ] **Step 3: Implement validation hooks**

Use the shared catalog retrieval to verify registry references and catch drift.

- [ ] **Step 4: Run the tests to verify pass**

Run the same test and expect PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/analytics-suite/__tests__/semantic-coverage.test.ts packages/analytics-adapter
git commit -m "test: validate suite semantic coverage"
```

## Task 10: Final verification and documentation

**Files:**
- Modify: relevant READMEs or docs if needed
- Confirm: `docs/superpowers/specs/2026-03-24-revops-analytics-suite-poc-design.md`

- [ ] **Step 1: Run targeted tests for shared runtime**

Run:
```bash
pnpm --filter @por/analytics-adapter test
pnpm --filter @por/analytics-adapter typecheck
```

- [ ] **Step 2: Run targeted tests for the suite app**

Run:
```bash
pnpm --filter @point-of-rental/analytics-suite exec vitest run
pnpm --filter @point-of-rental/analytics-suite typecheck
pnpm --filter @point-of-rental/analytics-suite build
```

- [ ] **Step 3: Run targeted tests for architecture visualization**

Run:
```bash
pnpm --filter @point-of-rental/architecture-explainer exec vitest run
pnpm --filter @point-of-rental/architecture-explainer typecheck
pnpm --filter @point-of-rental/architecture-explainer build
```

- [ ] **Step 4: Run sales dashboard compatibility checks**

Run:
```bash
pnpm --filter @point-of-rental/situation-room exec vitest run __tests__/dashboard-v2-routes.test.ts __tests__/dashboard-v2-page.test.tsx __tests__/dashboard-v2-server-loaders.test.ts
pnpm --filter @point-of-rental/situation-room typecheck
pnpm --filter @point-of-rental/situation-room build
```

- [ ] **Step 5: Confirm the PoC acceptance criteria manually**

Check:
- multiple dashboards share one suite shell
- shared runtime is reused by more than one module
- request caching and dedupe are working
- budget reporting exists per dashboard
- hierarchical semantic-system visualization exists

- [ ] **Step 6: Commit final documentation or cleanup**

```bash
git add .
git commit -m "docs: finalize analytics suite poc verification"
```
