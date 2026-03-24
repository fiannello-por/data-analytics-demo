with source_rows as (
  select
    Id as opportunity_id,
    AccountName as account_name,
    AccountLink as account_link,
    OpportunityName as opportunity_name,
    OpportunityLink as opportunity_link,
    date(CloseDate) as close_date,
    date(CreatedDate) as created_date,
    date(contract_start_date__c) as contract_start_date,
    date(PipelineStartDate) as pipeline_start_date,
    date(sales_qualified_date__c) as sales_qualified_date,
    date(ExpansionQualifiedDate) as expansion_qualified_date,
    date(Gate1CompletedDate) as gate1_completed_date,
    date(ExpansionSubmittedDate) as expansion_submitted_date,
    case
      when Type = 'New Business' then 'New Logo'
      when Type = 'Existing Business' then 'Expansion'
      when Type = 'Migration' then 'Migration'
      when Type = 'Renewal' then 'Renewal'
      else null
    end as dashboard_category,
    Division as division,
    Type as type,
    ProductFamily as product_family,
    BookingPlanOppType2025 as booking_plan_opp_type_2025,
    Owner as owner,
    SDR as sdr,
    OppRecordType as opp_record_type,
    SE as se,
    SDRSource as sdr_source,
    OpportunitySegment as opportunity_segment,
    Queue_Region__c as region,
    AccountOwner as account_owner,
    OwnerDepartment as owner_department,
    StageName as stage_name,
    coalesce(cast(StrategicFilter as bool), false) as strategic_filter,
    coalesce(cast(Gate1CriteriaMet as bool), false) as gate1_criteria_met,
    coalesce(cast(Won as bool), false) as won,
    coalesce(cast(Accepted as bool), false) as accepted,
    coalesce(cast(isclosed as bool), false) as is_closed,
    coalesce(cast(AE_Rejected as bool), false) as ae_rejected,
    coalesce(cast(ExpansionOpp as bool), false) as expansion_opp,
    coalesce(cast(ExpansionQualified as bool), false) as expansion_qualified,
    coalesce(cast(ExpansionSubmitted as bool), false) as expansion_submitted,
    coalesce(cast(MigrationOpp as bool), false) as migration_opp,
    cast(Age__c as float64) as age_days,
    cast(ACV as float64) as acv,
    cast(HardImpValueUSD as float64) as hard_imp_value_usd,
    cast(SDR_Points as float64) as sdr_points,
    cast(Users as float64) as users,
    concat(
      cast(extract(year from CloseDate) as string),
      '-Q',
      cast(extract(quarter from CloseDate) as string)
    ) as quarter_label
  from {{ source('salesforce', 'OpportunityViewTable') }}
)
select
  *,
  (gate1_criteria_met or accepted) as gate_met_or_accepted
from source_rows
where dashboard_category is not null
