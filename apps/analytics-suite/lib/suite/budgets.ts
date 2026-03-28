import {
  createDashboardBudgetTracker,
  type DashboardBudgetPolicy,
} from '@por/semantic-runtime';

export const suiteBudgetPolicies: Record<string, DashboardBudgetPolicy> = {
  'sales-performance': {
    dashboardId: 'sales-performance',
    maxQueryCount: 2,
    targetBytesProcessed: 600,
    targetExecutionDurationMs: 150,
    warningRatio: 0.75,
    degradeThresholds: {
      queryCount: 3,
      bytesProcessed: 900,
      executionDurationMs: 260,
    },
  },
  'pipeline-health': {
    dashboardId: 'pipeline-health',
    maxQueryCount: 3,
    targetBytesProcessed: 1200,
    targetExecutionDurationMs: 220,
    warningRatio: 0.75,
    degradeThresholds: {
      queryCount: 4,
      bytesProcessed: 1800,
      executionDurationMs: 320,
    },
  },
};

export function createSuiteBudgetTracker() {
  return createDashboardBudgetTracker(Object.values(suiteBudgetPolicies));
}
