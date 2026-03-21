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
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20
),
formatted as (
  select
    *,
    case
      when agg_type = 'pacing'
        then current_numerator * 365.0 / nullif(extract(dayofyear from current_date()), 0)
      when agg_type in ('ratio_pct', 'ratio_days', 'ratio_usd')
        then safe_divide(current_numerator, current_denominator)
      else current_numerator
    end as current_value,
    case
      when agg_type = 'pacing'
        then previous_numerator * 365.0 / nullif(extract(dayofyear from current_date()), 0)
      when agg_type in ('ratio_pct', 'ratio_days', 'ratio_usd')
        then safe_divide(previous_numerator, previous_denominator)
      else previous_numerator
    end as previous_value
  from aggregated
)
select
  *,
  case
    when agg_type = 'pacing' then concat('$', format("%'.2f", current_value / 1000.0), 'K')
    when agg_type = 'usd' then concat('$', format("%'.2f", current_numerator / 1000.0), 'K')
    when agg_type = 'ratio_days' then cast(round(current_value) as string)
    when agg_type = 'ratio_usd' then concat('$', format("%'.2f", current_value / 1000.0), 'K')
    when agg_type = 'ratio_pct'
      then concat(format('%.1f', current_value * 100), '%')
    else format("%'.0f", current_numerator)
  end as current_period,
  case
    when agg_type = 'pacing' then concat('$', format("%'.2f", previous_value / 1000.0), 'K')
    when agg_type = 'usd' then concat('$', format("%'.2f", previous_numerator / 1000.0), 'K')
    when agg_type = 'ratio_days' then cast(round(previous_value) as string)
    when agg_type = 'ratio_usd' then concat('$', format("%'.2f", previous_value / 1000.0), 'K')
    when agg_type = 'ratio_pct'
      then concat(format('%.1f', previous_value * 100), '%')
    else format("%'.0f", previous_numerator)
  end as previous_period,
  case
    when current_value is null or previous_value is null or previous_value = 0 then '-'
    else concat(
      case when current_value > previous_value then '+' else '' end,
      format('%.1f', ((current_value - previous_value) / abs(previous_value)) * 100),
      '%'
    )
  end as pct_change
from formatted
