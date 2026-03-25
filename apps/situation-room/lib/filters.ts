import {
  FILTER_KEYS,
  type FilterKey,
  type ScorecardFilters,
} from '@/lib/contracts';

export interface FilterDefinition {
  key: FilterKey;
  label: string;
  fieldId: string;
  type: 'string' | 'boolean' | 'date';
}

export const FILTER_DEFINITIONS: FilterDefinition[] = [
  {
    key: 'DateRange',
    label: 'Date Range',
    fieldId: 'scorecard_daily_report_date',
    type: 'date',
  },
  {
    key: 'Division',
    label: 'Division',
    fieldId: 'scorecard_daily_Division',
    type: 'string',
  },
  {
    key: 'Owner',
    label: 'Owner',
    fieldId: 'scorecard_daily_Owner',
    type: 'string',
  },
  {
    key: 'Segment',
    label: 'Segment',
    fieldId: 'scorecard_daily_OpportunitySegment',
    type: 'string',
  },
  {
    key: 'Region',
    label: 'Region',
    fieldId: 'scorecard_daily_Queue_Region__c',
    type: 'string',
  },
  { key: 'SE', label: 'SE', fieldId: 'scorecard_daily_SE', type: 'string' },
  {
    key: 'BookingPlanOppType',
    label: 'Booking Plan Opp Type',
    fieldId: 'scorecard_daily_BookingPlanOppType2025',
    type: 'string',
  },
  {
    key: 'ProductFamily',
    label: 'Product Family',
    fieldId: 'scorecard_daily_ProductFamily',
    type: 'string',
  },
  {
    key: 'SDRSource',
    label: 'SDR Source',
    fieldId: 'scorecard_daily_SDRSource',
    type: 'string',
  },
  { key: 'SDR', label: 'SDR', fieldId: 'scorecard_daily_SDR', type: 'string' },
  {
    key: 'OppRecordType',
    label: 'POR v R360',
    fieldId: 'scorecard_daily_OppRecordType',
    type: 'string',
  },
  {
    key: 'AccountOwner',
    label: 'Account Owner',
    fieldId: 'scorecard_daily_AccountOwner',
    type: 'string',
  },
  {
    key: 'OwnerDepartment',
    label: 'Owner Department',
    fieldId: 'scorecard_daily_OwnerDepartment',
    type: 'string',
  },
  {
    key: 'StrategicFilter',
    label: 'Strategic Filter',
    fieldId: 'scorecard_daily_StrategicFilter',
    type: 'boolean',
  },
  {
    key: 'Accepted',
    label: 'Accepted',
    fieldId: 'scorecard_daily_Accepted',
    type: 'boolean',
  },
  {
    key: 'Gate1CriteriaMet',
    label: 'Gate 1 Criteria Met',
    fieldId: 'scorecard_daily_Gate1CriteriaMet',
    type: 'boolean',
  },
  {
    key: 'GateMetOrAccepted',
    label: 'Gate Met or Accepted',
    fieldId: 'scorecard_daily_GateMetOrAccepted',
    type: 'boolean',
  },
];

const VALID_KEYS = new Set<FilterKey>(FILTER_KEYS);

function isFilterKey(key: string): key is FilterKey {
  return VALID_KEYS.has(key as FilterKey);
}

export function parseFilterParams(
  params: Record<string, string | undefined>,
): ScorecardFilters {
  const result: ScorecardFilters = {};
  for (const [key, value] of Object.entries(params)) {
    if (!isFilterKey(key) || !value) continue;
    result[key] = value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return result;
}
