# Situation Room Tile Dashboard V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first Situation Room executive dashboard as a tabbed tile-table experience backed by direct BigQuery reads from the existing Opportunity-based table, while preserving the Analytics Lab as the benchmarking surface.

**Architecture:** Move the current Analytics Lab to a dedicated `/lab` route and make the root page the new dashboard. The dashboard uses a curated tile catalog, one server-side snapshot fan-out per active category, one server-side trend query for the selected tile, global filter dictionaries, and the same direct BigQuery backend that the lab can benchmark.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Vitest, shadcn/ui, `@google-cloud/bigquery`, Chart.js via `react-chartjs-2`

---

## File Structure

### New files

- `apps/situation-room/app/lab/page.tsx`
  Dedicated route for the existing Analytics Lab.
- `apps/situation-room/app/api/dashboard/category/[category]/route.ts`
  GET route for the all-at-once category snapshot payload.
- `apps/situation-room/app/api/dashboard/trend/[tileId]/route.ts`
  GET route for the selected-tile weekly trend payload.
- `apps/situation-room/app/api/dashboard/filter-dictionaries/[key]/route.ts`
  GET route for the dashboard’s global filter dictionaries.
- `apps/situation-room/components/dashboard/dashboard-shell.tsx`
  Top-level client/server composition for the dashboard page.
- `apps/situation-room/components/dashboard/dashboard-filters.tsx`
  Global filter bar with custom date-range picker and multi-select filters.
- `apps/situation-room/components/dashboard/category-tabs.tsx`
  Tab shell for the five fixed categories.
- `apps/situation-room/components/dashboard/tile-table.tsx`
  Table that renders the active category’s tile rows.
- `apps/situation-room/components/dashboard/trend-panel.tsx`
  Right-side weekly comparison chart and selected-tile metadata.
- `apps/situation-room/components/dashboard/loading-state.tsx`
  Shared skeleton and empty/error states for dashboard sections.
- `apps/situation-room/lib/dashboard/catalog.ts`
  Curated category list, tile IDs, labels, sort order, and format types from the approved spec.
- `apps/situation-room/lib/dashboard/date-range.ts`
  Current-year default logic, same-period-previous-year derivation, and weekly bucket helpers.
- `apps/situation-room/lib/dashboard/filter-config.ts`
  Global filter definitions and allowlisted filter keys.
- `apps/situation-room/lib/dashboard/contracts.ts`
  Type-safe request/response shapes for category snapshots, tile trends, and dictionaries.
- `apps/situation-room/lib/dashboard/query-inputs.ts`
  URL/request parsing, normalization, and cache-key helpers for dashboard state.
- `apps/situation-room/lib/bigquery/dashboard-sql.ts`
  SQL builders for tile snapshots, category snapshot fan-out orchestration, trend queries, and dictionaries.
- `apps/situation-room/lib/server/get-dashboard-category-snapshot.ts`
  Cached server loader for the active category snapshot.
- `apps/situation-room/lib/server/get-dashboard-tile-trend.ts`
  Cached server loader for the selected-tile trend.
- `apps/situation-room/lib/server/get-dashboard-filter-dictionary.ts`
  Cached server loader for global dictionaries.
- `apps/situation-room/__tests__/dashboard-catalog.test.ts`
  Validates the tile catalog against the approved spec.
- `apps/situation-room/__tests__/dashboard-date-range.test.ts`
  Validates default current-year range and prior-year derivation.
- `apps/situation-room/__tests__/dashboard-query-inputs.test.ts`
  Validates normalized dashboard state parsing and cache keys.
- `apps/situation-room/__tests__/dashboard-sql.test.ts`
  Verifies SQL builders for snapshots, trends, and dictionaries.
- `apps/situation-room/__tests__/dashboard-server-loaders.test.ts`
  Verifies fan-out orchestration, selected-tile defaults, and caching behavior.
- `apps/situation-room/__tests__/dashboard-routes.test.ts`
  Verifies the new dashboard API routes.
- `apps/situation-room/__tests__/dashboard-page.test.tsx`
  Verifies page composition, tab behavior, and data flow.
- `apps/situation-room/__tests__/lab-page.test.tsx`
  Verifies that the Analytics Lab remains reachable at `/lab`.

### Modified files

- `apps/situation-room/app/page.tsx`
  Replace the root Analytics Lab page with the new dashboard page.
