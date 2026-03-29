# Phase 4b-1: Data Layer Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove every production query shape (snapshots, trends, closed-won, dictionaries) works through Lightdash v2 `executeMetricQuery`, with shared tile specs from `@por/dashboard-constants`.

**Architecture:** Extract tile semantic specs (`TILE_SPECS`, grouping logic, filter constants) from the analytics-suite's `semantic-registry.ts` into `@por/dashboard-constants`. Build a v2 query builder in the challenger that translates those shared specs into Lightdash `MetricQuery` format. Render all data as streaming HTML tables.

**Tech Stack:** TypeScript, Next.js 15, `@por/dashboard-constants` (shared package), Vitest

---

## File Map

### `@por/dashboard-constants` (new files in shared package)

| File | Responsibility |
|------|---------------|
| `packages/dashboard-constants/src/semantic-types.ts` | `SemanticFilter`, `DateRange`, `DashboardFilters`, `TileSemanticSpec`, `DateRangeStrategy`, `SnapshotGroup` types |
| `packages/dashboard-constants/src/semantic-specs.ts` | `TILE_SPECS`, filter constant arrays, `CLOSED_WON_DIMENSIONS`, `getSemanticTileSpec()` |
| `packages/dashboard-constants/src/semantic-grouping.ts` | `getSnapshotGroups(tileIds)`, `buildFilterSignature()`, `getEffectiveDateRange()` |
| `packages/dashboard-constants/src/semantic-filters.ts` | `buildSemanticFilters(filters, category)` |
| `packages/dashboard-constants/src/index.ts` | Re-exports (add new modules) |

### Analytics-suite (modified files)

| File | Change |
|------|--------|
| `apps/analytics-suite/lib/dashboard-v2/semantic-registry.ts` | Import from `@por/dashboard-constants` instead of defining inline |
| `apps/analytics-suite/lib/dashboard/contracts.ts` | `DateRange` and `DashboardFilters` imported from shared; re-exported for backward compat |
| `apps/analytics-suite/__tests__/semantic-registry-*.test.ts` | Update `getSnapshotGroups()` calls to pass tile IDs |

### Challenger app (new files)

| File | Responsibility |
|------|---------------|
| `apps/challenger/lib/v2-query-builder.ts` | Translates shared `SemanticFilter`/`TileSemanticSpec` → Lightdash `MetricQuery` |
| `apps/challenger/lib/scorecard-loader.ts` | Loads all tiles for a category using snapshot groups |
| `apps/challenger/lib/trend-loader.ts` | Loads default tile trend for a category |
| `apps/challenger/lib/closed-won-loader.ts` | Loads closed-won opportunities for a category |
| `apps/challenger/components/category-scorecard.tsx` | Server component: HTML table of all tiles |
| `apps/challenger/components/category-trend.tsx` | Server component: HTML table of weekly trend |
| `apps/challenger/components/closed-won-table.tsx` | Server component: HTML table of opportunities |
| `apps/challenger/app/page.tsx` | Updated to render all categories with Suspense |

---

## Task 1: Extract Semantic Types into Shared Package

**Files:**
- Create: `packages/dashboard-constants/src/semantic-types.ts`
- Modify: `packages/dashboard-constants/src/index.ts`

- [ ] **Step 1: Create semantic-types.ts**

```typescript
// packages/dashboard-constants/src/semantic-types.ts

export type SemanticFilter = {
  field: string;
  operator: string;
  values: Array<string | number | boolean | null>;
};

export type DateRange = {
  startDate: string;
  endDate: string;
};

export type DateRangeStrategy = 'selected' | 'ytd_to_end';

export type TileSemanticSpec = {
  measure: string;
  dateDimension: string;
  extraFilters?: SemanticFilter[];
  dateRangeStrategy?: DateRangeStrategy;
};

export type SnapshotGroup = {
  dateDimension: string;
  extraFilters?: SemanticFilter[];
  dateRangeStrategy?: DateRangeStrategy;
  tiles: Array<TileSemanticSpec & { tileId: string }>;
};
```

- [ ] **Step 2: Add re-exports to index.ts**

Add to `packages/dashboard-constants/src/index.ts`:

```typescript
export type {
  SemanticFilter,
  DateRange,
  DateRangeStrategy,
  TileSemanticSpec,
  SnapshotGroup,
} from './semantic-types';
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd packages/dashboard-constants && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/dashboard-constants/src/semantic-types.ts packages/dashboard-constants/src/index.ts
git commit -m "feat(dashboard-constants): add semantic types for shared tile specs"
```

---

## Task 2: Extract Tile Specs and Filter Constants

**Files:**
- Create: `packages/dashboard-constants/src/semantic-specs.ts`
- Modify: `packages/dashboard-constants/src/index.ts`

- [ ] **Step 1: Create semantic-specs.ts with TILE_SPECS**

Move from `apps/analytics-suite/lib/dashboard-v2/semantic-registry.ts` lines 29-256 into the shared package. The `SemanticFilter` arrays and `TILE_SPECS` are pure data with no external dependencies.

