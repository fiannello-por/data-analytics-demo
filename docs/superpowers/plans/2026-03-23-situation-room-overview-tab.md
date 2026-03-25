# Situation Room Overview Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `Overview` tab to the Situation Room dashboard that opens by default, preloads all category snapshots, and presents them as a balanced executive scorecard board without reusing the table-and-trend layout.

**Architecture:** Extend the existing dashboard tab model with a new `Overview` mode keyed internally as `Overview` and rendered as a `LayoutGrid` icon tab. Add a board loader that fetches all five category snapshots for the overview, seed a client-side `snapshotByCategory` cache from that payload, and let category tabs reuse cached snapshots for instant switching while trends continue to load on demand. Render the overview through dedicated scorecard components and keep the existing category tabs as the detailed mode.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Vitest, shadcn/ui, lucide-react

---

## File Structure

### New files

- `apps/situation-room/app/api/dashboard/overview/route.ts`
  GET route for the all-categories overview board payload.
- `apps/situation-room/components/dashboard/overview-tab.tsx`
  Board-level renderer for the new overview mode.
- `apps/situation-room/components/dashboard/category-scorecard.tsx`
  One scorecard per non-total category with sections A/B/C.
- `apps/situation-room/components/dashboard/total-scorecard.tsx`
  Wide executive summary card for `Total`.
- `apps/situation-room/components/dashboard/scorecard-section.tsx`
  Shared section shell for section titles, KPI layout, and support rows.
- `apps/situation-room/components/dashboard/overview-skeleton.tsx`
  Board-shaped loading UI for overview mode.
- `apps/situation-room/lib/dashboard/overview-model.ts`
  Transformer that maps snapshot payloads into overview scorecard sections.
- `apps/situation-room/lib/server/get-dashboard-overview-board.ts`
  Cached server loader that fetches all category snapshots for overview mode.
- `apps/situation-room/__tests__/overview-model.test.ts`
  Verifies section mapping, total-card shaping, and missing-metric omission.
- `apps/situation-room/__tests__/overview-tab.test.tsx`
  Verifies overview rendering, scorecard presence, and trend-panel absence.
- `apps/situation-room/__tests__/overview-route.test.ts`
  Verifies the overview API route and board payload shape.

### Modified files

- `apps/situation-room/components/dashboard/category-tabs.tsx`
  Add the new `Overview` tab to the tab model and render the icon treatment.
- `apps/situation-room/components/dashboard/dashboard-shell.tsx`
  Route overview mode through the shell, seed and reuse category snapshot cache, hide the trend panel, and use overview loading behavior.
- `apps/situation-room/components/dashboard/tile-table.tsx`
  No behavior change expected, but keep types aligned if tab/category unions expand.
- `apps/situation-room/app/page.tsx`
  Load the overview board by default and avoid trend loading when overview is active.
- `apps/situation-room/lib/dashboard/catalog.ts`
  Add the `Overview` tab key and any helpers needed to separate overview mode from category tabs.
- `apps/situation-room/lib/dashboard/contracts.ts`
  Update dashboard state and payload typing for overview mode and category snapshot cache.
- `apps/situation-room/lib/dashboard/query-inputs.ts`
  Parse and serialize overview tab state correctly.
- `apps/situation-room/lib/server/get-dashboard-category-snapshot.ts`
  Keep the existing category snapshot loader as the per-category fallback path.
- `apps/situation-room/__tests__/dashboard-page.test.tsx`
  Verify the new tab is present and the page can render overview mode.
- `apps/situation-room/__tests__/dashboard-shell.client.test.tsx`
  Verify overview is default, tab switching reuses cached category snapshots, and overview loading states behave correctly.

## Task 1: Extend The Dashboard State Model For Overview

**Files:**

- Modify: `apps/situation-room/lib/dashboard/catalog.ts`
- Modify: `apps/situation-room/lib/dashboard/contracts.ts`
- Modify: `apps/situation-room/lib/dashboard/query-inputs.ts`
- Test: `apps/situation-room/__tests__/dashboard-page.test.tsx`
- Test: `apps/situation-room/__tests__/dashboard-shell.client.test.tsx`

- [ ] **Step 1: Write the failing state-model tests**

