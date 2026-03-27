import type { DashboardRegistrySummary } from '@/lib/suite/contracts';

export const pipelineHealthRegistry: DashboardRegistrySummary = {
  models: ['sales_dashboard_v2_opportunity_base'],
  surfaces: [
    {
      id: 'pipeline-health-summary',
      label: 'Pipeline health summary',
      description:
        'Minimal demo dashboard that proves a second dashboard can live inside the same suite and declare its own semantic intent.',
      measures: ['pipeline_created', 'avg_quoted_deal', 'sql_count'],
      dimensions: ['created_date_week'],
      filters: ['division', 'region', 'owner'],
    },
  ],
};