- `apps/situation-room/components/architecture-lab.tsx`
  Keep the current tool, but adapt links/copy to the new `/lab` route and add dashboard benchmark probes.
- `apps/situation-room/components/trend-chart.tsx`
  Convert or replace the existing chart implementation to a weekly two-line comparison chart.
- `apps/situation-room/components/ui/calendar.tsx`
  Reuse the existing shadcn calendar primitive for date-range selection if needed.
- `apps/situation-room/lib/env.server.ts`
  Add any dashboard-specific env validation needed for direct BigQuery access.
- `apps/situation-room/lib/bigquery/client.ts`
  Reuse the current BigQuery client from the dashboard server loaders.
- `apps/situation-room/lib/analytics-lab.ts`
  Register the new dashboard snapshot/trend probes and benchmark labels.
- `apps/situation-room/lib/server/architecture-probes.ts`
  Add probe handlers for dashboard category snapshot and tile trend paths.
- `apps/situation-room/scripts/benchmark-report.mjs`
  Add benchmark coverage for the new dashboard endpoints.
- `apps/situation-room/package.json`
  Add any route-specific benchmark or test script wiring if needed.
- `apps/situation-room/.env.local.example`
  Document any new dashboard route env vars or example URLs.

## Task 1: Lock The Dashboard Domain Contracts

**Files:**
- Create: `apps/situation-room/lib/dashboard/catalog.ts`
- Create: `apps/situation-room/lib/dashboard/date-range.ts`
- Create: `apps/situation-room/lib/dashboard/filter-config.ts`
- Create: `apps/situation-room/lib/dashboard/contracts.ts`
- Create: `apps/situation-room/lib/dashboard/query-inputs.ts`
- Test: `apps/situation-room/__tests__/dashboard-catalog.test.ts`
- Test: `apps/situation-room/__tests__/dashboard-date-range.test.ts`
- Test: `apps/situation-room/__tests__/dashboard-query-inputs.test.ts`

- [ ] **Step 1: Write the failing catalog and state tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  CATEGORY_ORDER,
  TILE_CATALOG,
  getDefaultTileId,
  GLOBAL_FILTER_KEYS,
} from '@/lib/dashboard/catalog';
import {
  derivePreviousYearRange,
  getCurrentYearRange,
} from '@/lib/dashboard/date-range';
import {
  parseDashboardSearchParams,
  serializeDashboardStateKey,
} from '@/lib/dashboard/query-inputs';

describe('dashboard catalog', () => {
  it('keeps the approved category order', () => {
    expect(CATEGORY_ORDER).toEqual([
      'New Logo',
      'Expansion',
      'Migration',
      'Renewal',
      'Total',
    ]);
  });

  it('uses the first curated tile as the default selection', () => {
    expect(getDefaultTileId('New Logo')).toBe('new_logo_bookings_amount');
  });

  it('includes all approved non-date global filters', () => {
    expect(GLOBAL_FILTER_KEYS).toContain('Division');
    expect(GLOBAL_FILTER_KEYS).toContain('Gate Met or Accepted');
  });
});

describe('date range', () => {
  it('defaults to the current year', () => {
    const range = getCurrentYearRange(new Date('2026-03-22T00:00:00Z'));
    expect(range).toEqual({
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });
  });

  it('derives the same period in the previous year', () => {
    expect(
      derivePreviousYearRange({
        startDate: '2026-01-01',
        endDate: '2026-03-31',
      }),
    ).toEqual({
      startDate: '2025-01-01',
      endDate: '2025-03-31',
    });
  });
});

