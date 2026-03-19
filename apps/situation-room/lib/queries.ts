import type { Category, LightdashFilterRule } from './types';

export const CATEGORIES: Category[] = [
  'New Logo',
  'Expansion',
  'Migration',
  'Renewal',
  'Total',
];

const FILTER_FIELD_MAP: Record<string, string> = {
  Division: 'scorecard_daily_Division',
  Owner: 'scorecard_daily_Owner',
  Segment: 'scorecard_daily_OpportunitySegment',
  Region: 'scorecard_daily_Queue_Region__c',
  SE: 'scorecard_daily_SE',
  BookingPlanOppType: 'scorecard_daily_BookingPlanOppType2025',
  ProductFamily: 'scorecard_daily_ProductFamily',
  SDRSource: 'scorecard_daily_SDRSource',
  SDR: 'scorecard_daily_SDR',
  OppRecordType: 'scorecard_daily_OppRecordType',
  AccountOwner: 'scorecard_daily_AccountOwner',
  OwnerDepartment: 'scorecard_daily_OwnerDepartment',
  StrategicFilter: 'scorecard_daily_StrategicFilter',
  Accepted: 'scorecard_daily_Accepted',
  Gate1CriteriaMet: 'scorecard_daily_Gate1CriteriaMet',
  GateMetOrAccepted: 'scorecard_daily_GateMetOrAccepted',
};

export function buildCategoryFilters(
  category: Category,
  activeFilters: Record<string, string[]>,
): { id: string; and: LightdashFilterRule[] } {
  const rules: LightdashFilterRule[] = [
    {
      id: 'category-filter',
      target: { fieldId: 'scorecard_daily_category' },
      operator: 'equals',
      values: [category],
    },
    {
      id: 'date-filter',
      target: { fieldId: 'scorecard_daily_report_date' },
      operator: 'inTheCurrent',
      values: [1],
      settings: { unitOfTime: 'years' },
    },
  ];

  for (const [key, values] of Object.entries(activeFilters)) {
    if (values.length === 0) continue;
    const fieldId = FILTER_FIELD_MAP[key];
    if (!fieldId) continue;
    rules.push({
      id: `filter-${key}`,
      target: { fieldId },
      operator: 'equals',
      values,
    });
  }

  return { id: 'root', and: rules };
}
