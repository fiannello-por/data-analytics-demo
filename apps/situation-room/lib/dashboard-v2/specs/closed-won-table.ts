import type { TableTileSpec } from '@por/dashboard-spec';

export const closedWonOpportunitiesTableSpec = {
  id: 'closed_won_opportunities_table',
  kind: 'table',
  title: 'Closed Won Opportunities',
  description: 'Current-period closed won opportunities',
  data: {
    kind: 'binding',
    key: 'closedWonOpportunities',
  },
  visualization: {
    type: 'table',
    columns: [
      { field: 'accountName', label: 'Account' },
      { field: 'opportunityName', label: 'Opportunity' },
      { field: 'closeDate', label: 'Close Date' },
      { field: 'createdDate', label: 'Created Date' },
      { field: 'division', label: 'Division' },
      { field: 'type', label: 'Type' },
      { field: 'productFamily', label: 'Product' },
      {
        field: 'bookingPlanOppType2025',
        label: 'Booking Plan Opp Type 2025',
      },
      { field: 'owner', label: 'Owner' },
      { field: 'sdr', label: 'SDR' },
      { field: 'oppRecordType', label: 'POR / R360' },
      { field: 'age', label: 'Age' },
      { field: 'se', label: 'SE' },
      { field: 'quarter', label: 'Quarter' },
      { field: 'contractStartDate', label: 'Contract Start Date' },
      { field: 'users', label: 'Users' },
      { field: 'acv', label: 'ACV $' },
    ],
  },
} satisfies TableTileSpec;
