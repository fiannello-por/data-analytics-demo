export const GLOBAL_FILTER_KEYS = [
  'Division',
  'Owner',
  'Segment',
  'Region',
  'SE',
  'Booking Plan Opp Type',
  'Product Family',
  'SDR Source',
  'SDR',
  'POR v R360',
  'Account Owner',
  'Owner Department',
  'Strategic Filter',
  'Accepted',
  'Gate 1 Criteria Met',
  'Gate Met or Accepted',
] as const;

export type GlobalFilterKey = (typeof GLOBAL_FILTER_KEYS)[number];

export const FILTER_DIMENSIONS: Record<GlobalFilterKey, string> = {
  Division: 'division',
  Owner: 'owner',
  Segment: 'opportunity_segment',
  Region: 'region',
  SE: 'se',
  'Booking Plan Opp Type': 'booking_plan_opp_type_2025',
  'Product Family': 'product_family',
  'SDR Source': 'sdr_source',
  SDR: 'sdr',
  'POR v R360': 'opp_record_type',
  'Account Owner': 'account_owner',
  'Owner Department': 'owner_department',
  'Strategic Filter': 'strategic_filter',
  Accepted: 'accepted',
  'Gate 1 Criteria Met': 'gate1_criteria_met',
  'Gate Met or Accepted': 'gate_met_or_accepted',
};