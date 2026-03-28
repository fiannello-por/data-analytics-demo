export const OVERVIEW_TAB = 'Overview' as const;

export const CATEGORY_ORDER = [
  'New Logo',
  'Expansion',
  'Migration',
  'Renewal',
  'Total',
] as const;

export type Category = (typeof CATEGORY_ORDER)[number];
export type DashboardTab = typeof OVERVIEW_TAB | Category;

export const DASHBOARD_TAB_ORDER = [OVERVIEW_TAB, ...CATEGORY_ORDER] as const;