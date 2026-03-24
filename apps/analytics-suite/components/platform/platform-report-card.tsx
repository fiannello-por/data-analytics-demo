import * as React from 'react';
import type { DashboardBudgetReport } from '@por/analytics-adapter';

import { getCacheHitRate } from '@/lib/suite/platform-report';

type PlatformReportCardProps = {
  title: string;
  report: DashboardBudgetReport;
};

export function PlatformReportCard({
  title,
  report,
}: PlatformReportCardProps) {
  const cacheHitRate = getCacheHitRate(report);

  return (
    <article className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted">
            {title}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            {report.status === 'healthy'
              ? 'Healthy'
              : report.status === 'warning'
                ? 'Warning'
                : 'Degrade'}
          </h2>
        </div>
        <span className="rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted">
          {report.status}
        </span>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <dt className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
            Query count
          </dt>
          <dd className="mt-1 text-lg font-semibold">
            {report.telemetry.queryCount}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
            Bytes processed
          </dt>
          <dd className="mt-1 text-lg font-semibold">
            {report.telemetry.bytesProcessed.toLocaleString()}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
            Execution time
          </dt>
          <dd className="mt-1 text-lg font-semibold">
            {report.telemetry.executionDurationMs} ms
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
            Cache hit rate
          </dt>
          <dd className="mt-1 text-lg font-semibold">
            {Math.round(cacheHitRate * 100)}%
          </dd>
        </div>
      </dl>

      <div className="mt-6 space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
          Reasons
        </p>
        <ul className="space-y-2 text-sm leading-6 text-muted">
          {report.reasons.length > 0 ? (
            report.reasons.map((reason) => <li key={reason}>• {reason}</li>)
          ) : (
            <li>• Operating comfortably inside the declared budget.</li>
          )}
        </ul>
      </div>
    </article>
  );
}
