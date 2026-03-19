# Situation Room Report UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a custom board-facing report UI on top of Lightdash that presents the Scorecard Grid Prototype as a polished "situation room report" using Next.js, shadcn/ui, and Chart.js.

**Architecture:** A new Next.js app (`apps/situation-room`) in the existing pnpm monorepo queries the Lightdash v2 async API for scorecard data, renders it through a custom report layout built on shadcn/ui primitives with extensive custom styling for board-grade presentation. Filter state is URL-driven for shareability.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Chart.js + react-chartjs-2, nuqs (URL state)

---

## File Structure

```text
apps/situation-room/
├── package.json
├── next.config.mjs
├── tsconfig.json
├── vitest.config.ts                   # Vitest config with path aliases
├── postcss.config.mjs
├── .env.local.example                 # Lightdash credentials template
├── components.json                    # shadcn/ui config
├── app/
│   ├── layout.tsx                     # Root layout: fonts, theme provider, metadata
│   ├── global.css                     # Tailwind + custom theme tokens
│   ├── page.tsx                       # Report page (server component shell)
│   └── api/
│       └── lightdash/
│           └── route.ts               # Proxy to Lightdash API (hides credentials)
├── lib/
│   ├── lightdash-client.ts            # Lightdash v2 API client (server-only)
│   ├── scorecard-parser.ts            # Pure row-parsing functions (testable, no server-only)
│   ├── queries.ts                     # Query definitions per category
│   ├── filters.ts                     # Filter type definitions and defaults
│   ├── types.ts                       # Shared TypeScript types
│   └── utils.ts                       # cn() helper, formatting helpers
├── components/
│   ├── theme-provider.tsx             # next-themes provider
│   ├── theme-toggle.tsx               # Light/dark toggle
│   ├── report-header.tsx              # Title, period, last-refresh, description
│   ├── filter-rail.tsx                # Global filter bar with all dashboard filters
│   ├── filter-chip.tsx                # Applied filter chip
│   ├── executive-snapshot.tsx         # Top-line metrics across all categories
│   ├── category-section.tsx           # Reusable section for each of the 5 categories
│   ├── metric-row.tsx                 # Single metric display: name, current, previous, change
│   ├── change-indicator.tsx           # +/- percent change with color coding
│   ├── trend-chart.tsx                # Chart.js wrapper for trend visualization
│   ├── report-content.tsx             # Client component: interactive report shell
│   └── ui/                            # shadcn/ui primitives (installed via CLI)
│       ├── button.tsx
│       ├── select.tsx
│       ├── popover.tsx
│       ├── command.tsx
│       ├── badge.tsx
│       ├── separator.tsx
│       ├── skeleton.tsx
│       ├── dropdown-menu.tsx
│       └── calendar.tsx
├── hooks/
│   ├── use-scorecard-query.ts         # SWR/fetch hook for scorecard data
│   └── use-filters.ts                 # URL-driven filter state via nuqs
└── __tests__/
    ├── scorecard-parser.test.ts       # Row parsing unit tests
    ├── queries.test.ts                # Query builder tests
    ├── filters.test.ts                # Filter state tests
    └── change-indicator.test.ts       # Change indicator logic tests
```

## Source Data Reference

The report queries the `scorecard_daily` explore in Lightdash with these fields:

- **Dimensions:** `scorecard_daily_sort_order`, `scorecard_daily_metric_name`, `scorecard_daily_category`
- **Metrics:** `scorecard_daily_current_period`, `scorecard_daily_previous_period`, `scorecard_daily_pct_change`
- **Category filter values:** `New Logo`, `Expansion`, `Migration`, `Renewal`, `Total`

**Lightdash dashboard filters** (from `scorecard-filterable-test.yml`):

| Label                 | Field ID                                 | Type                |
| --------------------- | ---------------------------------------- | ------------------- |
| Date Range            | `scorecard_daily_report_date`            | date (inTheCurrent) |
| Division              | `scorecard_daily_Division`               | string (equals)     |
| Owner                 | `scorecard_daily_Owner`                  | string (equals)     |
| Segment               | `scorecard_daily_OpportunitySegment`     | string (equals)     |
| Region                | `scorecard_daily_Queue_Region__c`        | string (equals)     |
| SE                    | `scorecard_daily_SE`                     | string (equals)     |
| Booking Plan Opp Type | `scorecard_daily_BookingPlanOppType2025` | string (equals)     |
| Product Family        | `scorecard_daily_ProductFamily`          | string (equals)     |
| SDR Source            | `scorecard_daily_SDRSource`              | string (equals)     |
| SDR                   | `scorecard_daily_SDR`                    | string (equals)     |
| POR v R360            | `scorecard_daily_OppRecordType`          | string (equals)     |
| Account Owner         | `scorecard_daily_AccountOwner`           | string (equals)     |
| Owner Department      | `scorecard_daily_OwnerDepartment`        | string (equals)     |
| Strategic Filter      | `scorecard_daily_StrategicFilter`        | boolean (equals)    |
| Accepted              | `scorecard_daily_Accepted`               | boolean (equals)    |
| Gate 1 Criteria Met   | `scorecard_daily_Gate1CriteriaMet`       | boolean (equals)    |
| Gate Met or Accepted  | `scorecard_daily_GateMetOrAccepted`      | boolean (equals)    |

**Lightdash v2 API endpoints used:**

- `POST /api/v2/projects/{projectUuid}/query/metric-query` — execute query
- `GET /api/v2/projects/{projectUuid}/query/{queryUuid}?page=1&pageSize=500` — poll results

**Authentication:** `Authorization: ApiKey {LIGHTDASH_API_KEY}` header

---

## Task 1: Scaffold the Next.js App

**Files:**

- Create: `apps/situation-room/package.json`
- Create: `apps/situation-room/next.config.mjs`
- Create: `apps/situation-room/tsconfig.json`
- Create: `apps/situation-room/postcss.config.mjs`
- Create: `apps/situation-room/app/layout.tsx`
- Create: `apps/situation-room/app/global.css`
- Create: `apps/situation-room/app/page.tsx`
- Modify: `package.json` (root — add workspace scripts)

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@point-of-rental/situation-room",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3100",
    "build": "next build",
    "start": "next start --port 3100",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "15.5.12",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.14",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.14",
    "typescript": "5.9.3",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create next.config.mjs**

```js
/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
};

export default config;
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", "next-env.d.ts", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create postcss.config.mjs**

```js
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
```

- [ ] **Step 5: Create app/global.css with custom theme tokens**

Create `apps/situation-room/app/global.css` with Tailwind v4 imports and custom CSS variables for the report theme (light and dark). Define a premium color palette using CSS custom properties — muted backgrounds, precise typographic scale, and accent colors for positive/negative change indicators.

```css
@import 'tailwindcss';

