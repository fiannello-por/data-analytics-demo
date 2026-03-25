import * as React from 'react';

import { SuiteShell } from '@/components/suite-shell';
import { PlatformReportCard } from '@/components/platform/platform-report-card';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
        <Card>
          <CardHeader>
            <CardDescription className="text-sm font-medium uppercase tracking-[0.22em]">
              Platform reporting
            </CardDescription>
            <CardTitle className="text-3xl">
              Shared runtime health across dashboards
            </CardTitle>
            <CardDescription className="mt-1 max-w-3xl">
            The suite reports budget posture, cache effectiveness, and cost-shaped
            telemetry per dashboard so a noisy module does not become invisible
            inside the shared platform.
            </CardDescription>
          </CardHeader>
        </Card>

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
