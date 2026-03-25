# Situation Room Direct Baseline And Lightdash Evaluation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fast, beautiful Situation Room report on top of direct BigQuery reads from dbt app-serving models, then insert a Lightdash adapter over the same models and benchmark the difference.

**Architecture:** Phase 1 uses `BigQuery -> dbt app-serving models -> Next.js server adapter -> Vercel cache` to establish the fastest realistic baseline. Phase 2 adds `Lightdash` as a governed semantic layer over the same dbt models, keeps the same app contracts, and benchmarks the latency/cost/governance tradeoff without rewriting the UI.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Vitest, `@google-cloud/bigquery`, dbt Core + dbt-bigquery, BigQuery, Lightdash YAML, `unstable_cache`, `nuqs`

---

## Precondition

This plan assumes the explicit user-approved exception that allows introducing
`dbt Core` for Situation Room app-serving models even though the repo previously
preferred standalone Lightdash YAML only.

Before adding `dbt_project.yml`, record that exception in the repo guidance so
implementation does not proceed against contradictory instructions.

## File Structure

### New files

- `apps/situation-room/.env.local.example`
  Phase-1 and phase-2 server env template for BigQuery, backend toggle, and Lightdash.
- `apps/situation-room/lib/contracts.ts`
  Canonical app request/response contracts shared by both adapters.
- `apps/situation-room/lib/filter-normalization.ts`
  Stable filter normalization, ordering, and cache-key serialization.
- `apps/situation-room/lib/env.server.ts`
  Server-only env parsing and validation.
- `apps/situation-room/lib/bigquery/client.ts`
  BigQuery client construction.
- `apps/situation-room/lib/bigquery/sql.ts`
  Allowlisted SQL builders for report payload and filter dictionaries.
- `apps/situation-room/lib/data-adapters/types.ts`
  Shared `ScorecardDataAdapter` interface.
- `apps/situation-room/lib/data-adapters/bigquery-adapter.ts`
  Phase-1 adapter backed by dbt serving models in BigQuery.
- `apps/situation-room/lib/data-adapters/lightdash-adapter.ts`
  Phase-2 adapter backed by Lightdash app-facing explores over the same serving models.
- `apps/situation-room/lib/data-adapters/index.ts`
  Backend selector keyed by `SITUATION_ROOM_BACKEND`.
- `apps/situation-room/lib/server/get-scorecard-report.ts`
  Cached canonical loader for the main report payload.
- `apps/situation-room/lib/server/get-filter-dictionary.ts`
  Cached canonical loader for filter dictionaries.
- `apps/situation-room/app/api/report/route.ts`
  GET route for report payload refreshes.
- `apps/situation-room/app/api/filter-dictionaries/[key]/route.ts`
  GET route for filter dictionary requests.
- `apps/situation-room/__tests__/contracts.test.ts`
  Contract invariants for category order and payload shape helpers.
- `apps/situation-room/__tests__/filter-normalization.test.ts`
  Stable filter normalization and cache-key tests.
- `apps/situation-room/__tests__/bigquery-sql.test.ts`
  SQL builder tests for allowlisted fields and normalized predicates.
- `apps/situation-room/__tests__/bigquery-adapter.test.ts`
  BigQuery adapter grouping and payload-shaping tests.
- `apps/situation-room/__tests__/server-loaders.test.ts`
  Loader cache-key and delegation tests.
- `apps/situation-room/__tests__/lightdash-adapter.test.ts`
  Lightdash adapter contract-parity tests.
- `apps/situation-room/scripts/benchmark-report.mjs`
  Simple benchmark runner for cold/warm report and dictionary endpoints.
- `docs/superpowers/benchmarks/2026-03-20-situation-room-backend-comparison.md`
  Recorded apples-to-apples benchmark evidence for the direct and Lightdash adapters.
- `dbt/dbt_project.yml`
  Minimal dbt project config.
- `dbt/profiles.yml`
  Env-driven BigQuery profile for local and CI usage via `--profiles-dir dbt`.
- `dbt/models/sources.yml`
  Source definition for the existing `scorecard_daily` table.
- `dbt/models/app_serving/scorecard_report_rows.sql`
  Pre-shaped rows for the Situation Room report payload.
- `dbt/models/app_serving/scorecard_filter_dictionary.sql`
  Unioned filter dictionary model keyed by filter name.
- `dbt/models/app_serving/schema.yml`
  Model docs and dbt tests for the serving layer.
- `lightdash/models/scorecard_report_rows.yml`
  Phase-2 Lightdash app-facing model over the dbt serving table.
- `lightdash/models/scorecard_filter_dictionary.yml`
  Phase-2 Lightdash app-facing model for filter dictionaries.

### Modified files

- `AGENTS.md`
  Record the approved dbt exception for Situation Room app-serving models.
- `pyproject.toml`
  Add `dbt-core` and `dbt-bigquery` to the Python toolchain.
- `package.json`
  Add root scripts for dbt build/test/benchmark workflows.
- `apps/situation-room/package.json`
  Add `@google-cloud/bigquery` and benchmark scripts.
- `apps/situation-room/app/page.tsx`
  Make initial report load server-first.
- `apps/situation-room/components/report-content.tsx`
  Accept initial server payload and consume backend-agnostic refresh data.
- `apps/situation-room/hooks/use-filters.ts`
  Keep URL state, but rely on normalized filter serialization helpers.
- `apps/situation-room/hooks/use-scorecard-query.ts`
  Replace POST-to-Lightdash flow with GET refreshes against canonical report route.
- `apps/situation-room/lib/filters.ts`
  Reuse filter definitions in normalization and SQL allowlists.
- `apps/situation-room/lib/lightdash-client.ts`
  Rework around new app-facing Lightdash models instead of sequential category fan-out.

## Task 0: Record The Approved dbt Exception

**Files:**

- Modify: `AGENTS.md`

- [ ] **Step 1: Add a short exception note for Situation Room**

```md
## Lightdash Conventions

- Use standalone Lightdash YAML only. Do not introduce `dbt_project.yml` yet.
- Exception: the Situation Room app-serving backend pilot may introduce `dbt Core`
  models and `dbt_project.yml` to benchmark direct BigQuery vs Lightdash-backed
  delivery. Lightdash content for that pilot should remain YAML-defined.
```

- [ ] **Step 2: Commit the exception before adding dbt files**