@theme {
  --font-sans: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  --color-surface: #ffffff;
  --color-surface-elevated: #f8f9fa;
  --color-surface-sunken: #f1f3f5;
  --color-border: #e5e7eb;
  --color-border-subtle: #f0f0f0;

  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-text-tertiary: #9ca3af;

  --color-positive: #059669;
  --color-positive-bg: #ecfdf5;
  --color-negative: #dc2626;
  --color-negative-bg: #fef2f2;
  --color-neutral-change: #6b7280;

  --color-accent: #1e40af;
  --color-accent-subtle: #eff6ff;
}

@variant dark (&:where(.dark, .dark *)) {
  @theme {
    --color-surface: #0a0a0b;
    --color-surface-elevated: #141416;
    --color-surface-sunken: #09090b;
    --color-border: #27272a;
    --color-border-subtle: #1c1c1f;

    --color-text-primary: #fafafa;
    --color-text-secondary: #a1a1aa;
    --color-text-tertiary: #71717a;

    --color-positive: #34d399;
    --color-positive-bg: #052e16;
    --color-negative: #f87171;
    --color-negative-bg: #450a0a;
    --color-neutral-change: #71717a;

    --color-accent: #60a5fa;
    --color-accent-subtle: #172554;
  }
}

* {
  border-color: var(--color-border);
}

body {
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- [ ] **Step 6: Create minimal app/layout.tsx**

```tsx
import type { Metadata } from 'next';
import './global.css';

export const metadata: Metadata = {
  title: 'Situation Room — Sales Performance Report',
  description: 'Board-facing sales performance scorecard report',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Create placeholder app/page.tsx**

```tsx
export default function ReportPage() {
  return (
    <main className="min-h-screen px-6 py-12 max-w-7xl mx-auto">
      <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
        Sales Performance Situation Room
      </h1>
      <p className="mt-2 text-text-secondary">
        Report scaffold — ready for implementation.
      </p>
    </main>
  );
}
```

- [ ] **Step 8: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

- [ ] **Step 9: Create .env.local.example**

```dotenv
LIGHTDASH_URL=https://app.lightdash.cloud
LIGHTDASH_API_KEY=your-api-key-here
LIGHTDASH_PROJECT_UUID=your-project-uuid-here
```

- [ ] **Step 10: Add .gitignore entry**

Add `apps/situation-room/.next` to root `.gitignore` alongside the existing `apps/pdr/.next` entry.

- [ ] **Step 11: Add workspace scripts to root package.json**

Add to root `package.json` scripts:

```json
"sr:dev": "pnpm --filter @point-of-rental/situation-room dev",
"sr:build": "pnpm --filter @point-of-rental/situation-room build",
"sr:test": "pnpm --filter @point-of-rental/situation-room test"
```

- [ ] **Step 12: Install dependencies and verify**

Run: `cd /Users/f/Documents/GitHub/point-of-rental/data-analytics-demo && pnpm install`

Then: `pnpm sr:dev` — verify the page loads at `http://localhost:3100` with the placeholder content.

- [ ] **Step 13: Commit**

```bash
git add apps/situation-room/ package.json pnpm-lock.yaml
git commit -m "feat(situation-room): scaffold Next.js app in monorepo"
```

---

## Task 2: Install shadcn/ui and Core Primitives

**Files:**

- Create: `apps/situation-room/components.json`
- Create: `apps/situation-room/lib/utils.ts`
- Create: `apps/situation-room/components/ui/*.tsx` (via shadcn CLI)

- [ ] **Step 1: Initialize shadcn/ui**

Run from `apps/situation-room/`:

```bash
npx shadcn@latest init
```

Select: New York style, Zinc base color, CSS variables. This creates `components.json` and `lib/utils.ts`.

- [ ] **Step 2: Install required primitives**

```bash
npx shadcn@latest add button select popover command badge separator skeleton dropdown-menu calendar
```

- [ ] **Step 3: Install next-themes for theme switching**

```bash
cd apps/situation-room && pnpm add next-themes
```

- [ ] **Step 4: Create theme provider**

Create `apps/situation-room/components/theme-provider.tsx`:

```tsx
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

- [ ] **Step 5: Create theme toggle**

Create `apps/situation-room/components/theme-toggle.tsx`:

```tsx
'use client';

import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="text-text-secondary hover:text-text-primary"
    >
      <span className="dark:hidden">Dark</span>
      <span className="hidden dark:inline">Light</span>
    </Button>
  );
}
```

- [ ] **Step 6: Update layout.tsx to use theme provider**

Update `app/layout.tsx` to wrap children with `<ThemeProvider attribute="class" defaultTheme="light" enableSystem>`.

- [ ] **Step 7: Verify light/dark toggle works**

Run: `pnpm sr:dev` — toggle between themes, confirm CSS variable swap.

- [ ] **Step 8: Commit**

```bash
git add apps/situation-room/
git commit -m "feat(situation-room): add shadcn/ui primitives and theme system"
```

---

## Task 3: Lightdash API Client and Types

**Files:**

- Create: `apps/situation-room/lib/types.ts`
- Create: `apps/situation-room/lib/lightdash-client.ts`
- Create: `apps/situation-room/lib/scorecard-parser.ts`
- Create: `apps/situation-room/lib/queries.ts`
- Create: `apps/situation-room/lib/filters.ts`
- Create: `apps/situation-room/app/api/lightdash/route.ts`
- Create: `apps/situation-room/__tests__/scorecard-parser.test.ts`
- Create: `apps/situation-room/__tests__/queries.test.ts`

- [ ] **Step 1: Write types**

Create `apps/situation-room/lib/types.ts`:

```ts
export type Category =
  | 'New Logo'
  | 'Expansion'
  | 'Migration'
  | 'Renewal'
  | 'Total';

export interface ScorecardRow {
  sortOrder: number;
  metricName: string;
  currentPeriod: string;
  previousPeriod: string;
  pctChange: string;
}

export interface CategoryData {
  category: Category;
  rows: ScorecardRow[];
}

export interface FilterValue {
  fieldId: string;
  label: string;
  operator: 'equals' | 'inTheCurrent';
  values: string[];
  type: 'string' | 'boolean' | 'date';
}

export interface LightdashQueryRequest {
  exploreName: string;
  dimensions: string[];
  metrics: string[];
  filters: LightdashFilterGroup;
  sorts: LightdashSort[];
  limit: number;
}

export interface LightdashFilterGroup {
  dimensions?: {
    id: string;
    and: LightdashFilterRule[];
  };
}

export interface LightdashFilterRule {
  id: string;
  target: { fieldId: string };
  operator: string;
  values?: (string | number | boolean)[];
  settings?: Record<string, unknown>;
}

export interface LightdashSort {
  fieldId: string;
  descending: boolean;
}

export interface LightdashQueryResponse {
  status: 'ok' | 'error';
  results: {
    queryUuid: string;
    fields: Record<string, unknown>;
  };
}

