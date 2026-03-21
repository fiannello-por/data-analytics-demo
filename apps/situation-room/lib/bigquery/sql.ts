import {
  type FilterKey,
  type ScorecardFilters,
  withDefaultDateRange,
} from '@/lib/contracts';

type QueryDefinition = {
  sql: string;
  params: Record<string, unknown>;
};

type QueryableFilterKey = Exclude<FilterKey, 'DateRange'>;

const FILTER_COLUMNS: Record<QueryableFilterKey, string> = {
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

function getTableReference(tableName: string): string {
  const projectId = process.env.BIGQUERY_PROJECT_ID ?? 'test-project';
  const dataset = process.env.BIGQUERY_DATASET ?? 'test_dataset';

  return `\`${projectId}.${dataset}.${tableName}\``;
}

export function buildScorecardReportQuery(
  filters: ScorecardFilters,
): QueryDefinition {
  const clauses: string[] = [];
  const params: Record<string, string[]> = {};
  const normalized = withDefaultDateRange(filters);

  for (const [key, values] of Object.entries(normalized)) {
    if (!values?.length) {
      continue;
    }

    if (key === 'DateRange') {
      if (values.includes('current_year')) {
        clauses.push('report_date >= DATE_TRUNC(CURRENT_DATE(), YEAR)');
      }
      continue;
    }

    const column = FILTER_COLUMNS[key as QueryableFilterKey];
    if (!column) {
      continue;
    }

    clauses.push(`${column} IN UNNEST(@${key})`);
    params[key] = values;
  }

  const whereClause = clauses.length > 0 ? clauses.join('\n        and ') : '1 = 1';

  return {
    sql: `
      with scoped_rows as (
        select
          category,
          sort_order,
          metric_name,
          current_period,
          previous_period,
          pct_change,
          report_date
        from ${getTableReference('scorecard_report_rows')}
        where ${whereClause}
      ),
      latest_snapshot as (
        select max(report_date) as latest_report_date
        from scoped_rows
      )
      select
        category,
        sort_order,
        metric_name,
        current_period,
        previous_period,
        pct_change,
        report_date
      from scoped_rows
      where report_date = (select latest_report_date from latest_snapshot)
      order by category, sort_order
    `.trim(),
    params,
  };
}

export function buildFilterDictionaryQuery(filterKey: string): QueryDefinition {
  return {
    sql: `
      select
        filter_key,
        value,
        label,
        sort_order
      from ${getTableReference('scorecard_filter_dictionary')}
      where filter_key = @filterKey
      order by sort_order
    `.trim(),
    params: { filterKey },
  };
}
