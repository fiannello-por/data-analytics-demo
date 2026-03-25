# Modular Analytics Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a shared `packages/analytics-adapter/` package with a provider-agnostic `SemanticLayerClient` interface, a Lightdash provider, and wire it into the Situation Room via a `LightdashScorecardAdapter`.

**Architecture:** Two-layer adapter system. The shared package (`@por/analytics-adapter`) provides a generic semantic layer query interface with pluggable providers. App-level adapters (e.g., `LightdashScorecardAdapter`) use the generic client to implement domain-specific contracts (e.g., `ScorecardDataAdapter`). The existing `BigQueryAdapter` direct path is unchanged.

**Tech Stack:** TypeScript 5.9, Vitest 3, pnpm workspaces, Node 22+, ESNext modules

**Spec:** `docs/superpowers/specs/2026-03-21-modular-analytics-adapter-design.md`

---

## File Structure

### New: `packages/analytics-adapter/`

| File | Responsibility |
|------|----------------|
| `src/index.ts` | Public exports: `createClient`, all types, `SemanticLayerError` |
| `src/interface.ts` | `SemanticLayerClient` interface, `MetricQuery`, `QueryResult`, `Row`, `Filter`, `FilterOperator`, `Sort` types |
| `src/error.ts` | `SemanticLayerError` class with typed error codes |
| `src/factory.ts` | `createClient(config)` factory function |
| `src/providers/lightdash.ts` | `LightdashProvider` implementing `SemanticLayerClient` — field translation, filter translation, HTTP query, polling, response normalization |
| `__tests__/interface.test.ts` | Type contract tests |
| `__tests__/lightdash-provider.test.ts` | Lightdash provider tests with mocked `fetch` |
| `__tests__/factory.test.ts` | Factory tests |
| `package.json` | `@por/analytics-adapter`, private workspace package |
| `tsconfig.json` | ESNext, strict, `noEmit: true` |
| `vitest.config.ts` | Node environment |

### New: Situation Room app-level adapter

| File | Responsibility |
|------|----------------|
| `apps/situation-room/lib/data-adapters/lightdash-adapter.ts` | `LightdashScorecardAdapter` implementing `ScorecardDataAdapter` using `SemanticLayerClient` |
| `apps/situation-room/__tests__/lightdash-adapter.test.ts` | Tests for the app-level Lightdash adapter |

### Modified

| File | Change |
|------|--------|
| `pnpm-workspace.yaml` | Add `packages/*` |
| `apps/situation-room/package.json` | Add `@por/analytics-adapter` workspace dep |
| `apps/situation-room/lib/data-adapters/index.ts` | Update factory to support `SITUATION_ROOM_BACKEND=lightdash` |
| `apps/situation-room/components/category-section.tsx` | Rewrite import from `@/lib/types` → `@/lib/contracts` |
| `apps/situation-room/components/executive-snapshot.tsx` | Rewrite import from `@/lib/types` → `@/lib/contracts` |
| `apps/situation-room/components/trend-chart.tsx` | Rewrite import from `@/lib/types` → `@/lib/contracts` |
| `apps/situation-room/components/metric-row.tsx` | Rewrite import from `@/lib/types` → `@/lib/contracts` |

### Deleted

| File | Reason |
|------|--------|
| `apps/situation-room/lib/lightdash-client.ts` | Replaced by `LightdashProvider` in adapter package |
| `apps/situation-room/lib/queries.ts` | Filter field map & query building move into provider |
| `apps/situation-room/lib/scorecard-parser.ts` | Response normalization moves into provider |
| `apps/situation-room/lib/types.ts` | Legacy duplicates of types in `contracts.ts` + `LightdashFilterRule` |
| `apps/situation-room/app/api/lightdash/route.ts` | Old Lightdash route, replaced by `app/api/report/route.ts` |
| `apps/situation-room/__tests__/queries.test.ts` | Tests for deleted `queries.ts` |
| `apps/situation-room/__tests__/scorecard-parser.test.ts` | Tests for deleted `scorecard-parser.ts` |

---

## Task 1: Scaffold the analytics-adapter package

**Files:**
- Create: `packages/analytics-adapter/package.json`
- Create: `packages/analytics-adapter/tsconfig.json`
- Create: `packages/analytics-adapter/vitest.config.ts`
- Create: `packages/analytics-adapter/src/index.ts`
- Modify: `pnpm-workspace.yaml`

- [ ] **Step 1: Add `packages/*` to workspace**

In `pnpm-workspace.yaml`, add the `packages/*` glob:

```yaml
packages:
  - apps/*
  - packages/*
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "@por/analytics-adapter",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "5.9.3",
    "vitest": "^3.0.0"
  }
}
```

Note: no build step — workspace packages are consumed directly via `main: ./src/index.ts` by Next.js bundler.

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "noEmit": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "isolatedModules": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "__tests__"]
}
```

- [ ] **Step 4: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node' },
});
```

- [ ] **Step 5: Create placeholder src/index.ts**

