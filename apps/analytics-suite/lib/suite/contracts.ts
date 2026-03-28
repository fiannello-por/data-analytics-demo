import type { DashboardBudgetPolicy } from '@por/semantic-runtime';

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
