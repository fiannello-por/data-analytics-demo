import { GLOBAL_FILTER_KEYS, type GlobalFilterKey } from '@/lib/dashboard/catalog';

export const DATE_RANGE_FILTER_LABEL = 'Date Range';

export type DashboardFilterDefinition = {
  key: GlobalFilterKey;
  label: GlobalFilterKey;
  fieldId: string;
  type: 'string' | 'boolean';
  multiSelect: true;
};

export const DASHBOARD_FILTER_DEFINITIONS: readonly DashboardFilterDefinition[] = [
  { key: 'Division', label: 'Division', fieldId: 'scorecard_daily_Division', type: 'string', multiSelect: true },
  { key: 'Owner', label: 'Owner', fieldId: 'scorecard_daily_Owner', type: 'string', multiSelect: true },
  { key: 'Segment', label: 'Segment', fieldId: 'scorecard_daily_OpportunitySegment', type: 'string', multiSelect: true },
  { key: 'Region', label: 'Region', fieldId: 'scorecard_daily_Queue_Region__c', type: 'string', multiSelect: true },
  { key: 'SE', label: 'SE', fieldId: 'scorecard_daily_SE', type: 'string', multiSelect: true },
  { key: 'Booking Plan Opp Type', label: 'Booking Plan Opp Type', fieldId: 'scorecard_daily_BookingPlanOppType2025', type: 'string', multiSelect: true },
  { key: 'Product Family', label: 'Product Family', fieldId: 'scorecard_daily_ProductFamily', type: 'string', multiSelect: true },
  { key: 'SDR Source', label: 'SDR Source', fieldId: 'scorecard_daily_SDRSource', type: 'string', multiSelect: true },
  { key: 'SDR', label: 'SDR', fieldId: 'scorecard_daily_SDR', type: 'string', multiSelect: true },
  { key: 'POR v R360', label: 'POR v R360', fieldId: 'scorecard_daily_OppRecordType', type: 'string', multiSelect: true },
  { key: 'Account Owner', label: 'Account Owner', fieldId: 'scorecard_daily_AccountOwner', type: 'string', multiSelect: true },
  { key: 'Owner Department', label: 'Owner Department', fieldId: 'scorecard_daily_OwnerDepartment', type: 'string', multiSelect: true },
  { key: 'Strategic Filter', label: 'Strategic Filter', fieldId: 'scorecard_daily_StrategicFilter', type: 'boolean', multiSelect: true },
  { key: 'Accepted', label: 'Accepted', fieldId: 'scorecard_daily_Accepted', type: 'boolean', multiSelect: true },
  { key: 'Gate 1 Criteria Met', label: 'Gate 1 Criteria Met', fieldId: 'scorecard_daily_Gate1CriteriaMet', type: 'boolean', multiSelect: true },
  { key: 'Gate Met or Accepted', label: 'Gate Met or Accepted', fieldId: 'scorecard_daily_GateMetOrAccepted', type: 'boolean', multiSelect: true },
] as const;

const FILTER_KEY_SET = new Set<string>(GLOBAL_FILTER_KEYS);

export function isGlobalFilterKey(value: string): value is GlobalFilterKey {
  return FILTER_KEY_SET.has(value);
}

export function getDashboardFilterDefinition(
  key: GlobalFilterKey,
): DashboardFilterDefinition {
  const definition = DASHBOARD_FILTER_DEFINITIONS.find((item) => item.key === key);
  if (!definition) {
    throw new Error(`Unknown dashboard filter: ${key}`);
  }
  return definition;
}
