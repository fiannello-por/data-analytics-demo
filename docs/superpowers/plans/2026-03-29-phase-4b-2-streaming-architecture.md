# Phase 4b-2: Streaming Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tab-scoped streaming dashboard with priority-ordered loading, interactive filters, trend charts, server-side closed-won pagination, and a telemetry waterfall — meeting < 4s per-tab load on all 6 tabs.

**Architecture:** Single `page.tsx` server component reads URL search params (`tab`, filters, date range, pagination, sort). Eagerly creates loader promises in manifest priority order, passes them to Suspense-wrapped child components. Filter bar renders shell immediately, options stream last. Trend charts via recharts client component. Closed-won uses Lightdash v2 cursor-based pagination.

**Tech Stack:** Next.js 15, React 19, TypeScript, recharts, `@por/dashboard-constants`, Playwright

**Prerequisite:** Phase 4b-1 complete (shared tile specs, v2 query builder, all loaders working).

---

## File Map

### New files

| File | Responsibility |
|------|---------------|
| `apps/challenger/lib/url-state.ts` | Parse/serialize dashboard state from URL search params |
| `apps/challenger/lib/tab-manifest.ts` | Declarative per-tab section manifests with priority ordering |
| `apps/challenger/components/tab-bar.tsx` | Tab navigation links (server component) |
| `apps/challenger/components/filter-bar-shell.tsx` | Synchronous filter layout with disabled dropdowns |
| `apps/challenger/components/filter-bar-options.tsx` | Async server component loading dictionary options |
| `apps/challenger/components/filter-dropdown.tsx` | `"use client"` dropdown with checkbox selection + apply URL |
| `apps/challenger/components/trend-chart.tsx` | `"use client"` recharts line chart |
| `apps/challenger/components/closed-won-pagination.tsx` | Server component: prev/next page links |
| `apps/challenger/components/closed-won-sort-header.tsx` | Column header links for sorting |
| `apps/challenger/lib/waterfall-types.ts` | QuerySpan type and telemetry serialization helpers |
| `apps/challenger/app/waterfall/page.tsx` | `"use client"` dev route rendering waterfall chart |

### Modified files

| File | Change |
|------|--------|
| `apps/challenger/app/page.tsx` | Tab-scoped rendering with priority-ordered promises |
| `apps/challenger/lib/lightdash-v2-client.ts` | Add waterfall span instrumentation to `executeMetricQuery` |
| `apps/challenger/lib/closed-won-loader.ts` | Add `page`, `pageSize`, `sortField`, `sortDir` params |
| `apps/challenger/lib/v2-query-builder.ts` | Add `sortField`/`sortDir` params to `buildV2ClosedWonQuery` |
| `apps/challenger/components/closed-won-table.tsx` | Use pagination + sort headers |
| `apps/challenger/components/category-trend.tsx` | Render TrendChart instead of HTML table |
| `apps/challenger/components/filter-bar.tsx` | Replace with shell + options pattern |
| `apps/challenger/package.json` | Add recharts dependency |
| `apps/challenger/e2e/benchmark.spec.ts` | Per-tab measurement across all 6 tabs |

---

## Task 1: URL State Parser

**Files:**
- Create: `apps/challenger/lib/url-state.ts`

Parses dashboard state from Next.js `searchParams`. This is the single source of truth for the entire page — every component reads from this parsed state.

- [ ] **Step 1: Create url-state.ts**

```typescript
// apps/challenger/lib/url-state.ts

import {
  CATEGORY_ORDER,
  GLOBAL_FILTER_KEYS,
  type Category,
  type DashboardFilters,
  type DateRange,
  type GlobalFilterKey,
} from '@por/dashboard-constants';

export type DashboardTab = 'Overview' | Category;

export type ClosedWonSort = {
  field: string;
  descending: boolean;
};

export type DashboardUrlState = {
  tab: DashboardTab;
  filters: DashboardFilters;
  dateRange: DateRange;
  previousDateRange: DateRange;
  cwPage: number;
  cwPageSize: number;
  cwSort: ClosedWonSort;
};

function defaultDateRange(): DateRange {
  const now = new Date();
  return {
    startDate: `${now.getFullYear()}-01-01`,
    endDate: now.toISOString().slice(0, 10),
  };
}

function defaultPreviousDateRange(dateRange: DateRange): DateRange {
  const endDate = new Date(dateRange.endDate);
  const year = endDate.getFullYear() - 1;
  const month = String(endDate.getMonth() + 1).padStart(2, '0');
  const day = String(endDate.getDate()).padStart(2, '0');
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-${month}-${day}`,
  };
}

function parseTab(raw: string | undefined): DashboardTab {
  if (!raw) return 'Overview';
  if (raw === 'Overview') return 'Overview';
  if (CATEGORY_ORDER.includes(raw as Category)) return raw as Category;
  return 'Overview';
}

