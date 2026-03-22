import {
  type Category,
  findTileDefinition,
  type GlobalFilterKey,
} from '@/lib/dashboard/catalog';
import type {
  DashboardFilters,
  DateRange,
} from '@/lib/dashboard/contracts';

type DashboardQueryInput = {
  category: Category;
  tileId: string;
  dateRange: DateRange;
  previousDateRange: DateRange;
  filters: DashboardFilters;
};

export type DashboardQueryDefinition = {
  sql: string;
  params: Record<string, unknown>;
};

type MetricSqlDefinition = {
  snapshotCurrentSql: string;
  snapshotPreviousSql: string;
  trendValueSql: string;
  dateField: string;
  sourcePredicate?: string;
};

type DateParamPrefix = 'current' | 'previous';

type FilterClauseResult = {
  clauses: string[];
  params: Record<string, string[]>;
};

const FILTER_COLUMNS: Record<GlobalFilterKey, string> = {
  Division: 'Division',
  Owner: 'Owner',
  Segment: 'OpportunitySegment',
  Region: 'Queue_Region__c',
  SE: 'SE',
  'Booking Plan Opp Type': 'BookingPlanOppType2025',
  'Product Family': 'ProductFamily',
  'SDR Source': 'SDRSource',
  SDR: 'SDR',
  'POR v R360': 'OppRecordType',
  'Account Owner': 'AccountOwner',
  'Owner Department': 'OwnerDepartment',
  'Strategic Filter': 'StrategicFilter',
  Accepted: 'Accepted',
  'Gate 1 Criteria Met': 'Gate1CriteriaMet',
  'Gate Met or Accepted': 'GateMetOrAccepted',
};

const CATEGORY_PREDICATES: Record<Category, string> = {
  'New Logo': `Type = 'New Business'`,
  Expansion: `Type = 'Existing Business'`,
  Migration: `Type = 'Migration'`,
  Renewal: `Type = 'Renewal'`,
  Total: '1 = 1',
};

const TILE_ID_PREFIXES = ['new_logo_', 'expansion_', 'migration_', 'renewal_', 'total_'] as const;

