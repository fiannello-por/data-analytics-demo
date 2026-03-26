import type { DashboardModule } from '@/lib/suite/contracts';
import { pipelineHealthModule } from '@/dashboards/pipeline-health/module';
import { salesPerformanceModule } from '@/dashboards/sales-performance/module';

export type HomepageModuleStatus = 'Live' | 'WIP';
type DashboardModuleId =
  | typeof salesPerformanceModule.id
  | typeof pipelineHealthModule.id;

const homepageModuleStatusLabels: Record<
  DashboardModule['status'],
  HomepageModuleStatus
> = {
  active: 'Live',
  demo: 'WIP',
};

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

export const homepageModuleMetadata: Record<DashboardModuleId, HomepageModuleMeta> =
  {
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

function getHomepageModuleMetadata(moduleId: DashboardModuleId): HomepageModuleMeta {
  const metadata = homepageModuleMetadata[moduleId];

  if (!metadata) {
    throw new Error(`Missing homepage metadata for dashboard module id: ${moduleId}`);
  }

  return metadata;
}

export function getHomepageModuleRow(module: DashboardModule): HomepageModuleRow {
  const metadata = getHomepageModuleMetadata(module.id as DashboardModuleId);

  return {
    id: module.id,
    dashboardName: module.title,
    owner: metadata.owner,
    updatedAt: metadata.updatedAt,
    changelogLabel: metadata.changelogLabel,
    changelogHref: metadata.changelogHref,
    statusLabel: homepageModuleStatusLabels[module.status],
    href: module.href,
  };
}
