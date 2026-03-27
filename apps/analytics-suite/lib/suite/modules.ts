import type { DashboardModule } from '@/lib/suite/contracts';
import { pipelineHealthModule } from '@/dashboards/pipeline-health/module';
import { salesPerformanceModule } from '@/dashboards/sales-performance/module';

export const dashboardModules = [
  salesPerformanceModule,
  pipelineHealthModule,
] as const satisfies readonly DashboardModule[];

export function getDashboardModule(
  id: DashboardModule['id'],
): DashboardModule | undefined {
  return dashboardModules.find((module) => module.id === id);
}