describe('query inputs', () => {
  it('normalizes dashboard search params into stable state', () => {
    const state = parseDashboardSearchParams(
      new URLSearchParams('category=New%20Logo&Division=B&B&Division=A'),
    );

    expect(state.activeCategory).toBe('New Logo');
    expect(state.filters.Division).toEqual(['A', 'B']);
  });

  it('serializes identical filter states to the same key', () => {
    const left = serializeDashboardStateKey({
      activeCategory: 'New Logo',
      filters: { Division: ['A', 'B'] },
    });
    const right = serializeDashboardStateKey({
      activeCategory: 'New Logo',
      filters: { Division: ['B', 'A'] },
    });

    expect(left).toBe(right);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @point-of-rental/situation-room test -- dashboard-catalog dashboard-date-range dashboard-query-inputs`

Expected: FAIL with missing module errors for the new dashboard domain files.

- [ ] **Step 3: Implement the minimal dashboard domain modules**

```ts
// apps/situation-room/lib/dashboard/catalog.ts
export const CATEGORY_ORDER = [
  'New Logo',
  'Expansion',
  'Migration',
  'Renewal',
  'Total',
] as const;

export const TILE_CATALOG = {
  'New Logo': [
    {
      tileId: 'new_logo_bookings_amount',
      label: 'Bookings $',
      sortOrder: 1,
      formatType: 'currency',
    },
    {
      tileId: 'new_logo_bookings_count',
      label: 'Bookings #',
      sortOrder: 2,
      formatType: 'number',
    },
    {
      tileId: 'new_logo_annual_pacing_ytd',
      label: 'Annual Pacing (YTD)',
      sortOrder: 3,
      formatType: 'number',
    },
    {
      tileId: 'new_logo_close_rate',
      label: 'Close Rate',
      sortOrder: 4,
      formatType: 'percent',
    },
    {
      tileId: 'new_logo_avg_age',
      label: 'Avg Age',
      sortOrder: 5,
      formatType: 'days',
    },
    {
      tileId: 'new_logo_avg_booked_deal',
      label: 'Avg Booked Deal',
      sortOrder: 6,
      formatType: 'currency',
    },
    {
      tileId: 'new_logo_avg_quoted_deal',
      label: 'Avg Quoted Deal',
      sortOrder: 7,
      formatType: 'currency',
    },
    {
      tileId: 'new_logo_pipeline_created',
      label: 'Pipeline Created',
      sortOrder: 8,
      formatType: 'number',
    },
    { tileId: 'new_logo_sql', label: 'SQL', sortOrder: 9, formatType: 'number' },
    { tileId: 'new_logo_sqo', label: 'SQO', sortOrder: 10, formatType: 'number' },
    {
      tileId: 'new_logo_gate_1_complete',
      label: 'Gate 1 Complete',
      sortOrder: 11,
      formatType: 'number',
    },
    {
      tileId: 'new_logo_sdr_points',
      label: 'SDR Points',
      sortOrder: 12,
      formatType: 'number',
    },
    {
      tileId: 'new_logo_sqo_users',
      label: 'SQO Users',
      sortOrder: 13,
      formatType: 'number',
    },
  ],
  Expansion: [
    {
      tileId: 'expansion_bookings_amount',
      label: 'Bookings $',
      sortOrder: 1,
      formatType: 'currency',
    },
    {
      tileId: 'expansion_bookings_count',
      label: 'Bookings #',
      sortOrder: 2,
      formatType: 'number',
    },
    {
      tileId: 'expansion_annual_pacing_ytd',
      label: 'Annual Pacing (YTD)',
      sortOrder: 3,
      formatType: 'number',
    },
    {
      tileId: 'expansion_close_rate',
      label: 'Close Rate',
      sortOrder: 4,
      formatType: 'percent',
    },
    {
      tileId: 'expansion_avg_age',
      label: 'Avg Age',
      sortOrder: 5,
      formatType: 'days',
    },
    {
      tileId: 'expansion_avg_booked_deal',
      label: 'Avg Booked Deal',
      sortOrder: 6,
      formatType: 'currency',
    },
    {
      tileId: 'expansion_avg_quoted_deal',
      label: 'Avg Quoted Deal',
      sortOrder: 7,
      formatType: 'currency',
    },
    {
      tileId: 'expansion_pipeline_created',
      label: 'Pipeline Created',
      sortOrder: 8,
      formatType: 'number',
    },
    { tileId: 'expansion_sql', label: 'SQL', sortOrder: 9, formatType: 'number' },
    { tileId: 'expansion_sqo', label: 'SQO', sortOrder: 10, formatType: 'number' },
  ],
  Migration: [
    {
      tileId: 'migration_bookings_amount',
      label: 'Bookings $',
      sortOrder: 1,
      formatType: 'currency',
    },
    {
      tileId: 'migration_bookings_count',
      label: 'Bookings #',
      sortOrder: 2,
      formatType: 'number',
    },
    {
      tileId: 'migration_annual_pacing_ytd',
      label: 'Annual Pacing (YTD)',
      sortOrder: 3,
      formatType: 'number',
    },
    {
      tileId: 'migration_close_rate',
      label: 'Close Rate',
      sortOrder: 4,
      formatType: 'percent',
    },
    {
      tileId: 'migration_avg_age',
      label: 'Avg Age',
      sortOrder: 5,
      formatType: 'days',
    },
    {
      tileId: 'migration_avg_booked_deal',
      label: 'Avg Booked Deal',
      sortOrder: 6,
      formatType: 'currency',
    },
    {
      tileId: 'migration_avg_quoted_deal',
      label: 'Avg Quoted Deal',
      sortOrder: 7,
      formatType: 'currency',
    },
    {
      tileId: 'migration_pipeline_created',
      label: 'Pipeline Created',
      sortOrder: 8,
      formatType: 'number',
    },
    { tileId: 'migration_sql', label: 'SQL', sortOrder: 9, formatType: 'number' },
    { tileId: 'migration_sqo', label: 'SQO', sortOrder: 10, formatType: 'number' },
    { tileId: 'migration_sal', label: 'SAL', sortOrder: 11, formatType: 'number' },
    {
      tileId: 'migration_avg_users',
      label: 'Avg Users',
      sortOrder: 12,
      formatType: 'number',
    },
  ],
  Renewal: [
    {
      tileId: 'renewal_bookings_amount',
      label: 'Bookings $',
      sortOrder: 1,
      formatType: 'currency',
    },
    {
      tileId: 'renewal_bookings_count',
      label: 'Bookings #',
      sortOrder: 2,
      formatType: 'number',
    },
    {
      tileId: 'renewal_annual_pacing_ytd',
      label: 'Annual Pacing (YTD)',
      sortOrder: 3,
      formatType: 'number',
    },
    {
      tileId: 'renewal_close_rate',
      label: 'Close Rate',
      sortOrder: 4,
      formatType: 'percent',
    },
    {
      tileId: 'renewal_avg_age',
      label: 'Avg Age',
      sortOrder: 5,
      formatType: 'days',
    },
    {
      tileId: 'renewal_avg_booked_deal',
      label: 'Avg Booked Deal',
      sortOrder: 6,
      formatType: 'currency',
    },
    {
      tileId: 'renewal_avg_quoted_deal',
      label: 'Avg Quoted Deal',
      sortOrder: 7,
      formatType: 'currency',
    },
    {
      tileId: 'renewal_pipeline_created',
      label: 'Pipeline Created',
      sortOrder: 8,
      formatType: 'number',
    },
    { tileId: 'renewal_sql', label: 'SQL', sortOrder: 9, formatType: 'number' },
  ],
  Total: [
    {
      tileId: 'total_bookings_amount',
      label: 'Bookings $',
      sortOrder: 1,
      formatType: 'currency',
    },
    {
      tileId: 'total_bookings_count',
      label: 'Bookings #',
      sortOrder: 2,
      formatType: 'number',
    },
    {
      tileId: 'total_annual_pacing_ytd',
      label: 'Annual Pacing (YTD)',
      sortOrder: 3,
      formatType: 'number',
    },
    {
      tileId: 'total_one_time_revenue',
      label: 'One-time Revenue',
      sortOrder: 4,
      formatType: 'currency',
    },
  ],
} as const;

export const GLOBAL_FILTER_KEYS = [
  'Division',
  'Owner',
  'Segment',
  'Region',
  'SE',
  'Booking Plan Opp Type',
  'Product Family',
  'SDR Source',
  'SDR',
  'POR v R360',
  'Account Owner',
  'Owner Department',
  'Strategic Filter',
  'Accepted',
  'Gate 1 Criteria Met',
  'Gate Met or Accepted',
] as const;
```

- [ ] **Step 4: Run the targeted tests**

Run: `pnpm --filter @point-of-rental/situation-room test -- dashboard-catalog dashboard-date-range dashboard-query-inputs`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/situation-room/lib/dashboard apps/situation-room/__tests__/dashboard-*.test.ts
git commit -m "feat: add dashboard tile catalog and state contracts"
```

## Task 2: Build Direct BigQuery Query Builders

**Files:**
- Create: `apps/situation-room/lib/bigquery/dashboard-sql.ts`
- Modify: `apps/situation-room/lib/bigquery/client.ts`
- Test: `apps/situation-room/__tests__/dashboard-sql.test.ts`

- [ ] **Step 1: Write the failing SQL-builder tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  buildTileSnapshotQuery,
  buildTileTrendQuery,
  buildFilterDictionaryQuery,
} from '@/lib/bigquery/dashboard-sql';

describe('dashboard sql', () => {
  it('builds a tile snapshot query scoped to one tile and one category', () => {
    const sql = buildTileSnapshotQuery({
      category: 'New Logo',
      tileId: 'new_logo_bookings_amount',
      dateRange: { startDate: '2026-01-01', endDate: '2026-03-31' },
      previousDateRange: { startDate: '2025-01-01', endDate: '2025-03-31' },
      filters: { Division: ['Enterprise'] },
    });

    expect(sql).toContain('Bookings $');
    expect(sql).toContain('Division');
    expect(sql).toContain('2026-01-01');
    expect(sql).toContain('2025-03-31');
  });

  it('builds a weekly trend query with aligned current and previous ranges', () => {
    const sql = buildTileTrendQuery({
      category: 'New Logo',
      tileId: 'new_logo_bookings_amount',
      dateRange: { startDate: '2026-01-01', endDate: '2026-03-31' },
      previousDateRange: { startDate: '2025-01-01', endDate: '2025-03-31' },
      filters: {},
    });

    expect(sql).toContain('DATE_TRUNC');
    expect(sql).toContain('WEEK');
    expect(sql).toContain('current_value');
    expect(sql).toContain('previous_value');
  });

  it('builds a global dictionary query without contextual filters', () => {
    const sql = buildFilterDictionaryQuery('Division');
    expect(sql).toContain('distinct');
    expect(sql).not.toContain('where Division in');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @point-of-rental/situation-room test -- dashboard-sql`

Expected: FAIL with missing module errors for `dashboard-sql`.

- [ ] **Step 3: Implement minimal allowlisted SQL builders**

```ts
// apps/situation-room/lib/bigquery/dashboard-sql.ts
export function buildTileSnapshotQuery(input: TileSnapshotQueryInput): string {
  const tile = getTileDefinition(input.category, input.tileId);
  return `
    with scoped as (
      select *
      from \`${input.tableRef}\`
      where ${buildSharedWhereClause(input)}
    )
    select
      '${tile.tileId}' as tile_id,
      '${tile.label}' as label,
      ${tile.sortOrder} as sort_order,
      ${tile.snapshotSql} as current_value,
      ${tile.previousSnapshotSql} as previous_value
  `;
}
```

- [ ] **Step 4: Run the SQL tests**

Run: `pnpm --filter @point-of-rental/situation-room test -- dashboard-sql`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/situation-room/lib/bigquery/dashboard-sql.ts apps/situation-room/lib/bigquery/client.ts apps/situation-room/__tests__/dashboard-sql.test.ts
git commit -m "feat: add dashboard BigQuery sql builders"
```

## Task 3: Add Server Loaders And Dashboard API Routes

**Files:**
- Create: `apps/situation-room/lib/server/get-dashboard-category-snapshot.ts`
- Create: `apps/situation-room/lib/server/get-dashboard-tile-trend.ts`
- Create: `apps/situation-room/lib/server/get-dashboard-filter-dictionary.ts`
- Create: `apps/situation-room/app/api/dashboard/category/[category]/route.ts`
- Create: `apps/situation-room/app/api/dashboard/trend/[tileId]/route.ts`
- Create: `apps/situation-room/app/api/dashboard/filter-dictionaries/[key]/route.ts`
- Modify: `apps/situation-room/lib/env.server.ts`
- Test: `apps/situation-room/__tests__/dashboard-server-loaders.test.ts`
- Test: `apps/situation-room/__tests__/dashboard-routes.test.ts`

- [ ] **Step 1: Write the failing loader and route tests**

```ts
import { describe, expect, it, vi } from 'vitest';
import { getDashboardCategorySnapshot } from '@/lib/server/get-dashboard-category-snapshot';
import { GET as getCategoryRoute } from '@/app/api/dashboard/category/[category]/route';

describe('category snapshot loader', () => {
  it('fans out one snapshot query per tile and aggregates the rows in order', async () => {
    const result = await getDashboardCategorySnapshot({
      activeCategory: 'New Logo',
      filters: {},
    });

    expect(result.rows[0].tileId).toBe('new_logo_bookings_amount');
    expect(result.rows).toHaveLength(13);
  });
});

describe('dashboard routes', () => {
  it('returns the category snapshot payload', async () => {
    const response = await getCategoryRoute(
      new Request('http://localhost/api/dashboard/category/New%20Logo'),
      { params: Promise.resolve({ category: 'New Logo' }) },
    );

    expect(response.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @point-of-rental/situation-room test -- dashboard-server-loaders dashboard-routes`

Expected: FAIL with missing module errors for the new server loaders and routes.

- [ ] **Step 3: Implement minimal server loaders and GET routes**

```ts
// apps/situation-room/lib/server/get-dashboard-category-snapshot.ts
export async function getDashboardCategorySnapshot(input: DashboardState) {
  const tiles = getCategoryTiles(input.activeCategory);
  const rows = await Promise.all(
    tiles.map((tile) => runTileSnapshotQuery(tile, input)),
  );

  return {
    category: input.activeCategory,
    currentWindowLabel: formatDateRange(input.dateRange),
    previousWindowLabel: formatDateRange(input.previousDateRange),
    rows,
  };
}
```

- [ ] **Step 4: Run the targeted tests**

Run: `pnpm --filter @point-of-rental/situation-room test -- dashboard-server-loaders dashboard-routes`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/situation-room/lib/server/get-dashboard-* apps/situation-room/app/api/dashboard apps/situation-room/lib/env.server.ts apps/situation-room/__tests__/dashboard-server-loaders.test.ts apps/situation-room/__tests__/dashboard-routes.test.ts
git commit -m "feat: add dashboard server loaders and routes"
```

## Task 4: Build The Dashboard Page And Move The Lab To `/lab`

**Files:**
- Create: `apps/situation-room/app/lab/page.tsx`
- Create: `apps/situation-room/components/dashboard/dashboard-shell.tsx`
- Create: `apps/situation-room/components/dashboard/dashboard-filters.tsx`
- Create: `apps/situation-room/components/dashboard/category-tabs.tsx`
- Create: `apps/situation-room/components/dashboard/tile-table.tsx`
- Create: `apps/situation-room/components/dashboard/trend-panel.tsx`
- Create: `apps/situation-room/components/dashboard/loading-state.tsx`
- Modify: `apps/situation-room/app/page.tsx`
- Modify: `apps/situation-room/components/architecture-lab.tsx`
- Modify: `apps/situation-room/components/trend-chart.tsx`
- Test: `apps/situation-room/__tests__/dashboard-page.test.tsx`
- Test: `apps/situation-room/__tests__/lab-page.test.tsx`

- [ ] **Step 1: Write the failing page tests**

```tsx
import { render, screen } from '@testing-library/react';
import DashboardPage from '@/app/page';
import LabPage from '@/app/lab/page';

describe('dashboard page', () => {
  it('renders the five fixed category tabs', async () => {
    const page = await DashboardPage();
    render(page);

    expect(screen.getByRole('tab', { name: 'New Logo' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Total' })).toBeInTheDocument();
  });
});

describe('lab page', () => {
  it('keeps the Analytics Lab available on /lab', async () => {
    const page = await LabPage();
    render(page);
    expect(screen.getByText(/Analytics Lab/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @point-of-rental/situation-room test -- dashboard-page lab-page`

Expected: FAIL because the new route/components do not exist yet.

- [ ] **Step 3: Implement the minimal dashboard shell with shadcn primitives**

```tsx
// apps/situation-room/app/page.tsx
export default async function Page() {
  const initialState = getInitialDashboardState();
  const initialSnapshot = await getDashboardCategorySnapshot(initialState);
  const initialTrend = await getDashboardTileTrend({
    ...initialState,
    tileId: initialSnapshot.rows[0].tileId,
  });

  return (
    <DashboardShell
      initialState={initialState}
      initialSnapshot={initialSnapshot}
      initialTrend={initialTrend}
    />
  );
}
```

- [ ] **Step 4: Run the page tests**

Run: `pnpm --filter @point-of-rental/situation-room test -- dashboard-page lab-page`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/situation-room/app/page.tsx apps/situation-room/app/lab/page.tsx apps/situation-room/components/dashboard apps/situation-room/components/architecture-lab.tsx apps/situation-room/components/trend-chart.tsx apps/situation-room/__tests__/dashboard-page.test.tsx apps/situation-room/__tests__/lab-page.test.tsx
git commit -m "feat: add situation room dashboard page"
```

## Task 5: Wire Client Refresh Behavior For Tabs, Filters, And Tile Selection

**Files:**
- Modify: `apps/situation-room/components/dashboard/dashboard-shell.tsx`
- Modify: `apps/situation-room/components/dashboard/dashboard-filters.tsx`
- Modify: `apps/situation-room/components/dashboard/category-tabs.tsx`
- Modify: `apps/situation-room/components/dashboard/tile-table.tsx`
- Modify: `apps/situation-room/components/dashboard/trend-panel.tsx`
- Modify: `apps/situation-room/lib/dashboard/query-inputs.ts`
- Test: `apps/situation-room/__tests__/dashboard-page.test.tsx`

- [ ] **Step 1: Extend the dashboard page tests for interactions**

```tsx
it('selects the first tile by default and reloads the trend when another row is clicked', async () => {
  render(<DashboardShell {...fixtures} />);

  expect(screen.getByText('Bookings $')).toBeInTheDocument();

  await user.click(screen.getByRole('row', { name: /Close Rate/i }));

  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('/api/dashboard/trend/new_logo_close_rate'),
    expect.anything(),
  );
});
```

- [ ] **Step 2: Run the interaction tests to verify they fail**

Run: `pnpm --filter @point-of-rental/situation-room test -- dashboard-page`

Expected: FAIL because the current shell does not implement client refresh behavior yet.

- [ ] **Step 3: Implement minimal client-side refresh flows**

```tsx
// dashboard-shell.tsx
const [state, setState] = useState(initialState);
const [snapshot, setSnapshot] = useState(initialSnapshot);
const [trend, setTrend] = useState(initialTrend);

async function handleCategoryChange(category: Category) {
  const nextState = { ...state, activeCategory: category, selectedTileId: getDefaultTileId(category) };
  const nextSnapshot = await fetchCategorySnapshot(nextState);
  const nextTrend = await fetchTileTrend(nextState, nextState.selectedTileId);
  setState(nextState);
  setSnapshot(nextSnapshot);
  setTrend(nextTrend);
}
```

- [ ] **Step 4: Run the interaction tests**

Run: `pnpm --filter @point-of-rental/situation-room test -- dashboard-page`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/situation-room/components/dashboard apps/situation-room/lib/dashboard/query-inputs.ts apps/situation-room/__tests__/dashboard-page.test.tsx
git commit -m "feat: add dashboard tab and tile interactions"
```

## Task 6: Add Dashboard Probes To The Analytics Lab

**Files:**
- Modify: `apps/situation-room/lib/analytics-lab.ts`
- Modify: `apps/situation-room/lib/server/architecture-probes.ts`
- Modify: `apps/situation-room/components/architecture-lab.tsx`
- Modify: `apps/situation-room/scripts/benchmark-report.mjs`
- Modify: `apps/situation-room/__tests__/architecture-probes.test.ts`
- Modify: `apps/situation-room/__tests__/analytics-lab-registry.test.ts`
- Modify: `apps/situation-room/__tests__/probe-routes.test.ts`

- [ ] **Step 1: Extend the probe tests for dashboard-specific probes**

```ts
it('registers a dashboard category snapshot probe', () => {
  expect(PROBES.some((probe) => probe.id === 'dashboard-category-snapshot')).toBe(true);
});

it('measures dashboard tile trend probes', async () => {
  const result = await runProbe('dashboard-tile-trend', { cacheMode: 'off' });
  expect(result.payload.source).toBe('bigquery');
});

it('registers the dashboard filter dictionary probe', () => {
  expect(PROBES.some((probe) => probe.id === 'dashboard-filter-dictionary')).toBe(true);
});
```

- [ ] **Step 2: Run the probe tests to verify they fail**

Run: `pnpm --filter @point-of-rental/situation-room test -- analytics-lab-registry architecture-probes probe-routes`

Expected: FAIL because the new probe registrations are not present yet.

- [ ] **Step 3: Add dashboard snapshot and trend probes**

```ts
// apps/situation-room/lib/analytics-lab.ts
{
  id: 'dashboard-category-snapshot',
  label: 'Dashboard category snapshot',
  endpoint: '/api/dashboard/category/New%20Logo',
}
{
  id: 'dashboard-filter-dictionary',
  label: 'Dashboard filter dictionary',
  endpoint: '/api/dashboard/filter-dictionaries/Division',
}
```

- [ ] **Step 4: Run the probe tests**

Run: `pnpm --filter @point-of-rental/situation-room test -- analytics-lab-registry architecture-probes probe-routes`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/situation-room/lib/analytics-lab.ts apps/situation-room/lib/server/architecture-probes.ts apps/situation-room/components/architecture-lab.tsx apps/situation-room/scripts/benchmark-report.mjs apps/situation-room/__tests__/analytics-lab-registry.test.ts apps/situation-room/__tests__/architecture-probes.test.ts apps/situation-room/__tests__/probe-routes.test.ts
git commit -m "feat: add dashboard probes to analytics lab"
```

## Task 7: Protect Legacy Lab Compatibility

**Files:**
- Modify: `apps/situation-room/components/architecture-lab.tsx`
- Modify: `apps/situation-room/app/api/report/route.ts`
- Modify: `apps/situation-room/app/api/filter-dictionaries/[key]/route.ts`
- Test: `apps/situation-room/__tests__/report-page.test.ts`
- Test: `apps/situation-room/__tests__/filter-dictionaries.test.ts`

- [ ] **Step 1: Write failing compatibility tests for the relocated lab**

```ts
it('keeps the lab report endpoints available for the /lab tooling path', async () => {
  const response = await GET(
    new Request('http://localhost/api/filter-dictionaries/Division'),
    { params: Promise.resolve({ key: 'Division' }) },
  );

  expect(response.status).toBe(200);
});
```

- [ ] **Step 2: Run the compatibility tests to verify they fail or expose stale coupling**

Run: `pnpm --filter @point-of-rental/situation-room test -- report-page filter-dictionaries`

Expected: FAIL or reveal lab-route assumptions broken by the page split.

- [ ] **Step 3: Keep only the compatibility needed for /lab**

```ts
// Preserve the legacy lab endpoints and any probe dependencies,
// but do not route the new dashboard page through the old scorecard flow.
```

- [ ] **Step 4: Run the affected tests**

Run: `pnpm --filter @point-of-rental/situation-room test -- report-page filter-dictionaries`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/situation-room/components/architecture-lab.tsx apps/situation-room/app/api/report/route.ts apps/situation-room/app/api/filter-dictionaries/[key]/route.ts apps/situation-room/__tests__/report-page.test.ts apps/situation-room/__tests__/filter-dictionaries.test.ts
git commit -m "refactor: preserve lab compatibility during dashboard cutover"
```

## Task 8: Final Verification And Benchmark Capture

**Files:**
- Modify: `apps/situation-room/.env.local.example`
- Modify: `apps/situation-room/package.json`
- Create or update benchmark evidence in a follow-up doc if desired

- [ ] **Step 1: Run the full app test suite**

Run: `pnpm --filter @point-of-rental/situation-room test`

Expected: PASS

- [ ] **Step 2: Run static verification**

Run: `pnpm --filter @point-of-rental/situation-room typecheck`

Expected: PASS

- [ ] **Step 3: Run the production build**

Run: `pnpm --filter @point-of-rental/situation-room build`

Expected: PASS

- [ ] **Step 4: Run live benchmark captures against direct BigQuery**

Run:

```bash
BIGQUERY_PROJECT_ID=data-analytics-306119 \
BIGQUERY_DATASET=scorecard_test \
BIGQUERY_LOCATION=US \
BIGQUERY_SERVICE_ACCOUNT_PATH=/Users/f/Documents/GitHub/point-of-rental/keys/gcp_sa_facundoiannello.json \
pnpm sr:dev
```

Then:

```bash
BENCHMARK_BASE_URL=http://localhost:3100 \
node apps/situation-room/scripts/benchmark-report.mjs --cache off --iterations 3
```

Expected: dashboard category snapshot and tile trend results print successfully.

- [ ] **Step 5: Commit**

```bash
git add apps/situation-room/.env.local.example apps/situation-room/package.json
git commit -m "chore: verify dashboard baseline and benchmark flow"
```
