import 'server-only';

const SOURCE_TABLE = 'scorecard_daily';

type QueryDefinition = {
  sql: string;
  params: Record<string, unknown>;
};

export function buildPingQuery(): QueryDefinition {
  return {
    sql: 'select 1 as ping_value',
    params: {},
  };
}

function getTableReference(projectId: string, dataset: string): string {
  return `\`${projectId}.${dataset}.${SOURCE_TABLE}\``;
}

export function buildProbeSummaryQuery(
  projectId: string,
  dataset: string,
): QueryDefinition {
  return {
    sql: `
      select
        count(*) as row_count,
        count(distinct Division) as division_count,
        min(report_date) as min_report_date,
        max(report_date) as max_report_date
      from ${getTableReference(projectId, dataset)}
    `.trim(),
    params: {},
  };
}

export function buildDivisionFilterOptionsQuery(
  projectId: string,
  dataset: string,
): QueryDefinition {
  return {
    sql: `
      with deduped as (
        select distinct
          Division as value,
          Division as label
        from ${getTableReference(projectId, dataset)}
        where Division is not null and trim(Division) != ''
      )
      select
        value,
        label,
        dense_rank() over (order by value) as sort_order
      from deduped
      order by sort_order, value
    `.trim(),
    params: {},
  };
}

export function getProbeTableLabel(dataset: string): string {
  return `${dataset}.${SOURCE_TABLE}`;
}
