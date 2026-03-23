# Sales Dashboard Architecture Explainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate interactive architecture explainer app for the `Sales Performance Dashboard`, with a graph-first UI, per-node inspector, timing waterfall, comments with Google-authored identity, and a launch point from the dashboard side panel.

**Architecture:** Create a new Next.js app under `apps/` that loads an explicit architecture manifest plus a separate timing-report artifact, renders the system with `React Flow`, and exposes a right-side inspector for selected nodes. Keep the dashboard itself unchanged except for a shadcn metadata side panel that links to the new app. Use `Auth.js` with Google and Firestore-backed node comments so the explanatory surface stays objective while allowing collaborative annotations.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, shadcn/ui, Tailwind CSS v4, React Flow, Auth.js (`next-auth`), Google OAuth, Firestore, Vitest

---

## File Structure

### New app

- `apps/architecture-explainer/package.json`
  New standalone Next.js app package.
- `apps/architecture-explainer/components.json`
  shadcn project configuration for the new app.
- `apps/architecture-explainer/app/layout.tsx`
  Global layout, theme, and session providers.
- `apps/architecture-explainer/app/page.tsx`
  Main architecture explainer screen.
- `apps/architecture-explainer/app/global.css`
  App-local shadcn tokens and styles.
- `apps/architecture-explainer/app/api/comments/route.ts`
  Comments read/create API.
- `apps/architecture-explainer/app/api/auth/[...nextauth]/route.ts`
  Google OAuth auth route.
- `apps/architecture-explainer/lib/env.server.ts`
  Env parsing for Google OAuth and Firestore.
- `apps/architecture-explainer/lib/auth.ts`
  Auth.js configuration.
- `apps/architecture-explainer/lib/architecture/contracts.ts`
  Types for nodes, edges, reports, and comments.
- `apps/architecture-explainer/lib/architecture/manifest.ts`
  Explicit graph definition for the current dashboard architecture.
- `apps/architecture-explainer/lib/architecture/report.ts`
  Report loader and normalization for timing artifacts.
- `apps/architecture-explainer/lib/architecture/selectors.ts`
  Helpers for pipeline filtering, neighborhood focus, and inspector state.
- `apps/architecture-explainer/lib/comments/firestore.ts`
  Firestore comment storage adapter.
- `apps/architecture-explainer/components/architecture/graph-canvas.tsx`
  React Flow wrapper and graph controls.
- `apps/architecture-explainer/components/architecture/graph-node.tsx`
  Custom node rendering for different component kinds.
- `apps/architecture-explainer/components/architecture/inspector.tsx`
  Right-side node inspector shell.
- `apps/architecture-explainer/components/architecture/timing-waterfall.tsx`
  Mini waterfall UI for node timing.
- `apps/architecture-explainer/components/architecture/comments-panel.tsx`
  Comment list and add-comment form.
- `apps/architecture-explainer/components/architecture/pipeline-filter-bar.tsx`
  Quick graph filter controls.
- `apps/architecture-explainer/components/architecture/full-graph-empty.tsx`
  Empty/fallback state for missing node selections.
- `apps/architecture-explainer/components/providers.tsx`
  Theme + session providers.
- `apps/architecture-explainer/__tests__/manifest.test.ts`
  Validates graph manifest integrity.
- `apps/architecture-explainer/__tests__/selectors.test.ts`
  Validates filtering and focus-neighborhood behavior.
- `apps/architecture-explainer/__tests__/page.test.tsx`
  Verifies the graph-first screen renders.
- `apps/architecture-explainer/__tests__/comments-route.test.ts`
  Verifies comments API and auth gating.

### Existing dashboard integration

- `apps/situation-room/components/dashboard/dashboard-shell.tsx`
  Add the side-panel entry point to the architecture app.
- `apps/situation-room/components/ui/sheet.tsx`
  Add if missing for the dashboard metadata side panel.
- `apps/situation-room/__tests__/dashboard-page.test.tsx`
  Verify the dashboard exposes the architecture-app entry action.