function parseFilters(
  params: Record<string, string | string[] | undefined>,
): DashboardFilters {
  const filters: DashboardFilters = {};
  for (const key of GLOBAL_FILTER_KEYS) {
    const raw = params[key];
    if (!raw) continue;
    const str = typeof raw === 'string' ? raw : raw[0];
    if (!str) continue;
    filters[key] = str.split(',').filter(Boolean);
  }
  return filters;
}

export function parseDashboardUrl(
  params: Record<string, string | string[] | undefined> | undefined,
): DashboardUrlState {
  const p = params ?? {};
  const tab = parseTab(typeof p.tab === 'string' ? p.tab : undefined);

  const startDate = typeof p.startDate === 'string' ? p.startDate : undefined;
  const endDate = typeof p.endDate === 'string' ? p.endDate : undefined;
  const dateRange =
    startDate && endDate ? { startDate, endDate } : defaultDateRange();
  const previousDateRange = defaultPreviousDateRange(dateRange);

  const cwPage = Math.max(1, parseInt(typeof p.cwPage === 'string' ? p.cwPage : '1', 10) || 1);
  const cwPageSize = 50;

  const cwSortField = typeof p.cwSort === 'string' ? p.cwSort : 'close_date';
  const cwSortDir = typeof p.cwDir === 'string' ? p.cwDir : 'desc';

  return {
    tab,
    filters: parseFilters(p),
    dateRange,
    previousDateRange,
    cwPage,
    cwPageSize,
    cwSort: { field: cwSortField, descending: cwSortDir === 'desc' },
  };
}

export function buildTabUrl(
  tab: DashboardTab,
  current: DashboardUrlState,
): string {
  const params = new URLSearchParams();
  params.set('tab', tab);
  if (current.dateRange.startDate !== defaultDateRange().startDate ||
      current.dateRange.endDate !== defaultDateRange().endDate) {
    params.set('startDate', current.dateRange.startDate);
    params.set('endDate', current.dateRange.endDate);
  }
  for (const key of GLOBAL_FILTER_KEYS) {
    const values = current.filters[key];
    if (values?.length) {
      params.set(key, values.join(','));
    }
  }
  return `/?${params.toString()}`;
}

export function buildFilterApplyUrl(
  current: DashboardUrlState,
  newFilters: DashboardFilters,
): string {
  return buildTabUrl(current.tab, { ...current, filters: newFilters });
}

export function buildCwPageUrl(
  current: DashboardUrlState,
  page: number,
): string {
  const params = new URLSearchParams();
  params.set('tab', current.tab);
  for (const key of GLOBAL_FILTER_KEYS) {
    const values = current.filters[key];
    if (values?.length) params.set(key, values.join(','));
  }
  if (current.dateRange.startDate !== defaultDateRange().startDate ||
      current.dateRange.endDate !== defaultDateRange().endDate) {
    params.set('startDate', current.dateRange.startDate);
    params.set('endDate', current.dateRange.endDate);
  }
  params.set('cwPage', String(page));
  params.set('cwSort', current.cwSort.field);
  params.set('cwDir', current.cwSort.descending ? 'desc' : 'asc');
  return `/?${params.toString()}`;
}