const METRIC_SQL: Record<string, MetricSqlDefinition> = {
  bookings_amount: {
    snapshotCurrentSql: `COALESCE(SUM(CASE WHEN Won THEN ACV END), 0)`,
    snapshotPreviousSql: `COALESCE(SUM(CASE WHEN Won THEN ACV END), 0)`,
    trendValueSql: `COALESCE(SUM(CASE WHEN Won THEN ACV END), 0)`,
    dateField: 'CloseDate',
  },
  bookings_count: {
    snapshotCurrentSql: `COUNT(DISTINCT CASE WHEN Won THEN Id END)`,
    snapshotPreviousSql: `COUNT(DISTINCT CASE WHEN Won THEN Id END)`,
    trendValueSql: `COUNT(DISTINCT CASE WHEN Won THEN Id END)`,
    dateField: 'CloseDate',
  },
  annual_pacing_ytd: {
    snapshotCurrentSql:
      `COALESCE(SUM(CASE WHEN Won THEN ACV END), 0) * 365.0 / NULLIF(DATE_DIFF(DATE(@currentEndDate), DATE(@currentStartDate), DAY) + 1, 0)`,
    snapshotPreviousSql:
      `COALESCE(SUM(CASE WHEN Won THEN ACV END), 0) * 365.0 / NULLIF(DATE_DIFF(DATE(@previousEndDate), DATE(@previousStartDate), DAY) + 1, 0)`,
    trendValueSql:
      `COALESCE(SUM(CASE WHEN Won THEN ACV END), 0) * 365.0 / NULLIF(DATE_DIFF(DATE(@currentEndDate), DATE(@currentStartDate), DAY) + 1, 0)`,
    dateField: 'CloseDate',
  },
  close_rate: {
    snapshotCurrentSql:
      `SAFE_DIVIDE(COUNT(DISTINCT CASE WHEN isclosed AND Won THEN Id END), COUNT(DISTINCT CASE WHEN isclosed THEN Id END))`,
    snapshotPreviousSql:
      `SAFE_DIVIDE(COUNT(DISTINCT CASE WHEN isclosed AND Won THEN Id END), COUNT(DISTINCT CASE WHEN isclosed THEN Id END))`,
    trendValueSql:
      `SAFE_DIVIDE(COUNT(DISTINCT CASE WHEN isclosed AND Won THEN Id END), COUNT(DISTINCT CASE WHEN isclosed THEN Id END))`,
    dateField: 'CloseDate',
  },
  avg_age: {
    snapshotCurrentSql: `AVG(CASE WHEN Won AND Age__c > 0 THEN Age__c END)`,
    snapshotPreviousSql: `AVG(CASE WHEN Won AND Age__c > 0 THEN Age__c END)`,
    trendValueSql: `AVG(CASE WHEN Won AND Age__c > 0 THEN Age__c END)`,
    dateField: 'CloseDate',
  },
  avg_booked_deal: {
    snapshotCurrentSql: `AVG(CASE WHEN Won AND ACV > 0 THEN ACV END)`,
    snapshotPreviousSql: `AVG(CASE WHEN Won AND ACV > 0 THEN ACV END)`,
    trendValueSql: `AVG(CASE WHEN Won AND ACV > 0 THEN ACV END)`,
    dateField: 'CloseDate',
  },
  avg_quoted_deal: {
    snapshotCurrentSql: `AVG(CASE WHEN ACV > 0 AND Id IS NOT NULL THEN ACV END)`,
    snapshotPreviousSql: `AVG(CASE WHEN ACV > 0 AND Id IS NOT NULL THEN ACV END)`,
    trendValueSql: `AVG(CASE WHEN ACV > 0 AND Id IS NOT NULL THEN ACV END)`,
    dateField: 'CreatedDate',
  },
  pipeline_created: {
    snapshotCurrentSql: `COALESCE(SUM(CASE WHEN ACV > 0 AND Id IS NOT NULL THEN ACV END), 0)`,
    snapshotPreviousSql: `COALESCE(SUM(CASE WHEN ACV > 0 AND Id IS NOT NULL THEN ACV END), 0)`,
    trendValueSql: `COALESCE(SUM(CASE WHEN ACV > 0 AND Id IS NOT NULL THEN ACV END), 0)`,
    dateField: 'PipelineStartDate',
  },
  sql: {
    snapshotCurrentSql: `COUNT(DISTINCT Id)`,
    snapshotPreviousSql: `COUNT(DISTINCT Id)`,
    trendValueSql: `COUNT(DISTINCT Id)`,
    dateField: 'CreatedDate',
  },
  sqo: {
    snapshotCurrentSql: `COUNT(DISTINCT Id)`,
    snapshotPreviousSql: `COUNT(DISTINCT Id)`,
    trendValueSql: `COUNT(DISTINCT Id)`,
    dateField: 'sales_qualified_date__c',
    sourcePredicate: `Accepted AND OppRecordType = 'POR'`,
  },
  gate_1_complete: {
    snapshotCurrentSql: `COUNT(DISTINCT Id)`,
    snapshotPreviousSql: `COUNT(DISTINCT Id)`,
    trendValueSql: `COUNT(DISTINCT Id)`,
    dateField: 'Gate1CompletedDate',
    sourcePredicate: `Gate1CriteriaMet`,
  },
  sdr_points: {
    snapshotCurrentSql: `COALESCE(SUM(SDR_Points), 0)`,
    snapshotPreviousSql: `COALESCE(SUM(SDR_Points), 0)`,
    trendValueSql: `COALESCE(SUM(SDR_Points), 0)`,
    dateField: 'CreatedDate',
    sourcePredicate: `Gate1CriteriaMet`,
  },
  sqo_users: {
    snapshotCurrentSql: `COALESCE(SUM(Users), 0)`,
    snapshotPreviousSql: `COALESCE(SUM(Users), 0)`,
    trendValueSql: `COALESCE(SUM(Users), 0)`,
    dateField: 'sales_qualified_date__c',
    sourcePredicate: `Accepted AND sales_qualified_date__c IS NOT NULL`,
  },
  sal: {
    snapshotCurrentSql: `COUNT(DISTINCT Id)`,
    snapshotPreviousSql: `COUNT(DISTINCT Id)`,
    trendValueSql: `COUNT(DISTINCT Id)`,
    dateField: 'ExpansionSubmittedDate',
    sourcePredicate: `MigrationOpp AND OppRecordType = 'POR' AND ExpansionSubmitted`,
  },
  avg_users: {
    snapshotCurrentSql: `AVG(CASE WHEN Won THEN Users END)`,
    snapshotPreviousSql: `AVG(CASE WHEN Won THEN Users END)`,
    trendValueSql: `AVG(CASE WHEN Won THEN Users END)`,
    dateField: 'CloseDate',
  },
  one_time_revenue: {
    snapshotCurrentSql: `COALESCE(SUM(CASE WHEN Won AND HardImpValueUSD > 0 THEN HardImpValueUSD END), 0)`,
    snapshotPreviousSql: `COALESCE(SUM(CASE WHEN Won AND HardImpValueUSD > 0 THEN HardImpValueUSD END), 0)`,
    trendValueSql: `COALESCE(SUM(CASE WHEN Won AND HardImpValueUSD > 0 THEN HardImpValueUSD END), 0)`,
    dateField: 'CloseDate',
  },
};