```typescript
// packages/dashboard-constants/src/semantic-specs.ts

import type { SemanticFilter, TileSemanticSpec } from './semantic-types';

export const CLOSED_WON_FILTERS: SemanticFilter[] = [
  { field: 'won', operator: 'equals', values: [true] },
  { field: 'stage_name', operator: 'equals', values: ['Closed Won'] },
];

export const CLOSED_WON_POSITIVE_ACV_FILTERS: SemanticFilter[] = [
  ...CLOSED_WON_FILTERS,
  { field: 'acv', operator: 'greaterThan', values: [0] },
];

export const WON_POSITIVE_ACV_FILTERS: SemanticFilter[] = [
  { field: 'won', operator: 'equals', values: [true] },
  { field: 'acv', operator: 'greaterThan', values: [0] },
];

export const CLOSED_WON_DIMENSIONS = [
  'account_name',
  'account_link',
  'opportunity_name',
  'opportunity_link',
  'close_date',
  'created_date',
  'division',
  'type',
  'product_family',
  'booking_plan_opp_type_2025',
  'owner',
  'sdr',
  'opp_record_type',
  'age_days',
  'se',
  'quarter_label',
  'contract_start_date',
  'users',
  'acv',
] as const;

export const TILE_SPECS: Record<string, TileSemanticSpec> = {
  new_logo_bookings_amount: {
    measure: 'bookings_amount',
    dateDimension: 'close_date',
  },
  new_logo_bookings_count: {
    measure: 'bookings_count',
    dateDimension: 'close_date',
  },
  new_logo_annual_pacing_ytd: {
    measure: 'annual_pacing_ytd',
    dateDimension: 'close_date',
    dateRangeStrategy: 'ytd_to_end',
  },
  new_logo_close_rate: { measure: 'close_rate', dateDimension: 'close_date' },
  new_logo_avg_age: { measure: 'avg_age', dateDimension: 'close_date' },
  new_logo_avg_booked_deal: {
    measure: 'avg_booked_deal',
    dateDimension: 'close_date',
  },
  new_logo_avg_quoted_deal: {
    measure: 'avg_quoted_deal',
    dateDimension: 'created_date',
  },
  new_logo_pipeline_created: {
    measure: 'pipeline_created',
    dateDimension: 'pipeline_start_date',
  },
  new_logo_sql: { measure: 'sql_count', dateDimension: 'created_date' },
  new_logo_sqo: { measure: 'sqo_count', dateDimension: 'sales_qualified_date' },
  new_logo_gate_1_complete: {
    measure: 'gate_1_complete_count',
    dateDimension: 'gate1_completed_date',
  },
  new_logo_sdr_points: { measure: 'sdr_points', dateDimension: 'created_date' },
  new_logo_sqo_users: {
    measure: 'sqo_users',
    dateDimension: 'sales_qualified_date',
  },
  expansion_bookings_amount: {
    measure: 'bookings_amount',
    dateDimension: 'close_date',
    extraFilters: CLOSED_WON_POSITIVE_ACV_FILTERS,
  },
  expansion_bookings_count: {
    measure: 'bookings_count',
    dateDimension: 'close_date',
    extraFilters: CLOSED_WON_POSITIVE_ACV_FILTERS,
  },
  expansion_annual_pacing_ytd: {
    measure: 'annual_pacing_ytd',
    dateDimension: 'close_date',
    extraFilters: WON_POSITIVE_ACV_FILTERS,
    dateRangeStrategy: 'ytd_to_end',
  },
  expansion_close_rate: { measure: 'close_rate', dateDimension: 'close_date' },
  expansion_avg_age: {
    measure: 'avg_age_scorecard',
    dateDimension: 'close_date',
    extraFilters: WON_POSITIVE_ACV_FILTERS,
  },
  expansion_avg_booked_deal: {
    measure: 'avg_booked_deal',
    dateDimension: 'close_date',
  },
  expansion_avg_quoted_deal: {
    measure: 'avg_quoted_deal',
    dateDimension: 'created_date',
  },
  expansion_pipeline_created: {
    measure: 'pipeline_created',
    dateDimension: 'pipeline_start_date',
  },
  expansion_sql: {
    measure: 'expansion_sql_count',
    dateDimension: 'created_date',
  },
  expansion_sqo: {
    measure: 'expansion_sqo_count',
    dateDimension: 'expansion_qualified_date',
  },
  migration_bookings_amount: {
    measure: 'bookings_amount',
    dateDimension: 'close_date',
  },
  migration_bookings_count: {
    measure: 'bookings_count',
    dateDimension: 'close_date',
  },
  migration_annual_pacing_ytd: {
    measure: 'annual_pacing_ytd',
    dateDimension: 'close_date',
    dateRangeStrategy: 'ytd_to_end',
  },
  migration_close_rate: { measure: 'close_rate', dateDimension: 'close_date' },
  migration_avg_age: { measure: 'avg_age', dateDimension: 'close_date' },
  migration_avg_booked_deal: {
    measure: 'avg_booked_deal',
    dateDimension: 'close_date',
  },
  migration_avg_quoted_deal: {
    measure: 'avg_quoted_deal',
    dateDimension: 'created_date',
  },
  migration_pipeline_created: {
    measure: 'pipeline_created',
    dateDimension: 'pipeline_start_date',
  },
  migration_sql: {
    measure: 'migration_sql_count',
    dateDimension: 'created_date',
  },
  migration_sqo: {
    measure: 'migration_sqo_count',
    dateDimension: 'expansion_qualified_date',
  },
  migration_sal: {
    measure: 'migration_sal_count',
    dateDimension: 'expansion_submitted_date',
  },
  migration_avg_users: { measure: 'avg_users', dateDimension: 'close_date' },
  renewal_bookings_amount: {
    measure: 'bookings_amount',
    dateDimension: 'close_date',
  },
  renewal_bookings_count: {
    measure: 'bookings_count',
    dateDimension: 'close_date',
  },
  renewal_annual_pacing_ytd: {
    measure: 'annual_pacing_ytd',
    dateDimension: 'close_date',
    dateRangeStrategy: 'ytd_to_end',
  },
  renewal_close_rate: { measure: 'close_rate', dateDimension: 'close_date' },
  renewal_avg_age: { measure: 'avg_age', dateDimension: 'close_date' },
  renewal_avg_booked_deal: {
    measure: 'avg_booked_deal',
    dateDimension: 'close_date',
  },
  renewal_avg_quoted_deal: {
    measure: 'avg_quoted_deal',
    dateDimension: 'created_date',
  },
  renewal_pipeline_created: {
    measure: 'pipeline_created',
    dateDimension: 'pipeline_start_date',
  },
  renewal_sql: { measure: 'renewal_sql_count', dateDimension: 'close_date' },
  total_bookings_amount: {
    measure: 'bookings_amount',
    dateDimension: 'close_date',
    extraFilters: CLOSED_WON_POSITIVE_ACV_FILTERS,
  },
  total_bookings_count: {
    measure: 'bookings_count',
    dateDimension: 'close_date',
    extraFilters: CLOSED_WON_POSITIVE_ACV_FILTERS,
  },
  total_annual_pacing_ytd: {
    measure: 'annual_pacing_ytd',
    dateDimension: 'close_date',
    extraFilters: CLOSED_WON_POSITIVE_ACV_FILTERS,
    dateRangeStrategy: 'ytd_to_end',
  },
  total_one_time_revenue: {
    measure: 'one_time_revenue',
    dateDimension: 'close_date',
  },
};

export function getSemanticTileSpec(tileId: string): TileSemanticSpec {
  const spec = TILE_SPECS[tileId];
  if (!spec) {
    throw new Error(`Missing semantic tile spec for "${tileId}".`);
  }
  return spec;
}
```

- [ ] **Step 2: Add re-exports to index.ts**

Add to `packages/dashboard-constants/src/index.ts`:

