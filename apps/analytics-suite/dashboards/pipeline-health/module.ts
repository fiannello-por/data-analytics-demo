import type { DashboardModule } from '@/lib/suite/contracts';
import { pipelineHealthRegistry } from '@/dashboards/pipeline-health/registry';
import { pipelineHealthMapperNotes } from '@/dashboards/pipeline-health/mappers';
import { suiteBudgetPolicies } from '@/lib/suite/budgets';

export const pipelineHealthModule = {
  id: 'pipeline-health',
  title: 'Pipeline Health',
  description:
    'Dummy dashboard module that exists to prove the multi-dashboard suite and local-registry pattern.',
  href: '/dashboards/pipeline-health',
  status: 'demo',
  registry: pipelineHealthRegistry,
  budgetPolicy: suiteBudgetPolicies['pipeline-health'],
  highlights: pipelineHealthMapperNotes,
} satisfies DashboardModule;
