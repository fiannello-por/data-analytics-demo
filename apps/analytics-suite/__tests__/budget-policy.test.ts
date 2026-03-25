import { describe, expect, it } from 'vitest';

import {
  createSuiteBudgetTracker,
  suiteBudgetPolicies,
} from '@/lib/suite/budgets';
import { dashboardModules } from '@/lib/suite/modules';

describe('suite dashboard budget policies', () => {
  it('declares a budget policy for every dashboard module', () => {
    expect(
      dashboardModules.map((module) => module.budgetPolicy.dashboardId),
    ).toEqual(['sales-performance', 'pipeline-health']);
    expect(
      suiteBudgetPolicies['sales-performance'].maxQueryCount,
    ).toBeGreaterThan(0);
  });

  it('produces soft isolation states from shared runtime telemetry', () => {
    const tracker = createSuiteBudgetTracker();

    tracker.record('sales-performance', {
      queryCount: 1,
      bytesProcessed: 320,
      compileDurationMs: 25,
      executionDurationMs: 90,
      cacheStatus: 'miss',
    });
    const report = tracker.record('sales-performance', {
      queryCount: 1,
      bytesProcessed: 360,
      compileDurationMs: 20,
      executionDurationMs: 95,
      cacheStatus: 'miss',
    });

    expect(report.status).toBe('warning');
    expect(report.telemetry.queryCount).toBe(2);
    expect(report.telemetry.cacheMisses).toBe(2);
  });
});