```typescript
export {
  CLOSED_WON_FILTERS,
  CLOSED_WON_POSITIVE_ACV_FILTERS,
  WON_POSITIVE_ACV_FILTERS,
  CLOSED_WON_DIMENSIONS,
  TILE_SPECS,
  getSemanticTileSpec,
} from './semantic-specs';
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd packages/dashboard-constants && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/dashboard-constants/src/semantic-specs.ts packages/dashboard-constants/src/index.ts
git commit -m "feat(dashboard-constants): extract TILE_SPECS and filter constants from semantic-registry"
```

---

## Task 3: Extract Grouping and Date Logic

**Files:**
- Create: `packages/dashboard-constants/src/semantic-grouping.ts`
- Create: `packages/dashboard-constants/src/semantic-filters.ts`
- Modify: `packages/dashboard-constants/src/index.ts`

- [ ] **Step 1: Create semantic-grouping.ts**

```typescript
// packages/dashboard-constants/src/semantic-grouping.ts

import type {
  SemanticFilter,
  DateRange,
  DateRangeStrategy,
  SnapshotGroup,
} from './semantic-types';
import { getSemanticTileSpec } from './semantic-specs';

export function buildFilterSignature(filters?: SemanticFilter[]): string {
  if (!filters?.length) {
    return '';
  }
  return JSON.stringify(filters);
}

export function getEffectiveDateRange(
  dateRange: DateRange,
  strategy: DateRangeStrategy | undefined,
): DateRange {
  if (strategy !== 'ytd_to_end') {
    return dateRange;
  }
  return {
    startDate: `${dateRange.endDate.slice(0, 4)}-01-01`,
    endDate: dateRange.endDate,
  };
}

export function getSnapshotGroups(tileIds: string[]): SnapshotGroup[] {
  const groups = new Map<string, SnapshotGroup>();

  for (const tileId of tileIds) {
    const semantic = getSemanticTileSpec(tileId);
    const key = `${semantic.dateDimension}:${semantic.dateRangeStrategy ?? 'selected'}:${buildFilterSignature(semantic.extraFilters)}`;
    const group = groups.get(key) ?? {
      dateDimension: semantic.dateDimension,
      extraFilters: semantic.extraFilters,
      dateRangeStrategy: semantic.dateRangeStrategy,
      tiles: [],
    };
    group.tiles.push({ ...semantic, tileId });
    groups.set(key, group);
  }

  return [...groups.values()];
}
```

- [ ] **Step 2: Create semantic-filters.ts**

```typescript
// packages/dashboard-constants/src/semantic-filters.ts

import type { SemanticFilter } from './semantic-types';
import type { Category, GlobalFilterKey } from './categories';
import { FILTER_DIMENSIONS } from './filters';

export type DashboardFilters = Partial<Record<GlobalFilterKey, string[]>>;

export function buildSemanticFilters(
  filters: DashboardFilters,
  category: Category,
): SemanticFilter[] {
  const semanticFilters: SemanticFilter[] = [];

  if (category !== 'Total') {
    semanticFilters.push({
      field: 'dashboard_category',
      operator: 'equals',
      values: [category],
    });
  }

  for (const [key, values] of Object.entries(filters)) {
    if (!values?.length) {
      continue;
    }
    const dimension = FILTER_DIMENSIONS[key as GlobalFilterKey];
    if (!dimension) {
      continue;
    }
    semanticFilters.push({
      field: dimension,
      operator: 'equals',
      values,
    });
  }

  return semanticFilters;
}
```

- [ ] **Step 3: Add re-exports to index.ts**

Add to `packages/dashboard-constants/src/index.ts`:

```typescript
export {
  buildFilterSignature,
  getEffectiveDateRange,
  getSnapshotGroups,
} from './semantic-grouping';

export {
  buildSemanticFilters,
  type DashboardFilters,
} from './semantic-filters';
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `cd packages/dashboard-constants && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add packages/dashboard-constants/src/semantic-grouping.ts packages/dashboard-constants/src/semantic-filters.ts packages/dashboard-constants/src/index.ts
git commit -m "feat(dashboard-constants): extract grouping logic and semantic filter builder"
```

---

## Task 4: Refactor Production semantic-registry.ts to Import from Shared Package

**Files:**
- Modify: `apps/analytics-suite/lib/dashboard-v2/semantic-registry.ts`
- Modify: `apps/analytics-suite/lib/dashboard/contracts.ts`

- [ ] **Step 1: Refactor semantic-registry.ts**

Replace inline definitions with imports from `@por/dashboard-constants`. Keep query builder functions (`buildSnapshotGroupQuery`, `buildTrendQuery`, `buildClosedWonQuery`, `buildFilterDictionaryQuery`) in place — they produce `SemanticQueryRequest` objects specific to the production runtime.

The key changes:
- Remove `CLOSED_WON_FILTERS`, `CLOSED_WON_POSITIVE_ACV_FILTERS`, `WON_POSITIVE_ACV_FILTERS` definitions (import from shared)
- Remove `CLOSED_WON_DIMENSIONS` definition (import from shared)
- Remove `TILE_SPECS` and `TileSemanticSpec` definitions (import from shared)
- Remove `getSemanticTileSpec()` (import from shared)
- Remove `buildFilterSignature()` and `getEffectiveDateRange()` (import from shared)
- Import `buildSemanticFilters` from shared (replace local implementation)
- Change `getSnapshotGroups(category)` to use `getSnapshotGroups(tileIds)` from shared, wrapping with `getCategoryTiles(category).map(t => t.tileId)`
- Keep `buildSnapshotGroupQuery()`, `buildTrendQuery()`, `buildClosedWonQuery()`, `buildFilterDictionaryQuery()` — they call the shared functions but produce `SemanticQueryRequest` output

The refactored file should import from `@por/dashboard-constants` and re-export anything that other production files depend on. Refer to the current file at `apps/analytics-suite/lib/dashboard-v2/semantic-registry.ts` for the exact function signatures that consumers expect.

- [ ] **Step 2: Update contracts.ts to import DateRange and DashboardFilters**

In `apps/analytics-suite/lib/dashboard/contracts.ts`, import `DateRange` and `DashboardFilters` from the shared package and re-export them so existing imports continue to work:

```typescript
// At the top of contracts.ts, replace the local DateRange definition:
import type { DateRange, DashboardFilters } from '@por/dashboard-constants';
export type { DateRange, DashboardFilters };
```

Remove the local `DateRange` and `DashboardFilters` type definitions. Keep all other types (`CategorySnapshotPayload`, `TileTrendPayload`, etc.) unchanged.

- [ ] **Step 3: Run the full analytics-suite test suite**

Run: `pnpm suite:test`
Expected: All 57 tests pass. If any `getSnapshotGroups` calls fail, they need to be updated — see Task 5.

- [ ] **Step 4: Commit**

```bash
git add apps/analytics-suite/lib/dashboard-v2/semantic-registry.ts apps/analytics-suite/lib/dashboard/contracts.ts
git commit -m "refactor(analytics-suite): import tile specs from @por/dashboard-constants"
```

---

## Task 5: Update Analytics-Suite Tests for New getSnapshotGroups Signature

**Files:**
- Modify: `apps/analytics-suite/__tests__/semantic-registry-total-metrics.test.ts`
- Modify: `apps/analytics-suite/__tests__/semantic-registry-expansion-bookings.test.ts`
- Modify: `apps/analytics-suite/__tests__/semantic-registry-expansion-metrics.test.ts`
- Modify: Any other test files that call `getSnapshotGroups(category)`

- [ ] **Step 1: Update test imports and calls**

The tests currently call `getSnapshotGroups('Total')` which accepts a `Category`. After the refactor, the shared function takes `string[]` tile IDs. The production `semantic-registry.ts` should re-export a wrapper that preserves the old `getSnapshotGroups(category)` signature by calling `getCategoryTiles(category).map(t => t.tileId)` and passing to the shared function.

If the production module re-exports a category-accepting wrapper, no test changes needed. If not, update each test to pass tile IDs:

```typescript
import { getCategoryTiles } from '@/lib/dashboard/catalog';
import { getSnapshotGroups } from '@por/dashboard-constants';