```ts
import { describe, expect, it } from 'vitest';
import { DASHBOARD_TAB_ORDER, isOverviewTab } from '@/lib/dashboard/catalog';
import { parseDashboardSearchParams } from '@/lib/dashboard/query-inputs';

describe('dashboard tabs', () => {
  it('includes Overview before the category tabs', () => {
    expect(DASHBOARD_TAB_ORDER[0]).toBe('Overview');
  });

  it('treats Overview as a non-category presentation mode', () => {
    expect(isOverviewTab('Overview')).toBe(true);
  });
});

describe('query inputs', () => {
  it('parses Overview as the active dashboard tab', () => {
    const state = parseDashboardSearchParams(
      new URLSearchParams('category=Overview'),
    );

    expect(state.activeCategory).toBe('Overview');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @point-of-rental/situation-room exec vitest run __tests__/dashboard-page.test.tsx __tests__/dashboard-shell.client.test.tsx`

Expected: FAIL with missing `Overview` tab definitions or incorrect active-category typing.

- [ ] **Step 3: Implement the minimal state-model changes**

```ts
// apps/situation-room/lib/dashboard/catalog.ts
export const DASHBOARD_TAB_ORDER = [
  'Overview',
  'New Logo',
  'Expansion',
  'Migration',
  'Renewal',
  'Total',
] as const;

export function isOverviewTab(value: DashboardTab) {
  return value === 'Overview';
}
```

```ts
// apps/situation-room/lib/dashboard/contracts.ts
export type DashboardTab =
  | 'Overview'
  | 'New Logo'
  | 'Expansion'
  | 'Migration'
  | 'Renewal'
  | 'Total';
```

```ts
// apps/situation-room/lib/dashboard/query-inputs.ts
const DEFAULT_ACTIVE_CATEGORY: DashboardTab = 'Overview';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @point-of-rental/situation-room exec vitest run __tests__/dashboard-page.test.tsx __tests__/dashboard-shell.client.test.tsx`

Expected: PASS for the new state-model assertions, with any remaining failures now isolated to unimplemented overview rendering.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/situation-room/lib/dashboard/catalog.ts \
  apps/situation-room/lib/dashboard/contracts.ts \
  apps/situation-room/lib/dashboard/query-inputs.ts \
  apps/situation-room/__tests__/dashboard-page.test.tsx \
  apps/situation-room/__tests__/dashboard-shell.client.test.tsx
git commit -m "feat: add overview dashboard tab model"
```

## Task 2: Add The Overview Board Loader

**Files:**

- Create: `apps/situation-room/lib/server/get-dashboard-overview-board.ts`
- Create: `apps/situation-room/app/api/dashboard/overview/route.ts`
- Modify: `apps/situation-room/app/page.tsx`
- Modify: `apps/situation-room/lib/dashboard/contracts.ts`
- Test: `apps/situation-room/__tests__/overview-route.test.ts`
- Test: `apps/situation-room/__tests__/dashboard-page.test.tsx`

- [ ] **Step 1: Write the failing overview-loader tests**

```ts
import { describe, expect, it } from 'vitest';
import { getDashboardOverviewBoard } from '@/lib/server/get-dashboard-overview-board';

