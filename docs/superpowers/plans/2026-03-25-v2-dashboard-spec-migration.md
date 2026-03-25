# v2 Dashboard Spec Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract Situation Room `v2` dashboard composition into reusable shared packages for spec definition, shared layout/chrome, and Recharts-based visualization, then migrate the `Main Metrics + selected trend` pilot slice.

**Architecture:** The migration is split into three shared layers plus one app consumer. `packages/dashboard-spec` owns declarative contracts, validation, normalization, and renderer interfaces. `packages/dashboard-layout` owns tile chrome, common states, and layout primitives. `packages/dashboard-visualization-recharts` owns concrete Recharts-backed renderers. `apps/situation-room` consumes all three and supplies data bindings plus traceability adapters.

**Tech Stack:** TypeScript, React, Next.js, Recharts, Vitest, workspace packages, existing Situation Room semantic runtime.

---

## Task 1: Scaffold the shared dashboard packages

**Files:**

- Create: `packages/dashboard-spec/package.json`
- Create: `packages/dashboard-spec/tsconfig.json`
- Create: `packages/dashboard-spec/src/index.ts`
- Create: `packages/dashboard-layout/package.json`
- Create: `packages/dashboard-layout/tsconfig.json`
- Create: `packages/dashboard-layout/src/index.ts`
- Create: `packages/dashboard-visualization-recharts/package.json`
- Create: `packages/dashboard-visualization-recharts/tsconfig.json`
- Create: `packages/dashboard-visualization-recharts/src/index.ts`
- Modify: `apps/situation-room/package.json`

- [ ] **Step 1: Write the failing workspace import test**

Create `apps/situation-room/__tests__/dashboard-spec-packages.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import * as dashboardSpec from "@por/dashboard-spec";
import * as dashboardLayout from "@por/dashboard-layout";
import * as dashboardVisualizationRecharts from "@por/dashboard-visualization-recharts";

describe("dashboard package scaffolding", () => {
  it("exposes the shared packages to situation-room", () => {
    expect(dashboardSpec).toBeTruthy();
    expect(dashboardLayout).toBeTruthy();
    expect(dashboardVisualizationRecharts).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @point-of-rental/situation-room exec vitest run __tests__/dashboard-spec-packages.test.ts`
Expected: FAIL with module resolution errors for the new workspace packages.

- [ ] **Step 3: Create minimal package scaffolding**

Mirror the package structure used by `packages/analytics-adapter`:

- `package.json`
  - `private: true`
  - `type: "module"`
  - `main` and `types` pointing at `./src/index.ts`
  - `test` and `typecheck` scripts
- `tsconfig.json`
  - same compiler baseline as `packages/analytics-adapter/tsconfig.json`
- `src/index.ts`
  - export a placeholder constant from each package

Update `apps/situation-room/package.json` dependencies:

```json
{
  "@por/dashboard-spec": "workspace:*",
  "@por/dashboard-layout": "workspace:*",
  "@por/dashboard-visualization-recharts": "workspace:*"
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @point-of-rental/situation-room exec vitest run __tests__/dashboard-spec-packages.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  packages/dashboard-spec \
  packages/dashboard-layout \
  packages/dashboard-visualization-recharts \
  apps/situation-room/package.json \
  apps/situation-room/__tests__/dashboard-spec-packages.test.ts
git commit -m "feat: scaffold shared dashboard packages"
```

## Task 2: Define and validate the shared dashboard spec contracts

**Files:**

- Create: `packages/dashboard-spec/src/spec.ts`
- Create: `packages/dashboard-spec/src/validation.ts`
- Create: `packages/dashboard-spec/src/normalize.ts`
- Create: `packages/dashboard-spec/src/rendering.ts`
- Create: `packages/dashboard-spec/__tests__/spec.test.ts`
- Modify: `packages/dashboard-spec/src/index.ts`

- [ ] **Step 1: Write the failing spec contract tests**

Create `packages/dashboard-spec/__tests__/spec.test.ts` covering:

- valid `metric`, `table`, `chart`, and `composite` specs
- invalid composite with missing children
- invalid chart with missing `visualization.type`
- normalization of default layout/interactions

Example:

```ts
import { describe, expect, it } from "vitest";

import { normalizeTileSpec, validateTileSpec } from "../src";

describe("tile spec contracts", () => {
  it("validates a line comparison chart spec", () => {
    const result = validateTileSpec({
      id: "bookings_trend",
      kind: "chart",
      title: "Bookings $",
      data: { kind: "binding", key: "bookingsTrend" },
      visualization: {
        type: "line-comparison",
        xField: "bucketLabel",
        series: [
          { field: "currentValue", label: "Current period" },
          { field: "previousValue", label: "Previous year" }
        ]
      }
    });

    expect(result.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @por/dashboard-spec test`
