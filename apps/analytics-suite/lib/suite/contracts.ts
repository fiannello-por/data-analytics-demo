import type { DashboardBudgetPolicy } from '@por/analytics-adapter';

export type DashboardSurfaceSpec = {
  id: string;
  label: string;
  description: string;
  measures: string[];
  dimensions?: string[];
  filters?: string[];
};

export type DashboardRegistrySummary = {
  models: string[];
  surfaces: DashboardSurfaceSpec[];
};

export type DashboardModule = {
  id: string;
  title: string;
  description: string;
  href: string;
  status: 'active' | 'demo';
  registry: DashboardRegistrySummary;
  budgetPolicy: DashboardBudgetPolicy;
  highlights: string[];
};