const TILE_SQL_OVERRIDES: Record<string, Partial<MetricSqlDefinition>> = {
  expansion_sql: {
    sourcePredicate: `ExpansionOpp AND OppRecordType = 'POR'`,
  },
  migration_sql: {
    sourcePredicate: `MigrationOpp AND OppRecordType = 'POR'`,
  },
  renewal_sql: {
    dateField: 'CloseDate',
  },
  expansion_sqo: {
    dateField: 'ExpansionQualifiedDate',
    sourcePredicate: `ExpansionOpp AND ExpansionQualified AND OppRecordType = 'POR' AND ACV >= 0`,
  },
  migration_sqo: {
    dateField: 'ExpansionQualifiedDate',
    sourcePredicate: `MigrationOpp AND ExpansionQualified AND OppRecordType = 'POR'`,
  },
};

function getSourceTableReference(): string {
  if (process.env.BIGQUERY_SOURCE_TABLE) {
    return `\`${process.env.BIGQUERY_SOURCE_TABLE}\``;
  }

  return '`data-analytics-306119.sfdc.OpportunityViewTable`';
}

function getFilterParamName(key: GlobalFilterKey): string {
  return `filter_${key.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`;
}

function buildFilterClauses(filters: DashboardFilters): FilterClauseResult {
  const params: Record<string, string[]> = {};
  const clauses = Object.entries(filters)
    .filter((entry): entry is [GlobalFilterKey, string[]] => {
      const [key, values] = entry;
      return key in FILTER_COLUMNS && Array.isArray(values) && values.length > 0;
    })
    .map(([key, values]) => {
      const paramName = getFilterParamName(key);
      params[paramName] = values;
      return `${FILTER_COLUMNS[key]} IN UNNEST(@${paramName})`;
    });

  return { clauses, params };
}

function getMetricKey(tileId: string): string {
  const matchingPrefix = TILE_ID_PREFIXES.find((prefix) => tileId.startsWith(prefix));

  if (!matchingPrefix) {
    throw new Error(`Unsupported dashboard tile: ${tileId}`);
  }

  return tileId.slice(matchingPrefix.length);
}

function getMetricDefinition(tileId: string): MetricSqlDefinition {
  const baseMetric = METRIC_SQL[getMetricKey(tileId)];
  if (!baseMetric) {
    throw new Error(`Unsupported dashboard tile: ${tileId}`);
  }
  return {
    ...baseMetric,
    ...TILE_SQL_OVERRIDES[tileId],
  };
}

function getDateParamNames(prefix: DateParamPrefix) {
  const capitalizedPrefix = prefix[0].toUpperCase() + prefix.slice(1);

  return {
    start: `${prefix}StartDate`,
    end: `${prefix}EndDate`,
    startRef: `@${prefix}StartDate`,
    endRef: `@${prefix}EndDate`,
    capitalizedPrefix,
  };
}

function buildDateParams(range: DateRange, prefix: DateParamPrefix) {
  const paramNames = getDateParamNames(prefix);

  return {
    [paramNames.start]: range.startDate,
    [paramNames.end]: range.endDate,
  };
}

function buildScopedWhereClause(
  category: Category,
  metric: MetricSqlDefinition,
  dateField: string,
  datePrefix: DateParamPrefix,
  filterClauses: string[],
): string {
  const dateParams = getDateParamNames(datePrefix);

  return [
    CATEGORY_PREDICATES[category],
    metric.sourcePredicate,
    `${dateField} >= DATE(${dateParams.startRef})`,
    `${dateField} <= DATE(${dateParams.endRef})`,
    ...filterClauses,
  ]
    .filter(Boolean)
    .join('\n      AND ');
}

function getBaseParams(input: DashboardQueryInput): Record<string, unknown> {
  return {
    ...buildDateParams(input.dateRange, 'current'),
    ...buildDateParams(input.previousDateRange, 'previous'),
  };
}

