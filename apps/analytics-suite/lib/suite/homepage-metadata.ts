import type { DashboardModule } from '@/lib/suite/contracts';
import { dashboardModules } from '@/lib/suite/modules';

const CHANGELOG_SITE_URL = 'https://data-analytics-demo-orcin.vercel.app';

function getChangelogHref(id: string) {
  return `${CHANGELOG_SITE_URL}/?dashboard=${id}`;
}

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
  author: {
    name: string;
    githubUsername: string;
    avatarUrl: string;
  };
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
  author: {
    name: string;
    githubUsername: string;
    avatarUrl: string;
  };
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
    owner: 'Revenue Strategy',
    author: {
      name: 'Maya Chen',
      githubUsername: 'maya-chen',
      avatarUrl: 'https://github.com/maya-chen.png',
    },
    updatedAt: '2026-03-25',
    changelogLabel: 'Pending',
    changelogHref: getChangelogHref('revenue-velocity'),
    statusLabel: 'WIP',
  },
  {
    id: 'renewal-risk',
    dashboardName: 'Renewal Risk',
    owner: 'Customer Success',
    author: {
      name: 'Arjun Patel',
      githubUsername: 'arjun-patel',
      avatarUrl: 'https://github.com/arjun-patel.png',
    },
    updatedAt: '2026-03-22',
    changelogLabel: 'Pending',
    changelogHref: getChangelogHref('renewal-risk'),
    statusLabel: 'WIP',
  },
  {
    id: 'regional-forecast',
    dashboardName: 'Regional Forecast',
    owner: 'Forecasting',
    author: {
      name: 'Nina Alvarez',
      githubUsername: 'nina-alvarez',
      avatarUrl: 'https://github.com/nina-alvarez.png',
    },
    updatedAt: '2026-03-21',
    changelogLabel: 'Pending',
    changelogHref: getChangelogHref('regional-forecast'),
    statusLabel: 'WIP',
  },
  {
    id: 'booking-mix',
    dashboardName: 'Booking Mix',
    owner: 'Finance Ops',
    author: {
      name: 'Owen Brooks',
      githubUsername: 'owen-brooks',
      avatarUrl: 'https://github.com/owen-brooks.png',
    },
    updatedAt: '2026-03-20',
    changelogLabel: 'Pending',
    changelogHref: getChangelogHref('booking-mix'),
    statusLabel: 'WIP',
  },
  {
    id: 'expansion-watch',
    dashboardName: 'Expansion Watch',
    owner: 'Growth',
    author: {
      name: 'Leila Hassan',
      githubUsername: 'leila-hassan',
      avatarUrl: 'https://github.com/leila-hassan.png',
    },
    updatedAt: '2026-03-18',
    changelogLabel: 'Pending',
    changelogHref: getChangelogHref('expansion-watch'),
    statusLabel: 'WIP',
  },
  {
    id: 'at-risk-accounts',
    dashboardName: 'At-Risk Accounts',
    owner: 'Account Health',
    author: {
      name: 'Jonah Kim',
      githubUsername: 'jonah-kim',
      avatarUrl: 'https://github.com/jonah-kim.png',
    },
    updatedAt: '2026-03-17',
    changelogLabel: 'Pending',
    changelogHref: getChangelogHref('at-risk-accounts'),
    statusLabel: 'WIP',
  },
  {
    id: 'territory-balance',
    dashboardName: 'Territory Balance',
    owner: 'Field Operations',
    author: {
      name: 'Priya Raman',
      githubUsername: 'priya-raman',
      avatarUrl: 'https://github.com/priya-raman.png',
    },
    updatedAt: '2026-03-16',
    changelogLabel: 'Pending',
    changelogHref: getChangelogHref('territory-balance'),
    statusLabel: 'WIP',
  },
  {
    id: 'rep-ramp',
    dashboardName: 'Rep Ramp',
    owner: 'Sales Enablement',
    author: {
      name: 'Lucas Meyer',
      githubUsername: 'lucas-meyer',
      avatarUrl: 'https://github.com/lucas-meyer.png',
    },
    updatedAt: '2026-03-14',
    changelogLabel: 'Pending',
    changelogHref: getChangelogHref('rep-ramp'),
    statusLabel: 'WIP',
  },
  {
    id: 'product-adoption',
    dashboardName: 'Product Adoption',
    owner: 'Product Analytics',
    author: {
      name: 'Sara Novak',
      githubUsername: 'sara-novak',
      avatarUrl: 'https://github.com/sara-novak.png',
    },
    updatedAt: '2026-03-13',
    changelogLabel: 'Pending',
    changelogHref: getChangelogHref('product-adoption'),
    statusLabel: 'WIP',
  },
  {
    id: 'support-escalations',
    dashboardName: 'Support Escalations',
    owner: 'Support Operations',
    author: {
      name: 'Diego Romero',
      githubUsername: 'diego-romero',
      avatarUrl: 'https://github.com/diego-romero.png',
    },
    updatedAt: '2026-03-11',
    changelogLabel: 'Pending',
    changelogHref: getChangelogHref('support-escalations'),
    statusLabel: 'WIP',
  },
];

export const homepageModuleMetadata = {
  'sales-performance': {
    owner: 'RevOps',
    author: {
      name: 'Facundo Iannello',
      githubUsername: 'facundoiannello',
      avatarUrl: 'https://github.com/facundoiannello.png',
    },
    updatedAt: '2026-03-24',
    changelogLabel: 'Pending',
    changelogHref: getChangelogHref('sales-performance'),
  },
  'pipeline-health': {
    owner: 'Delivery Analytics',
    author: {
      name: 'Jamik Tashpulatov',
      githubUsername: 'jamik',
      avatarUrl: 'https://github.com/jamik.png',
    },
    updatedAt: '2026-03-19',
    changelogLabel: 'Pending',
    changelogHref: getChangelogHref('pipeline-health'),
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
    author: metadata.author,
    updatedAt: metadata.updatedAt,
    changelogLabel: metadata.changelogLabel,
    changelogHref: metadata.changelogHref,
    statusLabel:
      module.id === 'sales-performance'
        ? 'Live'
        : homepageModuleStatusLabels[module.status],
    href:
      module.id === 'sales-performance' ? module.href : undefined,
  };
}
