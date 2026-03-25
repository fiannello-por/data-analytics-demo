import type { ArchitectureStage } from '@/lib/architecture/contracts';

export const ARCHITECTURE_STAGE_LABEL: Record<ArchitectureStage, string> = {
  dashboard: 'Dashboard surface',
  client: 'Client orchestration',
  api: 'API layer',
  query: 'Query layer',
  warehouse: 'Warehouse',
  render: 'Rendered outputs',
};

export const ARCHITECTURE_STAGE_TONE: Record<ArchitectureStage, string> = {
  dashboard: 'border-sky-400/28 bg-sky-500/10',
  client: 'border-violet-400/28 bg-violet-500/10',
  api: 'border-cyan-400/28 bg-cyan-500/10',
  query: 'border-amber-400/28 bg-amber-500/10',
  warehouse: 'border-orange-400/28 bg-orange-500/10',
  render: 'border-teal-400/28 bg-teal-500/10',
};

export const ARCHITECTURE_STAGE_COLOR: Record<ArchitectureStage, string> = {
  dashboard: '#60a5fa',
  client: '#8b5cf6',
  api: '#22d3ee',
  query: '#f59e0b',
  warehouse: '#f97316',
  render: '#14b8a6',
};
