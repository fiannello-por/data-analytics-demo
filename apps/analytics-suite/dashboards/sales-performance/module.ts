import type { DashboardModule } from '@/lib/suite/contracts';
import { salesPerformanceRegistry } from '@/dashboards/sales-performance/registry';
import { salesPerformanceMapperNotes } from '@/dashboards/sales-performance/mappers';
import { suiteBudgetPolicies } from '@/lib/suite/budgets';

export const salesPerformanceModule = {
  id: 'sales-performance',
  title: 'Sales Performance',
  description:
    'Production-grade scorecard dashboard backed by the Lightdash semantic layer and BigQuery execution.',
  href: '/dashboards/sales-performance',
  status: 'active',
  registry: salesPerformanceRegistry,
  budgetPolicy: suiteBudgetPolicies['sales-performance'],
  highlights: salesPerformanceMapperNotes,
} satisfies DashboardModule;
