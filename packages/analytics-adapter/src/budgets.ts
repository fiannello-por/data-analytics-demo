import type { SemanticExecutionMeta } from './types';

export type DashboardBudgetStatus = 'healthy' | 'warning' | 'degrade';

export type DashboardBudgetPolicy = {
  dashboardId: string;
  maxQueryCount: number;
  targetBytesProcessed: number;
  targetExecutionDurationMs: number;
  warningRatio?: number;
  degradeThresholds?: Partial<{
    queryCount: number;
    bytesProcessed: number;
    executionDurationMs: number;
  }>;
};

export type DashboardBudgetTelemetry = {
  dashboardId: string;
  queryCount: number;
  bytesProcessed: number;
  executionDurationMs: number;
  compileDurationMs: number;
  cacheHits: number;
  cacheMisses: number;
};

export type DashboardBudgetReport = {
  policy: DashboardBudgetPolicy;
  telemetry: DashboardBudgetTelemetry;
  status: DashboardBudgetStatus;
  reasons: string[];
};

export type DashboardBudgetObservation = Pick<
  SemanticExecutionMeta,
  | 'queryCount'
  | 'bytesProcessed'
  | 'compileDurationMs'
  | 'executionDurationMs'
  | 'cacheStatus'
>;

export type DashboardBudgetTracker = {
  record(
    dashboardId: string,
    observation: DashboardBudgetObservation,
  ): DashboardBudgetReport;
  getReport(dashboardId: string): DashboardBudgetReport | undefined;
  getReports(): DashboardBudgetReport[];
};

function createEmptyTelemetry(dashboardId: string): DashboardBudgetTelemetry {
  return {
    dashboardId,
    queryCount: 0,
    bytesProcessed: 0,
    executionDurationMs: 0,
    compileDurationMs: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };
}

export function evaluateDashboardBudget(
  policy: DashboardBudgetPolicy,
  telemetry: DashboardBudgetTelemetry,
): DashboardBudgetReport {
  const telemetrySnapshot = { ...telemetry };
  const warningRatio = policy.warningRatio ?? 0.8;
  const reasons: string[] = [];
  const degradeReasons: string[] = [];

  const degradeThresholds = {
    queryCount: policy.degradeThresholds?.queryCount ?? policy.maxQueryCount,
    bytesProcessed:
      policy.degradeThresholds?.bytesProcessed ?? policy.targetBytesProcessed,
    executionDurationMs:
      policy.degradeThresholds?.executionDurationMs ??
      policy.targetExecutionDurationMs,
  };

  if (telemetrySnapshot.queryCount >= degradeThresholds.queryCount) {
    degradeReasons.push('query count crossed the degrade threshold');
  } else if (
    telemetrySnapshot.queryCount >=
    policy.maxQueryCount * warningRatio
  ) {
    reasons.push('query count is near its configured budget');
  }

  if (telemetrySnapshot.bytesProcessed >= degradeThresholds.bytesProcessed) {
    degradeReasons.push('bytes processed crossed the degrade threshold');
  } else if (
    telemetrySnapshot.bytesProcessed >=
    policy.targetBytesProcessed * warningRatio
  ) {
    reasons.push('bytes processed is near its configured budget');
  }

  if (
    telemetrySnapshot.executionDurationMs >=
    degradeThresholds.executionDurationMs
  ) {
    degradeReasons.push('execution time crossed the degrade threshold');
  } else if (
    telemetrySnapshot.executionDurationMs >=
    policy.targetExecutionDurationMs * warningRatio
  ) {
    reasons.push('execution time is near its configured budget');
  }

  return {
    policy,
    telemetry: telemetrySnapshot,
    status:
      degradeReasons.length > 0
        ? 'degrade'
        : reasons.length > 0
          ? 'warning'
          : 'healthy',
    reasons: [...degradeReasons, ...reasons],
  };
}

export function createDashboardBudgetTracker(
  policies: DashboardBudgetPolicy[],
): DashboardBudgetTracker {
  const policyByDashboardId = new Map(
    policies.map((policy) => [policy.dashboardId, policy]),
  );
  const telemetryByDashboardId = new Map<string, DashboardBudgetTelemetry>();

  const getPolicy = (dashboardId: string): DashboardBudgetPolicy => {
    const policy = policyByDashboardId.get(dashboardId);
    if (!policy) {
      throw new Error(
        `No dashboard budget policy exists for "${dashboardId}".`,
      );
    }

    return policy;
  };

  return {
    record(dashboardId, observation) {
      const telemetry =
        telemetryByDashboardId.get(dashboardId) ??
        createEmptyTelemetry(dashboardId);

      telemetry.queryCount += observation.queryCount;
      telemetry.bytesProcessed += observation.bytesProcessed ?? 0;
      telemetry.compileDurationMs += observation.compileDurationMs;
      telemetry.executionDurationMs += observation.executionDurationMs;

      if (observation.cacheStatus === 'hit') {
        telemetry.cacheHits += 1;
      } else if (observation.cacheStatus === 'miss') {
        telemetry.cacheMisses += 1;
      }

      telemetryByDashboardId.set(dashboardId, telemetry);
      return evaluateDashboardBudget(getPolicy(dashboardId), telemetry);
    },

    getReport(dashboardId) {
      const telemetry = telemetryByDashboardId.get(dashboardId);
      if (!telemetry) {
        return undefined;
      }

      return evaluateDashboardBudget(getPolicy(dashboardId), telemetry);
    },

    getReports() {
      return [...telemetryByDashboardId.entries()].map(
        ([dashboardId, telemetry]) =>
          evaluateDashboardBudget(getPolicy(dashboardId), telemetry),
      );
    },
  };
}