```ts
// @por/analytics-adapter — generic semantic layer client
export {};
```

- [ ] **Step 6: Install dependencies**

Run: `pnpm install`

- [ ] **Step 7: Verify package is recognized**

Run: `pnpm --filter @por/analytics-adapter typecheck`
Expected: succeeds with no errors

- [ ] **Step 8: Commit**

```bash
git add packages/analytics-adapter/ pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "chore: scaffold analytics-adapter workspace package"
```

---

## Task 2: Define the generic interface and error types

**Files:**
- Create: `packages/analytics-adapter/src/interface.ts`
- Create: `packages/analytics-adapter/src/error.ts`
- Create: `packages/analytics-adapter/__tests__/interface.test.ts`
- Modify: `packages/analytics-adapter/src/index.ts`

- [ ] **Step 1: Write the failing test for interface types**

Create `packages/analytics-adapter/__tests__/interface.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type {
  SemanticLayerClient,
  MetricQuery,
  QueryResult,
  Row,
  Filter,
  FilterOperator,
  Sort,
} from '../src/interface';

describe('SemanticLayerClient interface', () => {
  it('accepts a valid MetricQuery and returns QueryResult', async () => {
    const mockClient: SemanticLayerClient = {
      async query(params: MetricQuery): Promise<QueryResult> {
        return {
          rows: [
            {
              metric_name: { raw: 'Revenue', formatted: 'Revenue' },
              amount: { raw: 1000, formatted: '$1,000' },
            },
          ],
          meta: { queryCount: 1 },
        };
      },
    };

    const result = await mockClient.query({
      model: 'pipeline',
      measures: ['amount'],
      dimensions: ['metric_name'],
      filters: [{ field: 'stage', operator: 'equals', values: ['Won'] }],
      sorts: [{ field: 'amount', descending: true }],
      limit: 10,
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].amount.raw).toBe(1000);
    expect(result.rows[0].amount.formatted).toBe('$1,000');
    expect(result.meta?.queryCount).toBe(1);
  });

  it('works with minimal query (no filters, sorts, or limit)', async () => {
    const mockClient: SemanticLayerClient = {
      async query(): Promise<QueryResult> {
        return { rows: [] };
      },
    };

    const result = await mockClient.query({
      model: 'test',
      measures: ['count'],
      dimensions: [],
    });

    expect(result.rows).toEqual([]);
    expect(result.meta).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @por/analytics-adapter test`
Expected: FAIL — modules not found

- [ ] **Step 3: Create interface.ts**

Create `packages/analytics-adapter/src/interface.ts`:

```ts
export interface SemanticLayerClient {
  query(params: MetricQuery): Promise<QueryResult>;
}

export interface MetricQuery {
  model: string;
  measures: string[];
  dimensions: string[];
  filters?: Filter[];
  sorts?: Sort[];
  limit?: number;
}

export interface Filter {
  field: string;
  operator: FilterOperator;
  values?: (string | number | boolean)[];
}

export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'greaterThan'
  | 'lessThan'
  | 'between'
  | 'currentYear'
  | 'currentMonth'
  | 'currentWeek'
  | 'pastYears'
  | 'pastMonths'
  | 'pastDays'
  | 'isTrue'
  | 'isFalse'
  | 'isNull'
  | 'isNotNull';

export interface Sort {
  field: string;
  descending: boolean;
}

export interface QueryResult {
  rows: Row[];
  meta?: {
    queryCount: number;
    bytesProcessed?: number;
  };
}

export type Row = Record<
  string,
  {
    raw: unknown;
    formatted: string;
  }
>;
```

- [ ] **Step 4: Create error.ts**

Create `packages/analytics-adapter/src/error.ts`:

```ts
export type SemanticLayerErrorCode =
  | 'CONNECTION'
  | 'QUERY'
  | 'TIMEOUT'
  | 'AUTH'
  | 'MODEL_NOT_FOUND';

export class SemanticLayerError extends Error {
  constructor(
    message: string,
    public readonly code: SemanticLayerErrorCode,
  ) {
    super(message);
    this.name = 'SemanticLayerError';
  }
}
```

- [ ] **Step 5: Update index.ts exports**

Update `packages/analytics-adapter/src/index.ts`:

```ts
export type {
  SemanticLayerClient,
  MetricQuery,
  QueryResult,
  Row,
  Filter,
  FilterOperator,
  Sort,
} from './interface';

export {
  SemanticLayerError,
  type SemanticLayerErrorCode,
} from './error';
```

- [ ] **Step 6: Run tests**

Run: `pnpm --filter @por/analytics-adapter test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/analytics-adapter/
git commit -m "feat(analytics-adapter): define SemanticLayerClient interface and error types"
```

---

## Task 3: Implement the Lightdash provider

