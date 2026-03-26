import * as React from 'react';

import { DashboardModulesTable } from '@/components/homepage/dashboard-modules-table';
import { SuiteShell } from '@/components/suite-shell';
import { getHomepageModuleRow } from '@/lib/suite/homepage-metadata';
import { dashboardModules } from '@/lib/suite/modules';

export default function HomePage() {
  const rows = dashboardModules.map(getHomepageModuleRow);

  return (
    <SuiteShell headerVariant="compact">
      <section className="space-y-4">
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Homepage registry
          </p>
          <h1 className="font-heading text-2xl font-medium">Dashboard registry</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Shared suite navigation stays in the shell. Ownership, release state,
            and changelog access live here so teams can scan the active dashboard
            surface quickly.
          </p>
        </div>

        <DashboardModulesTable rows={rows} />
      </section>
    </SuiteShell>
  );
}