Expected: FAIL because the spec contracts and validators do not exist yet.

- [ ] **Step 3: Implement the shared contracts**

In `packages/dashboard-spec/src/spec.ts`, define:

- `BaseTileSpec`
- `MetricTileSpec`
- `TableTileSpec`
- `ChartTileSpec`
- `CompositeTileSpec`
- `TileSpec`
- `TileDataBindingSpec`
- `TileLayoutSpec`
- `SplitLayoutSpec`
- `GridLayoutSpec`
- `StackLayoutSpec`
- `MetricVisualizationSpec`
- `TableVisualizationSpec`
- `LineComparisonVisualizationSpec`

In `packages/dashboard-spec/src/validation.ts`, implement runtime validation with handwritten invariant checks returning:

```ts
type ValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };
```

In `packages/dashboard-spec/src/normalize.ts`, implement:

- `normalizeTileSpec`
- defaults for layout and interactions
- default empty arrays or omitted optional sections only where safe

In `packages/dashboard-spec/src/rendering.ts`, define:

- `RendererRegistry`
- `VisualizationRenderer`
- registry key helpers such as `getVisualizationRendererKey(spec)`

- [ ] **Step 4: Run tests to verify they pass**

Run:

- `pnpm --filter @por/dashboard-spec test`
- `pnpm --filter @por/dashboard-spec typecheck`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/dashboard-spec
git commit -m "feat: add shared dashboard spec contracts"
```

## Task 3: Build shared tile chrome and layout primitives

**Files:**

- Create: `packages/dashboard-layout/src/tile-frame.tsx`
- Create: `packages/dashboard-layout/src/layout-primitives.tsx`
- Create: `packages/dashboard-layout/src/states.tsx`
- Create: `packages/dashboard-layout/src/types.ts`
- Create: `packages/dashboard-layout/__tests__/tile-frame.test.tsx`
- Modify: `packages/dashboard-layout/src/index.ts`

- [ ] **Step 1: Write the failing layout tests**

Create `packages/dashboard-layout/__tests__/tile-frame.test.tsx` covering:

- shared header rendering with title, subtitle, and actions
- loading, empty, and error state shells
- `split` layout giving the first child content width and second child fill width

Example:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TileFrame } from "../src";

describe("TileFrame", () => {
  it("renders title, subtitle, and actions in shared chrome", () => {
    render(
      <TileFrame
        title="Main Metrics"
        subtitle="Track the primary outcomes for this booking category."
        actions={<button type=\"button\">Inspect</button>}
      >
        <div>Body</div>
      </TileFrame>,
    );

    expect(screen.getByText("Main Metrics")).toBeInTheDocument();
    expect(screen.getByText("Inspect")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @por/dashboard-layout test`
Expected: FAIL because no shared layout components exist.

- [ ] **Step 3: Implement shared layout package**

In `packages/dashboard-layout/src/tile-frame.tsx`:

- export `TileFrame`
- accept `title`, `subtitle`, `actions`, `children`
- keep visual chrome generic and reusable

In `packages/dashboard-layout/src/states.tsx`:

- export `TileLoadingState`
- export `TileEmptyState`
- export `TileErrorState`

In `packages/dashboard-layout/src/layout-primitives.tsx`:

- export `DashboardSplit`
- export `DashboardGrid`
- export `DashboardStack`

Keep the layout package renderer-agnostic:

- no Recharts imports
- no Situation Room-specific copy

- [ ] **Step 4: Run tests to verify they pass**

Run:

- `pnpm --filter @por/dashboard-layout test`
- `pnpm --filter @por/dashboard-layout typecheck`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/dashboard-layout
git commit -m "feat: add shared dashboard layout primitives"
```

## Task 4: Implement reusable Recharts visualization renderers

**Files:**

- Create: `packages/dashboard-visualization-recharts/src/registry.tsx`
- Create: `packages/dashboard-visualization-recharts/src/renderers/metric-headline.tsx`
- Create: `packages/dashboard-visualization-recharts/src/renderers/table-standard.tsx`
- Create: `packages/dashboard-visualization-recharts/src/renderers/chart-line-comparison.tsx`
- Create: `packages/dashboard-visualization-recharts/src/types.ts`
- Create: `packages/dashboard-visualization-recharts/__tests__/registry.test.tsx`
- Modify: `packages/dashboard-visualization-recharts/src/index.ts`
- Modify: `packages/dashboard-visualization-recharts/package.json`

- [ ] **Step 1: Write the failing renderer tests**

Create `packages/dashboard-visualization-recharts/__tests__/registry.test.tsx` to prove:

- `metric.headline` resolves
- `table.standard` resolves
- `chart.line-comparison` resolves
- line comparison renderer fills container width without imposing its own structural width policy

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @por/dashboard-visualization-recharts test`
Expected: FAIL because the registry and renderers do not exist.