export function buildTileSnapshotQuery(
  input: DashboardQueryInput,
): DashboardQueryDefinition {
  const tile = findTileDefinition(input.category, input.tileId);
  if (!tile) {
    throw new Error(`Unknown tile "${input.tileId}" for category "${input.category}"`);
  }

  const metric = getMetricDefinition(input.tileId);
  const sourceTable = getSourceTableReference();
  const filterState = buildFilterClauses(input.filters);

  return {
    sql: `
      WITH current_window AS (
        SELECT *
        FROM ${sourceTable}
        WHERE ${buildScopedWhereClause(
          input.category,
          metric,
          metric.dateField,
          'current',
          filterState.clauses,
        )}
      ),
      previous_window AS (
        SELECT *
        FROM ${sourceTable}
        WHERE ${buildScopedWhereClause(
          input.category,
          metric,
          metric.dateField,
          'previous',
          filterState.clauses,
        )}
      )
      SELECT
        '${tile.tileId}' AS tile_id,
        '${tile.label}' AS label,
        ${tile.sortOrder} AS sort_order,
        '${tile.formatType}' AS format_type,
        ${metric.snapshotCurrentSql} AS current_value,
        (SELECT ${metric.snapshotPreviousSql} FROM previous_window) AS previous_value,
        @currentStartDate AS current_start_date,
        @previousEndDate AS previous_end_date
      FROM current_window
    `.trim(),
    params: {
      ...getBaseParams(input),
      ...filterState.params,
    },
  };
}

export function buildTileTrendQuery(
  input: DashboardQueryInput,
): DashboardQueryDefinition {
  const tile = findTileDefinition(input.category, input.tileId);
  if (!tile) {
    throw new Error(`Unknown tile "${input.tileId}" for category "${input.category}"`);
  }

  const metric = getMetricDefinition(input.tileId);
  const sourceTable = getSourceTableReference();
  const filterState = buildFilterClauses(input.filters);

  return {
    sql: `
      WITH current_window AS (
        SELECT
          DATE_TRUNC(${metric.dateField}, WEEK(MONDAY)) AS bucket_date,
          DATE_DIFF(
            DATE_TRUNC(${metric.dateField}, WEEK(MONDAY)),
            DATE_TRUNC(DATE(@currentStartDate), WEEK(MONDAY)),
            WEEK
          ) AS bucket_index,
          ${metric.trendValueSql} AS current_value
        FROM ${sourceTable}
        WHERE ${buildScopedWhereClause(
          input.category,
          metric,
          metric.dateField,
          'current',
          filterState.clauses,
        )}
        GROUP BY 1, 2
      ),
      previous_window AS (
        SELECT
          DATE_TRUNC(${metric.dateField}, WEEK(MONDAY)) AS bucket_date,
          DATE_DIFF(
            DATE_TRUNC(${metric.dateField}, WEEK(MONDAY)),
            DATE_TRUNC(DATE(@previousStartDate), WEEK(MONDAY)),
            WEEK
          ) AS bucket_index,
          ${metric.trendValueSql} AS previous_value
        FROM ${sourceTable}
        WHERE ${buildScopedWhereClause(
          input.category,
          metric,
          metric.dateField,
          'previous',
          filterState.clauses,
        )}
        GROUP BY 1, 2
      )
      SELECT
        COALESCE(current_window.bucket_index, previous_window.bucket_index) AS bucket_index,
        FORMAT_DATE('%Y-%m-%d', COALESCE(current_window.bucket_date, previous_window.bucket_date)) AS bucket_label,
        current_window.current_value AS current_value,
        previous_window.previous_value AS previous_value
      FROM current_window
      FULL OUTER JOIN previous_window USING (bucket_index)
      ORDER BY bucket_index
    `.trim(),
    params: {
      ...getBaseParams(input),
      ...filterState.params,
    },
  };
}

export function buildFilterDictionaryQuery(
  filterKey: GlobalFilterKey,
): DashboardQueryDefinition {
  const column = FILTER_COLUMNS[filterKey];
  if (!column) {
    throw new Error(`Unsupported dashboard filter dictionary key: ${filterKey}`);
  }

  return {
    sql: `
      select distinct
        ${column} AS value,
        ${column} AS label
      from ${getSourceTableReference()}
      where ${column} IS NOT NULL
      order by label
    `.trim(),
    params: {},
  };
}
