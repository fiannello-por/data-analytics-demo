import type { DashboardModule } from '@/lib/suite/contracts';

export type HomepageModuleStatus = 'Live' | 'WIP';

export type HomepageModuleMeta = {
  owner: string;
  updatedAt: string;
  changelogLabel: string;
  changelogHref?: string;
};

export type HomepageModuleRow = {
  id: DashboardModule['id'];
  dashboardName: DashboardModule['title'];
  owner: string;
  updatedAt: string;
  changelogLabel: string;
  changelogHref?: string;
  statusLabel: HomepageModuleStatus;
  href: DashboardModule['href'];
};

export const homepageModuleMetadata: Record<string, HomepageModuleMeta> = {
  'sales-performance': {
    owner: 'Revenue Analytics',
    updatedAt: '2026-03-18',
    changelogLabel: 'Changelog',
    changelogHref: '/dashboards/sales-performance/changelog',
  },
  'pipeline-health': {
    owner: 'Delivery Analytics',
    updatedAt: '2026-03-18',
    changelogLabel: 'Changelog',
    changelogHref: '/dashboards/pipeline-health/changelog',
  },
};

export function getHomepageModuleRow(module: DashboardModule): HomepageModuleRow {
  const metadata = homepageModuleMetadata[module.id];

  return {
    id: module.id,
    dashboardName: module.title,
    owner: metadata.owner,
    updatedAt: metadata.updatedAt,
    changelogLabel: metadata.changelogLabel,
    changelogHref: metadata.changelogHref,
    statusLabel: module.status === 'active' ? 'Live' : 'WIP',
    href: module.href,
  };
}