- [ ] **Step 3: Implement the renderer package**

Update `packages/dashboard-visualization-recharts/package.json` dependencies to include:

- `react`
- `react-dom`
- `recharts`
- `@por/dashboard-spec`

Implement:

- `createRechartsRendererRegistry()`
- `MetricHeadlineRenderer`
- `TableStandardRenderer`
- `LineComparisonRenderer`

Keep this package focused on rendering:

- no tile chrome
- no page composition
- no Situation Room traceability

- [ ] **Step 4: Run tests to verify they pass**

Run:

- `pnpm --filter @por/dashboard-visualization-recharts test`
- `pnpm --filter @por/dashboard-visualization-recharts typecheck`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/dashboard-visualization-recharts
git commit -m "feat: add recharts dashboard visualization package"
```

## Task 5: Introduce Situation Room binding adapters for the pilot slice

**Files:**

- Create: `apps/situation-room/lib/dashboard-v2/spec-bindings.ts`
- Create: `apps/situation-room/lib/dashboard-v2/spec-data-shapes.ts`
- Create: `apps/situation-room/lib/dashboard-v2/spec-builders.ts`
- Create: `apps/situation-room/__tests__/spec-bindings.test.ts`
- Modify: `apps/situation-room/lib/server/v2/get-dashboard-category-snapshot.ts`
- Modify: `apps/situation-room/lib/server/v2/get-dashboard-tile-trend.ts`
- Modify: `apps/situation-room/lib/dashboard/contracts.ts`

- [ ] **Step 1: Write the failing binding tests**

Create `apps/situation-room/__tests__/spec-bindings.test.ts` covering:

- snapshot query -> standardized table rows
- trend query -> standardized line comparison data
- business-friendly X-axis label sourced from semantic metadata

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @point-of-rental/situation-room exec vitest run __tests__/spec-bindings.test.ts`
Expected: FAIL because the binding registry and standardized shapes do not exist.

- [ ] **Step 3: Implement the app adapter layer**

Create a binding registry that maps stable keys such as:

- `mainMetricsSnapshot`
- `selectedMetricTrend`

to functions that adapt current Situation Room server outputs into standardized shapes used by shared renderers.

Keep traceability separate:

- preserve existing backend trace structures
- attach them in adapter outputs rather than in the shared spec package

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @point-of-rental/situation-room exec vitest run __tests__/spec-bindings.test.ts __tests__/dashboard-v2-server-loaders.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  apps/situation-room/lib/dashboard-v2/spec-bindings.ts \
  apps/situation-room/lib/dashboard-v2/spec-data-shapes.ts \
  apps/situation-room/lib/dashboard-v2/spec-builders.ts \
  apps/situation-room/lib/server/v2/get-dashboard-category-snapshot.ts \
  apps/situation-room/lib/server/v2/get-dashboard-tile-trend.ts \
  apps/situation-room/lib/dashboard/contracts.ts \
  apps/situation-room/__tests__/spec-bindings.test.ts
