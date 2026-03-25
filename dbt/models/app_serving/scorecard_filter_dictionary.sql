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
