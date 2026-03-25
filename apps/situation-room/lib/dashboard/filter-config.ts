import {
  GLOBAL_FILTER_KEYS,
  type GlobalFilterKey,
} from '@/lib/dashboard/catalog';

export const DATE_RANGE_FILTER_LABEL = 'Date Range';

export type DashboardFilterDefinition = {
  key: GlobalFilterKey;
  label: GlobalFilterKey;
  description: string;
  fieldId: string;
  type: 'string' | 'boolean';
  multiSelect: true;
};

export const DASHBOARD_FILTER_DEFINITIONS: readonly DashboardFilterDefinition[] =
  [
    {
      key: 'Division',
      label: 'Division',
      description:
        'Groups metrics by the commercial division assigned to the opportunity.',
      fieldId: 'scorecard_daily_Division',
      type: 'string',
      multiSelect: true,
    },
    {
      key: 'Owner',
      label: 'Owner',
      description:
        'Filters by the opportunity owner currently responsible for the record.',
      fieldId: 'scorecard_daily_Owner',
      type: 'string',
      multiSelect: true,
    },
    {
      key: 'Segment',
      label: 'Segment',
      description:
        'Limits results to the selected opportunity segment classification.',
      fieldId: 'scorecard_daily_OpportunitySegment',
      type: 'string',
      multiSelect: true,
    },
    {
      key: 'Region',
      label: 'Region',
      description:
        'Scopes the dashboard to the queue region associated with each opportunity.',
      fieldId: 'scorecard_daily_Queue_Region__c',
      type: 'string',
      multiSelect: true,
    },
    {
      key: 'SE',
      label: 'SE',
      description: 'Filters opportunities by assigned solutions engineer.',
      fieldId: 'scorecard_daily_SE',
      type: 'string',
      multiSelect: true,
    },
    {
      key: 'Booking Plan Opp Type',
      label: 'Booking Plan Opp Type',
      description:
        'Uses the 2025 booking plan opportunity type categorization.',
      fieldId: 'scorecard_daily_BookingPlanOppType2025',
      type: 'string',
      multiSelect: true,
    },
    {
      key: 'Product Family',
      label: 'Product Family',
      description: 'Limits metrics to the selected product family mix.',
      fieldId: 'scorecard_daily_ProductFamily',
      type: 'string',
      multiSelect: true,
    },
    {
      key: 'SDR Source',
      label: 'SDR Source',
      description:
        'Filters by the SDR source attribution recorded on the opportunity.',
      fieldId: 'scorecard_daily_SDRSource',
      type: 'string',
      multiSelect: true,
    },
    {
      key: 'SDR',
      label: 'SDR',
      description:
        'Scopes results to the selected sales development representatives.',
      fieldId: 'scorecard_daily_SDR',
      type: 'string',
      multiSelect: true,
    },
    {
      key: 'POR v R360',
      label: 'POR v R360',
      description:
        'Filters by the opportunity record-type grouping used in POR versus R360 reporting.',
      fieldId: 'scorecard_daily_OppRecordType',
      type: 'string',
      multiSelect: true,
    },
    {
      key: 'Account Owner',
      label: 'Account Owner',
      description:
        'Limits results to the owner of the related customer account.',
      fieldId: 'scorecard_daily_AccountOwner',
      type: 'string',
      multiSelect: true,
    },
    {
      key: 'Owner Department',
      label: 'Owner Department',
      description:
        'Filters by the department of the current opportunity owner.',
      fieldId: 'scorecard_daily_OwnerDepartment',
      type: 'string',
      multiSelect: true,
    },
    {
      key: 'Strategic Filter',
      label: 'Strategic Filter',
      description:
        'Includes only opportunities marked for the strategic-filter reporting cut.',
      fieldId: 'scorecard_daily_StrategicFilter',
      type: 'boolean',
      multiSelect: true,
    },
    {
      key: 'Accepted',
      label: 'Accepted',
      description:
        'Filters opportunities based on whether the accepted flag is set.',
      fieldId: 'scorecard_daily_Accepted',
      type: 'boolean',
      multiSelect: true,
    },
    {
      key: 'Gate 1 Criteria Met',
      label: 'Gate 1 Criteria Met',
      description: 'Filters opportunities based on Gate 1 criteria completion.',
      fieldId: 'scorecard_daily_Gate1CriteriaMet',
      type: 'boolean',
      multiSelect: true,
    },
    {
      key: 'Gate Met or Accepted',
      label: 'Gate Met or Accepted',
      description:
        'Includes opportunities that either met Gate 1 criteria or were accepted.',
      fieldId: 'scorecard_daily_GateMetOrAccepted',
      type: 'boolean',
      multiSelect: true,
    },
  ] as const;

const FILTER_KEY_SET = new Set<string>(GLOBAL_FILTER_KEYS);

export function isGlobalFilterKey(value: string): value is GlobalFilterKey {
  return FILTER_KEY_SET.has(value);
}

export function getDashboardFilterDefinition(
  key: GlobalFilterKey,
): DashboardFilterDefinition {
  const definition = DASHBOARD_FILTER_DEFINITIONS.find(
    (item) => item.key === key,
  );
  if (!definition) {
    throw new Error(`Unknown dashboard filter: ${key}`);
  }
  return definition;
}