**Files:**
- Create: `packages/analytics-adapter/src/providers/lightdash.ts`
- Create: `packages/analytics-adapter/__tests__/lightdash-provider.test.ts`
- Modify: `packages/analytics-adapter/src/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/analytics-adapter/__tests__/lightdash-provider.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LightdashProvider } from '../src/providers/lightdash';
import { SemanticLayerError } from '../src/error';
import type { MetricQuery } from '../src/interface';

const BASE_CONFIG = {
  url: 'https://lightdash.example.com',
  apiKey: 'test-api-key',
  projectUuid: 'test-project-uuid',
};

function mockFetchSequence(responses: Array<{ ok: boolean; json: () => unknown; status?: number; text?: () => string }>) {
  const fetchMock = vi.fn();
  for (const res of responses) {
    fetchMock.mockResolvedValueOnce({
      ok: res.ok,
      status: res.status ?? (res.ok ? 200 : 500),
      json: async () => res.json(),
      text: async () => res.text?.() ?? '',
    });
  }
  return fetchMock;
}

describe('LightdashProvider', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('translates a generic query into a Lightdash metric-query request', async () => {
    const fetchMock = mockFetchSequence([
      // POST metric-query → returns queryUuid
      { ok: true, json: () => ({ results: { queryUuid: 'q-123' } }) },
      // GET poll → returns ready results
      {
        ok: true,
        json: () => ({
          results: {
            status: 'ready',
            rows: [
              {
                my_model_revenue: { value: { raw: 1000, formatted: '$1,000' } },
                my_model_stage: { value: { raw: 'Won', formatted: 'Won' } },
              },
            ],
          },
        }),
      },
    ]);
    globalThis.fetch = fetchMock;

    const provider = new LightdashProvider(BASE_CONFIG);
    const result = await provider.query({
      model: 'my_model',
      measures: ['revenue'],
      dimensions: ['stage'],
      filters: [{ field: 'stage', operator: 'equals', values: ['Won'] }],
      sorts: [{ field: 'revenue', descending: true }],
      limit: 10,
    });

    // Verify the POST request
    const [postUrl, postOptions] = fetchMock.mock.calls[0];
    expect(postUrl).toBe(
      'https://lightdash.example.com/api/v2/projects/test-project-uuid/query/metric-query',
    );
    const postBody = JSON.parse(postOptions.body);
    expect(postBody.query.exploreName).toBe('my_model');
    expect(postBody.query.metrics).toEqual(['my_model_revenue']);
    expect(postBody.query.dimensions).toEqual(['my_model_stage']);
    expect(postBody.query.filters.dimensions.and[0].operator).toBe('equals');
    expect(postBody.query.filters.dimensions.and[0].target.fieldId).toBe('my_model_stage');
    expect(postBody.query.sorts).toEqual([{ fieldId: 'my_model_revenue', descending: true }]);
    expect(postBody.query.limit).toBe(10);

    // Verify normalized response (explore prefix stripped)
    expect(result.rows).toEqual([
      {
        revenue: { raw: 1000, formatted: '$1,000' },
        stage: { raw: 'Won', formatted: 'Won' },
      },
    ]);
    expect(result.meta?.queryCount).toBe(1);
  });

  it('translates currentYear filter into Lightdash inTheCurrent operator', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, json: () => ({ results: { queryUuid: 'q-1' } }) },
      { ok: true, json: () => ({ results: { status: 'ready', rows: [] } }) },
    ]);
    globalThis.fetch = fetchMock;

    const provider = new LightdashProvider(BASE_CONFIG);
    await provider.query({
      model: 'test',
      measures: ['count'],
      dimensions: [],
      filters: [{ field: 'date', operator: 'currentYear' }],
    });

    const postBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    const filter = postBody.query.filters.dimensions.and[0];
    expect(filter.operator).toBe('inTheCurrent');
    expect(filter.values).toEqual([1]);
    expect(filter.settings).toEqual({ unitOfTime: 'years' });
  });

  it('polls until results are ready', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, json: () => ({ results: { queryUuid: 'q-1' } }) },
      { ok: true, json: () => ({ results: { status: 'running' } }) },
      { ok: true, json: () => ({ results: { status: 'running' } }) },
      { ok: true, json: () => ({ results: { status: 'ready', rows: [] } }) },
    ]);
    globalThis.fetch = fetchMock;

    const provider = new LightdashProvider({ ...BASE_CONFIG, pollDelayMs: 0 });
    const result = await provider.query({
      model: 'test',
      measures: [],
      dimensions: [],
    });

    expect(fetchMock).toHaveBeenCalledTimes(4); // 1 POST + 3 GETs
    expect(result.rows).toEqual([]);
  });

  it('throws TIMEOUT when polling exceeds maxAttempts', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, json: () => ({ results: { queryUuid: 'q-1' } }) },
      { ok: true, json: () => ({ results: { status: 'running' } }) },
      { ok: true, json: () => ({ results: { status: 'running' } }) },
    ]);
    globalThis.fetch = fetchMock;

    const provider = new LightdashProvider({
      ...BASE_CONFIG,
      pollDelayMs: 0,
      maxPollAttempts: 2,
    });

    const error = await provider
      .query({ model: 'test', measures: [], dimensions: [] })
      .catch((e) => e);

    expect(error).toBeInstanceOf(SemanticLayerError);
    expect(error.code).toBe('TIMEOUT');
  });

  it('throws QUERY when Lightdash returns error status', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, json: () => ({ results: { queryUuid: 'q-1' } }) },
      {
        ok: true,
        json: () => ({
          results: { status: 'error', error: 'Table not found' },
        }),
      },
    ]);
    globalThis.fetch = fetchMock;

    const provider = new LightdashProvider(BASE_CONFIG);

    await expect(
      provider.query({ model: 'test', measures: [], dimensions: [] }),
    ).rejects.toMatchObject({ code: 'QUERY' });
  });

  it('throws AUTH when Lightdash returns 401', async () => {
    const fetchMock = mockFetchSequence([
      { ok: false, status: 401, json: () => ({}), text: () => 'Unauthorized' },
    ]);
    globalThis.fetch = fetchMock;

    const provider = new LightdashProvider(BASE_CONFIG);

    await expect(
      provider.query({ model: 'test', measures: [], dimensions: [] }),
    ).rejects.toMatchObject({ code: 'AUTH' });
  });

  it('throws CONNECTION when fetch fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));

    const provider = new LightdashProvider(BASE_CONFIG);

    await expect(
      provider.query({ model: 'test', measures: [], dimensions: [] }),
    ).rejects.toMatchObject({ code: 'CONNECTION' });
  });

  it('translates isTrue/isFalse filters', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, json: () => ({ results: { queryUuid: 'q-1' } }) },
      { ok: true, json: () => ({ results: { status: 'ready', rows: [] } }) },
    ]);
    globalThis.fetch = fetchMock;

    const provider = new LightdashProvider(BASE_CONFIG);
    await provider.query({
      model: 'test',
      measures: [],
      dimensions: [],
      filters: [{ field: 'active', operator: 'isTrue' }],
    });

    const postBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    const filter = postBody.query.filters.dimensions.and[0];
    expect(filter.operator).toBe('equals');
    expect(filter.values).toEqual([true]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @por/analytics-adapter test`