// Before: getSnapshotGroups('Total')
// After:  getSnapshotGroups(getCategoryTiles('Total').map(t => t.tileId))
```

Check all 5 test files listed above and any others that call `getSnapshotGroups`.

- [ ] **Step 2: Run the full test suite**

Run: `pnpm suite:test`
Expected: All 57 tests pass

- [ ] **Step 3: Commit**

```bash
git add apps/analytics-suite/__tests__/
git commit -m "test(analytics-suite): update tests for parameterized getSnapshotGroups"
```

---

## Task 6: Build v2 Query Builder in Challenger

**Files:**
- Create: `apps/challenger/lib/v2-query-builder.ts`

- [ ] **Step 1: Write the v2 query builder**

This translates shared `SemanticFilter`/`TileSemanticSpec` into Lightdash `MetricQuery` format. The translation is mechanical — field IDs get prefixed with explore name, operator names get mapped.

```typescript
// apps/challenger/lib/v2-query-builder.ts

import type { MetricQueryRequest, MetricQueryFilters } from './types';
import {
  DASHBOARD_V2_BASE_MODEL,
  DASHBOARD_V2_CLOSED_WON_MODEL,
  CLOSED_WON_DIMENSIONS,
  getSemanticTileSpec,
  getSnapshotGroups,
  getEffectiveDateRange,
  buildSemanticFilters,
  type SemanticFilter,
  type DateRange,
  type DashboardFilters,
  type Category,
  type SnapshotGroup,
} from '@por/dashboard-constants';

function buildFieldId(model: string, field: string): string {
  return `${model}_${field}`;
}

// Map SemanticFilter operator names to Lightdash MetricQuery operator names
function mapOperator(semanticOp: string): string {
  if (semanticOp === 'between') return 'inBetween';
  return semanticOp;
}

// Convert SemanticFilter[] to Lightdash MetricQueryFilters for a given model
function toMetricQueryFilters(
  model: string,
  semanticFilters: SemanticFilter[],
): MetricQueryFilters {
  return {
    dimensions: {
      id: 'root',
      and: semanticFilters.map((f, i) => ({
        id: `f${i}`,
        target: { fieldId: buildFieldId(model, f.field) },
        operator: mapOperator(f.operator),
        values: f.values,
      })),
    },
  };
}

export function buildV2SnapshotGroupQuery(
  category: Category,
  filters: DashboardFilters,
  dateRange: DateRange,
  group: SnapshotGroup,
): MetricQueryRequest {
  const effectiveDateRange = getEffectiveDateRange(
    dateRange,
    group.dateRangeStrategy,
  );

  const semanticFilters: SemanticFilter[] = [
    ...buildSemanticFilters(filters, category),
    ...(group.extraFilters ?? []),
    {
      field: group.dateDimension,
      operator: 'between',
      values: [effectiveDateRange.startDate, effectiveDateRange.endDate],
    },
  ];

  return {
    exploreName: DASHBOARD_V2_BASE_MODEL,
    metrics: group.tiles.map((tile) =>
      buildFieldId(DASHBOARD_V2_BASE_MODEL, tile.measure),
    ),
    dimensions: [],
    filters: toMetricQueryFilters(DASHBOARD_V2_BASE_MODEL, semanticFilters),
    sorts: [],
    limit: 1,
    tableCalculations: [],
  };
}

export function buildV2TrendQuery(
  category: Category,
  tileId: string,
  filters: DashboardFilters,
  dateRange: DateRange,
): MetricQueryRequest {
  const semantic = getSemanticTileSpec(tileId);
  const effectiveDateRange = getEffectiveDateRange(
    dateRange,
    semantic.dateRangeStrategy,
  );

  const semanticFilters: SemanticFilter[] = [
    ...buildSemanticFilters(filters, category),
    ...(semantic.extraFilters ?? []),
    {
      field: semantic.dateDimension,
      operator: 'between',
      values: [effectiveDateRange.startDate, effectiveDateRange.endDate],
    },
  ];

  const weekDimension = `${semantic.dateDimension}_week`;

  return {
    exploreName: DASHBOARD_V2_BASE_MODEL,
    metrics: [buildFieldId(DASHBOARD_V2_BASE_MODEL, semantic.measure)],
    dimensions: [buildFieldId(DASHBOARD_V2_BASE_MODEL, weekDimension)],
    filters: toMetricQueryFilters(DASHBOARD_V2_BASE_MODEL, semanticFilters),
    sorts: [
      {
        fieldId: buildFieldId(DASHBOARD_V2_BASE_MODEL, weekDimension),
        descending: false,
      },
    ],
    limit: 500,
    tableCalculations: [],
  };
}