export function buildCwSortUrl(
  current: DashboardUrlState,
  field: string,
): string {
  const descending = current.cwSort.field === field ? !current.cwSort.descending : true;
  const params = new URLSearchParams();
  params.set('tab', current.tab);
  for (const key of GLOBAL_FILTER_KEYS) {
    const values = current.filters[key];
    if (values?.length) params.set(key, values.join(','));
  }
  if (current.dateRange.startDate !== defaultDateRange().startDate ||
      current.dateRange.endDate !== defaultDateRange().endDate) {
    params.set('startDate', current.dateRange.startDate);
    params.set('endDate', current.dateRange.endDate);
  }
  params.set('cwSort', field);
  params.set('cwDir', descending ? 'desc' : 'asc');
  // Sort change resets to page 1 — no cwPage param
  return `/?${params.toString()}`;
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd apps/challenger && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/challenger/lib/url-state.ts
git commit -m "feat(challenger): add URL state parser for tab/filter/pagination/sort params"
```

---

## Task 2: Tab Manifest and Tab Bar

**Files:**
- Create: `apps/challenger/lib/tab-manifest.ts`
- Create: `apps/challenger/components/tab-bar.tsx`

- [ ] **Step 1: Create tab-manifest.ts**

```typescript
// apps/challenger/lib/tab-manifest.ts

export type SectionId = 'overview' | 'scorecard' | 'trend' | 'closedWon' | 'filters';

export type SectionEntry = {
  id: SectionId;
  priority: number;
};

export const OVERVIEW_MANIFEST: SectionEntry[] = [
  { id: 'overview', priority: 1 },
  { id: 'filters', priority: 2 },
];

export const CATEGORY_MANIFEST: SectionEntry[] = [
  { id: 'scorecard', priority: 1 },
  { id: 'trend', priority: 2 },
  { id: 'closedWon', priority: 3 },
  { id: 'filters', priority: 4 },
];
```

- [ ] **Step 2: Create tab-bar.tsx**

```tsx
// apps/challenger/components/tab-bar.tsx

import { CATEGORY_ORDER } from '@por/dashboard-constants';
import { buildTabUrl, type DashboardUrlState, type DashboardTab } from '../lib/url-state';

type Props = {
  state: DashboardUrlState;
};

const ALL_TABS: DashboardTab[] = ['Overview', ...CATEGORY_ORDER];

export function TabBar({ state }: Props) {
  return (
    <nav style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #e5e7eb', marginBottom: '16px' }}>
      {ALL_TABS.map((tab) => {
        const isActive = state.tab === tab;
        return (
          <a
            key={tab}
            href={buildTabUrl(tab, state)}
            data-testid={`tab-${tab.replace(/\s+/g, '-').toLowerCase()}`}
            style={{
              padding: '8px 16px',
              textDecoration: 'none',
              color: isActive ? '#1d4ed8' : '#6b7280',
              borderBottom: isActive ? '2px solid #1d4ed8' : '2px solid transparent',
              fontWeight: isActive ? 600 : 400,
              marginBottom: '-2px',
            }}
          >
            {tab}
          </a>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd apps/challenger && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/challenger/lib/tab-manifest.ts apps/challenger/components/tab-bar.tsx
git commit -m "feat(challenger): add tab manifest and tab bar navigation component"
```

---

## Task 3: Rewrite page.tsx with Tab-Scoped Rendering and Priority Ordering

**Files:**
- Modify: `apps/challenger/app/page.tsx`

This is the core architectural change. The page reads URL state, selects the manifest for the active tab, eagerly creates loader promises in manifest order, and passes them as props to Suspense-wrapped components.

- [ ] **Step 1: Rewrite page.tsx**

Read the current `apps/challenger/app/page.tsx` first (it renders all categories on one page). Replace it with a tab-scoped version.

The new page should:
1. Parse URL state via `parseDashboardUrl(searchParams)`
2. Render `TabBar` with the parsed state
3. If `tab === 'Overview'`:
   - Eagerly call `loadOverviewBoard(cacheMode)` (priority 1)
   - Eagerly call `loadFilterDictionaries(cacheMode)` (priority 2)
   - Render overview board in Suspense, filter bar in Suspense
4. If tab is a category:
   - Eagerly call `loadScorecard(category, tileIds, filters, dateRange, prevDateRange, cacheMode)` (priority 1)
   - Eagerly call `loadTrend(category, defaultTileId, filters, dateRange, prevDateRange, cacheMode)` (priority 2)
   - Eagerly call `loadClosedWon(category, filters, dateRange, cacheMode)` (priority 3)
   - Eagerly call `loadFilterDictionaries(cacheMode)` (priority 4)
   - Pass resulting promises as props to components in Suspense boundaries

Key: the loader calls happen at the top of the async function body, BEFORE the return statement. This ensures they submit to the concurrency limiter in priority order. Components receive promises and `await` them.

Components that currently call loaders internally (e.g., `CategoryScorecard` calls `loadScorecard` inside itself) will need their interfaces updated — they should accept a `data` promise prop instead. This change can be done inline or deferred to the component tasks. For now, the simplest approach: keep components calling their own loaders, but the page eagerly starts the promises and passes them. The components can still call the loaders (which return cached results from `unstable_cache`), but the page's eager calls ensure submission order.

Actually, for true priority control, the page must own the promises. Update component interfaces to accept data props:

```tsx
// Scorecard component accepts data prop
type ScorecardProps = {
  data: Promise<ScorecardResult>;
};
export async function CategoryScorecard({ data }: ScorecardProps) {
  const result = await data;
  // render...
}
```

This requires updating all 4b-1 components — do that as part of this task.

- [ ] **Step 2: Update component interfaces to accept promise props**

Update each component (`CategoryScorecard`, `CategoryTrend`, `ClosedWonTable`, `OverviewBoard`, `FilterBar`) to accept a `data` promise prop instead of calling loaders internally. Read each component, modify its props type and remove the internal loader call.

- [ ] **Step 3: Verify the page builds**

Run: `cd apps/challenger && npx next build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add apps/challenger/app/page.tsx apps/challenger/components/
git commit -m "feat(challenger): tab-scoped page with priority-ordered loader promises"
```

---

## Task 4: Filter Bar Shell-Then-Data

**Files:**
- Create: `apps/challenger/components/filter-bar-shell.tsx`
- Create: `apps/challenger/components/filter-bar-options.tsx`
- Modify: `apps/challenger/components/filter-bar.tsx` (or replace)

- [ ] **Step 1: Create filter-bar-shell.tsx**

Synchronous server component that renders the filter layout with disabled dropdown buttons. Uses `GLOBAL_FILTER_KEYS` for labels. Accepts a `children` slot for the options.

```tsx
// apps/challenger/components/filter-bar-shell.tsx

import { GLOBAL_FILTER_KEYS } from '@por/dashboard-constants';
import type { ReactNode } from 'react';

type Props = { children: ReactNode };

export function FilterBarShell({ children }: Props) {
  return (
    <div data-testid="filter-bar" style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '16px' }}>
      <div style={{ fontWeight: 600, marginBottom: '8px' }}>Filters</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {GLOBAL_FILTER_KEYS.map((key) => (
          <button
            key={key}
            disabled
            data-testid={`filter-${key.replace(/\s+/g, '-').toLowerCase()}`}
            style={{ padding: '4px 12px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb', color: '#9ca3af', fontSize: '13px', cursor: 'not-allowed' }}
          >
            {key} ▾
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create filter-bar-options.tsx**

Async server component that receives dictionary data promise and renders enabled dropdowns replacing the disabled placeholders. For 4b-2, this renders the option counts — the interactive dropdown (`filter-dropdown.tsx`) comes in Task 5.

```tsx
// apps/challenger/components/filter-bar-options.tsx

import type { DictionaryLoaderResult } from '../lib/dictionary-loader';

type Props = { data: Promise<DictionaryLoaderResult> };

export async function FilterBarOptions({ data }: Props) {
  const result = await data;

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          // Enable filter dropdowns now that options are loaded
          document.querySelectorAll('[data-testid^="filter-"]').forEach(btn => {
            btn.disabled = false;
            btn.style.cursor = 'pointer';
            btn.style.color = '#374151';
            btn.style.backgroundColor = '#fff';
          });
          window.__CHALLENGER_TELEMETRY__ = {
            ...window.__CHALLENGER_TELEMETRY__,
            filterDurationMs: ${Math.round(result.durationMs)},
            filterQueryCount: ${result.actualQueryCount},
            filterDictionaryCount: ${result.dictionaries.length},
          };
        `,
      }}
    />
  );
}
```

- [ ] **Step 3: Update the page to use FilterBarShell + Suspense(FilterBarOptions)**

In `page.tsx`, replace the old `<FilterBar>` Suspense with:

```tsx
<FilterBarShell>
  <Suspense fallback={null}>
    <FilterBarOptions data={filtersPromise} />
  </Suspense>
</FilterBarShell>
```

- [ ] **Step 4: Verify build**

Run: `cd apps/challenger && npx next build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add apps/challenger/components/filter-bar-shell.tsx apps/challenger/components/filter-bar-options.tsx apps/challenger/app/page.tsx
git commit -m "feat(challenger): filter bar shell renders immediately, options stream in last"
```

---

## Task 5: Interactive Filter Dropdown

**Files:**
- Create: `apps/challenger/components/filter-dropdown.tsx`
- Modify: `apps/challenger/components/filter-bar-shell.tsx`
- Modify: `apps/challenger/components/filter-bar-options.tsx`

- [ ] **Step 1: Create filter-dropdown.tsx**

A `"use client"` component. Renders a button that toggles a popover with checkboxes. Tracks local checkbox state. "Apply" constructs a URL with the selected filter values and navigates.

```tsx
// apps/challenger/components/filter-dropdown.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import type { GlobalFilterKey } from '@por/dashboard-constants';

type Props = {
  filterKey: GlobalFilterKey;
  options: string[];
  selected: string[];
  buildApplyUrl: (key: GlobalFilterKey, values: string[]) => string;
};

export function FilterDropdown({ filterKey, options, selected, buildApplyUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set(selected));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasChanges = checked.size !== selected.length || [...checked].some(v => !selected.includes(v));

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        data-testid={`filter-${filterKey.replace(/\s+/g, '-').toLowerCase()}`}
        style={{
          padding: '4px 12px', borderRadius: '4px',
          border: `1px solid ${selected.length > 0 ? '#3b82f6' : '#d1d5db'}`,
          backgroundColor: selected.length > 0 ? '#eff6ff' : '#fff',
          fontSize: '13px', cursor: 'pointer',
        }}
      >
        {filterKey} {selected.length > 0 ? `(${selected.length})` : ''} ▾
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 50,
          backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: '6px',
          padding: '8px', minWidth: '200px', maxHeight: '300px', overflowY: 'auto',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        }}>
          {options.map((opt) => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={checked.has(opt)}
                onChange={() => {
                  const next = new Set(checked);
                  if (next.has(opt)) next.delete(opt);
                  else next.add(opt);
                  setChecked(next);
                }}
              />
              {opt}
            </label>
          ))}
          <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '8px', paddingTop: '8px', display: 'flex', gap: '8px' }}>
            <a
              href={hasChanges ? buildApplyUrl(filterKey, [...checked]) : undefined}
              style={{
                padding: '4px 12px', borderRadius: '4px', fontSize: '13px',
                backgroundColor: hasChanges ? '#2563eb' : '#d1d5db',
                color: '#fff', textDecoration: 'none',
                pointerEvents: hasChanges ? 'auto' : 'none',
              }}
            >
              Apply
            </a>
            <button
              onClick={() => { setChecked(new Set()); }}
              style={{ padding: '4px 12px', borderRadius: '4px', fontSize: '13px', border: '1px solid #d1d5db', backgroundColor: '#fff', cursor: 'pointer' }}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update filter-bar-shell and filter-bar-options**

The shell should no longer render disabled buttons — it just renders the container. The options component renders `FilterDropdown` instances with real data.

Update `filter-bar-options.tsx` to render dropdowns:

```tsx
// apps/challenger/components/filter-bar-options.tsx
import { GLOBAL_FILTER_KEYS, type GlobalFilterKey } from '@por/dashboard-constants';
import type { DictionaryLoaderResult } from '../lib/dictionary-loader';
import { buildFilterApplyUrl, type DashboardUrlState } from '../lib/url-state';
import { FilterDropdown } from './filter-dropdown';

type Props = {
  data: Promise<DictionaryLoaderResult>;
  state: DashboardUrlState;
};

export async function FilterBarOptions({ data, state }: Props) {
  const result = await data;

  const optionsByKey = new Map(
    result.dictionaries.map((d) => [d.key, d.options]),
  );

  // Reuses the shared URL builder from url-state.ts which preserves all
  // dashboard state (tab, dateRange, cwPage, cwSort, cwDir) when applying
  // a filter change. Only the specified filter key is updated.
  function buildApplyUrl(key: GlobalFilterKey, values: string[]): string {
    const newFilters = { ...state.filters };
    if (values.length > 0) {
      newFilters[key] = values;
    } else {
      delete newFilters[key];
    }
    return buildFilterApplyUrl(state, newFilters);
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {GLOBAL_FILTER_KEYS.map((key) => (
        <FilterDropdown
          key={key}
          filterKey={key}
          options={optionsByKey.get(key) ?? []}
          selected={state.filters[key] ?? []}
          buildApplyUrl={buildApplyUrl}
        />
      ))}
    </div>
  );
}
```

Update `filter-bar-shell.tsx` to show placeholder buttons in the fallback slot (before options load) and replace with real dropdowns when options arrive:

```tsx
// apps/challenger/components/filter-bar-shell.tsx
import { GLOBAL_FILTER_KEYS } from '@por/dashboard-constants';
import type { ReactNode } from 'react';

type Props = { children: ReactNode };

export function FilterBarShell({ children }: Props) {
  return (
    <div data-testid="filter-bar" style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '16px' }}>
      <div style={{ fontWeight: 600, marginBottom: '8px' }}>Filters</div>
      {children}
    </div>
  );
}

export function FilterBarSkeleton() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {GLOBAL_FILTER_KEYS.map((key) => (
        <button
          key={key}
          disabled
          style={{ padding: '4px 12px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb', color: '#9ca3af', fontSize: '13px', cursor: 'not-allowed' }}
        >
          {key} ▾
        </button>
      ))}
    </div>
  );
}
```

Page usage:
```tsx
<FilterBarShell>
  <Suspense fallback={<FilterBarSkeleton />}>
    <FilterBarOptions data={filtersPromise} state={urlState} />
  </Suspense>
</FilterBarShell>
```

- [ ] **Step 3: Verify build**

Run: `cd apps/challenger && npx next build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add apps/challenger/components/filter-dropdown.tsx apps/challenger/components/filter-bar-shell.tsx apps/challenger/components/filter-bar-options.tsx apps/challenger/app/page.tsx
git commit -m "feat(challenger): interactive filter dropdowns with URL-based apply"
```

---

## Task 6: Trend Chart (recharts)

**Files:**
- Modify: `apps/challenger/package.json` (add recharts)
- Create: `apps/challenger/components/trend-chart.tsx`
- Modify: `apps/challenger/components/category-trend.tsx`

- [ ] **Step 1: Add recharts dependency**

Run: `cd apps/challenger && pnpm add recharts`

- [ ] **Step 2: Create trend-chart.tsx**

```tsx
// apps/challenger/components/trend-chart.tsx
'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type DataPoint = {
  week: string;
  current: number | null;
  previous: number | null;
};

type Props = {
  data: DataPoint[];
  currentLabel: string;
  previousLabel: string;
};

export function TrendChart({ data, currentLabel, previousLabel }: Props) {
  if (data.length === 0) {
    return <p style={{ color: '#9ca3af' }}>No trend data available.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="week" fontSize={12} />
        <YAxis fontSize={12} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="current"
          name={currentLabel}
          stroke="#2563eb"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="previous"
          name={previousLabel}
          stroke="#9ca3af"
          strokeWidth={1.5}
          strokeDasharray="5 5"
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: Update category-trend.tsx to use TrendChart**

Read the current `apps/challenger/components/category-trend.tsx`. Replace the HTML tables with the `TrendChart` component. The component now accepts a `data` promise prop (from Task 3). Merge current and previous points into a single array with `{ week, current, previous }` objects, aligning by week index.

- [ ] **Step 4: Verify build**

Run: `cd apps/challenger && npx next build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add apps/challenger/package.json apps/challenger/components/trend-chart.tsx apps/challenger/components/category-trend.tsx
git commit -m "feat(challenger): replace trend HTML tables with recharts line chart"
```

---

## Task 7: Closed-Won Pagination and Sorting

**Files:**
- Modify: `apps/challenger/lib/v2-query-builder.ts`
- Modify: `apps/challenger/lib/closed-won-loader.ts`
- Create: `apps/challenger/components/closed-won-pagination.tsx`
- Create: `apps/challenger/components/closed-won-sort-header.tsx`
- Modify: `apps/challenger/components/closed-won-table.tsx`

- [ ] **Step 1: Add sort params to buildV2ClosedWonQuery**

Read `apps/challenger/lib/v2-query-builder.ts`. Update `buildV2ClosedWonQuery` to accept optional `sortField` and `sortDescending` params (default: `'close_date'` and `true`). Replace the hardcoded sort with the params.

```typescript
export function buildV2ClosedWonQuery(
  category: Category,
  filters: DashboardFilters,
  dateRange: DateRange,
  sortField: string = 'close_date',
  sortDescending: boolean = true,
): MetricQueryRequest {
  // ... existing filter logic unchanged ...

  return {
    exploreName: DASHBOARD_V2_CLOSED_WON_MODEL,
    metrics: [],
    dimensions,
    filters: toMetricQueryFilters(DASHBOARD_V2_CLOSED_WON_MODEL, allFilters),
    sorts: [{ fieldId: buildFieldId(DASHBOARD_V2_CLOSED_WON_MODEL, sortField), descending: sortDescending }],
    limit: 500,
    tableCalculations: [],
  };
}
```

- [ ] **Step 2: Update closed-won-loader for pagination**

Read `apps/challenger/lib/closed-won-loader.ts`. The loader currently fetches all rows with `limit: 500`. Update it to:
1. Accept `page`, `pageSize`, `sortField`, `sortDescending` params
2. Submit the query (Lightdash caches it)
3. Poll with `pageSize` and `page` params on the poll URL
4. Return the paginated result plus `totalResults` and `totalPageCount`

The key change is in `lightdash-v2-client.ts` — the `pollForResults` function currently hardcodes `pageSize=500`. It needs to accept `pageSize` and `page` params. Either:
- Add params to `pollForResults` and `executeMetricQuery`
- Or create a new `executeMetricQueryPaginated` function

The cleaner approach: add optional `pageSize` and `page` params to `executeMetricQuery`.

Update `executeMetricQuery` signature:
```typescript
export async function executeMetricQuery(
  request: MetricQueryRequest,
  options?: { pageSize?: number; page?: number },
): Promise<QueryResultPage> {
```

And pass them to `pollForResults`.

Update the `ClosedWonResult` type to include pagination info:
```typescript
export type ClosedWonResult = {
  category: Category;
  rows: ClosedWonRow[];
  totalResults: number;
  totalPageCount: number;
  page: number;
  pageSize: number;
  durationMs: number;
  queryCount: number;
};
```

- [ ] **Step 3: Create closed-won-pagination.tsx**

```tsx
// apps/challenger/components/closed-won-pagination.tsx

import type { DashboardUrlState } from '../lib/url-state';
import { buildCwPageUrl } from '../lib/url-state';

type Props = {
  state: DashboardUrlState;
  page: number;
  totalPageCount: number;
  totalResults: number;
};

export function ClosedWonPagination({ state, page, totalPageCount, totalResults }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', fontSize: '13px' }}>
      {page > 1 ? (
        <a href={buildCwPageUrl(state, page - 1)} style={{ color: '#2563eb' }}>← Previous</a>
      ) : (
        <span style={{ color: '#d1d5db' }}>← Previous</span>
      )}
      <span>Page {page} of {totalPageCount} ({totalResults} rows)</span>
      {page < totalPageCount ? (
        <a href={buildCwPageUrl(state, page + 1)} style={{ color: '#2563eb' }}>Next →</a>
      ) : (
        <span style={{ color: '#d1d5db' }}>Next →</span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create closed-won-sort-header.tsx**

```tsx
// apps/challenger/components/closed-won-sort-header.tsx

import type { DashboardUrlState, ClosedWonSort } from '../lib/url-state';
import { buildCwSortUrl } from '../lib/url-state';

type Props = {
  state: DashboardUrlState;
  field: string;
  label: string;
  currentSort: ClosedWonSort;
};

export function ClosedWonSortHeader({ state, field, label, currentSort }: Props) {
  const isActive = currentSort.field === field;
  const arrow = isActive ? (currentSort.descending ? ' ↓' : ' ↑') : '';

  return (
    <th style={{ textAlign: 'left', padding: '4px 6px', borderBottom: '1px solid #ccc', whiteSpace: 'nowrap' }}>
      <a
        href={buildCwSortUrl(state, field)}
        style={{ color: isActive ? '#1d4ed8' : '#374151', textDecoration: 'none' }}
      >
        {label}{arrow}
      </a>
    </th>
  );
}
```

- [ ] **Step 5: Update closed-won-table.tsx**

Read the current component. Update it to:
- Accept `data` promise prop (from page) and `state` prop (for URL building)
- Render `ClosedWonSortHeader` for each column
- Render `ClosedWonPagination` below the table
- Show the correct page of data

- [ ] **Step 6: Verify build**

Run: `cd apps/challenger && npx next build`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add apps/challenger/lib/v2-query-builder.ts apps/challenger/lib/closed-won-loader.ts apps/challenger/lib/lightdash-v2-client.ts apps/challenger/components/closed-won-pagination.tsx apps/challenger/components/closed-won-sort-header.tsx apps/challenger/components/closed-won-table.tsx
git commit -m "feat(challenger): closed-won server-side pagination and column sorting"
```

---

## Task 8: Waterfall Telemetry Instrumentation

**Files:**
- Create: `apps/challenger/lib/waterfall-types.ts`
- Modify: `apps/challenger/lib/lightdash-v2-client.ts`
- Modify: `apps/challenger/app/page.tsx`

- [ ] **Step 1: Create waterfall-types.ts**

The collector must be **per-request**, not module-global. Module-global state
is not request-scoped — concurrent SSR requests would contaminate each
other's spans, and the page returns JSX before Suspense children resolve,
so a global array would be empty or partial at serialization time.

Instead: create a `WaterfallCollector` class that the page instantiates per
request and passes to loaders. Each loader records spans into the collector
it received. The collector is referenced by the final Suspense boundary
(a `WaterfallInjector` component) that serializes all spans after every
loader has resolved.

```typescript
// apps/challenger/lib/waterfall-types.ts

export type QuerySpan = {
  id: string;
  section: string;
  priority: number;
  limiterWaitMs: number;
  submitMs: number;
  pollMs: number;
  lightdashExecMs: number;
  lightdashPageMs: number;
  cacheHit: boolean;
  startMs: number;
  endMs: number;
};

export class WaterfallCollector {
  private epoch: number;
  private spans: QuerySpan[] = [];

  constructor() {
    this.epoch = performance.now();
  }

  getEpoch(): number {
    return this.epoch;
  }

  record(span: QuerySpan): void {
    this.spans.push(span);
  }

  getSpans(): QuerySpan[] {
    return [...this.spans];
  }
}
```

- [ ] **Step 2: Create a WaterfallInjector server component**

This is an async server component that awaits ALL loader promises (ensuring
every span has been recorded), then serializes the collector's spans into
the client HTML. It lives in its own Suspense boundary at the END of the
page — it resolves last because it waits for everything else.

```tsx
// apps/challenger/components/waterfall-injector.tsx

import type { WaterfallCollector } from '../lib/waterfall-types';

type Props = {
  collector: WaterfallCollector;
  allPromises: Promise<unknown>[];
};

export async function WaterfallInjector({ collector, allPromises }: Props) {
  // Wait for every loader to finish so all spans are recorded
  await Promise.allSettled(allPromises);

  const spans = collector.getSpans();

  return (
    <script dangerouslySetInnerHTML={{ __html: `
      window.__CHALLENGER_TELEMETRY__ = {
        ...window.__CHALLENGER_TELEMETRY__,
        waterfall: ${JSON.stringify(spans)},
      };
      try { sessionStorage.setItem('challenger-waterfall', ${JSON.stringify(JSON.stringify(spans))}); } catch {}
    ` }} />
  );
}
```

- [ ] **Step 3: Instrument executeMetricQuery**

Read `apps/challenger/lib/lightdash-v2-client.ts`. Add an optional
`instrumentation` parameter that accepts a `WaterfallCollector` and span
metadata (`section`, `priority`, `id`). When provided, the function records
timing at each phase:

Key timing points:
- `limiterWaitMs`: time from function entry to when the concurrency slot opens
- `submitMs`: time for the POST request
- `pollMs`: time from first poll to "ready"
- `lightdashExecMs`: from `result.initialQueryExecutionMs`
- `lightdashPageMs`: from `result.resultsPageExecutionMs`
- `cacheHit`: from `submitData.results.cacheMetadata.cacheHit`
- `startMs` / `endMs`: relative to `collector.getEpoch()`

When `instrumentation` is not provided, the function behaves exactly as
before (no overhead). This keeps the existing CallTracker pattern and
loaders backward-compatible — waterfall is opt-in.

- [ ] **Step 4: Update page.tsx**

At the top of the page, create a `WaterfallCollector` instance. Pass it
to each loader (which passes it to `executeMetricQuery`). Collect all
loader promises into an array. At the end of the JSX, render:

```tsx
<Suspense fallback={null}>
  <WaterfallInjector collector={collector} allPromises={allPromises} />
</Suspense>
```

This Suspense boundary resolves last (after all data), injecting the
complete waterfall into the client HTML.

- [ ] **Step 4: Verify build**

Run: `cd apps/challenger && npx next build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add apps/challenger/lib/waterfall-types.ts apps/challenger/lib/lightdash-v2-client.ts apps/challenger/app/page.tsx
git commit -m "feat(challenger): waterfall telemetry instrumentation on executeMetricQuery"
```

---

## Task 9: Waterfall Visualization Route

**Files:**
- Create: `apps/challenger/app/waterfall/page.tsx`

- [ ] **Step 1: Create the waterfall page**

A `"use client"` dev route that reads waterfall spans from `sessionStorage` and renders a horizontal bar chart. Each bar represents a query span, grouped by section, colored by section, positioned on a time axis.

Use inline SVG or simple `<div>` bars — no additional charting library needed. Each span renders as an absolutely positioned `<div>` within a container, with `left` = startMs and `width` = (endMs - startMs), scaled to the container width.

The page should:
1. Read from `sessionStorage.getItem('challenger-waterfall')`
2. Parse the JSON into `QuerySpan[]`
3. Group spans by section
4. Render a section header + bars for each group
5. Show a time axis at the bottom
6. Color code: scorecard=#2563eb, trend=#16a34a, closedWon=#ea580c, filters=#8b5cf6
7. On hover, show span details (id, all timing values, cacheHit)
8. Show summary: total spans, total wall time, effective parallelism

- [ ] **Step 2: Verify build**

Run: `cd apps/challenger && npx next build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add apps/challenger/app/waterfall/page.tsx
git commit -m "feat(challenger): waterfall visualization dev route at /waterfall"
```

---

## Task 10: Playwright Benchmark Harness (All 6 Tabs)

**Files:**
- Modify: `apps/challenger/e2e/benchmark.spec.ts`

- [ ] **Step 1: Update the benchmark harness**

Read the existing `apps/challenger/e2e/benchmark.spec.ts`. Update it to:

1. Test all 6 tabs: Overview, New Logo, Expansion, Migration, Renewal, Total
2. For each tab, navigate to `/?tab={tabName}&cacheMode=off`
3. Wait for all `data-testid="section-ready"` markers to appear (each component adds one when it renders with data)
4. Collect TTFB and total load time via Performance API
5. Extract waterfall telemetry from `window.__CHALLENGER_TELEMETRY__`
6. Run 5 times per tab in full-cold mode = 30 runs total
7. Report per-tab p50 metrics
8. Assert: TTFB p50 < 50ms, total load p50 < 4s for every tab

Each component (`CategoryScorecard`, `CategoryTrend`, `ClosedWonTable`, `OverviewBoard`, `FilterBarOptions`) should render a `data-testid="section-ready"` attribute when it has data. Add these in their JSX if not already present.

- [ ] **Step 2: Verify the harness compiles**

Run: `cd apps/challenger && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/challenger/e2e/benchmark.spec.ts apps/challenger/components/
git commit -m "feat(challenger): Playwright benchmark harness for all 6 tabs"
```

---

## Task 11: Extend Parity Validation for 4b-2

**Files:**
- Modify: `apps/challenger/scripts/validate-parity.ts`

- [ ] **Step 1: Extend the validation script**

Read the existing script. Add these new validation surfaces:

1. **Per-tab URL navigation:** For each of the 6 tabs, verify `/?tab={tabName}&cacheMode=off` renders without errors (via HTTP fetch of the HTML, check for error markers)
2. **Filter smoke test:** First, fetch the Division dictionary via the
   existing `buildDictionaryQuery('Division')` + `executeMetricQuery` to
   get real option values. Pick the first option dynamically (e.g., if
   the dictionary returns `['East', 'West', ...]`, use `'East'`). Then
   compare `?tab=New+Logo` vs `?tab=New+Logo&Division={firstOption}`.
   Verify at least one tile value differs. This avoids hardcoding a
   warehouse-dependent value that may not exist in every environment.
3. **Closed-won pagination:** Submit a closed-won query, verify page 1 and page 2 return different rows (re-use the pattern from our earlier live test)
4. **Dictionary completeness:** Verify all 16 filter keys return > 0 options

These additions require the challenger server to be running (unlike the existing scorecard parity checks which call the v2 API directly). Add a new section that fetches from `http://localhost:3500`.

- [ ] **Step 2: Commit**

```bash
git add apps/challenger/scripts/validate-parity.ts
git commit -m "feat(challenger): extend parity validation for tab navigation, filters, pagination"
```

---

## Task 12: Metric Completeness Audit

**Files:** No new files — this is a verification task

- [ ] **Step 1: Run the full parity validation**

Start both apps:
- Production: `cd apps/analytics-suite && npx next start -p 3300`
- Challenger: `cd apps/challenger && npx next start -p 3500`

Run: `npx tsx apps/challenger/scripts/validate-parity.ts`

Expected: All surfaces pass — scorecard values match, trend values match, closed-won projections match, dictionaries match, per-tab navigation works, filter changes produce different values, pagination returns different pages.

- [ ] **Step 2: Run the Playwright benchmark**

Run: `cd apps/challenger && pnpm benchmark`

Expected: All 6 tabs meet < 4s total load and < 50ms TTFB gates.

- [ ] **Step 3: Extract and save waterfall report**

Navigate to `http://localhost:3500/?tab=New+Logo&cacheMode=off` in a browser, then open `http://localhost:3500/waterfall` to view the telemetry. Take a screenshot or extract the JSON for the PR.

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "feat(challenger): Phase 4b-2 streaming architecture validated"
```