describe('overview board loader', () => {
  it('returns snapshots for all five dashboard categories', async () => {
    const result = await getDashboardOverviewBoard(state, client);

    expect(result.data.snapshots).toHaveLength(5);
    expect(result.data.snapshots.map((snapshot) => snapshot.category)).toEqual([
      'New Logo',
      'Expansion',
      'Migration',
      'Renewal',
      'Total',
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @point-of-rental/situation-room exec vitest run __tests__/overview-route.test.ts __tests__/dashboard-page.test.tsx`

Expected: FAIL with missing loader/route errors.

- [ ] **Step 3: Implement the minimal overview loader and route**

```ts
// apps/situation-room/lib/server/get-dashboard-overview-board.ts
export async function getDashboardOverviewBoard(input: DashboardOverviewState) {
  const snapshots = await Promise.all(
    CATEGORY_ORDER.map((category) =>
      getDashboardCategorySnapshot({ ...input, activeCategory: category }),
    ),
  );

  return {
    data: {
      currentWindowLabel: formatDateRange(input.dateRange),
      previousWindowLabel: formatDateRange(input.previousDateRange),
      snapshots: snapshots.map((entry) => entry.data),
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @point-of-rental/situation-room exec vitest run __tests__/overview-route.test.ts __tests__/dashboard-page.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/situation-room/lib/server/get-dashboard-overview-board.ts \
  apps/situation-room/app/api/dashboard/overview/route.ts \
  apps/situation-room/app/page.tsx \
  apps/situation-room/lib/dashboard/contracts.ts \
  apps/situation-room/__tests__/overview-route.test.ts \
  apps/situation-room/__tests__/dashboard-page.test.tsx
git commit -m "feat: add overview board loader"
```

## Task 3: Build The Overview Data Transformer

**Files:**

- Create: `apps/situation-room/lib/dashboard/overview-model.ts`
- Test: `apps/situation-room/__tests__/overview-model.test.ts`

- [ ] **Step 1: Write the failing transformer tests**

```ts
import { describe, expect, it } from 'vitest';
import { buildOverviewBoard } from '@/lib/dashboard/overview-model';

describe('overview model', () => {
  it('maps non-total categories into sections A, B, and C', () => {
    const board = buildOverviewBoard(fixtures);

    expect(
      board.categoryCards[0].sections.map((section) => section.id),
    ).toEqual(['section-a', 'section-b', 'section-c']);
  });

  it('creates a separate total summary card', () => {
    const board = buildOverviewBoard(fixtures);

    expect(board.totalCard.category).toBe('Total');
    expect(board.totalCard.sections).toHaveLength(2);
  });

  it('omits missing metrics instead of creating fake zeros', () => {
    const board = buildOverviewBoard(fixturesWithoutGateMetrics);

    expect(board.categoryCards[0].sectionC.supportMetrics).not.toContainEqual(
      expect.objectContaining({ label: 'Gate 1 Complete' }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @point-of-rental/situation-room exec vitest run __tests__/overview-model.test.ts`

Expected: FAIL with missing module error for `overview-model.ts`.

- [ ] **Step 3: Implement the minimal overview transformer**

```ts
// apps/situation-room/lib/dashboard/overview-model.ts
export function buildOverviewBoard(
  snapshots: CategorySnapshotPayload[],
): OverviewBoardModel {
  return {
    categoryCards: snapshots
      .filter((snapshot) => snapshot.category !== 'Total')
      .map((snapshot) => buildCategoryScorecard(snapshot)),
    totalCard: buildTotalScorecard(
      snapshots.find((snapshot) => snapshot.category === 'Total'),
    ),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @point-of-rental/situation-room exec vitest run __tests__/overview-model.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/situation-room/lib/dashboard/overview-model.ts \
  apps/situation-room/__tests__/overview-model.test.ts
git commit -m "feat: add overview scorecard transformer"
```

## Task 4: Render The Overview Scorecards

**Files:**

- Create: `apps/situation-room/components/dashboard/scorecard-section.tsx`
- Create: `apps/situation-room/components/dashboard/category-scorecard.tsx`
- Create: `apps/situation-room/components/dashboard/total-scorecard.tsx`
- Create: `apps/situation-room/components/dashboard/overview-tab.tsx`
- Test: `apps/situation-room/__tests__/overview-tab.test.tsx`

- [ ] **Step 1: Write the failing overview rendering test**

```tsx
import { render, screen } from '@testing-library/react';
import { OverviewTab } from '@/components/dashboard/overview-tab';

it('renders four category scorecards plus one wide total card', () => {
  render(<OverviewTab board={boardFixture} />);

  expect(screen.getByText('New Logo')).toBeInTheDocument();
  expect(screen.getByText('Expansion')).toBeInTheDocument();
  expect(screen.getByText('Migration')).toBeInTheDocument();
  expect(screen.getByText('Renewal')).toBeInTheDocument();
  expect(screen.getByText('Total')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @point-of-rental/situation-room exec vitest run __tests__/overview-tab.test.tsx`

Expected: FAIL with missing component errors.

- [ ] **Step 3: Implement the minimal overview components**

```tsx
// apps/situation-room/components/dashboard/overview-tab.tsx
export function OverviewTab({ board }: { board: OverviewBoardModel }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-2">
        {board.categoryCards.map((card) => (
          <CategoryScorecard key={card.category} card={card} />
        ))}
      </div>
      <TotalScorecard card={board.totalCard} />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @point-of-rental/situation-room exec vitest run __tests__/overview-tab.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/situation-room/components/dashboard/scorecard-section.tsx \
  apps/situation-room/components/dashboard/category-scorecard.tsx \
  apps/situation-room/components/dashboard/total-scorecard.tsx \
  apps/situation-room/components/dashboard/overview-tab.tsx \
  apps/situation-room/__tests__/overview-tab.test.tsx
git commit -m "feat: add overview scorecard components"
```

## Task 5: Wire Overview Into The Shell With Snapshot Cache

**Files:**

- Create: `apps/situation-room/components/dashboard/overview-skeleton.tsx`
- Modify: `apps/situation-room/components/dashboard/dashboard-shell.tsx`
- Modify: `apps/situation-room/components/dashboard/category-tabs.tsx`
- Modify: `apps/situation-room/lib/dashboard/query-inputs.ts`
- Test: `apps/situation-room/__tests__/dashboard-shell.client.test.tsx`

- [ ] **Step 1: Write the failing cache-and-loading tests**

```tsx
it('shows overview skeletons instead of table skeletons when the overview tab is loading', async () => {
  render(<DashboardShell {...propsWithOverviewState} />);

  await user.click(screen.getByRole('tab', { name: /overview/i }));

  expect(screen.getByTestId('overview-skeleton')).toBeInTheDocument();
  expect(screen.queryByTestId('tile-table-skeleton')).not.toBeInTheDocument();
});

it('reuses cached category snapshots after overview preload', async () => {
  render(<DashboardShell {...propsWithOverviewBoard} />);

  await user.click(screen.getByRole('tab', { name: /new logo/i }));

  expect(fetchMock).not.toHaveBeenCalledWith(
    expect.stringContaining('/api/dashboard/category/New%20Logo'),
    expect.anything(),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @point-of-rental/situation-room exec vitest run __tests__/dashboard-shell.client.test.tsx`

Expected: FAIL because overview caching and loading behavior do not exist yet.

- [ ] **Step 3: Implement the minimal overview cache flow**

```tsx
// apps/situation-room/components/dashboard/dashboard-shell.tsx
const snapshotByCategory = buildSnapshotCache(
  initialOverviewBoard,
  initialSnapshot,
);

if (isOverviewTab(activeTab)) {
  return isSnapshotLoading ? (
    <OverviewSkeleton />
  ) : (
    <OverviewTab
      board={buildOverviewBoard(Object.values(snapshotByCategory))}
    />
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @point-of-rental/situation-room exec vitest run __tests__/dashboard-shell.client.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/situation-room/components/dashboard/overview-skeleton.tsx \
  apps/situation-room/components/dashboard/dashboard-shell.tsx \
  apps/situation-room/components/dashboard/category-tabs.tsx \
  apps/situation-room/lib/dashboard/query-inputs.ts \
  apps/situation-room/__tests__/dashboard-shell.client.test.tsx
git commit -m "feat: add overview shell caching"
```

## Task 6: Finalize The Tab Integration

**Files:**

- Modify: `apps/situation-room/components/dashboard/dashboard-shell.tsx`
- Modify: `apps/situation-room/__tests__/dashboard-page.test.tsx`
- Modify: `apps/situation-room/__tests__/dashboard-shell.client.test.tsx`

- [ ] **Step 1: Write the failing integration assertions**

```tsx
it('renders the layout-grid overview tab in the dashboard tab strip', () => {
  render(<DashboardPage />);

  expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
});

it('hides the trend panel when the overview tab is active', async () => {
  render(<DashboardShell {...propsWithOverviewState} />);

  expect(screen.queryByText(/weekly trend/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @point-of-rental/situation-room exec vitest run __tests__/dashboard-page.test.tsx __tests__/dashboard-shell.client.test.tsx`

Expected: FAIL because the existing tab strip only knows about category tabs and the shell still assumes trend-panel mode.

- [ ] **Step 3: Implement the minimal tab integration**

```tsx
// apps/situation-room/components/dashboard/category-tabs.tsx
{
  name: <LayoutGridIcon aria-hidden="true" />,
  value: 'Overview',
  ariaLabel: 'Overview',
}
```

```tsx
// apps/situation-room/components/dashboard/dashboard-shell.tsx
const isOverview = state.activeCategory === 'Overview';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @point-of-rental/situation-room exec vitest run __tests__/dashboard-page.test.tsx __tests__/dashboard-shell.client.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/situation-room/components/dashboard/category-tabs.tsx \
  apps/situation-room/components/dashboard/dashboard-shell.tsx \
  apps/situation-room/__tests__/dashboard-page.test.tsx \
  apps/situation-room/__tests__/dashboard-shell.client.test.tsx
git commit -m "feat: finalize overview tab integration"
```

## Task 7: Final Verification And Cleanup

**Files:**

- Modify: `apps/situation-room/components/dashboard/*` (only if polish is needed after tests)

- [ ] **Step 1: Run the focused dashboard test suite**

Run:

```bash
pnpm --filter @point-of-rental/situation-room exec vitest run \
  __tests__/overview-model.test.ts \
  __tests__/overview-route.test.ts \
  __tests__/overview-tab.test.tsx \
  __tests__/dashboard-page.test.tsx \
  __tests__/dashboard-shell.client.test.tsx \
  __tests__/dashboard-filters.client.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run:

```bash
pnpm --dir /Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room typecheck
```

Expected: PASS.

- [ ] **Step 3: Run a production build**

Run:

```bash
pnpm --dir /Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/situation-room docs/superpowers/plans/2026-03-23-situation-room-overview-tab.md
git commit -m "feat: add situation room overview scorecards"
```