export function buildV2ClosedWonQuery(
  category: Category,
  filters: DashboardFilters,
  dateRange: DateRange,
): MetricQueryRequest {
  const semanticFilters: SemanticFilter[] = [
    ...buildSemanticFilters(filters, category),
    {
      field: 'close_date',
      operator: 'between',
      values: [dateRange.startDate, dateRange.endDate],
    },
  ];

  return {
    exploreName: DASHBOARD_V2_CLOSED_WON_MODEL,
    metrics: [],
    dimensions: CLOSED_WON_DIMENSIONS.map((d) =>
      buildFieldId(DASHBOARD_V2_CLOSED_WON_MODEL, d),
    ),
    filters: toMetricQueryFilters(DASHBOARD_V2_CLOSED_WON_MODEL, semanticFilters),
    sorts: [
      {
        fieldId: buildFieldId(DASHBOARD_V2_CLOSED_WON_MODEL, 'close_date'),
        descending: true,
      },
    ],
    limit: 500,
    tableCalculations: [],
  };
}

// Re-export for convenience
export {
  getSnapshotGroups,
  getSemanticTileSpec,
  DASHBOARD_V2_BASE_MODEL,
  DASHBOARD_V2_CLOSED_WON_MODEL,
  CLOSED_WON_DIMENSIONS,
  type SnapshotGroup,
  type Category,
  type DashboardFilters,
  type DateRange,
};
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd apps/challenger && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/challenger/lib/v2-query-builder.ts
git commit -m "feat(challenger): add v2 query builder using shared tile specs"
```

---

## Task 7: Build Scorecard Loader

**Files:**
- Create: `apps/challenger/lib/scorecard-loader.ts`

- [ ] **Step 1: Write the scorecard loader**

Uses `getSnapshotGroups()` to group tiles, then executes two queries per group (current + previous window) via `executeMetricQuery`.

```typescript
// apps/challenger/lib/scorecard-loader.ts

import { unstable_cache } from 'next/cache';
import { executeMetricQuery, createCallTracker } from './lightdash-v2-client';
import {
  buildV2SnapshotGroupQuery,
  getSnapshotGroups,
  type Category,
  type DashboardFilters,
  type DateRange,
  type SnapshotGroup,
} from './v2-query-builder';
import type { CacheMode } from './cache-mode';
import type { QueryResultPage, ResultRow } from './types';

export type ScorecardTileResult = {
  tileId: string;
  measure: string;
  currentValue: string;
  previousValue: string;
  pctChange: string;
};

export type ScorecardResult = {
  category: Category;
  tiles: ScorecardTileResult[];
  durationMs: number;
  queryCount: number;
};

function extractTileValues(
  group: SnapshotGroup,
  row: ResultRow | undefined,
  model: string,
): Map<string, string> {
  const values = new Map<string, string>();
  if (!row) return values;

  for (const tile of group.tiles) {
    const fieldId = `${model}_${tile.measure}`;
    const cell = row[fieldId];
    values.set(tile.tileId, cell?.value?.formatted ?? '—');
  }
  return values;
}

