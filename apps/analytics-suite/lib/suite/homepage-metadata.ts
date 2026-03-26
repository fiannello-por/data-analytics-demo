import type { DashboardModule } from '@/lib/suite/contracts';
import { dashboardModules } from '@/lib/suite/modules';

export type HomepageModuleStatus = 'Live' | 'WIP';

const homepageModuleStatusLabels: Record<
  DashboardModule['status'],
  HomepageModuleStatus
> = {
  active: 'WIP',
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
  href?: DashboardModule['href'];
};

export const homepageDummyRows: HomepageModuleRow[] = [
  {
    id: 'revenue-velocity',
    dashboardName: 'Revenue Velocity',
    owner: 'Maya Chen',
    updatedAt: '2026-03-25',
    changelogLabel: 'Pending',
    statusLabel: 'WIP',
  },
  {
    id: 'renewal-risk',
    dashboardName: 'Renewal Risk',
    owner: 'Arjun Patel',
    updatedAt: '2026-03-22',
    changelogLabel: 'Pending',
    statusLabel: 'WIP',
  },
  {
    id: 'regional-forecast',
    dashboardName: 'Regional Forecast',
    owner: 'Nina Alvarez',
    updatedAt: '2026-03-21',
    changelogLabel: 'Pending',
    statusLabel: 'WIP',
  },
  {
    id: 'booking-mix',
    dashboardName: 'Booking Mix',
    owner: 'Owen Brooks',
    updatedAt: '2026-03-20',
    changelogLabel: 'Pending',
    statusLabel: 'WIP',
  },
  {
    id: 'expansion-watch',
    dashboardName: 'Expansion Watch',
    owner: 'Leila Hassan',
    updatedAt: '2026-03-18',
    changelogLabel: 'Pending',
    statusLabel: 'WIP',
  },
  {
    id: 'at-risk-accounts',
    dashboardName: 'At-Risk Accounts',
    owner: 'Jonah Kim',
    updatedAt: '2026-03-17',
    changelogLabel: 'Pending',
    statusLabel: 'WIP',
  },
  {
    id: 'territory-balance',
    dashboardName: 'Territory Balance',
    owner: 'Priya Raman',
    updatedAt: '2026-03-16',
    changelogLabel: 'Pending',
    statusLabel: 'WIP',
  },
  {
    id: 'rep-ramp',
    dashboardName: 'Rep Ramp',
    owner: 'Lucas Meyer',
    updatedAt: '2026-03-14',
    changelogLabel: 'Pending',
    statusLabel: 'WIP',
  },
  {
    id: 'product-adoption',
    dashboardName: 'Product Adoption',
    owner: 'Sara Novak',
    updatedAt: '2026-03-13',
    changelogLabel: 'Pending',
    statusLabel: 'WIP',
  },
  {
    id: 'support-escalations',
    dashboardName: 'Support Escalations',
    owner: 'Diego Romero',
    updatedAt: '2026-03-11',
    changelogLabel: 'Pending',
    statusLabel: 'WIP',
  },
];

export const homepageModuleMetadata = {
  'sales-performance': {
    owner: 'Eddie Lake',
    updatedAt: '2026-03-24',
    changelogLabel: 'Pending',
  },
  'pipeline-health': {
    owner: 'Jamik Tashpulatov',
    updatedAt: '2026-03-19',
    changelogLabel: 'Pending',
  },
} satisfies Record<(typeof dashboardModules)[number]['id'], HomepageModuleMeta>;

type DashboardModuleId = keyof typeof homepageModuleMetadata;

function isHomepageModuleId(moduleId: string): moduleId is DashboardModuleId {
  return moduleId in homepageModuleMetadata;
}

function getHomepageModuleMetadata(moduleId: DashboardModule['id']): HomepageModuleMeta {
  if (!isHomepageModuleId(moduleId)) {
    throw new HomepageMetadataError(moduleId);
  }

  const metadata = homepageModuleMetadata[moduleId];

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
    href:
      module.id === 'sales-performance' ? `${module.href}?view=v2` : undefined,
  };
}
