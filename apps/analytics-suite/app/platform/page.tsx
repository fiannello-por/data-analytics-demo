import * as React from 'react';

import { SuiteShell } from '@/components/suite-shell';
import { PlatformReportCard } from '@/components/platform/platform-report-card';
import { dashboardModules } from '@/lib/suite/modules';
import { getPlatformReports } from '@/lib/suite/platform-report';

export default async function PlatformPage() {
  const reports = getPlatformReports();
  const titles = Object.fromEntries(
    dashboardModules.map((module) => [module.id, module.title]),
  );

  return (
    <SuiteShell activeSection="platform">
      <section className="space-y-6">
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted">
            Platform reporting
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Shared runtime health across dashboards
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            The suite reports budget posture, cache effectiveness, and cost-shaped
            telemetry per dashboard so a noisy module does not become invisible
            inside the shared platform.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {reports.map((report) => (
            <PlatformReportCard
              key={report.policy.dashboardId}
              title={titles[report.policy.dashboardId] ?? report.policy.dashboardId}
              report={report}
            />
          ))}
        </div>
      </section>
    </SuiteShell>
  );
}