Expected: FAIL — `LightdashProvider` not found

- [ ] **Step 3: Implement the Lightdash provider**

Create `packages/analytics-adapter/src/providers/lightdash.ts`:

```ts
import type {
  Filter,
  MetricQuery,
  QueryResult,
  Row,
  SemanticLayerClient,
} from '../interface';
import { SemanticLayerError } from '../error';

export type LightdashProviderConfig = {
  url: string;
  apiKey: string;
  projectUuid: string;
  maxPollAttempts?: number;
  pollDelayMs?: number;
};

type LightdashFilterRule = {
  id: string;
  target: { fieldId: string };
  operator: string;
  values?: (string | number | boolean)[];
  settings?: Record<string, unknown>;
};

export class LightdashProvider implements SemanticLayerClient {
  private readonly url: string;
  private readonly apiKey: string;
  private readonly projectUuid: string;
  private readonly maxPollAttempts: number;
  private readonly pollDelayMs: number;

  constructor(config: LightdashProviderConfig) {
    this.url = config.url;
    this.apiKey = config.apiKey;
    this.projectUuid = config.projectUuid;
    this.maxPollAttempts = config.maxPollAttempts ?? 30;
    this.pollDelayMs = config.pollDelayMs ?? 1000;
  }

  async query(params: MetricQuery): Promise<QueryResult> {
    const { model } = params;
    const queryUuid = await this.submitQuery(model, params);
    const rawRows = await this.pollResults(queryUuid);

    return {
      rows: rawRows.map((row) => this.normalizeRow(model, row)),
      meta: { queryCount: 1 },
    };
  }

  private async submitQuery(
    model: string,
    params: MetricQuery,
  ): Promise<string> {
    const body = {
      query: {
        exploreName: model,
        dimensions: params.dimensions.map((d) => `${model}_${d}`),
        metrics: params.measures.map((m) => `${model}_${m}`),
        filters: {
          dimensions: {
            id: 'root',
            and: (params.filters ?? []).map((f, i) =>
              this.translateFilter(model, f, i),
            ),
          },
        },
        sorts: (params.sorts ?? []).map((s) => ({
          fieldId: `${model}_${s.field}`,
          descending: s.descending,
        })),
        limit: params.limit ?? 500,
      },
      context: 'api',
    };

    let res: Response;
    try {
      res = await fetch(
        `${this.url}/api/v2/projects/${this.projectUuid}/query/metric-query`,
        {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify(body),
        },
      );
    } catch (error) {
      throw new SemanticLayerError(
        `Failed to connect to Lightdash: ${error instanceof Error ? error.message : String(error)}`,
        'CONNECTION',
      );
    }

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new SemanticLayerError(
          `Lightdash authentication failed: ${res.status}`,
          'AUTH',
        );
      }
      throw new SemanticLayerError(
        `Lightdash query submission failed: ${res.status} ${await res.text()}`,
        'QUERY',
      );
    }

    const data = await res.json();
    return data.results.queryUuid;
  }

  private async pollResults(
    queryUuid: string,
  ): Promise<Record<string, { value: { raw: unknown; formatted: string } }>[]> {
    for (let i = 0; i < this.maxPollAttempts; i++) {
      const res = await fetch(
        `${this.url}/api/v2/projects/${this.projectUuid}/query/${queryUuid}?page=1&pageSize=500`,
        { headers: this.headers() },
      );

      if (!res.ok) {
        throw new SemanticLayerError(
          `Lightdash poll failed: ${res.status}`,
          'QUERY',
        );
      }

      const data = await res.json();
      const results = data.results;

      if (results.status === 'ready') return results.rows;
      if (results.status === 'error' || results.status === 'expired') {
        throw new SemanticLayerError(
          `Lightdash query failed: ${results.error ?? 'unknown error'}`,
          'QUERY',
        );
      }

      await new Promise((resolve) => setTimeout(resolve, this.pollDelayMs));
    }

    throw new SemanticLayerError(
      'Lightdash query timed out after max polling attempts',
      'TIMEOUT',
    );
  }

  private translateFilter(
    model: string,
    filter: Filter,
    index: number,
  ): LightdashFilterRule {
    const fieldId = `${model}_${filter.field}`;
    const id = `filter-${index}`;

    switch (filter.operator) {
      case 'currentYear':
        return {
          id,
          target: { fieldId },
          operator: 'inTheCurrent',
          values: [1],
          settings: { unitOfTime: 'years' },
        };
      case 'currentMonth':
        return {
          id,
          target: { fieldId },
          operator: 'inTheCurrent',
          values: [1],
          settings: { unitOfTime: 'months' },
        };
      case 'currentWeek':
        return {
          id,
          target: { fieldId },
          operator: 'inTheCurrent',
          values: [1],
          settings: { unitOfTime: 'weeks' },
        };
      case 'pastYears':
        return {
          id,
          target: { fieldId },
          operator: 'inThePast',
          values: filter.values ?? [1],
          settings: { unitOfTime: 'years' },
        };
      case 'pastMonths':
        return {
          id,
          target: { fieldId },
          operator: 'inThePast',
          values: filter.values ?? [1],
          settings: { unitOfTime: 'months' },
        };
      case 'pastDays':
        return {
          id,
          target: { fieldId },
          operator: 'inThePast',
          values: filter.values ?? [1],
          settings: { unitOfTime: 'days' },
        };
      case 'isTrue':
        return {
          id,
          target: { fieldId },
          operator: 'equals',
          values: [true],
        };
      case 'isFalse':
        return {
          id,
          target: { fieldId },
          operator: 'equals',
          values: [false],
        };
      case 'isNull':
        return { id, target: { fieldId }, operator: 'isNull' };
      case 'isNotNull':
        return { id, target: { fieldId }, operator: 'isNotNull' };
      default:
        return {
          id,
          target: { fieldId },
          operator: filter.operator,
          values: filter.values,
        };
    }
  }

  private normalizeRow(
    model: string,
    row: Record<string, { value: { raw: unknown; formatted: string } }>,
  ): Row {
    const prefix = `${model}_`;
    const normalized: Row = {};

    for (const [key, cell] of Object.entries(row)) {
      const field = key.startsWith(prefix) ? key.slice(prefix.length) : key;
      normalized[field] = { raw: cell.value.raw, formatted: cell.value.formatted };
    }

    return normalized;
  }

  private headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      Authorization: `ApiKey ${this.apiKey}`,
    };
  }
}
```

