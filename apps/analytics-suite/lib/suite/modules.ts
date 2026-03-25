import type { DashboardModule } from '@/lib/suite/contracts';
import { pipelineHealthModule } from '@/dashboards/pipeline-health/module';
import { salesPerformanceModule } from '@/dashboards/sales-performance/module';

export const dashboardModules: DashboardModule[] = [
  salesPerformanceModule,
  pipelineHealthModule,
];

export function getDashboardModule(id: string): DashboardModule | undefined {
  return dashboardModules.find((module) => module.id === id);
}
