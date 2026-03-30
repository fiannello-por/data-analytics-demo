import 'server-only';

import { unstable_cache } from 'next/cache';
import type { Category } from '@/lib/dashboard/catalog';
import { formatDateRange } from '@/lib/dashboard/date-range';
import { serializeDashboardStateKey } from '@/lib/dashboard/query-inputs';
import type {
  ClosedWonOpportunitiesPayload,
  DashboardState,
} from '@/lib/dashboard/contracts';
import type { ProbeExecutionOptions } from '@/lib/probe-cache-mode';
import {
  formatMetricValue,
  nowIsoString,
  type DashboardLoaderResult,
} from '@/lib/server/dashboard-query-runtime';
import { buildClosedWonQuery } from '@/lib/dashboard-v2/semantic-registry';
import {
  getDashboardV2Runtime,
  normalizeDashboardV2ExecutionOptions,
} from '@/lib/server/v2/semantic-runtime';
import { buildTileBackendTrace } from '@/lib/server/v2/tile-backend-trace';
import {
  getSemanticNumber,
  getSemanticOptionalString,
  getSemanticString,
} from '@/lib/server/v2/semantic-values';

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

export async function getDashboardV2ClosedWonOpportunities(
  input: ClosedWonState,
  runtime = getDashboardV2Runtime(),
  options: ProbeExecutionOptions = {},
): Promise<DashboardLoaderResult<ClosedWonOpportunitiesPayload>> {
  const execution = normalizeDashboardV2ExecutionOptions(options);

  const loadRows = async () => {
    const semanticRequest = buildClosedWonQuery(
      input.activeCategory,
      input.filters,
      input.dateRange,
    );
    const result = await runtime.runQuery(semanticRequest);
    const backendTrace = await buildTileBackendTrace({
      kind: 'single',
      includes: ['Closed Won Opportunities'],
      executions: [{ label: 'Current window', semanticRequest, result }],
    });

    return {
      data: {
        category: input.activeCategory,
        currentWindowLabel: formatDateRange(input.dateRange),
        lastRefreshedAt: nowIsoString(),
        rows: result.rows.map((row) => ({
          accountName: getSemanticString(row, 'account_name'),
          accountLink: getSemanticOptionalString(row, 'account_link'),
          opportunityName: getSemanticString(row, 'opportunity_name'),
          opportunityLink: getSemanticOptionalString(row, 'opportunity_link'),
          closeDate: getSemanticString(row, 'close_date'),
          createdDate: getSemanticString(row, 'created_date'),
          division: getSemanticString(row, 'division'),
          type: getSemanticString(row, 'type'),
          productFamily: getSemanticString(row, 'product_family'),
          bookingPlanOppType2025: getSemanticString(
            row,
            'booking_plan_opp_type_2025',
          ),
          owner: getSemanticString(row, 'owner'),
          sdr: getSemanticString(row, 'sdr'),
          oppRecordType: getSemanticString(row, 'opp_record_type'),
          age: formatMetricValue(getSemanticNumber(row, 'age_days'), 'days'),
          se: getSemanticString(row, 'se'),
          quarter: getSemanticString(row, 'quarter_label'),
          contractStartDate: getSemanticString(row, 'contract_start_date'),
          users: formatMetricValue(getSemanticNumber(row, 'users'), 'number'),
          acv: formatMetricValue(getSemanticNumber(row, 'acv'), 'currency'),
        })),
        backendTrace,
      },
      meta: {
        source: 'lightdash' as const,
        queryCount: result.meta.queryCount,
        bytesProcessed: result.meta.bytesProcessed ?? 0,
        compileDurationMs: result.meta.compileDurationMs,
        executionDurationMs: result.meta.executionDurationMs,
        cacheStatus: result.meta.cacheStatus,
        cacheMode: execution.cacheMode,
      },
    } satisfies DashboardLoaderResult<ClosedWonOpportunitiesPayload>;
  };

  if (execution.cacheMode === 'off') {
    return loadRows();
  }

  return unstable_cache(
    loadRows,
    ['v2-trace-links-3', 'dashboard-v2-closed-won', buildCacheKey(input)],
    {
      revalidate: 60,
      tags: ['dashboard-v2-closed-won'],
    },
  )();
}