```bash
git add AGENTS.md
git commit -m "docs: record situation room dbt exception"
```

## Task 1: Add Canonical Contracts And Filter Normalization

**Files:**

- Create: `apps/situation-room/lib/contracts.ts`
- Create: `apps/situation-room/lib/filter-normalization.ts`
- Test: `apps/situation-room/__tests__/contracts.test.ts`
- Test: `apps/situation-room/__tests__/filter-normalization.test.ts`
- Modify: `apps/situation-room/lib/filters.ts`

- [ ] **Step 1: Write the failing contract and normalization tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  CATEGORY_ORDER,
  DEFAULT_DATE_RANGE,
  type ScorecardFilters,
  summarizeFilters,
  withDefaultDateRange,
} from '@/lib/contracts';
import {
  normalizeFilters,
  serializeFilterCacheKey,
} from '@/lib/filter-normalization';

describe('contracts', () => {
  it('keeps the canonical category order', () => {
    expect(CATEGORY_ORDER).toEqual([
      'New Logo',
      'Expansion',
      'Migration',
      'Renewal',
      'Total',
    ]);
  });

  it('omits empty filters from summaries', () => {
    const filters: ScorecardFilters = {
      Division: ['North'],
      Owner: [],
    };

    expect(summarizeFilters(filters)).toEqual([
      { key: 'Division', values: ['North'] },
    ]);
  });

  it('applies the default date range when missing', () => {
    expect(withDefaultDateRange({})).toEqual({
      DateRange: DEFAULT_DATE_RANGE,
    });
  });
});