- [ ] **Step 4: Export the provider from index.ts**

Update `packages/analytics-adapter/src/index.ts`, append:

```ts
export { LightdashProvider, type LightdashProviderConfig } from './providers/lightdash';
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @por/analytics-adapter test`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add packages/analytics-adapter/
git commit -m "feat(analytics-adapter): implement Lightdash provider with query/poll/normalize"
```

---

## Task 4: Add the factory function

**Files:**
- Create: `packages/analytics-adapter/src/factory.ts`
- Create: `packages/analytics-adapter/__tests__/factory.test.ts`
- Modify: `packages/analytics-adapter/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/analytics-adapter/__tests__/factory.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createClient } from '../src/factory';
import { LightdashProvider } from '../src/providers/lightdash';

describe('createClient', () => {
  it('returns a LightdashProvider when provider is lightdash', () => {
    const client = createClient({
      provider: 'lightdash',
      lightdash: {
        url: 'https://example.com',
        apiKey: 'key',
        projectUuid: 'uuid',
      },
    });

    expect(client).toBeInstanceOf(LightdashProvider);
  });

  it('throws on unknown provider', () => {
    expect(() =>
      createClient({ provider: 'unknown' as never }),
    ).toThrow('Unknown semantic layer provider: unknown');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @por/analytics-adapter test`
Expected: FAIL — `createClient` not found

- [ ] **Step 3: Implement factory.ts**

Create `packages/analytics-adapter/src/factory.ts`:

```ts
import type { SemanticLayerClient } from './interface';
import {
  LightdashProvider,
  type LightdashProviderConfig,
} from './providers/lightdash';

export type AdapterConfig = {
  provider: 'lightdash';
  lightdash: LightdashProviderConfig;
};

export function createClient(config: AdapterConfig): SemanticLayerClient {
  switch (config.provider) {
    case 'lightdash':
      return new LightdashProvider(config.lightdash);
    default:
      throw new Error(
        `Unknown semantic layer provider: ${(config as { provider: string }).provider}`,
      );
  }
}
```

When a new provider (e.g., Cube) is added, extend the `AdapterConfig` union with a new branch.

- [ ] **Step 4: Export from index.ts**

Append to `packages/analytics-adapter/src/index.ts`:

```ts
export { createClient, type AdapterConfig } from './factory';
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @por/analytics-adapter test`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add packages/analytics-adapter/
git commit -m "feat(analytics-adapter): add createClient factory"
```

---

## Task 5: Create the app-level LightdashScorecardAdapter

**Files:**
- Create: `apps/situation-room/lib/data-adapters/lightdash-adapter.ts`
- Create: `apps/situation-room/__tests__/lightdash-adapter.test.ts`
- Modify: `apps/situation-room/package.json`

- [ ] **Step 1: Add the workspace dependency**

In `apps/situation-room/package.json`, add to `dependencies`:

```json
"@por/analytics-adapter": "workspace:*"
```

Run: `pnpm install`

- [ ] **Step 2: Write the failing test**

Create `apps/situation-room/__tests__/lightdash-adapter.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import type { SemanticLayerClient, QueryResult } from '@por/analytics-adapter';
import { CATEGORY_ORDER } from '@/lib/contracts';

// Mock server-only (not in test env)
vi.mock('server-only', () => ({}));

function makeMockClient(result: QueryResult): SemanticLayerClient {
  return { query: vi.fn().mockResolvedValue(result) };
}

function makeRows(
  categories: readonly string[],
  metricsPerCategory: number,
) {
  const rows: QueryResult['rows'] = [];
  for (const category of categories) {
    for (let i = 1; i <= metricsPerCategory; i++) {
      rows.push({
        sort_order: { raw: i, formatted: String(i) },
        metric_name: { raw: `Metric ${i}`, formatted: `Metric ${i}` },
        category: { raw: category, formatted: category },
        current_period: { raw: '$100', formatted: '$100' },
        previous_period: { raw: '$90', formatted: '$90' },
        pct_change: { raw: '+11%', formatted: '+11%' },
      });
    }
  }
  return rows;
}

describe('LightdashScorecardAdapter', () => {
  it('shapes generic rows into ScorecardReportPayload', async () => {
    const rows = makeRows(CATEGORY_ORDER, 2);
    const client = makeMockClient({ rows, meta: { queryCount: 1 } });

    const { LightdashScorecardAdapter } = await import(
      '@/lib/data-adapters/lightdash-adapter'
    );
    const adapter = new LightdashScorecardAdapter(client);
    const result = await adapter.getScorecardReport({});

    expect(result.data.categories.map((c) => c.category)).toEqual([
      ...CATEGORY_ORDER,
    ]);
    expect(result.data.categories[0].rows).toHaveLength(2);
    expect(result.data.categories[0].rows[0].metricName).toBe('Metric 1');
    expect(result.data.reportTitle).toBe('Situation Room');
    expect(result.meta.source).toBe('lightdash');
    expect(result.meta.queryCount).toBe(1);
  });

  it('passes filters through to the semantic layer client', async () => {
    const client = makeMockClient({ rows: makeRows(CATEGORY_ORDER, 1) });

    const { LightdashScorecardAdapter } = await import(
      '@/lib/data-adapters/lightdash-adapter'
    );
    const adapter = new LightdashScorecardAdapter(client);
    await adapter.getScorecardReport({ Division: ['Enterprise'] });

    const queryCall = (client.query as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const divisionFilter = queryCall.filters.find(
      (f: { field: string }) => f.field === 'Division',
    );
    expect(divisionFilter).toBeDefined();
    expect(divisionFilter.operator).toBe('equals');
    expect(divisionFilter.values).toEqual(['Enterprise']);
  });

  it('delegates getFilterDictionary to the BigQueryAdapter', async () => {
    const client = makeMockClient({ rows: [] });

    const { LightdashScorecardAdapter } = await import(
      '@/lib/data-adapters/lightdash-adapter'
    );
    const adapter = new LightdashScorecardAdapter(client);

    // getFilterDictionary should exist and not use the semantic layer client
    expect(typeof adapter.getFilterDictionary).toBe('function');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm sr:test -- __tests__/lightdash-adapter.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement lightdash-adapter.ts**

Create `apps/situation-room/lib/data-adapters/lightdash-adapter.ts`:

```ts
import type { SemanticLayerClient } from '@por/analytics-adapter';
import {
  CATEGORY_ORDER,
  type CategoryData,
  type ScorecardFilters,
  type ScorecardReportPayload,
  type ScorecardRow,
  withDefaultDateRange,
} from '@/lib/contracts';
import type {
  AdapterResult,
  FilterDictionaryPayload,
  ScorecardDataAdapter,
} from '@/lib/data-adapters/types';
import type { Filter } from '@por/analytics-adapter';
import { BigQueryAdapter } from '@/lib/data-adapters/bigquery-adapter';

const LIGHTDASH_MODEL = 'scorecard_daily';
const CATEGORY_SET = new Set<string>(CATEGORY_ORDER);

/**
 * Maps canonical filter keys to Lightdash field names where they differ.
 * Keys not listed here use the filter key as-is (e.g. Division → Division).
 */
const FIELD_NAME_OVERRIDES: Record<string, string> = {
  Segment: 'OpportunitySegment',
  Region: 'Queue_Region__c',
  BookingPlanOppType: 'BookingPlanOppType2025',
};

export class LightdashScorecardAdapter implements ScorecardDataAdapter {
  private bigqueryFallback: BigQueryAdapter | undefined;

  constructor(private readonly client: SemanticLayerClient) {}

  async getScorecardReport(
    filters: ScorecardFilters,
  ): Promise<AdapterResult<ScorecardReportPayload>> {
    const appliedFilters = withDefaultDateRange(filters);

    const result = await this.client.query({
      model: LIGHTDASH_MODEL,
      measures: ['current_period', 'previous_period', 'pct_change'],
      dimensions: ['sort_order', 'metric_name', 'category'],
      filters: this.translateFilters(appliedFilters),
      sorts: [{ field: 'sort_order', descending: false }],
      limit: 500,
    });

    const categories = this.buildCategories(result.rows);

    return {
      data: {
        reportTitle: 'Situation Room',
        reportPeriodLabel: 'Current Year',
        lastRefreshedAt: new Date().toISOString(),
        appliedFilters,
        categories,
      },
      meta: {
        source: 'lightdash',
        queryCount: result.meta?.queryCount ?? 1,
        bytesProcessed: result.meta?.bytesProcessed,
      },
    };
  }

  async getFilterDictionary(
    key: string,
  ): Promise<AdapterResult<FilterDictionaryPayload>> {
    // Filter dictionaries are precomputed in dbt and served from BigQuery.
    // They do not flow through the semantic layer. Lazy-init to avoid
    // eagerly importing @google-cloud/bigquery.
    this.bigqueryFallback ??= new BigQueryAdapter();
    return this.bigqueryFallback.getFilterDictionary(key);
  }

  private translateFilters(filters: ScorecardFilters): Filter[] {
    const result: Filter[] = [
      { field: 'report_date', operator: 'currentYear' },
    ];

    for (const [key, values] of Object.entries(filters)) {
      if (!values || values.length === 0 || key === 'DateRange') continue;
      const field = FIELD_NAME_OVERRIDES[key] ?? key;
      result.push({ field, operator: 'equals', values });
    }

    return result;
  }

  private buildCategories(
    rows: Array<Record<string, { raw: unknown; formatted: string }>>,
  ): CategoryData[] {
    const rowsByCategory = new Map<string, ScorecardRow[]>();

    for (const row of rows) {
      const category = String(row.category?.raw ?? '');
      if (!CATEGORY_SET.has(category)) continue;

      const mapped: ScorecardRow = {
        sortOrder: Number(row.sort_order?.raw ?? 0),
        metricName: String(row.metric_name?.formatted ?? ''),
        currentPeriod: String(row.current_period?.formatted ?? ''),
        previousPeriod: String(row.previous_period?.formatted ?? ''),
        pctChange: String(row.pct_change?.formatted ?? ''),
      };

      const existing = rowsByCategory.get(category) ?? [];
      existing.push(mapped);
      rowsByCategory.set(category, existing);
    }

    return CATEGORY_ORDER.map((category) => ({
      category,
      rows: (rowsByCategory.get(category) ?? []).sort(
        (a, b) => a.sortOrder - b.sortOrder,
      ),
    }));
  }
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm sr:test -- __tests__/lightdash-adapter.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/situation-room/
git commit -m "feat(situation-room): add LightdashScorecardAdapter using SemanticLayerClient"
```

---

## Task 6: Wire up the adapter factory with provider selection

**Files:**
- Modify: `apps/situation-room/lib/data-adapters/index.ts`
- Modify: `apps/situation-room/__tests__/server-loaders.test.ts` (verify still passes)

- [ ] **Step 1: Update the adapter factory**

Replace `apps/situation-room/lib/data-adapters/index.ts`:

```ts
import 'server-only';

import { createClient } from '@por/analytics-adapter';
import type { ScorecardDataAdapter } from '@/lib/data-adapters/types';
import { BigQueryAdapter } from '@/lib/data-adapters/bigquery-adapter';
import { LightdashScorecardAdapter } from '@/lib/data-adapters/lightdash-adapter';

export function getScorecardDataAdapter(): ScorecardDataAdapter {
  const backend = process.env.SITUATION_ROOM_BACKEND ?? 'bigquery';

  switch (backend) {
    case 'lightdash': {
      const client = createClient({
        provider: 'lightdash',
        lightdash: {
          url: requireEnv('LIGHTDASH_URL'),
          apiKey: requireEnv('LIGHTDASH_API_KEY'),
          projectUuid: requireEnv('LIGHTDASH_PROJECT_UUID'),
        },
      });
      return new LightdashScorecardAdapter(client);
    }
    case 'bigquery':
      return new BigQueryAdapter();
    default:
      throw new Error(`Unknown SITUATION_ROOM_BACKEND: ${backend}`);
  }
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}
```

Note: static imports are used instead of `require()` since the project uses ESM. The Next.js bundler tree-shakes unused branches, so the Lightdash imports have no cost when `SITUATION_ROOM_BACKEND=bigquery`.

- [ ] **Step 2: Run existing tests to verify nothing breaks**

Run: `pnpm sr:test`
Expected: all existing tests PASS (factory defaults to `bigquery`, unchanged behavior)

- [ ] **Step 3: Commit**

```bash
git add apps/situation-room/lib/data-adapters/index.ts
git commit -m "feat(situation-room): support SITUATION_ROOM_BACKEND=lightdash in adapter factory"
```

---

## Task 7: Remove legacy Lightdash code

**Files:**
- Delete: `apps/situation-room/lib/lightdash-client.ts`
- Delete: `apps/situation-room/lib/queries.ts`
- Delete: `apps/situation-room/lib/scorecard-parser.ts`
- Delete: `apps/situation-room/lib/types.ts`
- Delete: `apps/situation-room/app/api/lightdash/route.ts`
- Delete: `apps/situation-room/__tests__/queries.test.ts`
- Delete: `apps/situation-room/__tests__/scorecard-parser.test.ts`

- [ ] **Step 1: Migrate component imports from `@/lib/types` to `@/lib/contracts`**

Four components import `CategoryData` or `ScorecardRow` from the legacy `lib/types.ts`. These types also exist in `lib/contracts.ts`. Update each file:

- `apps/situation-room/components/category-section.tsx`: change `import type { CategoryData } from '@/lib/types'` → `import type { CategoryData } from '@/lib/contracts'`
- `apps/situation-room/components/executive-snapshot.tsx`: change `import type { CategoryData } from '@/lib/types'` → `import type { CategoryData } from '@/lib/contracts'`
- `apps/situation-room/components/trend-chart.tsx`: change `import type { CategoryData } from '@/lib/types'` → `import type { CategoryData } from '@/lib/contracts'`
- `apps/situation-room/components/metric-row.tsx`: change `import type { ScorecardRow } from '@/lib/types'` → `import type { ScorecardRow } from '@/lib/contracts'`

- [ ] **Step 2: Verify no remaining imports of the files to delete**

Run: `grep -r "from.*@/lib/types\|from.*lightdash-client\|from.*scorecard-parser\|from.*lib/queries" apps/situation-room/ --include="*.ts" --include="*.tsx" -l`

Expected: only files being deleted reference each other — `app/api/lightdash/route.ts`, `__tests__/queries.test.ts`, `__tests__/scorecard-parser.test.ts`, `lib/queries.ts`, `lib/scorecard-parser.ts`, and `lib/lightdash-client.ts`.

- [ ] **Step 3: Delete the files**

```bash
rm apps/situation-room/lib/lightdash-client.ts
rm apps/situation-room/lib/queries.ts
rm apps/situation-room/lib/scorecard-parser.ts
rm apps/situation-room/lib/types.ts
rm apps/situation-room/app/api/lightdash/route.ts
rm apps/situation-room/__tests__/queries.test.ts
rm apps/situation-room/__tests__/scorecard-parser.test.ts
```

- [ ] **Step 4: Run all tests**

Run: `pnpm sr:test`
Expected: all remaining tests PASS

- [ ] **Step 5: Run typecheck**

Run: `pnpm sr:typecheck` (or `pnpm typecheck` for full monorepo)
Expected: no type errors

- [ ] **Step 6: Commit**

```bash
git add -u apps/situation-room/
git commit -m "refactor(situation-room): remove legacy Lightdash code replaced by analytics-adapter"
```

---

## Task 8: Full validation

**Files:** none (validation only)

- [ ] **Step 1: Run adapter package tests**

Run: `pnpm --filter @por/analytics-adapter test`
Expected: all PASS

- [ ] **Step 2: Run Situation Room tests**

Run: `pnpm sr:test`
Expected: all PASS

- [ ] **Step 3: Run full monorepo validation**

Run: `pnpm validate`
Expected: all checks pass (format, lint, types, tests, lightdash validators)

- [ ] **Step 4: Commit any lint/format fixes if needed**

```bash
git add -A
git commit -m "chore: fix lint/format after analytics-adapter integration"
```
