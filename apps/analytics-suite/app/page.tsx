import * as React from 'react';

import { DashboardModulesTable } from '@/components/homepage/dashboard-modules-table';
import {
  getHomepageModuleRow,
  homepageDummyRows,
} from '@/lib/suite/homepage-metadata';
import { dashboardModules } from '@/lib/suite/modules';

export default function HomePage() {
  const rows = [
    ...dashboardModules.map(getHomepageModuleRow),
    ...homepageDummyRows,
  ];

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-8">
        <header className="space-y-2 py-12 text-center sm:py-20">
          <h1 className="text-[58px] font-semibold tracking-[-0.05em] text-white sm:text-[72px]">
            Ligthdash as a Semantic Layer POC
          </h1>
        </header>
        <DashboardModulesTable rows={rows} />
      </div>
    </main>
  );
}