describe('filter normalization', () => {
  it('sorts keys and values into a stable cache key', () => {
    const left = serializeFilterCacheKey({
      Region: ['South', 'North'],
      Division: ['Rental'],
    });
    const right = serializeFilterCacheKey({
      Division: ['Rental'],
      Region: ['North', 'South'],
    });

    expect(left).toBe(right);
  });

  it('drops blank and duplicate values', () => {
    expect(normalizeFilters({ Owner: [' ', 'Alice', 'Alice'] })).toEqual({
      Owner: ['Alice'],
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @point-of-rental/situation-room test -- contracts filter-normalization`

Expected: FAIL with missing module errors for `contracts` and `filter-normalization`

- [ ] **Step 3: Write the minimal contract and normalization modules**

```ts
// apps/situation-room/lib/contracts.ts
export const CATEGORY_ORDER = [
  'New Logo',
  'Expansion',
  'Migration',
  'Renewal',
  'Total',
] as const;

export type Category = (typeof CATEGORY_ORDER)[number];

export const DEFAULT_DATE_RANGE = ['current_year'] as const;

export type ScorecardFilters = Partial<
  Record<
    | 'DateRange'
    | 'Division'
    | 'Owner'
    | 'Segment'
    | 'Region'
    | 'SE'
    | 'BookingPlanOppType'
    | 'ProductFamily'
    | 'SDRSource'
    | 'SDR'
    | 'OppRecordType'
    | 'AccountOwner'
    | 'OwnerDepartment'
    | 'StrategicFilter'
    | 'Accepted'
    | 'Gate1CriteriaMet'
    | 'GateMetOrAccepted',
    string[]
  >
>;

export type ScorecardRow = {
  sortOrder: number;
  metricName: string;
  currentPeriod: string;
  previousPeriod: string;
  pctChange: string;
};

export type CategoryData = {
  category: Category;
  rows: ScorecardRow[];
};

export type ScorecardReportPayload = {
  reportTitle: string;
  reportPeriodLabel: string;
  lastRefreshedAt: string;
  appliedFilters: ScorecardFilters;
  categories: CategoryData[];
};

export function withDefaultDateRange(
  filters: ScorecardFilters,
): ScorecardFilters {
  return filters.DateRange?.length
    ? filters
    : { ...filters, DateRange: [...DEFAULT_DATE_RANGE] };
}

export function summarizeFilters(filters: ScorecardFilters) {
  return Object.entries(filters)
    .filter(([, values]) => values && values.length > 0)
    .map(([key, values]) => ({ key, values: values! }));
}
```

```ts
// apps/situation-room/lib/filter-normalization.ts
import type { ScorecardFilters } from '@/lib/contracts';

export function normalizeFilters(filters: ScorecardFilters): ScorecardFilters {
  const entries = Object.entries(filters)
    .map(
      ([key, values]) =>
        [
          key,
          [
            ...new Set((values ?? []).map((v) => v.trim()).filter(Boolean)),
          ].sort(),
        ] as const,
    )
    .filter(([, values]) => values.length > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  return Object.fromEntries(entries);
}

export function serializeFilterCacheKey(filters: ScorecardFilters): string {
  return JSON.stringify(normalizeFilters(withDefaultDateRange(filters)));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @point-of-rental/situation-room test -- contracts filter-normalization`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/situation-room/lib/contracts.ts \
  apps/situation-room/lib/filter-normalization.ts \
  apps/situation-room/lib/filters.ts \
  apps/situation-room/__tests__/contracts.test.ts \
  apps/situation-room/__tests__/filter-normalization.test.ts
git commit -m "feat(situation-room): add canonical report contracts"
```

## Task 2: Scaffold dbt Core And App-Serving Models

**Files:**

- Modify: `AGENTS.md`
- Modify: `pyproject.toml`
- Modify: `package.json`
- Create: `dbt/dbt_project.yml`
- Create: `dbt/profiles.yml`
- Create: `dbt/models/sources.yml`
- Create: `dbt/models/app_serving/scorecard_report_rows.sql`
- Create: `dbt/models/app_serving/scorecard_filter_dictionary.sql`
- Create: `dbt/models/app_serving/schema.yml`

- [ ] **Step 1: Add failing dbt tests first**

```yaml
# dbt/models/app_serving/schema.yml
version: 2

models:
  - name: scorecard_report_rows
    columns:
      - name: category
        tests: [not_null]
      - name: sort_order
        tests: [not_null]
      - name: metric_name
        tests: [not_null]

  - name: scorecard_filter_dictionary
    columns:
      - name: filter_key
        tests: [not_null]
      - name: value
        tests: [not_null]
```

- [ ] **Step 2: Run dbt parse/build to verify it fails before models exist**

Run: `uv add --dev dbt-core dbt-bigquery && uv run dbt parse --project-dir dbt --profiles-dir dbt`

Expected: FAIL because the project or models are incomplete

- [ ] **Step 3: Add the minimal dbt project and serving models**

```yaml
# dbt/dbt_project.yml
name: situation_room
version: 1.0.0
config-version: 2
profile: situation_room

model-paths: ['models']

models:
  situation_room:
    app_serving:
      +materialized: table
```

```yaml
# dbt/profiles.yml
situation_room:
  target: "{{ 'dev' if env_var('BIGQUERY_SERVICE_ACCOUNT_JSON', '') else 'parse' }}"
  outputs:
    parse:
      type: bigquery
      method: oauth
      project: "{{ env_var('BIGQUERY_PROJECT_ID', 'dbt_parse_placeholder') }}"
      dataset: "{{ env_var('BIGQUERY_DATASET', 'app_serving_dev') }}"
      location: "{{ env_var('BIGQUERY_LOCATION', 'US') }}"
      threads: 4
      job_execution_timeout_seconds: 300
    dev:
      type: bigquery
      method: service-account-json
      project: "{{ env_var('BIGQUERY_PROJECT_ID', 'dbt_parse_placeholder') }}"
      dataset: "{{ env_var('BIGQUERY_DATASET', 'app_serving_dev') }}"
      location: "{{ env_var('BIGQUERY_LOCATION', 'US') }}"
      keyfile_json: "{{ env_var('BIGQUERY_SERVICE_ACCOUNT_JSON', '{\"type\":\"service_account\",\"project_id\":\"dbt_parse_placeholder\",\"private_key_id\":\"placeholder\",\"private_key\":\"-----BEGIN PRIVATE KEY-----\\nplaceholder\\n-----END PRIVATE KEY-----\\n\",\"client_email\":\"placeholder@dbt-parse-placeholder.iam.gserviceaccount.com\",\"client_id\":\"1234567890\",\"token_uri\":\"https://oauth2.googleapis.com/token\"}') }}"
      threads: 4
      job_execution_timeout_seconds: 300
```

```yaml
# dbt/models/sources.yml
version: 2

sources:
  - name: legacy_scorecard
    database: "{{ env_var('BIGQUERY_PROJECT_ID', 'dbt_parse_placeholder') }}"
    schema: scorecard_test
    tables:
      - name: scorecard_daily
```

```sql
-- dbt/models/app_serving/scorecard_report_rows.sql
with source_rows as (
  select
    category,
    sort_order,
    metric_name,
    agg_type,
    period,
    original_day_of_year,
    numerator,
    denominator,
    Division,
    Owner,
    OpportunitySegment as Segment,
    Queue_Region__c as Region,
    SE,
    BookingPlanOppType2025 as BookingPlanOppType,
    ProductFamily,
    SDRSource,
    SDR,
    OppRecordType,
    AccountOwner,
    OwnerDepartment,
    cast(StrategicFilter as string) as StrategicFilter,
    cast(Accepted as string) as Accepted,
    cast(Gate1CriteriaMet as string) as Gate1CriteriaMet,
    cast(GateMetOrAccepted as string) as GateMetOrAccepted,
    report_date
  from {{ source('legacy_scorecard', 'scorecard_daily') }}
),
aggregated as (
  select
    category,
    sort_order,
    metric_name,
    report_date,
    Division,
    Owner,
    Segment,
    Region,
    SE,
    BookingPlanOppType,
    ProductFamily,
    SDRSource,
    SDR,
    OppRecordType,
    AccountOwner,
    OwnerDepartment,
    StrategicFilter,
    Accepted,
    Gate1CriteriaMet,
    GateMetOrAccepted,
    max(agg_type) as agg_type,
    sum(case when period = 'current' then numerator end) as current_numerator,
    sum(case when period = 'current' then denominator end) as current_denominator,
    sum(
      case
        when period = 'previous'
          and original_day_of_year <= extract(dayofyear from current_date())
        then numerator
      end
    ) as previous_numerator,
    sum(
      case
        when period = 'previous'
          and original_day_of_year <= extract(dayofyear from current_date())
        then denominator
      end
    ) as previous_denominator
  from source_rows
  group by
    1,2,3,4,5,6,7,8,9,10,
    11,12,13,14,15,16,17,18,19,20
)
select
  *,
  case
    when agg_type = 'usd' then concat('$', format("%'.2f", current_numerator / 1000.0), 'K')
    when agg_type = 'ratio_pct' then concat(format('%.1f', safe_divide(current_numerator, current_denominator) * 100), '%')
    else format("%'.0f", current_numerator)
  end as current_period,
  case
    when agg_type = 'usd' then concat('$', format("%'.2f", previous_numerator / 1000.0), 'K')
    when agg_type = 'ratio_pct' then concat(format('%.1f', safe_divide(previous_numerator, previous_denominator) * 100), '%')
    else format("%'.0f", previous_numerator)
  end as previous_period,
  case
    when previous_numerator is null or previous_numerator = 0 then '-'
    else concat(format('%.1f', ((current_numerator - previous_numerator) / previous_numerator) * 100), '%')
  end as pct_change
from aggregated
```

```sql
-- dbt/models/app_serving/scorecard_filter_dictionary.sql
with base as (
  select * from {{ ref('scorecard_report_rows') }}
),
unioned as (
  select 'Division' as filter_key, Division as value from base union all
  select 'Owner', Owner from base union all
  select 'Segment', Segment from base union all
  select 'Region', Region from base union all
  select 'SE', SE from base union all
  select 'BookingPlanOppType', BookingPlanOppType from base union all
  select 'ProductFamily', ProductFamily from base union all
  select 'SDRSource', SDRSource from base union all
  select 'SDR', SDR from base union all
  select 'OppRecordType', OppRecordType from base union all
  select 'AccountOwner', AccountOwner from base union all
  select 'OwnerDepartment', OwnerDepartment from base union all
  select 'StrategicFilter', StrategicFilter from base union all
  select 'Accepted', Accepted from base union all
  select 'Gate1CriteriaMet', Gate1CriteriaMet from base union all
  select 'GateMetOrAccepted', GateMetOrAccepted from base
),
deduped as (
  select distinct
    filter_key,
    value
  from unioned
  where value is not null and trim(value) != ''
)
select
  filter_key,
  value,
  value as label,
  dense_rank() over (partition by filter_key order by value) as sort_order
from deduped
```

- [ ] **Step 4: Run dbt parse/build to verify it passes**

Run: `uv run dbt build --project-dir dbt --profiles-dir dbt --select scorecard_report_rows scorecard_filter_dictionary`

Expected: PASS with both models built and schema tests green

- [ ] **Step 5: Commit**

```bash
git add pyproject.toml package.json dbt
git commit -m "feat(dbt): add situation room serving models"
```

## Task 3: Add BigQuery Adapter And SQL Builders

**Files:**

- Modify: `apps/situation-room/package.json`
- Create: `apps/situation-room/.env.local.example`
- Create: `apps/situation-room/lib/env.server.ts`
- Create: `apps/situation-room/lib/bigquery/client.ts`
- Create: `apps/situation-room/lib/bigquery/sql.ts`
- Create: `apps/situation-room/lib/data-adapters/types.ts`
- Create: `apps/situation-room/lib/data-adapters/bigquery-adapter.ts`
- Test: `apps/situation-room/__tests__/bigquery-sql.test.ts`
- Test: `apps/situation-room/__tests__/bigquery-adapter.test.ts`

- [ ] **Step 1: Write failing SQL builder and adapter tests**

```ts
import { describe, expect, it, vi } from 'vitest';
import { describe, expect, it } from 'vitest';
import {
  buildFilterDictionaryQuery,
  buildScorecardReportQuery,
} from '@/lib/bigquery/sql';
import { normalizeFilters } from '@/lib/filter-normalization';
import { BigQueryAdapter } from '@/lib/data-adapters/bigquery-adapter';

describe('buildScorecardReportQuery', () => {
  it('only emits allowlisted predicates', () => {
    const query = buildScorecardReportQuery(
      normalizeFilters({ Division: ['Rental'], Region: ['North'] }),
    );

    expect(query.sql).toContain('Division IN UNNEST(@Division)');
    expect(query.sql).toContain('Region IN UNNEST(@Region)');
    expect(query.sql).not.toContain('DROP TABLE');
  });
});

describe('buildFilterDictionaryQuery', () => {
  it('queries a single filter key', () => {
    const query = buildFilterDictionaryQuery('Division');
    expect(query.sql).toContain('where filter_key = @filterKey');
    expect(query.params).toEqual({ filterKey: 'Division' });
  });
});

describe('BigQueryAdapter', () => {
  it('groups rows into the canonical category order', async () => {
    const adapter = new BigQueryAdapter({
      queryRows: vi.fn().mockResolvedValue([
        {
          category: 'Expansion',
          sort_order: 20,
          metric_name: 'Bookings',
          current_period: '$10.0K',
          previous_period: '$8.0K',
          pct_change: '+25.0%',
          report_date: '2026-03-20',
        },
      ]),
    });

    const result = await adapter.getScorecardReport({});
    expect(result.data.categories[1]).toEqual({
      category: 'Expansion',
      rows: [
        {
          sortOrder: 20,
          metricName: 'Bookings',
          currentPeriod: '$10.0K',
          previousPeriod: '$8.0K',
          pctChange: '+25.0%',
        },
      ],
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @point-of-rental/situation-room test -- bigquery-sql bigquery-adapter`

Expected: FAIL because the BigQuery modules do not exist yet

- [ ] **Step 3: Add the env parser, BigQuery client, SQL builders, and adapter**

```ts
// apps/situation-room/lib/env.server.ts
import 'server-only';

function must(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export const situationRoomEnv = {
  backend: process.env.SITUATION_ROOM_BACKEND ?? 'bigquery',
  projectId: must('BIGQUERY_PROJECT_ID'),
  dataset: must('BIGQUERY_DATASET'),
  location: process.env.BIGQUERY_LOCATION ?? 'US',
  serviceAccountJson: must('BIGQUERY_SERVICE_ACCOUNT_JSON'),
};
```

```ts
// apps/situation-room/lib/bigquery/client.ts
import 'server-only';
import { BigQuery } from '@google-cloud/bigquery';
import { situationRoomEnv } from '@/lib/env.server';

export function getBigQueryClient() {
  return new BigQuery({
    projectId: situationRoomEnv.projectId,
    credentials: JSON.parse(situationRoomEnv.serviceAccountJson),
  });
}
```

```ts
// apps/situation-room/lib/data-adapters/types.ts
import type { ScorecardFilters, ScorecardReportPayload } from '@/lib/contracts';

export type AdapterMeta = {
  source: 'bigquery' | 'lightdash';
  queryCount: number;
  bytesProcessed?: number;
};

export type AdapterResult<T> = {
  data: T;
  meta: AdapterMeta;
};

export interface ScorecardDataAdapter {
  getScorecardReport(
    filters: ScorecardFilters,
  ): Promise<AdapterResult<ScorecardReportPayload>>;
  getFilterDictionary(key: string): Promise<
    AdapterResult<{
      key: string;
      refreshedAt: string;
      options: { value: string; label: string; sortOrder: number }[];
    }>
  >;
}
```

```ts
// apps/situation-room/lib/bigquery/sql.ts
import { withDefaultDateRange, type ScorecardFilters } from '@/lib/contracts';

const FILTER_COLUMNS: Record<string, string> = {
  Division: 'Division',
  Owner: 'Owner',
  Segment: 'Segment',
  Region: 'Region',
  SE: 'SE',
  BookingPlanOppType: 'BookingPlanOppType',
  ProductFamily: 'ProductFamily',
  SDRSource: 'SDRSource',
  SDR: 'SDR',
  OppRecordType: 'OppRecordType',
  AccountOwner: 'AccountOwner',
  OwnerDepartment: 'OwnerDepartment',
  StrategicFilter: 'StrategicFilter',
  Accepted: 'Accepted',
  Gate1CriteriaMet: 'Gate1CriteriaMet',
  GateMetOrAccepted: 'GateMetOrAccepted',
};

export function buildScorecardReportQuery(filters: ScorecardFilters) {
  const clauses = ['1 = 1'];
  const params: Record<string, string[]> = {};
  const normalized = withDefaultDateRange(filters);

  for (const [key, values] of Object.entries(normalized)) {
    if (key === 'DateRange') {
      clauses.push('report_date >= DATE_TRUNC(CURRENT_DATE(), YEAR)');
      continue;
    }

    const column = FILTER_COLUMNS[key];
    if (!column || !values?.length) continue;
    clauses.push(`${column} IN UNNEST(@${key})`);
    params[key] = values;
  }

  // Preserve report_date semantics from the serving model. If the source contains
  // multiple snapshots inside the selected range, constrain to the intended snapshot
  // during Task 3 rather than collapsing date grain in dbt.

  return {
    sql: `
      select category, sort_order, metric_name, current_period, previous_period, pct_change, report_date
      from \`${process.env.BIGQUERY_PROJECT_ID}.${process.env.BIGQUERY_DATASET}.scorecard_report_rows\`
      where ${clauses.join(' and ')}
      order by category, sort_order
    `,
    params,
  };
}

export function buildFilterDictionaryQuery(filterKey: string) {
  return {
    sql: `
      select filter_key, value, label, sort_order
      from \`${process.env.BIGQUERY_PROJECT_ID}.${process.env.BIGQUERY_DATASET}.scorecard_filter_dictionary\`
      where filter_key = @filterKey
      order by sort_order
    `,
    params: { filterKey },
  };
}
```

```ts
// apps/situation-room/lib/data-adapters/bigquery-adapter.ts
import type {
  CategoryData,
  ScorecardFilters,
  ScorecardReportPayload,
} from '@/lib/contracts';
import { CATEGORY_ORDER, withDefaultDateRange } from '@/lib/contracts';
import { getBigQueryClient } from '@/lib/bigquery/client';
import {
  buildFilterDictionaryQuery,
  buildScorecardReportQuery,
} from '@/lib/bigquery/sql';
import type {
  AdapterResult,
  ScorecardDataAdapter,
} from '@/lib/data-adapters/types';

type QueryClient = {
  queryRows: (query: {
    sql: string;
    params: Record<string, unknown>;
  }) => Promise<{ rows: Record<string, unknown>[]; bytesProcessed?: number }>;
};

export class BigQueryAdapter implements ScorecardDataAdapter {
  constructor(
    private readonly client: QueryClient = {
      async queryRows(query) {
        const bigquery = getBigQueryClient();
        const [job] = await bigquery.createQueryJob({
          query: query.sql,
          params: query.params,
          location: process.env.BIGQUERY_LOCATION ?? 'US',
        });
        const [rows] = await job.getQueryResults();
        const [metadata] = await job.getMetadata();
        return {
          rows: rows as Record<string, unknown>[],
          bytesProcessed: Number(
            metadata.statistics?.query?.totalBytesProcessed ?? 0,
          ),
        };
      },
    },
  ) {}

  async getScorecardReport(
    filters: ScorecardFilters,
  ): Promise<AdapterResult<ScorecardReportPayload>> {
    const appliedFilters = withDefaultDateRange(filters);
    const query = buildScorecardReportQuery(appliedFilters);
    const { rows, bytesProcessed } = await this.client.queryRows(query);

    const categories: CategoryData[] = CATEGORY_ORDER.map((category) => ({
      category,
      rows: rows
        .filter((row) => row.category === category)
        .map((row) => ({
          sortOrder: Number(row.sort_order),
          metricName: String(row.metric_name),
          currentPeriod: String(row.current_period),
          previousPeriod: String(row.previous_period),
          pctChange: String(row.pct_change),
        })),
    }));

    return {
      data: {
        reportTitle: 'Situation Room',
        reportPeriodLabel: 'Current Year',
        lastRefreshedAt: new Date().toISOString(),
        appliedFilters,
        categories,
      },
      meta: {
        source: 'bigquery',
        queryCount: 1,
        bytesProcessed,
      },
    };
  }

  async getFilterDictionary(key: string) {
    const query = buildFilterDictionaryQuery(key);
    const { rows, bytesProcessed } = await this.client.queryRows(query);
    return {
      data: {
        key,
        refreshedAt: new Date().toISOString(),
        options: rows.map((row) => ({
          value: String(row.value),
          label: String(row.label),
          sortOrder: Number(row.sort_order),
        })),
      },
      meta: {
        source: 'bigquery',
        queryCount: 1,
        bytesProcessed,
      },
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @point-of-rental/situation-room test -- bigquery-sql bigquery-adapter`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/situation-room/package.json \
  apps/situation-room/.env.local.example \
  apps/situation-room/lib/env.server.ts \
  apps/situation-room/lib/bigquery/client.ts \
  apps/situation-room/lib/bigquery/sql.ts \
  apps/situation-room/lib/data-adapters/types.ts \
  apps/situation-room/lib/data-adapters/bigquery-adapter.ts \
  apps/situation-room/__tests__/bigquery-sql.test.ts \
  apps/situation-room/__tests__/bigquery-adapter.test.ts
git commit -m "feat(situation-room): add BigQuery data adapter"
```

## Task 4: Add Cached Canonical Loaders And GET Endpoints

**Files:**

- Create: `apps/situation-room/lib/data-adapters/index.ts`
- Create: `apps/situation-room/lib/server/get-scorecard-report.ts`
- Create: `apps/situation-room/lib/server/get-filter-dictionary.ts`
- Create: `apps/situation-room/app/api/report/route.ts`
- Create: `apps/situation-room/app/api/filter-dictionaries/[key]/route.ts`
- Test: `apps/situation-room/__tests__/server-loaders.test.ts`

- [ ] **Step 1: Write the failing loader tests**

```ts
import { describe, expect, it, vi } from 'vitest';
import { getScorecardReport } from '@/lib/server/get-scorecard-report';
import { getFilterDictionary } from '@/lib/server/get-filter-dictionary';

vi.mock('@/lib/data-adapters', () => ({
  getScorecardDataAdapter: () => ({
    getScorecardReport: vi.fn().mockResolvedValue({
      data: { categories: [] },
      meta: { source: 'bigquery', queryCount: 1 },
    }),
    getFilterDictionary: vi.fn().mockResolvedValue({
      data: { key: 'Division', refreshedAt: '', options: [] },
      meta: { source: 'bigquery', queryCount: 1 },
    }),
  }),
}));

describe('server loaders', () => {
  it('delegates report requests through the canonical loader', async () => {
    await expect(
      getScorecardReport({ Division: ['Rental'] }),
    ).resolves.toMatchObject({
      data: { categories: [] },
      meta: { source: 'bigquery', queryCount: 1 },
    });
  });

  it('delegates dictionary requests through the canonical loader', async () => {
    await expect(getFilterDictionary('Division')).resolves.toMatchObject({
      data: { key: 'Division' },
      meta: { source: 'bigquery', queryCount: 1 },
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @point-of-rental/situation-room test -- server-loaders`

Expected: FAIL because the loader modules do not exist yet

- [ ] **Step 3: Implement the adapter selector, cached loaders, and routes**

```ts
// apps/situation-room/lib/data-adapters/index.ts
import 'server-only';
import { BigQueryAdapter } from '@/lib/data-adapters/bigquery-adapter';

export function getScorecardDataAdapter() {
  return new BigQueryAdapter();
}
```

```ts
// apps/situation-room/lib/server/get-scorecard-report.ts
import 'server-only';
import { unstable_cache } from 'next/cache';
import type { ScorecardFilters } from '@/lib/contracts';
import { serializeFilterCacheKey } from '@/lib/filter-normalization';
import { getScorecardDataAdapter } from '@/lib/data-adapters';

export async function getScorecardReport(filters: ScorecardFilters) {
  const key = serializeFilterCacheKey(filters);
  const load = unstable_cache(
    async () => getScorecardDataAdapter().getScorecardReport(filters),
    ['report-payload', key],
    { revalidate: 60, tags: ['report-payload'] },
  );
  return load();
}
```

```ts
// apps/situation-room/lib/server/get-filter-dictionary.ts
import 'server-only';
import { unstable_cache } from 'next/cache';
import { getScorecardDataAdapter } from '@/lib/data-adapters';

export async function getFilterDictionary(key: string) {
  const load = unstable_cache(
    async () => getScorecardDataAdapter().getFilterDictionary(key),
    ['filter-dictionaries', key],
    { revalidate: 900, tags: ['filter-dictionaries'] },
  );
  return load();
}
```

```ts
// apps/situation-room/app/api/report/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { parseFilterParams } from '@/lib/filters';
import { getScorecardReport } from '@/lib/server/get-scorecard-report';

export async function GET(request: NextRequest) {
  const filters = parseFilterParams(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  const adapterResult = await getScorecardReport(filters);
  const response = NextResponse.json(adapterResult.data);
  response.headers.set('Server-Timing', `adapter;dur=0`);
  response.headers.set(
    'x-situation-room-query-count',
    String(adapterResult.meta.queryCount),
  );
  if (adapterResult.meta.bytesProcessed != null) {
    response.headers.set(
      'x-situation-room-bytes-processed',
      String(adapterResult.meta.bytesProcessed),
    );
  }
  response.headers.set('x-situation-room-source', adapterResult.meta.source);
  return response;
}
```

```ts
// apps/situation-room/app/api/filter-dictionaries/[key]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFilterDictionary } from '@/lib/server/get-filter-dictionary';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const adapterResult = await getFilterDictionary(key);
  const response = NextResponse.json(adapterResult.data);
  response.headers.set(
    'x-situation-room-query-count',
    String(adapterResult.meta.queryCount),
  );
  if (adapterResult.meta.bytesProcessed != null) {
    response.headers.set(
      'x-situation-room-bytes-processed',
      String(adapterResult.meta.bytesProcessed),
    );
  }
  response.headers.set('x-situation-room-source', adapterResult.meta.source);
  return response;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @point-of-rental/situation-room test -- server-loaders`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/situation-room/lib/data-adapters/index.ts \
  apps/situation-room/lib/server/get-scorecard-report.ts \
  apps/situation-room/lib/server/get-filter-dictionary.ts \
  apps/situation-room/app/api/report/route.ts \
  apps/situation-room/app/api/filter-dictionaries/[key]/route.ts \
  apps/situation-room/__tests__/server-loaders.test.ts
git commit -m "feat(situation-room): add cached report loaders"
```

## Task 5: Refactor The App To Server-First Loading

**Files:**

- Modify: `apps/situation-room/app/page.tsx`
- Modify: `apps/situation-room/components/report-content.tsx`
- Modify: `apps/situation-room/hooks/use-scorecard-query.ts`
- Modify: `apps/situation-room/hooks/use-filters.ts`

- [ ] **Step 1: Write the failing fetch-path test for refresh URLs**

```ts
import { describe, expect, it } from 'vitest';
import { serializeFilterCacheKey } from '@/lib/filter-normalization';

describe('report refresh path', () => {
  it('uses normalized GET params instead of POSTing opaque JSON', () => {
    expect(serializeFilterCacheKey({ Region: ['South', 'North'] })).toBe(
      serializeFilterCacheKey({ Region: ['North', 'South'] }),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail if needed**

Run: `pnpm --filter @point-of-rental/situation-room test -- report-refresh`

Expected: FAIL or missing test target, depending on file naming

- [ ] **Step 3: Refactor the page and hook to use server-first initial data**

```tsx
// apps/situation-room/app/page.tsx
import { ReportContent } from '@/components/report-content';
import { parseFilterParams } from '@/lib/filters';
import { getScorecardReport } from '@/lib/server/get-scorecard-report';

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseFilterParams(
    Object.fromEntries(
      Object.entries(params).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(',') : value,
      ]),
    ),
  );

  const initialData = await getScorecardReport(filters);
  return <ReportContent initialData={initialData.data} />;
}
```

```tsx
// apps/situation-room/components/report-content.tsx
export function ReportContent({
  initialData,
}: {
  initialData: ScorecardReportPayload;
}) {
  const { activeFilters, activeCount, setFilter, clearAll } = useFilters();
  const { data, isLoading, error } = useScorecardQuery(
    activeFilters,
    initialData,
  );
  // existing rendering stays mostly unchanged
}
```

```ts
// apps/situation-room/hooks/use-scorecard-query.ts
export function useScorecardQuery(
  filters: ScorecardFilters,
  initialData: ScorecardReportPayload,
) {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  // build query string from normalized filters
  // fetch(`/api/report?${params.toString()}`)
}
```

- [ ] **Step 4: Run the app test/build commands**

Run:

- `pnpm --filter @point-of-rental/situation-room typecheck`
- `pnpm --filter @point-of-rental/situation-room build`

Expected: PASS with the page rendering from server-side data

- [ ] **Step 5: Commit**

```bash
git add apps/situation-room/app/page.tsx \
  apps/situation-room/components/report-content.tsx \
  apps/situation-room/hooks/use-scorecard-query.ts \
  apps/situation-room/hooks/use-filters.ts
git commit -m "feat(situation-room): make report load server-first"
```

## Task 6: Make Filter Dictionaries Instant

**Files:**

- Modify: `apps/situation-room/components/filter-rail.tsx`
- Modify: `apps/situation-room/hooks/use-filters.ts`
- Create: `apps/situation-room/lib/server/get-filter-dictionary.ts` (already created in Task 4; extend here)
- Optional Test: `apps/situation-room/__tests__/filter-dictionaries.test.ts`

- [ ] **Step 1: Write the failing dictionary test or fixture**

```ts
import { describe, expect, it } from 'vitest';

describe('filter dictionaries', () => {
  it('returns options ordered by sortOrder', async () => {
    const payload = await getFilterDictionary('Division');
    expect(payload.data.options).toEqual(
      [...payload.data.options].sort((a, b) => a.sortOrder - b.sortOrder),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify the dictionary loader behavior**

Run: `pnpm --filter @point-of-rental/situation-room test -- filter-dictionaries`

Expected: FAIL until `getFilterDictionary()` and the UI wiring exist

- [ ] **Step 3: Preload or fetch dictionaries from the cached endpoint**

```tsx
// apps/situation-room/components/filter-rail.tsx
const [options, setOptions] = useState<
  Record<string, FilterDictionaryOption[]>
>({});

useEffect(() => {
  void Promise.all(
    FILTER_DEFINITIONS.filter((filter) => filter.type === 'string').map(
      async (filter) => {
        const res = await fetch(`/api/filter-dictionaries/${filter.key}`);
        const payload = await res.json();
        return [filter.key, payload.options] as const;
      },
    ),
  ).then((entries) => setOptions(Object.fromEntries(entries)));
}, []);
```

Keep the UX rule:

- opening a dropdown must never trigger a heavy analytical query
- dictionaries can be prefetched or fetched once on mount
- payloads are already cached for 15 minutes server-side

- [ ] **Step 4: Run app checks**

Run:

- `pnpm --filter @point-of-rental/situation-room typecheck`
- `pnpm --filter @point-of-rental/situation-room build`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/situation-room/components/filter-rail.tsx \
  apps/situation-room/hooks/use-filters.ts \
  apps/situation-room/__tests__/filter-dictionaries.test.ts
git commit -m "feat(situation-room): serve cached filter dictionaries"
```

## Task 7: Add Benchmark Script And Root Commands

**Files:**

- Create: `apps/situation-room/scripts/benchmark-report.mjs`
- Modify: `apps/situation-room/package.json`
- Modify: `package.json`

- [ ] **Step 1: Write the benchmark runner**

```js
// apps/situation-room/scripts/benchmark-report.mjs
const baseUrl = process.env.BENCHMARK_BASE_URL ?? 'http://localhost:3100';

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[index];
}

async function request(path) {
  const start = performance.now();
  const res = await fetch(`${baseUrl}${path}`, { cache: 'no-store' });
  const elapsed = performance.now() - start;
  return {
    elapsed,
    bytesProcessed: res.headers.get('x-situation-room-bytes-processed'),
  };
}

async function measure(label, path, iterations = 20) {
  const warmTimings = [];
  const bytesProcessed = [];

  const cold = await request(path);
  if (cold.bytesProcessed) bytesProcessed.push(Number(cold.bytesProcessed));

  for (let i = 0; i < iterations; i += 1) {
    const warm = await request(path);
    warmTimings.push(warm.elapsed);
    if (warm.bytesProcessed) bytesProcessed.push(Number(warm.bytesProcessed));
  }

  return {
    label,
    iterations,
    coldMs: cold.elapsed,
    warmP50Ms: percentile(warmTimings, 0.5),
    warmP95Ms: percentile(warmTimings, 0.95),
    avgBytesProcessed: bytesProcessed.length
      ? bytesProcessed.reduce((sum, value) => sum + value, 0) /
        bytesProcessed.length
      : null,
  };
}

const results = [
  await measure('default-report', '/api/report'),
  await measure(
    'report-filter-change',
    '/api/report?Division=Rental&Region=North',
  ),
  await measure('division-dictionary', '/api/filter-dictionaries/Division'),
];

console.log(JSON.stringify(results, null, 2));
```

- [ ] **Step 2: Add scripts**

```json
// apps/situation-room/package.json
{
  "scripts": {
    "benchmark": "node ./scripts/benchmark-report.mjs"
  }
}
```

```json
// package.json
{
  "scripts": {
    "sr:benchmark": "pnpm --filter @point-of-rental/situation-room benchmark",
    "dbt:build": "uv run dbt build --project-dir dbt --profiles-dir dbt",
    "dbt:parse": "uv run dbt parse --project-dir dbt --profiles-dir dbt"
  }
}
```

- [ ] **Step 3: Run the benchmark script locally**

Run:

- `SITUATION_ROOM_BACKEND=bigquery pnpm sr:dev`
- `pnpm sr:benchmark`

Expected: JSON timing output with separate `coldMs`, `warmP50Ms`, and `warmP95Ms`

Important:

- start the app from a fresh process before each benchmark mode
- the benchmark script treats the first request as the cold path and the remaining iterations as the warm distribution

- [ ] **Step 4: Record the phase-1 baseline in the implementation notes**

Capture:

- cold report ms
- warm report p50 / p95
- filtered report cold / warm p95
- dictionary cold / warm p95
- average bytes processed when backend is `bigquery`

- [ ] **Step 5: Commit**

```bash
git add apps/situation-room/scripts/benchmark-report.mjs \
  apps/situation-room/package.json \
  package.json
git commit -m "chore(situation-room): add benchmark workflow"
```

## Task 8: Add Phase-2 Lightdash Adapter And Toggle

**Files:**

- Create: `lightdash/models/scorecard_report_rows.yml`
- Create: `lightdash/models/scorecard_filter_dictionary.yml`
- Create: `apps/situation-room/lib/data-adapters/lightdash-adapter.ts`
- Modify: `apps/situation-room/lib/lightdash-client.ts`
- Modify: `apps/situation-room/lib/data-adapters/index.ts`
- Test: `apps/situation-room/__tests__/lightdash-adapter.test.ts`

- [ ] **Step 1: Write the failing Lightdash adapter parity test**

```ts
import { describe, expect, it } from 'vitest';
import { LightdashAdapter } from '@/lib/data-adapters/lightdash-adapter';

describe('LightdashAdapter', () => {
  it('returns the canonical report payload shape', async () => {
    const adapter = new LightdashAdapter();
    const payload = await adapter.getScorecardReport({});

    expect(payload).toHaveProperty('data.categories');
    expect(Array.isArray(payload.data.categories)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @point-of-rental/situation-room test -- lightdash-adapter`

Expected: FAIL because the adapter or Lightdash app-facing models do not exist yet

- [ ] **Step 3: Add app-facing Lightdash models and adapter implementation**

```yaml
# lightdash/models/scorecard_report_rows.yml
type: model
name: scorecard_report_rows
sql_from: '`{{ env_var("BIGQUERY_PROJECT_ID") }}.{{ env_var("BIGQUERY_DATASET") }}.scorecard_report_rows`'
label: 'Situation Room Report Rows'
group_label: 'Situation Room'

dimensions:
  - name: category
    type: string
    sql: ${TABLE}.category
  - name: sort_order
    type: number
    sql: ${TABLE}.sort_order
  - name: metric_name
    type: string
    sql: ${TABLE}.metric_name

metrics:
  current_period:
    type: string
    sql: ${TABLE}.current_period
  previous_period:
    type: string
    sql: ${TABLE}.previous_period
  pct_change:
    type: string
    sql: ${TABLE}.pct_change
```

```ts
// apps/situation-room/lib/data-adapters/lightdash-adapter.ts
import type { ScorecardDataAdapter } from '@/lib/data-adapters/types';
import {
  executeAppFacingQuery,
  executeDictionaryQuery,
} from '@/lib/lightdash-client';

export class LightdashAdapter implements ScorecardDataAdapter {
  async getScorecardReport(filters) {
    const rows = await executeAppFacingQuery(filters);
    return {
      data: shapeRowsIntoPayload(rows, filters),
      meta: {
        source: 'lightdash',
        queryCount: 1,
      },
    };
  }

  async getFilterDictionary(key: string) {
    return {
      data: await executeDictionaryQuery(key),
      meta: {
        source: 'lightdash',
        queryCount: 1,
      },
    };
  }
}
```

```ts
// apps/situation-room/lib/data-adapters/index.ts
import 'server-only';
import { situationRoomEnv } from '@/lib/env.server';
import { BigQueryAdapter } from '@/lib/data-adapters/bigquery-adapter';
import { LightdashAdapter } from '@/lib/data-adapters/lightdash-adapter';

export function getScorecardDataAdapter() {
  if (situationRoomEnv.backend === 'lightdash') {
    return new LightdashAdapter();
  }

  return new BigQueryAdapter();
}
```

Use one Lightdash query for the report payload. Do not reintroduce per-category fan-out.

- [ ] **Step 4: Run Lightdash validation and adapter tests**

Run:

- `pnpm lightdash:lint`
- `pnpm --filter @point-of-rental/situation-room test -- lightdash-adapter`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lightdash/models/scorecard_report_rows.yml \
  lightdash/models/scorecard_filter_dictionary.yml \
  apps/situation-room/lib/data-adapters/lightdash-adapter.ts \
  apps/situation-room/lib/lightdash-client.ts \
  apps/situation-room/lib/data-adapters/index.ts \
  apps/situation-room/__tests__/lightdash-adapter.test.ts
git commit -m "feat(situation-room): add Lightdash adapter path"
```

## Task 9: Run The Apples-To-Apples Benchmark And Make The Backend Decision

**Files:**

- Create: `docs/superpowers/benchmarks/2026-03-20-situation-room-backend-comparison.md`

- [ ] **Step 1: Benchmark the direct BigQuery adapter**

Important:

- stop any existing app server
- start a fresh app process so the first request really measures the cold path

Run:

```bash
SITUATION_ROOM_BACKEND=bigquery pnpm sr:dev
pnpm sr:benchmark
```

Capture:

- cold report ms
- warm report p95
- dictionary cold / warm p95
- filtered report cold / warm p95

- [ ] **Step 2: Benchmark the Lightdash adapter**

Important:

- stop the BigQuery-mode app server
- start a fresh Lightdash-mode app process so the first request really measures the cold path

Run:

```bash
SITUATION_ROOM_BACKEND=lightdash pnpm sr:dev
pnpm sr:benchmark
```

Capture:

- cold report ms
- warm report p95
- dictionary cold / warm p95
- filtered report cold / warm p95
- any new failure modes

- [ ] **Step 3: Compare against the roadmap thresholds**

Lightdash is acceptable only if:

- initial report load remains `<= 3s`
- filter refresh remains `<= 3s`
- filter dictionaries remain effectively instant
- Lightdash adds no more than `750ms` p95 on cold paths
- Lightdash adds no more than `300ms` p95 on warm paths
- no sequential category fan-out is reintroduced

- [ ] **Step 4: Choose the backend mode**

Decide one:

- `bigquery` for now
- `lightdash`
- hybrid split

- [ ] **Step 4.5: Record the benchmark evidence**

Write `docs/superpowers/benchmarks/2026-03-20-situation-room-backend-comparison.md`
with:

- test environment
- backend mode
- coldMs / warmP50Ms / warmP95Ms
- bytes processed
- structural notes (`queryCount`, sequential fan-out, dropdown behavior)
- go / no-go recommendation

- [ ] **Step 5: Commit the selected default**

```bash
git add apps/situation-room/lib/data-adapters/index.ts \
  docs/superpowers/specs/2026-03-20-situation-room-data-backend-roadmap-design.md
git commit -m "chore(situation-room): set backend mode after benchmark"
```

## Verification Checklist

Before calling the work complete, run:

- `pnpm --filter @point-of-rental/situation-room test`
- `pnpm --filter @point-of-rental/situation-room typecheck`
- `pnpm --filter @point-of-rental/situation-room build`
- `uv run dbt parse --project-dir dbt --profiles-dir dbt`
- `uv run dbt build --project-dir dbt --profiles-dir dbt --select scorecard_report_rows scorecard_filter_dictionary`
- `pnpm lightdash:lint` (after Task 8)
- `pnpm sr:benchmark`

Expected outcomes:

- one main payload request per page load
- zero sequential category queries on the main path
- zero live distinct/filter-option queries against broad analytical models
- filter dictionaries feel instant
- measured latency is within roadmap thresholds
