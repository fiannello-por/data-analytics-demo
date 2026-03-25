import 'server-only';

import { unstable_cache } from 'next/cache';
import { buildClosedWonOpportunitiesQuery } from '@/lib/bigquery/dashboard-sql';
import type { Category } from '@/lib/dashboard/catalog';
import { formatDateRange } from '@/lib/dashboard/date-range';
import { serializeDashboardStateKey } from '@/lib/dashboard/query-inputs';
import type { ProbeExecutionOptions } from '@/lib/probe-cache-mode';
import type {
  ClosedWonOpportunitiesPayload,
  DashboardState,
} from '@/lib/dashboard/contracts';
import {
  defaultDashboardQueryClient,
  formatMetricValue,
  normalizeDashboardExecutionOptions,
  nowIsoString,
  requireNumberField,
  requireStringField,
  type DashboardLoaderResult,
  type DashboardQueryClient,
  type DashboardQueryRow,
} from '@/lib/server/dashboard-query-runtime';

type ClosedWonState = Pick<DashboardState, 'filters' | 'dateRange'> & {
  activeCategory: Category;
};

function buildCacheKey(input: ClosedWonState): string {
  return serializeDashboardStateKey({
    activeCategory: input.activeCategory,
    filters: input.filters,
    dateRange: input.dateRange,
  });
}

function requireOptionalStringField(
  row: DashboardQueryRow,
  key: string,
  context: string,
): string | null {
  const value = row[key];

  if (value == null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error(`Invalid ${context} field "${key}": expected a string.`);
  }

  return value;
}

export async function getDashboardClosedWonOpportunities(
  input: ClosedWonState,
  client: DashboardQueryClient = defaultDashboardQueryClient,
  options: ProbeExecutionOptions = {},
): Promise<DashboardLoaderResult<ClosedWonOpportunitiesPayload>> {
  const execution = normalizeDashboardExecutionOptions(options);

  const loadRows = async () => {
    const result = await client.queryRows(
      buildClosedWonOpportunitiesQuery({
        category: input.activeCategory,
        dateRange: input.dateRange,
        filters: input.filters,
      }),
      execution,
    );

    return {
      data: {
        category: input.activeCategory,
        currentWindowLabel: formatDateRange(input.dateRange),
        lastRefreshedAt: nowIsoString(),
        rows: result.rows.map((row) => ({
          accountName: requireStringField(row, 'account_name', 'closed won row'),
          accountLink: requireOptionalStringField(row, 'account_link', 'closed won row'),
          opportunityName: requireStringField(row, 'opportunity_name', 'closed won row'),
          opportunityLink: requireOptionalStringField(
            row,
            'opportunity_link',
            'closed won row',
          ),
          closeDate: requireStringField(row, 'close_date', 'closed won row'),
          createdDate: requireStringField(row, 'created_date', 'closed won row'),
          division: requireStringField(row, 'division', 'closed won row'),
          type: requireStringField(row, 'type', 'closed won row'),
          productFamily: requireStringField(row, 'product_family', 'closed won row'),
          bookingPlanOppType2025: requireStringField(
            row,
            'booking_plan_opp_type_2025',
            'closed won row',
          ),
          owner: requireStringField(row, 'owner', 'closed won row'),
          sdr: requireStringField(row, 'sdr', 'closed won row'),
          oppRecordType: requireStringField(row, 'opp_record_type', 'closed won row'),
          age: formatMetricValue(
            requireNumberField(row, 'age', 'closed won row'),
            'days',
          ),
          se: requireStringField(row, 'se', 'closed won row'),
          quarter: requireStringField(row, 'quarter', 'closed won row'),
          contractStartDate: requireStringField(
            row,
            'contract_start_date',
            'closed won row',
          ),
          users: formatMetricValue(
            requireNumberField(row, 'users', 'closed won row'),
            'number',
          ),
          acv: formatMetricValue(
            requireNumberField(row, 'acv', 'closed won row'),
            'currency',
          ),
        })),
      },
      meta: {
        source: 'bigquery' as const,
        queryCount: 1,
        bytesProcessed: result.bytesProcessed ?? 0,
        cacheMode: execution.cacheMode,
      },
    };
  };

  if (execution.cacheMode === 'off') {
    return loadRows();
  }

  return unstable_cache(loadRows, ['dashboard-closed-won', buildCacheKey(input)], {
    revalidate: 60,
    tags: ['dashboard-closed-won'],
  })();
}
