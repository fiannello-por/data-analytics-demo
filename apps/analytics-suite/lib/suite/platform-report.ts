import type { DashboardBudgetObservation, DashboardBudgetReport } from '@por/analytics-adapter';
import { createSuiteBudgetTracker } from '@/lib/suite/budgets';

const seededObservations: Record<string, DashboardBudgetObservation[]> = {
  'sales-performance': [
    {
      queryCount: 1,
      bytesProcessed: 240,
      compileDurationMs: 20,
      executionDurationMs: 68,
      cacheStatus: 'miss',
    },
    {
      queryCount: 1,
      bytesProcessed: 0,
      compileDurationMs: 0,
      executionDurationMs: 0,
      cacheStatus: 'hit',
    },
  ],
  'pipeline-health': [
    {
      queryCount: 1,
      bytesProcessed: 380,
      compileDurationMs: 24,
      executionDurationMs: 92,
      cacheStatus: 'miss',
    },
    {
      queryCount: 1,
      bytesProcessed: 410,
      compileDurationMs: 19,
      executionDurationMs: 84,
      cacheStatus: 'miss',
    },
  ],
};

export function getPlatformReports(): DashboardBudgetReport[] {
  const tracker = createSuiteBudgetTracker();

  Object.entries(seededObservations).forEach(([dashboardId, observations]) => {
    observations.forEach((observation) => {
      tracker.record(dashboardId, observation);
    });
  });

  return tracker.getReports();
}

export function getCacheHitRate(report: DashboardBudgetReport): number {
  const total = report.telemetry.cacheHits + report.telemetry.cacheMisses;
  if (total === 0) {
    return 0;
  }

  return report.telemetry.cacheHits / total;
}