- `apps/situation-room/package.json`
  Add `sheet` component dependency only if needed by shadcn CLI output.

### Shared/report bridge

- `apps/situation-room/lib/server/architecture-probes.ts`
  Reuse or extend current probe outputs to seed report artifacts.
- `apps/situation-room/lib/analytics-lab.ts`
  Wire the new report id naming if needed for the explainer.
- `docs/superpowers/specs/2026-03-23-sales-dashboard-architecture-explainer-design.md`
  Reference-only spec, no edits expected unless implementation reveals a gap.

## Task 1: Scaffold The New Explainer App

**Files:**
- Create: `apps/architecture-explainer/package.json`
- Create: `apps/architecture-explainer/components.json`
- Create: `apps/architecture-explainer/app/layout.tsx`
- Create: `apps/architecture-explainer/app/page.tsx`
- Create: `apps/architecture-explainer/app/global.css`
- Create: `apps/architecture-explainer/components/providers.tsx`
- Modify: `package.json`
- Test: `apps/architecture-explainer/__tests__/page.test.tsx`

- [ ] **Step 1: Write the failing page smoke test**

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

describe('architecture explainer page', () => {
  it('renders the graph-first shell for Sales Performance Dashboard', async () => {
    const { default: Page } = await import('@/app/page');
    const html = renderToStaticMarkup(await Page());

    expect(html).toContain('Sales Performance Dashboard');
    expect(html).toContain('Architecture Explainer');
    expect(html).toContain('All');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @point-of-rental/architecture-explainer exec vitest run __tests__/page.test.tsx`

Expected: FAIL with missing app/package/files.

- [ ] **Step 3: Create the app shell with matching shadcn setup**

```json
// apps/architecture-explainer/package.json
{
  "name": "@point-of-rental/architecture-explainer",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3200",
    "build": "next build",
    "start": "next start --port 3200",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

```json
// apps/architecture-explainer/components.json
{
  "style": "base-nova",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "css": "app/global.css",
    "baseColor": "mist"
  }
}
```

- [ ] **Step 4: Run the smoke test to verify it passes**

Run: `pnpm --filter @point-of-rental/architecture-explainer exec vitest run __tests__/page.test.tsx`

Expected: PASS with a minimal page shell.

- [ ] **Step 5: Commit**

```bash
git add \
  package.json \
  apps/architecture-explainer/package.json \
  apps/architecture-explainer/components.json \
  apps/architecture-explainer/app/layout.tsx \
  apps/architecture-explainer/app/page.tsx \
  apps/architecture-explainer/app/global.css \
  apps/architecture-explainer/components/providers.tsx \
  apps/architecture-explainer/__tests__/page.test.tsx
git commit -m "feat: scaffold architecture explainer app"
```

## Task 2: Define The Explicit Architecture Model

**Files:**
- Create: `apps/architecture-explainer/lib/architecture/contracts.ts`
- Create: `apps/architecture-explainer/lib/architecture/manifest.ts`
- Create: `apps/architecture-explainer/lib/architecture/report.ts`
- Create: `apps/architecture-explainer/__tests__/manifest.test.ts`
- Modify: `apps/situation-room/lib/server/architecture-probes.ts`

- [ ] **Step 1: Write the failing manifest integrity tests**

```ts
import { describe, expect, it } from 'vitest';
import { architectureManifest } from '@/lib/architecture/manifest';

describe('architecture manifest', () => {
  it('contains unique node ids', () => {
    const ids = architectureManifest.nodes.map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ensures all edges reference existing nodes', () => {
    const ids = new Set(architectureManifest.nodes.map((node) => node.id));
    for (const edge of architectureManifest.edges) {
      expect(ids.has(edge.from)).toBe(true);
      expect(ids.has(edge.to)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @point-of-rental/architecture-explainer exec vitest run __tests__/manifest.test.ts`

Expected: FAIL with missing contracts or manifest.

- [ ] **Step 3: Implement the contracts, first manifest, and report loader**

```ts
// apps/architecture-explainer/lib/architecture/contracts.ts
export type ArchitectureNodeKind =
  | 'ui'
  | 'client-state'
  | 'request-builder'
  | 'api-route'
  | 'server-loader'
  | 'sql-builder'
  | 'bigquery'
  | 'transformer'
  | 'render-target';
```

```ts
// apps/architecture-explainer/lib/architecture/manifest.ts
export const architectureManifest = {
  systemId: 'sales-performance-dashboard',
  nodes: [
    { id: 'dashboard-shell', kind: 'ui', title: 'DashboardShell', pipeline: 'snapshot' },
    { id: 'category-route', kind: 'api-route', title: '/api/dashboard/category/[category]', pipeline: 'snapshot' },
    { id: 'get-dashboard-category-snapshot', kind: 'server-loader', title: 'getDashboardCategorySnapshot', pipeline: 'snapshot' },
    { id: 'build-category-snapshot-query', kind: 'sql-builder', title: 'buildCategorySnapshotQuery', pipeline: 'snapshot' },
    { id: 'bigquery', kind: 'bigquery', title: 'BigQuery', pipeline: 'snapshot' }
  ],
  edges: [
    { from: 'dashboard-shell', to: 'category-route', type: 'trigger', label: 'refresh' },
    { from: 'category-route', to: 'get-dashboard-category-snapshot', type: 'trigger', label: 'load' },
    { from: 'get-dashboard-category-snapshot', to: 'build-category-snapshot-query', type: 'data', label: 'query input' },
    { from: 'build-category-snapshot-query', to: 'bigquery', type: 'data', label: 'sql' }
  ]
} as const;
```

- [ ] **Step 4: Run manifest tests to verify they pass**

Run: `pnpm --filter @point-of-rental/architecture-explainer exec vitest run __tests__/manifest.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/architecture-explainer/lib/architecture/contracts.ts \
  apps/architecture-explainer/lib/architecture/manifest.ts \
  apps/architecture-explainer/lib/architecture/report.ts \
  apps/architecture-explainer/__tests__/manifest.test.ts \
  apps/situation-room/lib/server/architecture-probes.ts
git commit -m "feat: add architecture manifest and report model"
```

## Task 3: Build Graph Filtering And Neighborhood Focus

**Files:**
- Create: `apps/architecture-explainer/lib/architecture/selectors.ts`
- Create: `apps/architecture-explainer/__tests__/selectors.test.ts`

- [ ] **Step 1: Write the failing selector tests**

```ts
import { describe, expect, it } from 'vitest';
import { getFocusedNeighborhood, getVisibleNodesForPipeline } from '@/lib/architecture/selectors';
import { architectureManifest } from '@/lib/architecture/manifest';

describe('architecture selectors', () => {
  it('filters to one pipeline without leaking unrelated nodes', () => {
    const nodes = getVisibleNodesForPipeline(architectureManifest, 'trend');
    expect(nodes.every((node) => node.pipeline === 'trend')).toBe(true);
  });

  it('returns direct dependencies and consumers for a focused node', () => {
    const result = getFocusedNeighborhood(architectureManifest, 'get-dashboard-category-snapshot');
    expect(result.nodeIds).toContain('category-route');
    expect(result.nodeIds).toContain('build-category-snapshot-query');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @point-of-rental/architecture-explainer exec vitest run __tests__/selectors.test.ts`

Expected: FAIL with missing selector helpers.

- [ ] **Step 3: Implement the selectors**

```ts
// apps/architecture-explainer/lib/architecture/selectors.ts
export function getVisibleNodesForPipeline(manifest, pipeline) {
  if (pipeline === 'All') return manifest.nodes;
  return manifest.nodes.filter((node) => node.pipeline === pipeline);
}

export function getFocusedNeighborhood(manifest, nodeId) {
  const direct = manifest.edges.filter(
    (edge) => edge.from === nodeId || edge.to === nodeId,
  );

  return {
    nodeIds: Array.from(
      new Set([nodeId, ...direct.flatMap((edge) => [edge.from, edge.to])]),
    ),
    edges: direct,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @point-of-rental/architecture-explainer exec vitest run __tests__/selectors.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/architecture-explainer/lib/architecture/selectors.ts \
  apps/architecture-explainer/__tests__/selectors.test.ts
git commit -m "feat: add graph filtering and focus selectors"
```

## Task 4: Build The Graph-First UI With React Flow

**Files:**
- Create: `apps/architecture-explainer/components/architecture/graph-canvas.tsx`
- Create: `apps/architecture-explainer/components/architecture/graph-node.tsx`
- Create: `apps/architecture-explainer/components/architecture/pipeline-filter-bar.tsx`
- Modify: `apps/architecture-explainer/app/page.tsx`
- Test: `apps/architecture-explainer/__tests__/page.test.tsx`

- [ ] **Step 1: Expand the page test to require graph controls**

```tsx
expect(html).toContain('Focus connections');
expect(html).toContain('Back to full graph');
expect(html).toContain('Overview');
expect(html).toContain('Snapshot');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @point-of-rental/architecture-explainer exec vitest run __tests__/page.test.tsx`

Expected: FAIL because the shell still lacks graph controls and node rendering.

- [ ] **Step 3: Implement the React Flow canvas and filter bar**

```tsx
// apps/architecture-explainer/components/architecture/graph-canvas.tsx
export function GraphCanvas({ nodes, edges, selectedNodeId, onSelectNode }) {
  return (
    <ReactFlow nodes={nodes} edges={edges} fitView>
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}
```

- [ ] **Step 4: Run the page test to verify it passes**

Run: `pnpm --filter @point-of-rental/architecture-explainer exec vitest run __tests__/page.test.tsx`

Expected: PASS with the graph shell visible.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/architecture-explainer/components/architecture/graph-canvas.tsx \
  apps/architecture-explainer/components/architecture/graph-node.tsx \
  apps/architecture-explainer/components/architecture/pipeline-filter-bar.tsx \
  apps/architecture-explainer/app/page.tsx \
  apps/architecture-explainer/__tests__/page.test.tsx
git commit -m "feat: add architecture graph canvas"
```

## Task 5: Build The Inspector, Timing Waterfall, And Read Path For Comments

**Files:**
- Create: `apps/architecture-explainer/components/architecture/inspector.tsx`
- Create: `apps/architecture-explainer/components/architecture/timing-waterfall.tsx`
- Create: `apps/architecture-explainer/components/architecture/comments-panel.tsx`
- Create: `apps/architecture-explainer/components/architecture/full-graph-empty.tsx`
- Modify: `apps/architecture-explainer/app/page.tsx`
- Test: `apps/architecture-explainer/__tests__/page.test.tsx`

- [ ] **Step 1: Expand the page test to require inspector sections**

```tsx
expect(html).toContain('What this does');
expect(html).toContain('Inputs / Outputs');
expect(html).toContain('Code references');
expect(html).toContain('Timing');
expect(html).toContain('Comments');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @point-of-rental/architecture-explainer exec vitest run __tests__/page.test.tsx`

Expected: FAIL because the inspector is not fully rendered.

- [ ] **Step 3: Implement the inspector and mini waterfall**

```tsx
// apps/architecture-explainer/components/architecture/timing-waterfall.tsx
export function TimingWaterfall({ breakdown }) {
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-muted">
      {breakdown.map((segment) => (
        <div
          key={segment.label}
          style={{ width: `${segment.percent}%` }}
          className={segment.className}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @point-of-rental/architecture-explainer exec vitest run __tests__/page.test.tsx`

Expected: PASS with inspector sections visible.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/architecture-explainer/components/architecture/inspector.tsx \
  apps/architecture-explainer/components/architecture/timing-waterfall.tsx \
  apps/architecture-explainer/components/architecture/comments-panel.tsx \
  apps/architecture-explainer/components/architecture/full-graph-empty.tsx \
  apps/architecture-explainer/app/page.tsx \
  apps/architecture-explainer/__tests__/page.test.tsx
git commit -m "feat: add architecture inspector and timing waterfall"
```

## Task 6: Add Google Auth And Firestore-Backed Comments

**Files:**
- Create: `apps/architecture-explainer/lib/env.server.ts`
- Create: `apps/architecture-explainer/lib/auth.ts`
- Create: `apps/architecture-explainer/lib/comments/firestore.ts`
- Create: `apps/architecture-explainer/app/api/auth/[...nextauth]/route.ts`
- Create: `apps/architecture-explainer/app/api/comments/route.ts`
- Modify: `apps/architecture-explainer/components/providers.tsx`
- Modify: `apps/architecture-explainer/components/architecture/comments-panel.tsx`
- Test: `apps/architecture-explainer/__tests__/comments-route.test.ts`

- [ ] **Step 1: Write the failing comments-route tests**

```ts
import { describe, expect, it } from 'vitest';

describe('comments route', () => {
  it('rejects comment creation when the user is unauthenticated', async () => {
    const response = await POST(new Request('http://localhost/api/comments', { method: 'POST' }));
    expect(response.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @point-of-rental/architecture-explainer exec vitest run __tests__/comments-route.test.ts`

Expected: FAIL with missing auth/comment route files.

- [ ] **Step 3: Implement Auth.js with Google and Firestore comment storage**

```ts
// apps/architecture-explainer/lib/auth.ts
export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  ],
};
```

```ts
// apps/architecture-explainer/app/api/comments/route.ts
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const comment = await createNodeComment({
    nodeId: body.nodeId,
    body: body.body,
    author: session.user.email,
  });

  return Response.json({ data: comment });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @point-of-rental/architecture-explainer exec vitest run __tests__/comments-route.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/architecture-explainer/lib/env.server.ts \
  apps/architecture-explainer/lib/auth.ts \
  apps/architecture-explainer/lib/comments/firestore.ts \
  apps/architecture-explainer/app/api/auth/[...nextauth]/route.ts \
  apps/architecture-explainer/app/api/comments/route.ts \
  apps/architecture-explainer/components/providers.tsx \
  apps/architecture-explainer/components/architecture/comments-panel.tsx \
  apps/architecture-explainer/__tests__/comments-route.test.ts
git commit -m "feat: add authenticated node comments"
```

## Task 7: Connect Timing Reports To Existing Situation Room Probes

**Files:**
- Modify: `apps/situation-room/lib/server/architecture-probes.ts`
- Modify: `apps/situation-room/lib/analytics-lab.ts`
- Modify: `apps/architecture-explainer/lib/architecture/report.ts`
- Test: `apps/situation-room/__tests__/architecture-probes.test.ts`
- Test: `apps/architecture-explainer/__tests__/manifest.test.ts`

- [ ] **Step 1: Write the failing probe/report mapping test**

```ts
import { describe, expect, it } from 'vitest';
import { buildArchitectureReport } from '@/lib/architecture/report';

describe('architecture report', () => {
  it('maps current probe outputs to architecture node timings', () => {
    const report = buildArchitectureReport(sampleProbeRun);
    expect(report.nodes.some((node) => node.nodeId === 'get-dashboard-category-snapshot')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @point-of-rental/situation-room exec vitest run __tests__/architecture-probes.test.ts`

Expected: FAIL because the probe output is not yet shaped for the explainer.

- [ ] **Step 3: Extend probe outputs and report normalization minimally**

```ts
// apps/situation-room/lib/server/architecture-probes.ts
export type ArchitectureProbeTiming = {
  nodeId: string;
  durationMs: number;
  breakdown: Array<{ label: string; durationMs: number }>;
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @point-of-rental/situation-room exec vitest run __tests__/architecture-probes.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/situation-room/lib/server/architecture-probes.ts \
  apps/situation-room/lib/analytics-lab.ts \
  apps/architecture-explainer/lib/architecture/report.ts \
  apps/situation-room/__tests__/architecture-probes.test.ts \
  apps/architecture-explainer/__tests__/manifest.test.ts
git commit -m "feat: connect explainer to architecture probe timings"
```

## Task 8: Add The Dashboard Metadata Side Panel And App Link

**Files:**
- Modify: `apps/situation-room/components/dashboard/dashboard-shell.tsx`
- Create or Modify: `apps/situation-room/components/ui/sheet.tsx`
- Modify: `apps/situation-room/__tests__/dashboard-page.test.tsx`

- [ ] **Step 1: Write the failing dashboard integration test**

```tsx
expect(html).toContain('Architecture');
expect(html).toContain('/architecture-explainer');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @point-of-rental/situation-room exec vitest run __tests__/dashboard-page.test.tsx`

Expected: FAIL because the side panel entry action does not exist yet.

- [ ] **Step 3: Implement the dashboard metadata side panel with the link**

```tsx
<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline">Tools</Button>
  </SheetTrigger>
  <SheetContent>
    <Button asChild>
      <Link href="http://localhost:3200">Architecture</Link>
    </Button>
  </SheetContent>
</Sheet>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @point-of-rental/situation-room exec vitest run __tests__/dashboard-page.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/situation-room/components/dashboard/dashboard-shell.tsx \
  apps/situation-room/components/ui/sheet.tsx \
  apps/situation-room/__tests__/dashboard-page.test.tsx
git commit -m "feat: add architecture app entry from dashboard"
```

## Task 9: Final Verification And Developer Ergonomics

**Files:**
- Modify: `package.json`
- Modify: `apps/architecture-explainer/package.json`
- Test: `apps/architecture-explainer/__tests__/page.test.tsx`
- Test: `apps/architecture-explainer/__tests__/manifest.test.ts`
- Test: `apps/architecture-explainer/__tests__/comments-route.test.ts`
- Test: `apps/situation-room/__tests__/dashboard-page.test.tsx`

- [ ] **Step 1: Add root scripts for the new app**

```json
"arch:dev": "pnpm --filter @point-of-rental/architecture-explainer dev",
"arch:build": "pnpm --filter @point-of-rental/architecture-explainer build"
```

- [ ] **Step 2: Run the focused test suites**

Run: `pnpm --filter @point-of-rental/architecture-explainer exec vitest run __tests__/page.test.tsx __tests__/manifest.test.ts __tests__/selectors.test.ts __tests__/comments-route.test.ts`

Expected: PASS.

- [ ] **Step 3: Run the dashboard integration test**

Run: `pnpm --filter @point-of-rental/situation-room exec vitest run __tests__/dashboard-page.test.tsx`

Expected: PASS.

- [ ] **Step 4: Run app typechecks**

Run: `pnpm --dir apps/architecture-explainer typecheck && pnpm --dir apps/situation-room typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add \
  package.json \
  apps/architecture-explainer/package.json \
  apps/architecture-explainer/__tests__/page.test.tsx \
  apps/architecture-explainer/__tests__/manifest.test.ts \
  apps/architecture-explainer/__tests__/selectors.test.ts \
  apps/architecture-explainer/__tests__/comments-route.test.ts \
  apps/situation-room/__tests__/dashboard-page.test.tsx
git commit -m "chore: wire architecture explainer scripts and verification"
```

## Assumptions To Validate During Implementation

- Use `apps/architecture-explainer` as the new app path.
- Use `Auth.js` with Google as the auth layer.
- Use Firestore for comment persistence because the repo has no reusable auth or
  comment storage today.
- Reuse `apps/situation-room/lib/server/architecture-probes.ts` as the first
  source of timing data instead of inventing a second timing pipeline.
- Keep the architecture app scoped to one documented system in v1.