export interface LightdashResultsResponse {
  status: 'ok' | 'error';
  results:
    | {
        status: 'ready';
        rows: Record<string, { value: { raw: unknown; formatted: string } }>[];
        totalRows: number;
      }
    | { status: 'pending' | 'queued' | 'executing' }
    | { status: 'error' | 'expired'; error?: string };
}
```

- [ ] **Step 2: Write the scorecard parser test**

Create `apps/situation-room/__tests__/scorecard-parser.test.ts` (pure functions, no `server-only` dependency):

```ts
import { describe, it, expect } from 'vitest';
import { parseScorecardRows } from '@/lib/scorecard-parser';

describe('parseScorecardRows', () => {
  it('transforms raw Lightdash rows into ScorecardRow objects', () => {
    const raw = [
      {
        scorecard_daily_sort_order: { value: { raw: 1, formatted: '1' } },
        scorecard_daily_metric_name: {
          value: { raw: 'Annual Pacing', formatted: 'Annual Pacing' },
        },
        scorecard_daily_current_period: {
          value: { raw: '$1,234.56K', formatted: '$1,234.56K' },
        },
        scorecard_daily_previous_period: {
          value: { raw: '$1,100.00K', formatted: '$1,100.00K' },
        },
        scorecard_daily_pct_change: {
          value: { raw: '+12.2%', formatted: '+12.2%' },
        },
      },
    ];

    const result = parseScorecardRows(raw);
    expect(result).toEqual([
      {
        sortOrder: 1,
        metricName: 'Annual Pacing',
        currentPeriod: '$1,234.56K',
        previousPeriod: '$1,100.00K',
        pctChange: '+12.2%',
      },
    ]);
  });

  it('sorts rows by sortOrder ascending', () => {
    const raw = [
      {
        scorecard_daily_sort_order: { value: { raw: 3, formatted: '3' } },
        scorecard_daily_metric_name: {
          value: { raw: 'Metric C', formatted: 'Metric C' },
        },
        scorecard_daily_current_period: {
          value: { raw: '10', formatted: '10' },
        },
        scorecard_daily_previous_period: {
          value: { raw: '8', formatted: '8' },
        },
        scorecard_daily_pct_change: {
          value: { raw: '+25.0%', formatted: '+25.0%' },
        },
      },
      {
        scorecard_daily_sort_order: { value: { raw: 1, formatted: '1' } },
        scorecard_daily_metric_name: {
          value: { raw: 'Metric A', formatted: 'Metric A' },
        },
        scorecard_daily_current_period: {
          value: { raw: '20', formatted: '20' },
        },
        scorecard_daily_previous_period: {
          value: { raw: '15', formatted: '15' },
        },
        scorecard_daily_pct_change: {
          value: { raw: '+33.3%', formatted: '+33.3%' },
        },
      },
    ];

    const result = parseScorecardRows(raw);
    expect(result[0].metricName).toBe('Metric A');
    expect(result[1].metricName).toBe('Metric C');
  });

  it('handles empty rows array', () => {
    expect(parseScorecardRows([])).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/situation-room && npx vitest run __tests__/scorecard-parser.test.ts`

Expected: FAIL — module not found. (vitest and vitest.config.ts are already set up from Task 1.)

- [ ] **Step 4: Implement scorecard-parser.ts (pure functions, testable)**

Create `apps/situation-room/lib/scorecard-parser.ts`:

```ts
import type { ScorecardRow } from './types';

export function parseScorecardRows(
  raw: Record<string, { value: { raw: unknown; formatted: string } }>[],
): ScorecardRow[] {
  return raw
    .map((row) => ({
      sortOrder: Number(row.scorecard_daily_sort_order.value.raw),
      metricName: String(row.scorecard_daily_metric_name.value.formatted),
      currentPeriod: String(row.scorecard_daily_current_period.value.formatted),
      previousPeriod: String(
        row.scorecard_daily_previous_period.value.formatted,
      ),
      pctChange: String(row.scorecard_daily_pct_change.value.formatted),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
```

- [ ] **Step 5: Implement lightdash-client.ts (server-only)**

Create `apps/situation-room/lib/lightdash-client.ts`.

This file uses `import "server-only"` to prevent accidental client-side import. The `executeScorecardQuery` function accepts a **complete** filter group (built by `buildCategoryFilters` in `queries.ts`), so it does not build any filter rules internally — all filter assembly is centralized in `queries.ts`.

```ts
import 'server-only';
import type { LightdashFilterRule } from './types';

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. See .env.local.example.`,
    );
  }
  return value;
}

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `ApiKey ${getEnv('LIGHTDASH_API_KEY')}`,
  };
}

export async function executeScorecardQuery(filterGroup: {
  id: string;
  and: LightdashFilterRule[];
}): Promise<string> {
  const url = getEnv('LIGHTDASH_URL');
  const projectUuid = getEnv('LIGHTDASH_PROJECT_UUID');

  const body = {
    query: {
      exploreName: 'scorecard_daily',
      dimensions: ['scorecard_daily_sort_order', 'scorecard_daily_metric_name'],
      metrics: [
        'scorecard_daily_current_period',
        'scorecard_daily_previous_period',
        'scorecard_daily_pct_change',
      ],
      filters: {
        dimensions: filterGroup,
      },
      sorts: [{ fieldId: 'scorecard_daily_sort_order', descending: false }],
      limit: 50,
    },
    context: 'api',
  };

  const res = await fetch(
    `${url}/api/v2/projects/${projectUuid}/query/metric-query`,
    { method: 'POST', headers: headers(), body: JSON.stringify(body) },
  );

  if (!res.ok) {
    throw new Error(
      `Lightdash query failed: ${res.status} ${await res.text()}`,
    );
  }

  const data = await res.json();
  return data.results.queryUuid;
}

export async function pollResults(
  queryUuid: string,
  maxAttempts = 30,
  delayMs = 1000,
): Promise<Record<string, { value: { raw: unknown; formatted: string } }>[]> {
  const url = getEnv('LIGHTDASH_URL');
  const projectUuid = getEnv('LIGHTDASH_PROJECT_UUID');

  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(
      `${url}/api/v2/projects/${projectUuid}/query/${queryUuid}?page=1&pageSize=500`,
      { headers: headers() },
    );

    if (!res.ok) {
      throw new Error(`Lightdash poll failed: ${res.status}`);
    }

    const data = await res.json();
    const results = data.results;

    if (results.status === 'ready') {
      return results.rows;
    }

    if (results.status === 'error' || results.status === 'expired') {
      throw new Error(`Query failed: ${results.error ?? 'unknown error'}`);
    }

    // Still processing — wait and retry
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error('Query timed out after max polling attempts');
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd apps/situation-room && npx vitest run __tests__/scorecard-parser.test.ts`

Expected: PASS

- [ ] **Step 7: Write query builder tests**

Create `apps/situation-room/__tests__/queries.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildCategoryFilters, CATEGORIES } from '@/lib/queries';

describe('buildCategoryFilters', () => {
  it('returns filter rules for a category with no additional filters', () => {
    const result = buildCategoryFilters('New Logo', {});
    expect(result.and).toHaveLength(2); // category + date
    expect(result.and[0].values).toEqual(['New Logo']);
  });

  it('includes additional filter rules when provided', () => {
    const result = buildCategoryFilters('Expansion', {
      Division: ['Enterprise'],
    });
    expect(result.and).toHaveLength(3); // category + date + Division
    expect(result.and[2].target.fieldId).toBe('scorecard_daily_Division');
    expect(result.and[2].values).toEqual(['Enterprise']);
  });
});

describe('CATEGORIES', () => {
  it('contains all five categories', () => {
    expect(CATEGORIES).toEqual([
      'New Logo',
      'Expansion',
      'Migration',
      'Renewal',
      'Total',
    ]);
  });
});
```

- [ ] **Step 8: Implement queries.ts**

Create `apps/situation-room/lib/queries.ts`:

```ts
import type { Category, LightdashFilterRule } from './types';

export const CATEGORIES: Category[] = [
  'New Logo',
  'Expansion',
  'Migration',
  'Renewal',
  'Total',
];

const FILTER_FIELD_MAP: Record<string, string> = {
  Division: 'scorecard_daily_Division',
  Owner: 'scorecard_daily_Owner',
  Segment: 'scorecard_daily_OpportunitySegment',
  Region: 'scorecard_daily_Queue_Region__c',
  SE: 'scorecard_daily_SE',
  BookingPlanOppType: 'scorecard_daily_BookingPlanOppType2025',
  ProductFamily: 'scorecard_daily_ProductFamily',
  SDRSource: 'scorecard_daily_SDRSource',
  SDR: 'scorecard_daily_SDR',
  OppRecordType: 'scorecard_daily_OppRecordType',
  AccountOwner: 'scorecard_daily_AccountOwner',
  OwnerDepartment: 'scorecard_daily_OwnerDepartment',
  StrategicFilter: 'scorecard_daily_StrategicFilter',
  Accepted: 'scorecard_daily_Accepted',
  Gate1CriteriaMet: 'scorecard_daily_Gate1CriteriaMet',
  GateMetOrAccepted: 'scorecard_daily_GateMetOrAccepted',
};

export function buildCategoryFilters(
  category: Category,
  activeFilters: Record<string, string[]>,
): { id: string; and: LightdashFilterRule[] } {
  const rules: LightdashFilterRule[] = [
    {
      id: 'category-filter',
      target: { fieldId: 'scorecard_daily_category' },
      operator: 'equals',
      values: [category],
    },
    {
      id: 'date-filter',
      target: { fieldId: 'scorecard_daily_report_date' },
      operator: 'inTheCurrent',
      values: [1],
      settings: { unitOfTime: 'years' },
    },
  ];

  for (const [key, values] of Object.entries(activeFilters)) {
    if (values.length === 0) continue;
    const fieldId = FILTER_FIELD_MAP[key];
    if (!fieldId) continue;

    rules.push({
      id: `filter-${key}`,
      target: { fieldId },
      operator: 'equals',
      values,
    });
  }

  return { id: 'root', and: rules };
}
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `cd apps/situation-room && npx vitest run __tests__/queries.test.ts`

Expected: PASS

- [ ] **Step 10: Create the API proxy route**

Create `apps/situation-room/app/api/lightdash/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { executeScorecardQuery, pollResults } from '@/lib/lightdash-client';
import { parseScorecardRows } from '@/lib/scorecard-parser';
import type { Category, CategoryData } from '@/lib/types';
import { buildCategoryFilters, CATEGORIES } from '@/lib/queries';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const filters: Record<string, string[]> = body.filters ?? {};
    const categories: Category[] = body.categories ?? CATEGORIES;

    // Execute queries sequentially to avoid Lightdash rate limits
    const results: CategoryData[] = [];
    for (const category of categories) {
      const filterGroup = buildCategoryFilters(category, filters);
      const queryUuid = await executeScorecardQuery(filterGroup);
      const rawRows = await pollResults(queryUuid);
      results.push({
        category,
        rows: parseScorecardRows(rawRows),
      });
    }

    return NextResponse.json({ data: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 11: Add server-only dependency**

```bash
cd apps/situation-room && pnpm add server-only
```

- [ ] **Step 12: Commit**

```bash
git add apps/situation-room/
git commit -m "feat(situation-room): add Lightdash API client, query builder, and proxy route"
```

---

## Task 4: Filter State Management (URL-driven)

**Files:**

- Create: `apps/situation-room/lib/filters.ts`
- Create: `apps/situation-room/hooks/use-filters.ts`
- Create: `apps/situation-room/__tests__/filters.test.ts`

- [ ] **Step 1: Install nuqs for URL state**

```bash
cd apps/situation-room && pnpm add nuqs
```

- [ ] **Step 2: Write filter definition tests**

Create `apps/situation-room/__tests__/filters.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { FILTER_DEFINITIONS, parseFilterParams } from '@/lib/filters';

describe('FILTER_DEFINITIONS', () => {
  it('defines all 17 dashboard filters', () => {
    expect(FILTER_DEFINITIONS).toHaveLength(17);
  });

  it('each filter has a key, label, fieldId, and type', () => {
    for (const f of FILTER_DEFINITIONS) {
      expect(f.key).toBeTruthy();
      expect(f.label).toBeTruthy();
      expect(f.fieldId).toBeTruthy();
      expect(['string', 'boolean', 'date']).toContain(f.type);
    }
  });
});

describe('parseFilterParams', () => {
  it('returns empty record for null params', () => {
    expect(parseFilterParams({})).toEqual({});
  });

  it('splits comma-separated values', () => {
    const result = parseFilterParams({ Division: 'Enterprise,SMB' });
    expect(result.Division).toEqual(['Enterprise', 'SMB']);
  });

  it('ignores unknown filter keys', () => {
    const result = parseFilterParams({ Division: 'Enterprise', bogus: 'x' });
    expect(result).toHaveProperty('Division');
    expect(result).not.toHaveProperty('bogus');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/situation-room && npx vitest run __tests__/filters.test.ts`

Expected: FAIL

- [ ] **Step 4: Implement filters.ts**

Create `apps/situation-room/lib/filters.ts`:

```ts
export interface FilterDefinition {
  key: string;
  label: string;
  fieldId: string;
  type: 'string' | 'boolean' | 'date';
}

export const FILTER_DEFINITIONS: FilterDefinition[] = [
  {
    key: 'DateRange',
    label: 'Date Range',
    fieldId: 'scorecard_daily_report_date',
    type: 'date',
  },
  {
    key: 'Division',
    label: 'Division',
    fieldId: 'scorecard_daily_Division',
    type: 'string',
  },
  {
    key: 'Owner',
    label: 'Owner',
    fieldId: 'scorecard_daily_Owner',
    type: 'string',
  },
  {
    key: 'Segment',
    label: 'Segment',
    fieldId: 'scorecard_daily_OpportunitySegment',
    type: 'string',
  },
  {
    key: 'Region',
    label: 'Region',
    fieldId: 'scorecard_daily_Queue_Region__c',
    type: 'string',
  },
  { key: 'SE', label: 'SE', fieldId: 'scorecard_daily_SE', type: 'string' },
  {
    key: 'BookingPlanOppType',
    label: 'Booking Plan Opp Type',
    fieldId: 'scorecard_daily_BookingPlanOppType2025',
    type: 'string',
  },
  {
    key: 'ProductFamily',
    label: 'Product Family',
    fieldId: 'scorecard_daily_ProductFamily',
    type: 'string',
  },
  {
    key: 'SDRSource',
    label: 'SDR Source',
    fieldId: 'scorecard_daily_SDRSource',
    type: 'string',
  },
  { key: 'SDR', label: 'SDR', fieldId: 'scorecard_daily_SDR', type: 'string' },
  {
    key: 'OppRecordType',
    label: 'POR v R360',
    fieldId: 'scorecard_daily_OppRecordType',
    type: 'string',
  },
  {
    key: 'AccountOwner',
    label: 'Account Owner',
    fieldId: 'scorecard_daily_AccountOwner',
    type: 'string',
  },
  {
    key: 'OwnerDepartment',
    label: 'Owner Department',
    fieldId: 'scorecard_daily_OwnerDepartment',
    type: 'string',
  },
  {
    key: 'StrategicFilter',
    label: 'Strategic Filter',
    fieldId: 'scorecard_daily_StrategicFilter',
    type: 'boolean',
  },
  {
    key: 'Accepted',
    label: 'Accepted',
    fieldId: 'scorecard_daily_Accepted',
    type: 'boolean',
  },
  {
    key: 'Gate1CriteriaMet',
    label: 'Gate 1 Criteria Met',
    fieldId: 'scorecard_daily_Gate1CriteriaMet',
    type: 'boolean',
  },
  {
    key: 'GateMetOrAccepted',
    label: 'Gate Met or Accepted',
    fieldId: 'scorecard_daily_GateMetOrAccepted',
    type: 'boolean',
  },
];

const VALID_KEYS = new Set(FILTER_DEFINITIONS.map((f) => f.key));

export function parseFilterParams(
  params: Record<string, string | undefined>,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const [key, value] of Object.entries(params)) {
    if (!VALID_KEYS.has(key) || !value) continue;
    result[key] = value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return result;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/situation-room && npx vitest run __tests__/filters.test.ts`

Expected: PASS

- [ ] **Step 6: Implement the useFilters hook**

Create `apps/situation-room/hooks/use-filters.ts`:

```tsx
'use client';

import { useQueryStates, parseAsString } from 'nuqs';
import { useCallback, useMemo } from 'react';
import { FILTER_DEFINITIONS, parseFilterParams } from '@/lib/filters';

const filterParsers = Object.fromEntries(
  FILTER_DEFINITIONS.map((f) => [f.key, parseAsString.withDefault('')]),
);

export function useFilters() {
  const [params, setParams] = useQueryStates(filterParsers, {
    history: 'push',
  });

  const activeFilters = useMemo(
    () => parseFilterParams(params as Record<string, string>),
    [params],
  );

  const activeCount = useMemo(
    () => Object.values(activeFilters).filter((v) => v.length > 0).length,
    [activeFilters],
  );

  const setFilter = useCallback(
    (key: string, values: string[]) => {
      setParams({ [key]: values.length > 0 ? values.join(',') : '' });
    },
    [setParams],
  );

  const clearAll = useCallback(() => {
    const cleared = Object.fromEntries(
      FILTER_DEFINITIONS.map((f) => [f.key, '']),
    );
    setParams(cleared);
  }, [setParams]);

  return { activeFilters, activeCount, setFilter, clearAll, params };
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/situation-room/
git commit -m "feat(situation-room): add URL-driven filter state management"
```

---

## Task 5: Data Fetching Hook

**Files:**

- Create: `apps/situation-room/hooks/use-scorecard-query.ts`

- [ ] **Step 1: Create the SWR-style data fetching hook**

Create `apps/situation-room/hooks/use-scorecard-query.ts`:

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CategoryData } from '@/lib/types';

interface UseScorecardQueryResult {
  data: CategoryData[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useScorecardQuery(
  filters: Record<string, string[]>,
): UseScorecardQueryResult {
  const [data, setData] = useState<CategoryData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filtersKey = JSON.stringify(filters);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/lightdash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:
          filtersKey === '{}'
            ? JSON.stringify({})
            : JSON.stringify({ filters }),
      });

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const json = await res.json();
      if (json.error) {
        throw new Error(json.error);
      }

      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [filtersKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/situation-room/hooks/
git commit -m "feat(situation-room): add scorecard data fetching hook"
```

---

## Task 6: Report Header Component

**Files:**

- Create: `apps/situation-room/components/report-header.tsx`

- [ ] **Step 1: Write the report header test**

Create `apps/situation-room/__tests__/report-header.test.ts` (or skip if no unit-testable logic — this is primarily a visual component).

- [ ] **Step 2: Implement the report header**

Create `apps/situation-room/components/report-header.tsx`:

```tsx
import { ThemeToggle } from './theme-toggle';

interface ReportHeaderProps {
  lastRefreshed?: Date;
}

export function ReportHeader({ lastRefreshed }: ReportHeaderProps) {
  const now = new Date();
  const year = now.getFullYear();

  return (
    <header className="pb-8 border-b border-border-subtle">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-text-tertiary mb-2">
            Situation Room
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary leading-tight">
            Sales Performance Report
          </h1>
          <p className="mt-3 text-sm text-text-secondary max-w-2xl leading-relaxed">
            Year-to-date performance across all booking categories. Metrics
            compare current period against prior year at the same point in time.
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="text-xs text-text-tertiary">Reporting Period</p>
            <p className="text-sm font-medium text-text-primary tabular-nums">
              {year} YTD
            </p>
          </div>
          <ThemeToggle />
        </div>
      </div>
      {lastRefreshed && (
        <p className="mt-4 text-xs text-text-tertiary">
          Last refreshed{' '}
          <time dateTime={lastRefreshed.toISOString()}>
            {lastRefreshed.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </time>
        </p>
      )}
    </header>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/situation-room/components/
git commit -m "feat(situation-room): add report header component"
```

---

## Task 7: Change Indicator and Metric Row Components

**Files:**

- Create: `apps/situation-room/components/change-indicator.tsx`
- Create: `apps/situation-room/components/metric-row.tsx`
- Create: `apps/situation-room/__tests__/change-indicator.test.ts`
- Create: `apps/situation-room/__tests__/metric-row.test.ts`

- [ ] **Step 1: Write change indicator tests**

Create `apps/situation-room/__tests__/change-indicator.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseChange } from '@/components/change-indicator';

describe('parseChange', () => {
  it('identifies positive changes', () => {
    const result = parseChange('+12.5%');
    expect(result).toEqual({ direction: 'positive', display: '+12.5%' });
  });

  it('identifies negative changes', () => {
    const result = parseChange('-8.3%');
    expect(result).toEqual({ direction: 'negative', display: '-8.3%' });
  });

  it('identifies neutral/dash changes', () => {
    const result = parseChange('-');
    expect(result).toEqual({ direction: 'neutral', display: '-' });
  });

  it('handles zero-ish values as neutral', () => {
    const result = parseChange('+0.0%');
    expect(result).toEqual({ direction: 'neutral', display: '+0.0%' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/situation-room && npx vitest run __tests__/change-indicator.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement change-indicator.tsx**

Create `apps/situation-room/components/change-indicator.tsx`:

```tsx
export type ChangeDirection = 'positive' | 'negative' | 'neutral';

export interface ParsedChange {
  direction: ChangeDirection;
  display: string;
}

export function parseChange(raw: string): ParsedChange {
  if (!raw || raw === '-') {
    return { direction: 'neutral', display: raw || '-' };
  }

  // Extract numeric value to handle all zero formats (+0.0%, -0.0%, 0%, etc.)
  const numeric = parseFloat(raw.replace(/[^0-9.\-+]/g, ''));

  if (isNaN(numeric) || numeric === 0) {
    return { direction: 'neutral', display: raw };
  }

  if (numeric > 0 || raw.startsWith('+')) {
    return { direction: 'positive', display: raw };
  }

  if (numeric < 0) {
    return { direction: 'negative', display: raw };
  }

  return { direction: 'neutral', display: raw };
}

const directionStyles: Record<ChangeDirection, string> = {
  positive: 'text-positive bg-positive-bg',
  negative: 'text-negative bg-negative-bg',
  neutral: 'text-neutral-change bg-surface-sunken',
};

interface ChangeIndicatorProps {
  value: string;
}

export function ChangeIndicator({ value }: ChangeIndicatorProps) {
  const { direction, display } = parseChange(value);

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium tabular-nums ${directionStyles[direction]}`}
    >
      {display}
    </span>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/situation-room && npx vitest run __tests__/change-indicator.test.ts`

Expected: PASS

- [ ] **Step 5: Implement metric-row.tsx**

Create `apps/situation-room/components/metric-row.tsx`:

```tsx
import type { ScorecardRow } from '@/lib/types';
import { ChangeIndicator } from './change-indicator';

interface MetricRowProps {
  row: ScorecardRow;
  isLast?: boolean;
}

export function MetricRow({ row, isLast = false }: MetricRowProps) {
  return (
    <div
      className={`grid grid-cols-[1fr_auto_auto_auto] gap-x-6 items-center py-3 ${
        isLast ? '' : 'border-b border-border-subtle'
      }`}
    >
      <span className="text-sm font-medium text-text-primary">
        {row.metricName}
      </span>
      <span className="text-sm tabular-nums text-text-primary font-semibold text-right min-w-[80px]">
        {row.currentPeriod}
      </span>
      <span className="text-sm tabular-nums text-text-secondary text-right min-w-[80px]">
        {row.previousPeriod}
      </span>
      <div className="text-right min-w-[72px]">
        <ChangeIndicator value={row.pctChange} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/situation-room/components/ apps/situation-room/__tests__/
git commit -m "feat(situation-room): add metric row and change indicator components"
```

---

## Task 8: Category Section Component

**Files:**

- Create: `apps/situation-room/components/category-section.tsx`

- [ ] **Step 1: Implement category-section.tsx**

Create `apps/situation-room/components/category-section.tsx`:

```tsx
import type { CategoryData } from '@/lib/types';
import { MetricRow } from './metric-row';

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'New Logo':
    'First-time customer acquisition — tracking pipeline generation through close.',
  Expansion:
    'Growth within existing accounts — upsells, cross-sells, and seat expansion.',
  Migration: 'Platform transitions — customers moving between product lines.',
  Renewal:
    'Contract renewals and retention performance across the book of business.',
  Total: 'Aggregate performance across all booking categories.',
};

interface CategorySectionProps {
  data: CategoryData;
}

export function CategorySection({ data }: CategorySectionProps) {
  const description = CATEGORY_DESCRIPTIONS[data.category] ?? '';

  return (
    <section className="py-8">
      <div className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight text-text-primary">
          {data.category}
        </h2>
        <p className="mt-1 text-sm text-text-secondary leading-relaxed">
          {description}
        </p>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 items-center pb-2 border-b border-border mb-1">
        <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          Metric
        </span>
        <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary text-right min-w-[80px]">
          Current
        </span>
        <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary text-right min-w-[80px]">
          Prior YTD
        </span>
        <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary text-right min-w-[72px]">
          Change
        </span>
      </div>

      {data.rows.map((row, i) => (
        <MetricRow
          key={row.sortOrder}
          row={row}
          isLast={i === data.rows.length - 1}
        />
      ))}
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/situation-room/components/
git commit -m "feat(situation-room): add category section component"
```

---

## Task 9: Executive Snapshot Component

**Files:**

- Create: `apps/situation-room/components/executive-snapshot.tsx`

- [ ] **Step 1: Implement executive-snapshot.tsx**

This component pulls the first metric (Annual Pacing — sort_order 1) from each category and shows them side by side for instant executive comparison.

Create `apps/situation-room/components/executive-snapshot.tsx`:

```tsx
import type { CategoryData } from '@/lib/types';
import { ChangeIndicator } from './change-indicator';

interface ExecutiveSnapshotProps {
  data: CategoryData[];
}

export function ExecutiveSnapshot({ data }: ExecutiveSnapshotProps) {
  // Extract the first metric (Annual Pacing, sort_order 1) from each category
  const highlights = data
    .filter((d) => d.rows.length > 0)
    .map((d) => ({
      category: d.category,
      metric: d.rows[0],
    }));

  if (highlights.length === 0) return null;

  return (
    <section className="py-8 border-b border-border-subtle">
      <h2 className="text-xs font-medium uppercase tracking-[0.15em] text-text-tertiary mb-5">
        Executive Snapshot
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {highlights.map(({ category, metric }) => (
          <div
            key={category}
            className="rounded-lg bg-surface-elevated px-4 py-4 border border-border-subtle"
          >
            <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">
              {category}
            </p>
            <p className="text-xs text-text-secondary mb-3">
              {metric.metricName}
            </p>
            <p className="text-2xl font-semibold tabular-nums text-text-primary tracking-tight">
              {metric.currentPeriod}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-text-tertiary tabular-nums">
                vs {metric.previousPeriod}
              </span>
              <ChangeIndicator value={metric.pctChange} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/situation-room/components/
git commit -m "feat(situation-room): add executive snapshot component"
```

---

## Task 10: Filter Rail Component

**Files:**

- Create: `apps/situation-room/components/filter-rail.tsx`
- Create: `apps/situation-room/components/filter-chip.tsx`

- [ ] **Step 1: Implement filter-chip.tsx**

Create `apps/situation-room/components/filter-chip.tsx`:

```tsx
import { Badge } from '@/components/ui/badge';

interface FilterChipProps {
  label: string;
  values: string[];
  onRemove: () => void;
}

export function FilterChip({ label, values, onRemove }: FilterChipProps) {
  return (
    <Badge
      variant="secondary"
      className="gap-1.5 pl-2.5 pr-1.5 py-1 text-xs font-normal bg-accent-subtle text-text-primary border border-border-subtle cursor-default"
    >
      <span className="font-medium text-text-secondary">{label}:</span>
      <span>{values.join(', ')}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-sm p-0.5 hover:bg-surface-sunken text-text-tertiary hover:text-text-primary transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        ×
      </button>
    </Badge>
  );
}
```

- [ ] **Step 2: Implement filter-rail.tsx**

Create `apps/situation-room/components/filter-rail.tsx`:

```tsx
'use client';

import { Button } from '@/components/ui/button';
import { FILTER_DEFINITIONS } from '@/lib/filters';
import { FilterChip } from './filter-chip';

interface FilterRailProps {
  activeFilters: Record<string, string[]>;
  activeCount: number;
  onSetFilter: (key: string, values: string[]) => void;
  onClearAll: () => void;
}

export function FilterRail({
  activeFilters,
  activeCount,
  onSetFilter,
  onClearAll,
}: FilterRailProps) {
  return (
    <div className="py-4 border-b border-border-subtle">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-text-tertiary">
          Filters
          {activeCount > 0 && (
            <span className="ml-2 text-accent font-semibold">
              {activeCount} active
            </span>
          )}
        </p>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-xs text-text-secondary hover:text-text-primary"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {FILTER_DEFINITIONS.filter(
            (f) => activeFilters[f.key]?.length > 0,
          ).map((f) => (
            <FilterChip
              key={f.key}
              label={f.label}
              values={activeFilters[f.key]}
              onRemove={() => onSetFilter(f.key, [])}
            />
          ))}
        </div>
      )}

      {/* Filter controls — compact row of selects */}
      <div className="flex flex-wrap gap-2">
        {FILTER_DEFINITIONS.filter((f) => f.type === 'string').map((f) => (
          <div key={f.key} className="relative">
            <input
              type="text"
              placeholder={f.label}
              className="h-8 px-3 text-xs rounded-md border border-border bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent w-[140px]"
              defaultValue={activeFilters[f.key]?.join(', ') ?? ''}
              onBlur={(e) => {
                const vals = e.target.value
                  .split(',')
                  .map((v) => v.trim())
                  .filter(Boolean);
                onSetFilter(f.key, vals);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                }
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/situation-room/components/
git commit -m "feat(situation-room): add filter rail and filter chip components"
```

---

## Task 11: Assemble the Report Page

**Files:**

- Modify: `apps/situation-room/app/page.tsx`

- [ ] **Step 1: Implement the full report page**

Create `apps/situation-room/components/report-content.tsx` (client component with all interactive logic):

```tsx
'use client';

import { ReportHeader } from '@/components/report-header';
import { FilterRail } from '@/components/filter-rail';
import { ExecutiveSnapshot } from '@/components/executive-snapshot';
import { CategorySection } from '@/components/category-section';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useFilters } from '@/hooks/use-filters';
import { useScorecardQuery } from '@/hooks/use-scorecard-query';
import { CATEGORIES } from '@/lib/queries';

export function ReportContent() {
  const { activeFilters, activeCount, setFilter, clearAll } = useFilters();
  const { data, isLoading, error } = useScorecardQuery(activeFilters);

  return (
    <main className="min-h-screen max-w-5xl mx-auto px-6 py-10 md:px-10 md:py-14">
      <ReportHeader lastRefreshed={data ? new Date() : undefined} />

      <FilterRail
        activeFilters={activeFilters}
        activeCount={activeCount}
        onSetFilter={setFilter}
        onClearAll={clearAll}
      />

      {error && (
        <div className="mt-8 rounded-lg bg-negative-bg border border-negative/20 px-4 py-3">
          <p className="text-sm text-negative">{error}</p>
        </div>
      )}

      {isLoading && (
        <div className="mt-8 space-y-6">
          {/* Executive snapshot skeleton */}
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
          {/* Category section skeletons */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-3 py-8">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64" />
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-10 w-full" />
              ))}
            </div>
          ))}
        </div>
      )}

      {data && !isLoading && (
        <>
          <ExecutiveSnapshot data={data} />

          <div className="divide-y divide-border-subtle">
            {CATEGORIES.map((cat) => {
              const catData = data.find((d) => d.category === cat);
              if (!catData) return null;
              return <CategorySection key={cat} data={catData} />;
            })}
          </div>
        </>
      )}

      {/* Report footer */}
      <Separator className="mt-12" />
      <footer className="py-6 text-center">
        <p className="text-xs text-text-tertiary">
          Data sourced from Lightdash semantic layer · All metrics governed
          centrally
        </p>
      </footer>
    </main>
  );
}
```

Then replace `apps/situation-room/app/page.tsx` (server component shell):

```tsx
import { ReportContent } from '@/components/report-content';

export default function ReportPage() {
  return <ReportContent />;
}
```

- [ ] **Step 2: Update layout.tsx with Inter font and NuqsAdapter**

Update `apps/situation-room/app/layout.tsx` to include the Inter font, ThemeProvider, and NuqsAdapter (must be in layout, not page, per nuqs docs):

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { ThemeProvider } from '@/components/theme-provider';
import './global.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Situation Room — Sales Performance Report',
  description: 'Board-facing sales performance scorecard report',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <NuqsAdapter>{children}</NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

Note: The `next/font` variable is set to `--font-sans` to match the CSS `@theme` block in `global.css`.

- [ ] **Step 3: Verify dev server runs without errors**

Run: `pnpm sr:dev`

The page should render the header, filter rail, and skeleton loading states. Without valid Lightdash credentials it will show an error state after the API call fails — that's expected.

- [ ] **Step 4: Commit**

```bash
git add apps/situation-room/
git commit -m "feat(situation-room): assemble full report page with all components"
```

---

## Task 12: Chart.js Trend Chart Component

**Files:**

- Create: `apps/situation-room/components/trend-chart.tsx`

- [ ] **Step 1: Install Chart.js dependencies**

```bash
cd apps/situation-room && pnpm add chart.js react-chartjs-2
```

- [ ] **Step 2: Implement trend-chart.tsx**

Create `apps/situation-room/components/trend-chart.tsx`.

**Important:** Chart.js renders to `<canvas>` and cannot resolve CSS `var()` functions. We must read computed CSS variable values at render time using `getComputedStyle`.

```tsx
'use client';

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { CategoryData } from '@/lib/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
);

function useCssVar(name: string): string {
  // Read once per render — safe because theme changes trigger re-render
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

interface TrendChartProps {
  data: CategoryData[];
  metricIndex: number;
}

export function TrendChart({ data, metricIndex }: TrendChartProps) {
  // Resolve CSS variables to actual color values for canvas rendering
  const accent = useCssVar('--color-accent');
  const border = useCssVar('--color-border');
  const borderSubtle = useCssVar('--color-border-subtle');
  const textSecondary = useCssVar('--color-text-secondary');
  const textTertiary = useCssVar('--color-text-tertiary');
  const surfaceElevated = useCssVar('--color-surface-elevated');
  const textPrimary = useCssVar('--color-text-primary');

  const categories = data.filter((d) => d.category !== 'Total');

  const labels = categories.map((d) => d.category);
  const currentValues = categories.map((d) => {
    const row = d.rows[metricIndex];
    if (!row) return 0;
    const cleaned = row.currentPeriod.replace(/[$,K%]/g, '');
    return parseFloat(cleaned) || 0;
  });
  const previousValues = categories.map((d) => {
    const row = d.rows[metricIndex];
    if (!row) return 0;
    const cleaned = row.previousPeriod.replace(/[$,K%]/g, '');
    return parseFloat(cleaned) || 0;
  });

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: 'Current YTD',
          data: currentValues,
          backgroundColor: accent || '#1e40af',
          borderRadius: 4,
          barPercentage: 0.35,
          categoryPercentage: 0.7,
        },
        {
          label: 'Prior YTD',
          data: previousValues,
          backgroundColor: border || '#e5e7eb',
          borderRadius: 4,
          barPercentage: 0.35,
          categoryPercentage: 0.7,
        },
      ],
    }),
    [labels, currentValues, previousValues, accent, border],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          align: 'end' as const,
          labels: {
            usePointStyle: true,
            pointStyle: 'rectRounded',
            padding: 16,
            font: { size: 11, family: 'Inter, sans-serif' },
            color: textSecondary || '#6b7280',
          },
        },
        tooltip: {
          backgroundColor: surfaceElevated || '#f8f9fa',
          titleColor: textPrimary || '#111827',
          bodyColor: textSecondary || '#6b7280',
          borderColor: border || '#e5e7eb',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          titleFont: {
            size: 12,
            weight: '600' as const,
            family: 'Inter, sans-serif',
          },
          bodyFont: { size: 11, family: 'Inter, sans-serif' },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 11, family: 'Inter, sans-serif' },
            color: textTertiary || '#9ca3af',
          },
          border: { display: false },
        },
        y: {
          grid: { color: borderSubtle || '#f0f0f0' },
          ticks: {
            font: { size: 11, family: 'Inter, sans-serif' },
            color: textTertiary || '#9ca3af',
          },
          border: { display: false },
        },
      },
    }),
    [
      textSecondary,
      textTertiary,
      textPrimary,
      surfaceElevated,
      border,
      borderSubtle,
    ],
  );

  return (
    <div className="h-[240px] w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
}
```

- [ ] **Step 3: Add the trend chart to the report content**

In `apps/situation-room/components/report-content.tsx`, import `TrendChart` and add it between the `ExecutiveSnapshot` and the category sections:

```tsx
{
  data && (
    <>
      <ExecutiveSnapshot data={data} />

      {/* Comparison chart — Annual Pacing across categories */}
      <section className="py-8 border-b border-border-subtle">
        <h2 className="text-xs font-medium uppercase tracking-[0.15em] text-text-tertiary mb-5">
          Category Comparison
        </h2>
        <TrendChart data={data} metricIndex={0} />
      </section>

      <div className="divide-y divide-border-subtle">
        {/* ...category sections... */}
      </div>
    </>
  );
}
```

- [ ] **Step 4: Verify the chart renders**

Run: `pnpm sr:dev` — confirm the bar chart renders (will need mock data or valid Lightdash credentials).

- [ ] **Step 5: Commit**

```bash
git add apps/situation-room/
git commit -m "feat(situation-room): add Chart.js trend chart component"
```

---

## Task 13: Responsive Design and Polish Pass

**Files:**

- Modify: `apps/situation-room/components/*.tsx` (various)
- Modify: `apps/situation-room/app/global.css`

- [ ] **Step 1: Add responsive breakpoints to category section grid**

Update `metric-row.tsx` grid to collapse on mobile:

```tsx
// Change grid-cols-[1fr_auto_auto_auto] to:
className =
  'grid grid-cols-2 sm:grid-cols-[1fr_auto_auto_auto] gap-x-4 sm:gap-x-6 ...';
```

Similarly update the column headers in `category-section.tsx` to hide Prior YTD on mobile.

- [ ] **Step 2: Make executive snapshot responsive**

The `grid-cols-2 md:grid-cols-3 lg:grid-cols-5` in `executive-snapshot.tsx` already handles this.

- [ ] **Step 3: Add print styles**

Add to `global.css`:

```css
@media print {
  body {
    background: white;
    color: black;
  }
  .no-print {
    display: none;
  }
}
```

Mark the filter rail and theme toggle as `no-print`.

- [ ] **Step 4: Polish dark theme**

Review all components in dark mode. Ensure:

- Elevated surfaces use `bg-surface-elevated` with proper contrast
- Border colors shift appropriately
- Change indicator pills have sufficient contrast on dark backgrounds
- Chart tooltip colors work in dark mode

- [ ] **Step 5: Commit**

```bash
git add apps/situation-room/
git commit -m "feat(situation-room): responsive design and dark theme polish"
```

---

## Task 14: Typecheck and Final Validation

**Files:**

- Modify: root `package.json` (add typecheck script)

- [ ] **Step 1: Run TypeScript typecheck**

```bash
cd apps/situation-room && npx tsc --noEmit
```

Fix any type errors.

- [ ] **Step 2: Run all unit tests**

```bash
cd apps/situation-room && npx vitest run
```

All tests must pass.

- [ ] **Step 3: Run the build**

```bash
pnpm sr:build
```

Must complete without errors.

- [ ] **Step 4: Visual review in both themes**

Run `pnpm sr:dev` and review:

- Light theme at desktop, tablet, and mobile widths
- Dark theme at desktop, tablet, and mobile widths
- Loading skeleton states
- Error state display
- Filter interaction flow

- [ ] **Step 5: Run root validation (ensure no regressions)**

```bash
pnpm format:check && pnpm lightdash:validate-refs && pnpm lightdash:validate-shared
```

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat(situation-room): typecheck, tests, and build validation"
```

---

## Task 15: Create Pull Request

- [ ] **Step 1: Push the branch and create PR**

Read `.github/pull_request_template.md` and fill every section. Create the PR against `main`.

---

## Summary of Commit Sequence

1. `feat(situation-room): scaffold Next.js app in monorepo`
2. `feat(situation-room): add shadcn/ui primitives and theme system`
3. `feat(situation-room): add Lightdash API client, query builder, and proxy route`
4. `feat(situation-room): add URL-driven filter state management`
5. `feat(situation-room): add scorecard data fetching hook`
6. `feat(situation-room): add report header component`
7. `feat(situation-room): add metric row and change indicator components`
8. `feat(situation-room): add category section component`
9. `feat(situation-room): add executive snapshot component`
10. `feat(situation-room): add filter rail and filter chip components`
11. `feat(situation-room): assemble full report page with all components`
12. `feat(situation-room): add Chart.js trend chart component`
13. `feat(situation-room): responsive design and dark theme polish`
14. `feat(situation-room): typecheck, tests, and build validation`
