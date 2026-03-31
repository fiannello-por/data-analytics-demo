# Analytics Suite Progressive Snapshot Group Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make active category tabs reveal main-metric rows progressively by query group while keeping fixed skeleton placeholders for unloaded rows.

**Architecture:** Extract the current per-group snapshot execution into a reusable server helper, expose a new category-group route, and change the client shell to fetch active category groups sequentially into a partial snapshot state. Keep hidden-tab warmup on the existing full-category route and gate it on snapshot completeness instead of simple cache presence.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Vercel Node runtime, Lightdash compile + BigQuery execution.

---

### Task 1: Add Red Tests For Progressive Snapshot Helpers

**Files:**
- Create: `apps/analytics-suite/__tests__/dashboard-progressive-snapshot.test.ts`
- Create: `apps/analytics-suite/__tests__/tile-table-display-rows.test.ts`
- Modify: `apps/analytics-suite/components/dashboard/tile-table.tsx`
- Modify: `apps/analytics-suite/components/dashboard/dashboard-shell.tsx`

- [ ] **Step 1: Write the failing helper tests**

Create `apps/analytics-suite/__tests__/dashboard-progressive-snapshot.test.ts`
covering pure helper behavior:

- progressive group manifests return a stable ordered list for a category
- partial snapshots merge rows and tile timings by tile id without duplication
- incomplete snapshots are not treated as fully cached
- complete snapshots are detected only when every category tile has a row

Create `apps/analytics-suite/__tests__/tile-table-display-rows.test.ts`
covering a pure helper exported from `tile-table.tsx`:

- unloaded rows remain present as skeleton entries
- loaded rows stay in catalog order
- mixed loaded/unloaded rows do not reorder the table

- [ ] **Step 2: Run the new tests to verify they fail**

Run:

```bash
pnpm --filter @point-of-rental/analytics-suite exec vitest run __tests__/dashboard-progressive-snapshot.test.ts __tests__/tile-table-display-rows.test.ts
```

Expected: FAIL because the progressive helpers do not exist yet.

- [ ] **Step 3: Implement the minimal helper exports**

Modify:

- `apps/analytics-suite/components/dashboard/dashboard-shell.tsx`
- `apps/analytics-suite/components/dashboard/tile-table.tsx`

to add only the pure helper functions needed for the tests, without wiring the
runtime behavior yet.

- [ ] **Step 4: Re-run the tests to verify they pass**

Run:

```bash
pnpm --filter @point-of-rental/analytics-suite exec vitest run __tests__/dashboard-progressive-snapshot.test.ts __tests__/tile-table-display-rows.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/analytics-suite/__tests__/dashboard-progressive-snapshot.test.ts apps/analytics-suite/__tests__/tile-table-display-rows.test.ts apps/analytics-suite/components/dashboard/tile-table.tsx apps/analytics-suite/components/dashboard/dashboard-shell.tsx
git commit -m "test: add progressive snapshot helper coverage"
```

### Task 2: Extract Per-Group Snapshot Loading On The Server

**Files:**
- Modify: `apps/analytics-suite/lib/dashboard/contracts.ts`
- Modify: `apps/analytics-suite/lib/dashboard-v2/semantic-registry.ts`
- Modify: `apps/analytics-suite/lib/server/v2/get-dashboard-category-snapshot.ts`
- Create: `apps/analytics-suite/app/api/dashboard-v2/category/[category]/groups/[groupId]/route.ts`
- Modify: `apps/analytics-suite/__tests__/dashboard-v2-routes.test.ts`

- [ ] **Step 1: Write the failing route/loader tests**

Update `apps/analytics-suite/__tests__/dashboard-v2-routes.test.ts` so the new
group route is exercised for:

- valid category + group id
- invalid group id -> `400`
- successful group payload includes rows and tile timings

- [ ] **Step 2: Run the route test to verify it fails**

Run:

```bash
pnpm --filter @point-of-rental/analytics-suite exec vitest run __tests__/dashboard-v2-routes.test.ts
```

Expected: FAIL because the new route and group payload contract do not exist.

- [ ] **Step 3: Implement the server extraction and new route**

Modify `apps/analytics-suite/lib/server/v2/get-dashboard-category-snapshot.ts`
to extract one-group execution into a reusable helper.

Modify `apps/analytics-suite/lib/dashboard-v2/semantic-registry.ts` to expose a
stable client/server-safe group manifest with:

- `groupId`
- `tileIds`
- current manifest order

