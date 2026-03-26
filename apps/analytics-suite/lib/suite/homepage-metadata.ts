import type { DashboardModule } from '@/lib/suite/contracts';
import { dashboardModules } from '@/lib/suite/modules';

export type HomepageModuleStatus = 'Live' | 'WIP';
type DashboardModuleId = (typeof dashboardModules)[number]['id'];

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

export class HomepageMetadataError extends Error {
  constructor(moduleId: string) {
    super(`Missing homepage metadata for dashboard module id: ${moduleId}`);
    this.name = 'HomepageMetadataError';
  }
}

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

export const homepageModuleMetadata = {
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
} satisfies Record<DashboardModuleId, HomepageModuleMeta>;

function getHomepageModuleMetadata(moduleId: DashboardModule['id']): HomepageModuleMeta {
  const metadata = homepageModuleMetadata[moduleId];

  if (!metadata) {
    throw new HomepageMetadataError(moduleId);
  }

  return metadata;
}

export function getHomepageModuleRow(module: DashboardModule): HomepageModuleRow {
  const metadata = getHomepageModuleMetadata(module.id);

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
