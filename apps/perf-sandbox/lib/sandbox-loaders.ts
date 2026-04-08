// apps/perf-sandbox/lib/sandbox-loaders.ts
import { unstable_cache } from 'next/cache';
import type { SpanCollector } from './telemetry';
import type { InstrumentedRuntime } from './sandbox-runtime';
import type { ProbeCacheMode } from './cache-mode';

const DASHBOARD_V2_BASE_MODEL = 'sales_dashboard_v2_opportunity_base';

const CATEGORY_ORDER = [
  'New Logo',
  'Expansion',
  'Migration',
  'Renewal',
  'Total',
] as const;

type Category = (typeof CATEGORY_ORDER)[number];

function defaultDateRange() {
  const now = new Date();
  const year = now.getFullYear();
  return {
    startDate: `${year}-01-01`,
    endDate: now.toISOString().slice(0, 10),
  };
}

function defaultPreviousDateRange() {
  const now = new Date();
  const year = now.getFullYear() - 1;
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
  };
}

const GLOBAL_FILTER_KEYS = [
  'Division', 'Owner', 'Segment', 'Region', 'SE',
  'Booking Plan Opp Type', 'Product Family', 'SDR Source', 'SDR',
  'POR v R360', 'Account Owner', 'Owner Department',
  'Strategic Filter', 'Accepted', 'Gate 1 Criteria Met',
  'Gate Met or Accepted',
] as const;

const FILTER_DIMENSIONS: Record<string, string> = {
  Division: 'division',
  Owner: 'owner',
  Segment: 'opportunity_segment',
  Region: 'region',
  SE: 'se',
  'Booking Plan Opp Type': 'booking_plan_opp_type_2025',
  'Product Family': 'product_family',
  'SDR Source': 'sdr_source',
  SDR: 'sdr',
  'POR v R360': 'opp_record_type',
  'Account Owner': 'account_owner',
  'Owner Department': 'owner_department',
  'Strategic Filter': 'strategic_filter',
  Accepted: 'accepted',
  'Gate 1 Criteria Met': 'gate1_criteria_met',
  'Gate Met or Accepted': 'gate_met_or_accepted',
};

type LoaderOptions = {
  cacheMode: ProbeCacheMode;
};

export async function loadOverviewBoard(
  runtime: InstrumentedRuntime,
  collector: SpanCollector,
  options: LoaderOptions = { cacheMode: 'auto' },
) {
  const loadBoard = async () => {
    const dateRange = defaultDateRange();
    const previousDateRange = defaultPreviousDateRange();
    const boardSpanId = collector.startSpan('overview_board');

    const results = await Promise.all(
      CATEGORY_ORDER.map(async (category) => {
        const catSpanId = collector.startSpan('category_snapshot', boardSpanId, {
          category,
        });

        const categoryFilter =
          category !== 'Total'
            ? [{ field: 'dashboard_category', operator: 'equals' as const, values: [category] }]
            : [];

        const currentSpanId = collector.startSpan('query_current', catSpanId, {
          model: DASHBOARD_V2_BASE_MODEL,
          measures: ['bookings_amount'],
        });
        // Set active parent so runtime's compile/execute spans nest here
        collector.setActiveParent(currentSpanId);
        const current = await runtime.runQuery({
          model: DASHBOARD_V2_BASE_MODEL,
          measures: ['bookings_amount'],
          filters: [
            ...categoryFilter,
            { field: 'close_date', operator: 'between', values: [dateRange.startDate, dateRange.endDate] },
          ],
        });
        collector.setActiveParent(undefined);
        collector.endSpan(currentSpanId);

        const previousSpanId = collector.startSpan('query_previous', catSpanId, {
          model: DASHBOARD_V2_BASE_MODEL,
          measures: ['bookings_amount'],
        });
        collector.setActiveParent(previousSpanId);
        const previous = await runtime.runQuery({
          model: DASHBOARD_V2_BASE_MODEL,
          measures: ['bookings_amount'],
          filters: [
            ...categoryFilter,
            { field: 'close_date', operator: 'between', values: [previousDateRange.startDate, previousDateRange.endDate] },
          ],
        });
        collector.setActiveParent(undefined);
        collector.endSpan(previousSpanId);

        collector.endSpan(catSpanId);
        return { category, current, previous };
      }),
    );

    collector.endSpan(boardSpanId);
    return results;
  };

  if (options.cacheMode === 'off') {
    return loadBoard();
  }

  // Match production: unstable_cache with 60s revalidation.
  // Production-cold runs hit this path — the Data Cache may serve
  // stale-but-valid entries from a prior process. Full-cold runs
  // bypass this via cacheMode=off above.
  return unstable_cache(loadBoard, ['sandbox-overview-board'], {
    revalidate: 60,
    tags: ['sandbox-overview-board'],
  })();
}

export async function loadFilterDictionaries(
  runtime: InstrumentedRuntime,
  collector: SpanCollector,
  options: LoaderOptions = { cacheMode: 'auto' },
) {
  const loadDictionaries = async () => {
    const dictSpanId = collector.startSpan('filter_dictionaries', undefined, {
      count: GLOBAL_FILTER_KEYS.length,
    });

    const results = await Promise.all(
      GLOBAL_FILTER_KEYS.map(async (key) => {
        const dimension = FILTER_DIMENSIONS[key];
        if (!dimension) return { key, options: [] };

        const dictItemSpanId = collector.startSpan(`dict_${dimension}`, dictSpanId);
        collector.setActiveParent(dictItemSpanId);
        const result = await runtime.runQuery({
          model: DASHBOARD_V2_BASE_MODEL,
          dimensions: [dimension],
          sorts: [{ field: dimension, descending: false }],
          limit: 500,
        });
        collector.setActiveParent(undefined);
        collector.endSpan(dictItemSpanId);

        return {
          key,
          options: result.rows.map((row) => {
            const value = Object.values(row)[0];
            return value?.formatted ?? '';
          }),
        };
      }),
    );

    collector.endSpan(dictSpanId);
    return results;
  };

  if (options.cacheMode === 'off') {
    return loadDictionaries();
  }

  // Match production: unstable_cache with 900s revalidation for dictionaries.
  return unstable_cache(loadDictionaries, ['sandbox-filter-dictionaries'], {
    revalidate: 900,
    tags: ['sandbox-filter-dictionaries'],
  })();
}
