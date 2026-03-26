import type { DashboardRegistrySummary } from '@/lib/suite/contracts';

const DASHBOARD_V2_BASE_MODEL = 'sales_dashboard_v2_opportunity_base';
const DASHBOARD_V2_CLOSED_WON_MODEL = 'sales_dashboard_v2_closed_won';

export const salesPerformanceRegistry: DashboardRegistrySummary = {
  models: [DASHBOARD_V2_BASE_MODEL, DASHBOARD_V2_CLOSED_WON_MODEL],
  surfaces: [
    {
      id: 'overview-board',
      label: 'Overview board',
      description:
        'Cross-category board of scorecards used by the overview tab in the Sales Performance dashboard.',
      measures: [
        'bookings_amount',
        'bookings_count',
        'annual_pacing_ytd',
        'close_rate',
        'avg_age',
        'pipeline_created',
      ],
      filters: ['dashboard_category', 'division', 'region', 'owner'],
    },
    {
      id: 'tile-trend',
      label: 'Tile trend',
      description:
        'Selected-metric time series used by the detail view trend panel.',
      measures: ['bookings_amount', 'pipeline_created', 'avg_booked_deal'],
      dimensions: [
        'close_date_week',
        'created_date_week',
        'pipeline_start_date_week',
      ],
      filters: ['dashboard_category', 'division', 'region', 'owner'],
    },
    {
      id: 'closed-won-table',
      label: 'Closed won opportunities',
      description:
        'Opportunity-grain table used by the closed won section below the detail surface.',
      dimensions: [
        'account_name',
        'opportunity_name',
        'close_date',
        'users',
        'acv',
      ],
      filters: ['dashboard_category', 'division', 'region', 'owner'],
      measures: [],
    },
  ],
};
