export type SemanticSystemModule = {
  id: string;
  title: string;
  registryItems: string[];
};

export type SemanticRuntimeStage = {
  id: string;
  title: string;
  description: string;
};

export const semanticSystemModules: SemanticSystemModule[] = [
  {
    id: 'sales-performance',
    title: 'Sales Performance module',
    registryItems: [
      'Overview board query set',
      'Trend query set',
      'Closed won opportunities query set',
      'Filter dictionary queries',
    ],
  },
  {
    id: 'pipeline-health',
    title: 'Pipeline Health module',
    registryItems: ['Pipeline health summary query set'],
  },
];

export const semanticRuntimeStages: SemanticRuntimeStage[] = [
  {
    id: 'compile',
    title: 'Lightdash compile',
    description:
      'Turns semantic intent into compiled SQL while preserving the shared business vocabulary.',
  },
  {
    id: 'execute',
    title: 'BigQuery execute',
    description:
      'Runs the compiled SQL directly against app-serving entities in scorecard_test.',
  },
  {
    id: 'normalize',
    title: 'Result normalization',
    description:
      'Maps raw rows into typed metric payloads, cache metadata, and budget-aware runtime telemetry.',
  },
];

export const servingEntities = [
  'scorecard_test.sales_dashboard_v2_opportunity_base',
  'scorecard_test.sales_dashboard_v2_closed_won_opportunities',
];

export const sourceEntities = ['sfdc.OpportunityViewTable'];