function computePctChange(current: string, previous: string): string {
  const c = parseFloat(current.replace(/[^0-9.\-]/g, ''));
  const p = parseFloat(previous.replace(/[^0-9.\-]/g, ''));
  if (isNaN(c) || isNaN(p) || p === 0) return '—';
  const pct = ((c - p) / Math.abs(p)) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

async function loadScorecardInner(
  category: Category,
  tileIds: string[],
  filters: DashboardFilters,
  dateRange: DateRange,
  previousDateRange: DateRange,
): Promise<ScorecardResult> {
  const start = performance.now();
  const tracker = createCallTracker();
  const groups = getSnapshotGroups(tileIds);

  const groupResults = await Promise.all(
    groups.map(async (group) => {
      const [current, previous] = await Promise.all([
        tracker.track(
          executeMetricQuery(
            buildV2SnapshotGroupQuery(category, filters, dateRange, group),
          ),
        ),
        tracker.track(
          executeMetricQuery(
            buildV2SnapshotGroupQuery(
              category,
              filters,
              previousDateRange,
              group,
            ),
          ),
        ),
      ]);
      return { group, current, previous };
    }),
  );

  const tiles: ScorecardTileResult[] = [];

  for (const { group, current, previous } of groupResults) {
    const model = 'sales_dashboard_v2_opportunity_base';
    const currentValues = extractTileValues(group, current.rows[0], model);
    const previousValues = extractTileValues(group, previous.rows[0], model);

    for (const tile of group.tiles) {
      const cv = currentValues.get(tile.tileId) ?? '—';
      const pv = previousValues.get(tile.tileId) ?? '—';
      tiles.push({
        tileId: tile.tileId,
        measure: tile.measure,
        currentValue: cv,
        previousValue: pv,
        pctChange: computePctChange(cv, pv),
      });
    }
  }

  return {
    category,
    tiles,
    durationMs: performance.now() - start,
    queryCount: tracker.getStats().actualCallCount,
  };
}

export function loadScorecard(
  category: Category,
  tileIds: string[],
  filters: DashboardFilters,
  dateRange: DateRange,
  previousDateRange: DateRange,
  cacheMode: CacheMode,
): Promise<ScorecardResult> {
  if (cacheMode === 'off') {
    return loadScorecardInner(
      category,
      tileIds,
      filters,
      dateRange,
      previousDateRange,
    );
  }

  const cached = unstable_cache(
    () =>
      loadScorecardInner(
        category,
        tileIds,
        filters,
        dateRange,
        previousDateRange,
      ),
    [`challenger-scorecard-${category}`],
    { revalidate: 60, tags: [`challenger-scorecard-${category}`] },
  );
  return cached();
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd apps/challenger && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/challenger/lib/scorecard-loader.ts
git commit -m "feat(challenger): add scorecard loader using shared snapshot groups"
```

---

## Task 8: Build Trend Loader

**Files:**
- Create: `apps/challenger/lib/trend-loader.ts`

- [ ] **Step 1: Write the trend loader**

Loads weekly trend data for a tile's default metric, for both current and previous windows.

```typescript
// apps/challenger/lib/trend-loader.ts

import { unstable_cache } from 'next/cache';
import { executeMetricQuery, createCallTracker } from './lightdash-v2-client';
import {
  buildV2TrendQuery,
  getSemanticTileSpec,
  DASHBOARD_V2_BASE_MODEL,
  type Category,
  type DashboardFilters,
  type DateRange,
} from './v2-query-builder';
import type { CacheMode } from './cache-mode';
import type { ResultRow } from './types';

export type TrendPoint = {
  week: string;
  value: string;
};

export type TrendResult = {
  category: Category;
  tileId: string;
  currentPoints: TrendPoint[];
  previousPoints: TrendPoint[];
  durationMs: number;
  queryCount: number;
};

function extractTrendPoints(
  rows: ResultRow[],
  model: string,
  measure: string,
  dateDimension: string,
): TrendPoint[] {
  const weekField = `${model}_${dateDimension}_week`;
  const measureField = `${model}_${measure}`;

  return rows.map((row) => ({
    week: row[weekField]?.value?.formatted ?? '—',
    value: row[measureField]?.value?.formatted ?? '—',
  }));
}

async function loadTrendInner(
  category: Category,
  tileId: string,
  filters: DashboardFilters,
  dateRange: DateRange,
  previousDateRange: DateRange,
): Promise<TrendResult> {
  const start = performance.now();
  const tracker = createCallTracker();

  const [current, previous] = await Promise.all([
    tracker.track(
      executeMetricQuery(
        buildV2TrendQuery(category, tileId, filters, dateRange),
      ),
    ),
    tracker.track(
      executeMetricQuery(
        buildV2TrendQuery(category, tileId, filters, previousDateRange),
      ),
    ),
  ]);

  const spec = getSemanticTileSpec(tileId);

  return {
    category,
    tileId,
    currentPoints: extractTrendPoints(
      current.rows,
      DASHBOARD_V2_BASE_MODEL,
      spec.measure,
      spec.dateDimension,
    ),
    previousPoints: extractTrendPoints(
      previous.rows,
      DASHBOARD_V2_BASE_MODEL,
      spec.measure,
      spec.dateDimension,
    ),
    durationMs: performance.now() - start,
    queryCount: tracker.getStats().actualCallCount,
  };
}

export function loadTrend(
  category: Category,
  tileId: string,
  filters: DashboardFilters,
  dateRange: DateRange,
  previousDateRange: DateRange,
  cacheMode: CacheMode,
): Promise<TrendResult> {
  if (cacheMode === 'off') {
    return loadTrendInner(category, tileId, filters, dateRange, previousDateRange);
  }

  const cached = unstable_cache(
    () => loadTrendInner(category, tileId, filters, dateRange, previousDateRange),
    [`challenger-trend-${category}-${tileId}`],
    { revalidate: 60, tags: [`challenger-trend-${category}`] },
  );
  return cached();
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd apps/challenger && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/challenger/lib/trend-loader.ts
git commit -m "feat(challenger): add trend loader for weekly tile trends"
```

---

## Task 9: Build Closed-Won Loader

**Files:**
- Create: `apps/challenger/lib/closed-won-loader.ts`

- [ ] **Step 1: Write the closed-won loader**

```typescript
// apps/challenger/lib/closed-won-loader.ts

import { unstable_cache } from 'next/cache';
import { executeMetricQuery, createCallTracker } from './lightdash-v2-client';
import {
  buildV2ClosedWonQuery,
  DASHBOARD_V2_CLOSED_WON_MODEL,
  CLOSED_WON_DIMENSIONS,
  type Category,
  type DashboardFilters,
  type DateRange,
} from './v2-query-builder';
import type { CacheMode } from './cache-mode';
import type { ResultRow } from './types';

export type ClosedWonRow = Record<string, string>;

export type ClosedWonResult = {
  category: Category;
  rows: ClosedWonRow[];
  durationMs: number;
  queryCount: number;
};

function extractClosedWonRows(rows: ResultRow[]): ClosedWonRow[] {
  return rows.map((row) => {
    const out: ClosedWonRow = {};
    for (const dim of CLOSED_WON_DIMENSIONS) {
      const fieldId = `${DASHBOARD_V2_CLOSED_WON_MODEL}_${dim}`;
      out[dim] = row[fieldId]?.value?.formatted ?? '—';
    }
    return out;
  });
}

async function loadClosedWonInner(
  category: Category,
  filters: DashboardFilters,
  dateRange: DateRange,
): Promise<ClosedWonResult> {
  const start = performance.now();
  const tracker = createCallTracker();

  const result = await tracker.track(
    executeMetricQuery(buildV2ClosedWonQuery(category, filters, dateRange)),
  );

  return {
    category,
    rows: extractClosedWonRows(result.rows),
    durationMs: performance.now() - start,
    queryCount: tracker.getStats().actualCallCount,
  };
}

export function loadClosedWon(
  category: Category,
  filters: DashboardFilters,
  dateRange: DateRange,
  cacheMode: CacheMode,
): Promise<ClosedWonResult> {
  if (cacheMode === 'off') {
    return loadClosedWonInner(category, filters, dateRange);
  }

  const cached = unstable_cache(
    () => loadClosedWonInner(category, filters, dateRange),
    [`challenger-closed-won-${category}`],
    { revalidate: 60, tags: [`challenger-closed-won-${category}`] },
  );
  return cached();
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd apps/challenger && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/challenger/lib/closed-won-loader.ts
git commit -m "feat(challenger): add closed-won opportunities loader"
```

---

## Task 10: Build Server Components for Scorecard, Trend, and Closed-Won

**Files:**
- Create: `apps/challenger/components/category-scorecard.tsx`
- Create: `apps/challenger/components/category-trend.tsx`
- Create: `apps/challenger/components/closed-won-table.tsx`

- [ ] **Step 1: Create category-scorecard.tsx**

```tsx
// apps/challenger/components/category-scorecard.tsx

import { loadScorecard } from '../lib/scorecard-loader';
import { TILE_CATALOG } from '../lib/tile-catalog';
import { defaultDateRange, defaultPreviousDateRange } from '../lib/query-builder';
import type { CacheMode } from '../lib/cache-mode';
import type { Category } from '@por/dashboard-constants';

type Props = { category: Category; cacheMode: CacheMode };

export async function CategoryScorecard({ category, cacheMode }: Props) {
  const tileIds = TILE_CATALOG[category].map((t) => t.tileId);
  const result = await loadScorecard(
    category,
    tileIds,
    {},
    defaultDateRange(),
    defaultPreviousDateRange(),
    cacheMode,
  );

  return (
    <div>
      <h3>
        {category} Scorecard ({result.tiles.length} tiles, {result.queryCount}{' '}
        queries, {Math.round(result.durationMs)}ms)
      </h3>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #ccc' }}>Tile ID</th>
            <th style={{ textAlign: 'right', padding: '4px 8px', borderBottom: '1px solid #ccc' }}>Current</th>
            <th style={{ textAlign: 'right', padding: '4px 8px', borderBottom: '1px solid #ccc' }}>Previous</th>
            <th style={{ textAlign: 'right', padding: '4px 8px', borderBottom: '1px solid #ccc' }}>% Change</th>
          </tr>
        </thead>
        <tbody>
          {result.tiles.map((tile) => (
            <tr key={tile.tileId}>
              <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee' }}>{tile.tileId}</td>
              <td style={{ textAlign: 'right', padding: '4px 8px', borderBottom: '1px solid #eee' }}>{tile.currentValue}</td>
              <td style={{ textAlign: 'right', padding: '4px 8px', borderBottom: '1px solid #eee' }}>{tile.previousValue}</td>
              <td style={{ textAlign: 'right', padding: '4px 8px', borderBottom: '1px solid #eee' }}>{tile.pctChange}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Create a local tile catalog for the challenger**

The challenger needs tile IDs per category to pass to `getSnapshotGroups()` and to know which default tile to use for trends. Create a minimal catalog:

```typescript
// apps/challenger/lib/tile-catalog.ts

import type { Category } from '@por/dashboard-constants';

type TileCatalogEntry = { tileId: string; label: string };

// Mirrors apps/analytics-suite/lib/dashboard/catalog.ts TILE_CATALOG
// Only tileId and label — no formatType/sortOrder needed for 4b-1
export const TILE_CATALOG: Record<Category, TileCatalogEntry[]> = {
  'New Logo': [
    { tileId: 'new_logo_bookings_amount', label: 'Bookings $' },
    { tileId: 'new_logo_bookings_count', label: 'Bookings #' },
    { tileId: 'new_logo_annual_pacing_ytd', label: 'Annual Pacing (YTD)' },
    { tileId: 'new_logo_close_rate', label: 'Close Rate' },
    { tileId: 'new_logo_avg_age', label: 'Avg Age' },
    { tileId: 'new_logo_avg_booked_deal', label: 'Avg Booked Deal' },
    { tileId: 'new_logo_avg_quoted_deal', label: 'Avg Quoted Deal' },
    { tileId: 'new_logo_pipeline_created', label: 'Pipeline Created' },
    { tileId: 'new_logo_sql', label: 'SQL' },
    { tileId: 'new_logo_sqo', label: 'SQO' },
    { tileId: 'new_logo_gate_1_complete', label: 'Gate 1 Complete' },
    { tileId: 'new_logo_sdr_points', label: 'SDR Points' },
    { tileId: 'new_logo_sqo_users', label: 'SQO Users' },
  ],
  Expansion: [
    { tileId: 'expansion_bookings_amount', label: 'Bookings $' },
    { tileId: 'expansion_bookings_count', label: 'Bookings #' },
    { tileId: 'expansion_annual_pacing_ytd', label: 'Annual Pacing (YTD)' },
    { tileId: 'expansion_close_rate', label: 'Close Rate' },
    { tileId: 'expansion_avg_age', label: 'Avg Age' },
    { tileId: 'expansion_avg_booked_deal', label: 'Avg Booked Deal' },
    { tileId: 'expansion_avg_quoted_deal', label: 'Avg Quoted Deal' },
    { tileId: 'expansion_pipeline_created', label: 'Pipeline Created' },
    { tileId: 'expansion_sql', label: 'SQL' },
    { tileId: 'expansion_sqo', label: 'SQO' },
  ],
  Migration: [
    { tileId: 'migration_bookings_amount', label: 'Bookings $' },
    { tileId: 'migration_bookings_count', label: 'Bookings #' },
    { tileId: 'migration_annual_pacing_ytd', label: 'Annual Pacing (YTD)' },
    { tileId: 'migration_close_rate', label: 'Close Rate' },
    { tileId: 'migration_avg_age', label: 'Avg Age' },
    { tileId: 'migration_avg_booked_deal', label: 'Avg Booked Deal' },
    { tileId: 'migration_avg_quoted_deal', label: 'Avg Quoted Deal' },
    { tileId: 'migration_pipeline_created', label: 'Pipeline Created' },
    { tileId: 'migration_sql', label: 'SQL' },
    { tileId: 'migration_sqo', label: 'SQO' },
    { tileId: 'migration_sal', label: 'SAL' },
    { tileId: 'migration_avg_users', label: 'Avg Users' },
  ],
  Renewal: [
    { tileId: 'renewal_bookings_amount', label: 'Bookings $' },
    { tileId: 'renewal_bookings_count', label: 'Bookings #' },
    { tileId: 'renewal_annual_pacing_ytd', label: 'Annual Pacing (YTD)' },
    { tileId: 'renewal_close_rate', label: 'Close Rate' },
    { tileId: 'renewal_avg_age', label: 'Avg Age' },
    { tileId: 'renewal_avg_booked_deal', label: 'Avg Booked Deal' },
    { tileId: 'renewal_avg_quoted_deal', label: 'Avg Quoted Deal' },
    { tileId: 'renewal_pipeline_created', label: 'Pipeline Created' },
    { tileId: 'renewal_sql', label: 'SQL' },
  ],
  Total: [
    { tileId: 'total_bookings_amount', label: 'Bookings $' },
    { tileId: 'total_bookings_count', label: 'Bookings #' },
    { tileId: 'total_annual_pacing_ytd', label: 'Annual Pacing (YTD)' },
    { tileId: 'total_one_time_revenue', label: 'One-time Revenue' },
  ],
};

export function getDefaultTileId(category: Category): string {
  return TILE_CATALOG[category][0]?.tileId ?? '';
}
```

- [ ] **Step 3: Create category-trend.tsx**

```tsx
// apps/challenger/components/category-trend.tsx

import { loadTrend } from '../lib/trend-loader';
import { getDefaultTileId } from '../lib/tile-catalog';
import { defaultDateRange, defaultPreviousDateRange } from '../lib/query-builder';
import type { CacheMode } from '../lib/cache-mode';
import type { Category } from '@por/dashboard-constants';

type Props = { category: Category; cacheMode: CacheMode };

export async function CategoryTrend({ category, cacheMode }: Props) {
  const tileId = getDefaultTileId(category);
  const result = await loadTrend(
    category,
    tileId,
    {},
    defaultDateRange(),
    defaultPreviousDateRange(),
    cacheMode,
  );

  return (
    <div>
      <h3>
        {category} Trend: {tileId} ({result.queryCount} queries,{' '}
        {Math.round(result.durationMs)}ms)
      </h3>
      <div style={{ display: 'flex', gap: '24px' }}>
        <table style={{ borderCollapse: 'collapse' }}>
          <caption style={{ fontWeight: 'bold', marginBottom: '4px' }}>Current</caption>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #ccc' }}>Week</th>
              <th style={{ textAlign: 'right', padding: '4px 8px', borderBottom: '1px solid #ccc' }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {result.currentPoints.map((p, i) => (
              <tr key={i}>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee' }}>{p.week}</td>
                <td style={{ textAlign: 'right', padding: '4px 8px', borderBottom: '1px solid #eee' }}>{p.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table style={{ borderCollapse: 'collapse' }}>
          <caption style={{ fontWeight: 'bold', marginBottom: '4px' }}>Previous</caption>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #ccc' }}>Week</th>
              <th style={{ textAlign: 'right', padding: '4px 8px', borderBottom: '1px solid #ccc' }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {result.previousPoints.map((p, i) => (
              <tr key={i}>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee' }}>{p.week}</td>
                <td style={{ textAlign: 'right', padding: '4px 8px', borderBottom: '1px solid #eee' }}>{p.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create closed-won-table.tsx**

```tsx
// apps/challenger/components/closed-won-table.tsx

import { loadClosedWon } from '../lib/closed-won-loader';
import { defaultDateRange } from '../lib/query-builder';
import { CLOSED_WON_DIMENSIONS } from '@por/dashboard-constants';
import type { CacheMode } from '../lib/cache-mode';
import type { Category } from '@por/dashboard-constants';

type Props = { category: Category; cacheMode: CacheMode };

export async function ClosedWonTable({ category, cacheMode }: Props) {
  const result = await loadClosedWon(
    category,
    {},
    defaultDateRange(),
    cacheMode,
  );

  return (
    <div>
      <h3>
        {category} Closed Won ({result.rows.length} rows, {result.queryCount}{' '}
        queries, {Math.round(result.durationMs)}ms)
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              {CLOSED_WON_DIMENSIONS.map((dim) => (
                <th key={dim} style={{ textAlign: 'left', padding: '4px 6px', borderBottom: '1px solid #ccc', whiteSpace: 'nowrap' }}>
                  {dim}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, i) => (
              <tr key={i}>
                {CLOSED_WON_DIMENSIONS.map((dim) => (
                  <td key={dim} style={{ padding: '4px 6px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }}>
                    {row[dim] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify TypeScript compilation**

Run: `cd apps/challenger && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/challenger/components/category-scorecard.tsx apps/challenger/components/category-trend.tsx apps/challenger/components/closed-won-table.tsx apps/challenger/lib/tile-catalog.ts
git commit -m "feat(challenger): add scorecard, trend, and closed-won server components"
```

---

## Task 11: Update Challenger Page to Render Full Data Parity

**Files:**
- Modify: `apps/challenger/app/page.tsx`

- [ ] **Step 1: Update page.tsx to render all categories**

Replace the current page with the streaming data parity layout. Keep the existing overview board and filter bar, add per-category scorecard/trend/closed-won sections.

```tsx
// apps/challenger/app/page.tsx

import { Suspense } from 'react';
import { parseCacheMode } from '../lib/cache-mode';
import { FilterBar } from '../components/filter-bar';
import { OverviewBoard } from '../components/overview-board';
import { CategoryScorecard } from '../components/category-scorecard';
import { CategoryTrend } from '../components/category-trend';
import { ClosedWonTable } from '../components/closed-won-table';
import { CATEGORY_ORDER, type Category } from '@por/dashboard-constants';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  const cacheMode = parseCacheMode(
    typeof params.cacheMode === 'string' ? params.cacheMode : undefined,
  );

  return (
    <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px' }}>
      <h1>Sales Performance — Full Data Parity</h1>
      <p style={{ color: '#666' }}>
        Cache mode: <code>{cacheMode}</code>
      </p>

      <Suspense fallback={<p>Loading filters...</p>}>
        <FilterBar cacheMode={cacheMode} />
      </Suspense>

      <Suspense fallback={<p>Loading overview...</p>}>
        <OverviewBoard cacheMode={cacheMode} />
      </Suspense>

      {CATEGORY_ORDER.map((category) => (
        <section key={category} style={{ marginTop: '32px' }}>
          <h2 style={{ borderBottom: '2px solid #333', paddingBottom: '8px' }}>
            {category}
          </h2>

          <Suspense fallback={<p>Loading {category} scorecard...</p>}>
            <CategoryScorecard
              category={category as Category}
              cacheMode={cacheMode}
            />
          </Suspense>

          <Suspense fallback={<p>Loading {category} trend...</p>}>
            <CategoryTrend
              category={category as Category}
              cacheMode={cacheMode}
            />
          </Suspense>

          <Suspense fallback={<p>Loading {category} closed-won...</p>}>
            <ClosedWonTable
              category={category as Category}
              cacheMode={cacheMode}
            />
          </Suspense>
        </section>
      ))}
    </main>
  );
}
```

- [ ] **Step 2: Build and verify**

Run: `cd apps/challenger && npx next build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Commit**

```bash
git add apps/challenger/app/page.tsx
git commit -m "feat(challenger): render full data parity page with all categories"
```

---

## Task 12: Run Full Validation

**Files:** No new files

- [ ] **Step 1: Run analytics-suite tests**

Run: `pnpm suite:test`
Expected: All tests pass (57/57 or more)

- [ ] **Step 2: Build challenger**

Run: `pnpm challenger:build`
Expected: Build succeeds

- [ ] **Step 3: Start challenger and verify page renders**

Run: `cd apps/challenger && npx next start -p 3500`
Then in a separate terminal: `curl -s http://localhost:3500/?cacheMode=off | head -100`
Expected: HTML output with category scorecard tables, trend tables, and closed-won tables streaming in

- [ ] **Step 4: Spot-check data correctness**

Start both apps and compare a few tile values:
- Production: `curl -s 'http://localhost:3300/api/dashboard-v2/category/New%20Logo?startDate=2026-01-01&endDate=2026-03-28&previousStartDate=2025-01-01&previousEndDate=2025-03-28'`
- Challenger: Check the rendered HTML for New Logo scorecard

Verify at least:
1. `new_logo_bookings_amount` current and previous values match
2. `expansion_bookings_amount` includes closed-won filters (value differs from unfiltered)
3. `total_annual_pacing_ytd` uses YTD date normalization (Jan 1 start)
4. Closed-won table has rows with account_name, close_date, acv columns

- [ ] **Step 5: Commit any fixes, then final commit**

```bash
git add -A
git commit -m "feat(challenger): Phase 4b-1 data layer parity complete"
```