git commit -m "feat: add situation-room dashboard spec adapters"
```

## Task 6: Migrate the `Main Metrics + selected trend` pilot slice

**Files:**

- Create: `apps/situation-room/lib/dashboard-v2/specs/main-metrics.ts`
- Create: `apps/situation-room/components/dashboard/spec-dashboard-renderer.tsx`
- Modify: `apps/situation-room/components/dashboard/dashboard-shell.tsx`
- Modify: `apps/situation-room/components/dashboard/tile-table.tsx`
- Modify: `apps/situation-room/components/dashboard/trend-panel.tsx`
- Modify: `apps/situation-room/__tests__/dashboard-shell.client.test.tsx`
- Modify: `apps/situation-room/__tests__/tile-table.test.tsx`
- Modify: `apps/situation-room/__tests__/trend-panel.test.tsx`

- [ ] **Step 1: Write the failing migration tests**

Extend existing tests so they assert:

- `Main Metrics` renders as a composite tile driven by shared layout
- the right-side trend area is empty until a metric is selected
- selecting a metric hydrates the trend from the binding registry
- the chart width is owned by the layout container rather than local wrapper hacks

- [ ] **Step 2: Run tests to verify they fail**

Run:

- `pnpm --filter @point-of-rental/situation-room exec vitest run __tests__/dashboard-shell.client.test.tsx`
- `pnpm --filter @point-of-rental/situation-room exec vitest run __tests__/tile-table.test.tsx __tests__/trend-panel.test.tsx`

Expected: FAIL because `Main Metrics` is still implemented through app-local composition.

- [ ] **Step 3: Implement the pilot slice migration**

Create `apps/situation-room/lib/dashboard-v2/specs/main-metrics.ts` defining:

- `main_metrics_table`
- `selected_metric_trend`
- `main_metrics_composite`

Create `spec-dashboard-renderer.tsx` to:

- validate and normalize tile specs
- resolve bindings
- route tiles through shared layout and renderer packages

Refactor `dashboard-shell.tsx` so the `Main Metrics + trend` area uses the new declarative pipeline while preserving:

- current traceability affordances
- current metric selection behavior
- current empty state behavior

- [ ] **Step 4: Run tests to verify they pass**

Run:

- `pnpm --filter @point-of-rental/situation-room exec vitest run __tests__/dashboard-shell.client.test.tsx __tests__/tile-table.test.tsx __tests__/trend-panel.test.tsx __tests__/dashboard-v2-server-loaders.test.ts`
- `pnpm --filter @point-of-rental/situation-room typecheck`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  apps/situation-room/lib/dashboard-v2/specs/main-metrics.ts \
  apps/situation-room/components/dashboard/spec-dashboard-renderer.tsx \
  apps/situation-room/components/dashboard/dashboard-shell.tsx \
  apps/situation-room/components/dashboard/tile-table.tsx \
  apps/situation-room/components/dashboard/trend-panel.tsx \
  apps/situation-room/__tests__/dashboard-shell.client.test.tsx \
  apps/situation-room/__tests__/tile-table.test.tsx \
  apps/situation-room/__tests__/trend-panel.test.tsx
git commit -m "feat: migrate main metrics pilot to dashboard spec"
```

## Task 7: Prove the shared system works end-to-end

**Files:**

- Modify: `apps/situation-room/__tests__/dashboard-v2-page.test.tsx`
- Modify: `apps/situation-room/__tests__/tile-backend-sheet.test.tsx`
- Modify: `docs/superpowers/specs/2026-03-25-v2-dashboard-spec-migration-design.md`
- Modify: `docs/superpowers/plans/2026-03-25-v2-dashboard-spec-migration.md`
- Modify: issue `#59`

- [ ] **Step 1: Add final integration assertions**

Extend end-to-end-facing tests to ensure:

- migrated tiles still show backend trace affordances
- no regressions in page rendering
- pilot slice remains visually and semantically correct

- [ ] **Step 2: Run full targeted verification**

Run:

```bash
pnpm --filter @por/dashboard-spec test
pnpm --filter @por/dashboard-spec typecheck
pnpm --filter @por/dashboard-layout test
pnpm --filter @por/dashboard-layout typecheck
pnpm --filter @por/dashboard-visualization-recharts test
pnpm --filter @por/dashboard-visualization-recharts typecheck
pnpm --filter @point-of-rental/situation-room exec vitest run __tests__/dashboard-spec-packages.test.ts __tests__/spec-bindings.test.ts __tests__/dashboard-shell.client.test.tsx __tests__/tile-table.test.tsx __tests__/trend-panel.test.tsx __tests__/dashboard-v2-server-loaders.test.ts __tests__/dashboard-v2-page.test.tsx __tests__/tile-backend-sheet.test.tsx
pnpm --filter @point-of-rental/situation-room typecheck
rm -rf apps/situation-room/.next && pnpm --filter @point-of-rental/situation-room build
```

Expected: all PASS

- [ ] **Step 3: Update migration status tracking**

Update issue `#59` with:

- completed phases/tasks
- deviations from the plan
- next migration targets after the pilot

- [ ] **Step 4: Commit**

```bash
git add \
  apps/situation-room/__tests__/dashboard-v2-page.test.tsx \
  apps/situation-room/__tests__/tile-backend-sheet.test.tsx \
  docs/superpowers/specs/2026-03-25-v2-dashboard-spec-migration-design.md \
  docs/superpowers/plans/2026-03-25-v2-dashboard-spec-migration.md
git commit -m "test: verify dashboard spec pilot migration"
```

## Notes for execution

- Keep the traceability inspector outside the shared core packages during this first migration.
- Do not move unrelated dashboard sections into the new system until the `Main Metrics + selected trend` pilot is stable.
- Prefer adapting current Situation Room data shapes to the shared contracts rather than rewriting semantic runtime logic.
- If a shared package starts absorbing Situation Room-specific assumptions, stop and move that logic back into the app adapter layer.
