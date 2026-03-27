import { describe, expect, it } from 'vitest';

import {
  createDashboardBudgetTracker,
  evaluateDashboardBudget,
  type DashboardBudgetPolicy,
} from '../src';

describe('dashboard budget policies', () => {
  const policy: DashboardBudgetPolicy = {
    dashboardId: 'sales-performance',
    maxQueryCount: 4,
    targetBytesProcessed: 1000,
    targetExecutionDurationMs: 200,
    warningRatio: 0.75,
    degradeThresholds: {
      queryCount: 5,
      bytesProcessed: 1400,
      executionDurationMs: 260,
    },
  };

  it('evaluates warning and degrade states from aggregated telemetry', () => {
    const warning = evaluateDashboardBudget(policy, {
      dashboardId: 'sales-performance',
      queryCount: 3,
      bytesProcessed: 900,
      executionDurationMs: 140,
      compileDurationMs: 40,
      cacheHits: 1,
      cacheMisses: 2,
    });
    const degrade = evaluateDashboardBudget(policy, {
      dashboardId: 'sales-performance',
      queryCount: 5,
      bytesProcessed: 1500,
      executionDurationMs: 280,
      compileDurationMs: 60,
      cacheHits: 0,
      cacheMisses: 5,
    });

    expect(warning.status).toBe('warning');
    expect(warning.reasons).toContain(
      'query count is near its configured budget',
    );
    expect(degrade.status).toBe('degrade');
    expect(degrade.reasons).toContain(
      'query count crossed the degrade threshold',
    );
  });

  it('tracks query count, bytes, and execution time per dashboard', () => {
    const tracker = createDashboardBudgetTracker([policy]);

    const first = tracker.record('sales-performance', {
      queryCount: 1,
      bytesProcessed: 300,
      compileDurationMs: 15,
      executionDurationMs: 40,
      cacheStatus: 'miss',
    });
    const second = tracker.record('sales-performance', {
      queryCount: 1,
      bytesProcessed: 500,
      compileDurationMs: 10,
      executionDurationMs: 80,
      cacheStatus: 'hit',
    });

    expect(first.telemetry).toMatchObject({
      queryCount: 1,
      bytesProcessed: 300,
      executionDurationMs: 40,
      cacheHits: 0,
      cacheMisses: 1,
    });
    expect(second.telemetry).toMatchObject({
      queryCount: 2,
      bytesProcessed: 800,
      executionDurationMs: 120,
      cacheHits: 1,
      cacheMisses: 1,
    });
    expect(tracker.getReport('sales-performance')?.status).toBe('warning');
  });
});