Add the new group route:

- `apps/analytics-suite/app/api/dashboard-v2/category/[category]/groups/[groupId]/route.ts`

Extend `apps/analytics-suite/lib/dashboard/contracts.ts` with a group payload
type.

Ensure the existing full category snapshot loader still works unchanged for
overview and hidden-tab warmup.

- [ ] **Step 4: Re-run the route test to verify it passes**

Run:

```bash
pnpm --filter @point-of-rental/analytics-suite exec vitest run __tests__/dashboard-v2-routes.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/analytics-suite/lib/dashboard/contracts.ts apps/analytics-suite/lib/dashboard-v2/semantic-registry.ts apps/analytics-suite/lib/server/v2/get-dashboard-category-snapshot.ts apps/analytics-suite/app/api/dashboard-v2/category/[category]/groups/[groupId]/route.ts apps/analytics-suite/__tests__/dashboard-v2-routes.test.ts
git commit -m "feat: add progressive category snapshot group route"
```

### Task 3: Wire Progressive Group Loading Into The Active Tab

**Files:**
- Modify: `apps/analytics-suite/components/dashboard/dashboard-shell.tsx`
- Modify: `apps/analytics-suite/components/dashboard/tile-table.tsx`
- Modify: `apps/analytics-suite/__tests__/dashboard-warmup-queue.test.ts`
- Modify: `apps/analytics-suite/__tests__/dashboard-shell-bootstrap.test.ts`

- [ ] **Step 1: Write the failing runtime-logic tests**

Update the existing shell helper tests so they assert:

- incomplete active category snapshots do not count as warm
- background warmup does not start until the active category snapshot is
  complete
- complete hidden-tab snapshots still count as warm

Use pure helpers rather than React effect tests.

- [ ] **Step 2: Run the helper tests to verify they fail**

Run:

```bash
pnpm --filter @point-of-rental/analytics-suite exec vitest run __tests__/dashboard-warmup-queue.test.ts __tests__/dashboard-shell-bootstrap.test.ts __tests__/dashboard-progressive-snapshot.test.ts __tests__/tile-table-display-rows.test.ts
```

Expected: FAIL because the shell still treats any category snapshot presence as
fully loaded.

- [ ] **Step 3: Implement the progressive foreground load**

Modify `apps/analytics-suite/components/dashboard/dashboard-shell.tsx` to:

- initialize an empty partial snapshot for foreground category loads
- fetch active category groups sequentially through the new route
- merge each group into the active category snapshot as it arrives
- keep `isSnapshotLoading` true until all groups finish
- invalidate partial snapshots on category/filter/date foreground refreshes
- require snapshot completeness before hidden-tab warmup can resume

Modify `apps/analytics-suite/components/dashboard/tile-table.tsx` to:

- render row labels from the full category catalog
- render skeleton value cells for unloaded rows
- keep loaded rows in their fixed positions

- [ ] **Step 4: Re-run the helper tests to verify they pass**

Run:

```bash
pnpm --filter @point-of-rental/analytics-suite exec vitest run __tests__/dashboard-warmup-queue.test.ts __tests__/dashboard-shell-bootstrap.test.ts __tests__/dashboard-progressive-snapshot.test.ts __tests__/tile-table-display-rows.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/analytics-suite/components/dashboard/dashboard-shell.tsx apps/analytics-suite/components/dashboard/tile-table.tsx apps/analytics-suite/__tests__/dashboard-warmup-queue.test.ts apps/analytics-suite/__tests__/dashboard-shell-bootstrap.test.ts
git commit -m "perf: stream active tab metrics by snapshot group"
```

### Task 4: Full Verification

**Files:**
- No new files

- [ ] **Step 1: Run the relevant verification set**

Run:

```bash
pnpm format:check
pnpm --filter @point-of-rental/analytics-suite exec vitest run __tests__/dashboard-progressive-snapshot.test.ts __tests__/tile-table-display-rows.test.ts __tests__/dashboard-warmup-queue.test.ts __tests__/dashboard-shell-bootstrap.test.ts __tests__/dashboard-refresh-structure.test.ts __tests__/dashboard-v2-routes.test.ts __tests__/sales-performance-dashboard-page.test.tsx
pnpm --filter @point-of-rental/analytics-suite build
```

Expected:

- formatting check PASS
- targeted Vitest suite PASS
- analytics-suite build PASS

- [ ] **Step 2: Commit any verification-driven fixes**

If verification required no code changes, skip this commit.
