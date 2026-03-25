import type { ProbeCacheMode } from '@/lib/probe-cache-mode';

export type LabTabId =
  | 'overview'
  | 'probes'
  | 'benchmarks'
  | 'architecture'
  | 'backends';

export type LabBackendId = 'direct-bigquery';

export type LabProbeId =
  | 'ping'
  | 'summary'
  | 'division-options'
  | 'dashboard-category-snapshot'
  | 'dashboard-tile-trend'
  | 'dashboard-filter-dictionary';

export type LabTab = {
  id: LabTabId;
  label: string;
  description: string;
};

export type LabBackend = {
  id: LabBackendId;
  label: string;
  status: 'active';
  description: string;
};

export type LabProbe = {
  id: LabProbeId;
  label: string;
  endpoint: string;
  purpose: string;
  note: string;
  queryFamily:
    | 'baseline'
    | 'aggregate'
    | 'filter-dictionary'
    | 'dashboard-category-snapshot'
    | 'dashboard-tile-trend';
  supportedBackends: LabBackendId[];
  benchmark: boolean;
};

export type LabCacheModeOption = {
  id: ProbeCacheMode;
  label: string;
  description: string;
};

export const LAB_TABS: LabTab[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'What this lab is for and how to read the numbers.',
  },
  {
    id: 'probes',
    label: 'Probes',
    description: 'Run one predefined query path at a time.',
  },
  {
    id: 'benchmarks',
    label: 'Benchmarks',
    description: 'Measure cold and warm runs over the same probe set.',
  },
  {
    id: 'architecture',
    label: 'Architecture',
    description: 'See how request latency is composed across the stack.',
  },
  {
    id: 'backends',
    label: 'Backends',
    description: 'Track the current adapter and future comparison targets.',
  },
];

export const LAB_BACKENDS: LabBackend[] = [
  {
    id: 'direct-bigquery',
    label: 'Direct BigQuery',
    status: 'active',
    description:
      'Next.js route handlers call BigQuery through the Node client without a semantic layer in the middle.',
  },
];

export const LAB_CACHE_MODES: LabCacheModeOption[] = [
  {
    id: 'auto',
    label: 'Auto',
    description:
      'Allow BigQuery to reuse query-cache results when it can.',
  },
  {
    id: 'off',
    label: 'Off',
    description:
      'Force live BigQuery execution with useQueryCache disabled.',
  },
];

export const LAB_PROBES: LabProbe[] = [
  {
    id: 'ping',
    label: 'Ping',
    endpoint: '/api/probe/ping',
    purpose: 'Minimal connectivity baseline through the full app path.',
    note: 'Use this to understand the cheapest possible request in the current stack.',
    queryFamily: 'baseline',
    supportedBackends: ['direct-bigquery'],
    benchmark: true,
  },
  {
    id: 'summary',
    label: 'Source summary',
    endpoint: '/api/probe/summary',
    purpose: 'Small aggregate query over the source scorecard table.',
    note: 'This is the cleanest direct read on aggregate latency before introducing a semantic layer.',
    queryFamily: 'aggregate',
    supportedBackends: ['direct-bigquery'],
    benchmark: true,
  },
  {
    id: 'division-options',
    label: 'Division filter options',
    endpoint: '/api/probe/filter-options/Division',
    purpose: 'Filter dictionary lookup for a real dimension.',
    note: 'This tells us whether dropdown-style lookups are cheap enough to stay interactive.',
    queryFamily: 'filter-dictionary',
    supportedBackends: ['direct-bigquery'],
    benchmark: true,
  },
  {
    id: 'dashboard-category-snapshot',
    label: 'Dashboard category snapshot',
    endpoint: '/api/dashboard/category/New%20Logo',
    purpose: 'Snapshot fan-out for the New Logo dashboard category.',
    note: 'This is the dashboard path that fans out across every tile in the active category.',
    queryFamily: 'dashboard-category-snapshot',
    supportedBackends: ['direct-bigquery'],
    benchmark: true,
  },
  {
    id: 'dashboard-tile-trend',
    label: 'Dashboard tile trend',
    endpoint: '/api/dashboard/trend/new_logo_bookings_amount',
    purpose: 'Trend series for the default New Logo tile.',
    note: 'This isolates the request path that powers the selected tile trend panel.',
    queryFamily: 'dashboard-tile-trend',
    supportedBackends: ['direct-bigquery'],
    benchmark: true,
  },
  {
    id: 'dashboard-filter-dictionary',
    label: 'Dashboard filter dictionary',
    endpoint: '/api/dashboard/filter-dictionaries/Division',
    purpose: 'Global filter dictionary lookup for dashboard controls.',
    note: 'This measures the dashboard-wide dictionary path used by the filter bar.',
    queryFamily: 'filter-dictionary',
    supportedBackends: ['direct-bigquery'],
    benchmark: true,
  },
];

export const BENCHMARKABLE_PROBE_IDS = LAB_PROBES.filter(
  (probe) => probe.benchmark,
).map((probe) => probe.id);

export const BENCHMARK_ITERATIONS = 6;

export const BENCHMARK_NOTES = [
  'Cold requests measure the first hit inside the current app process.',
  'Warm requests are the following runs against the same endpoint in the same process.',
  'Cache mode "auto" allows BigQuery query-cache hits when available.',
  'Cache mode "off" disables the BigQuery query cache so you can measure live warehouse execution.',
];

export function getArchitectureSteps(sourceLabel: string) {
  return [
    {
      label: 'Browser',
      description: 'User click and client-side fetch timing.',
    },
    {
      label: 'Analytics Lab',
      description:
        'The internal UI shell that triggers probe and benchmark runs.',
    },
    {
      label: 'Probe route',
      description:
        'Next.js route handler that captures timing metadata and normalizes the result.',
    },
    {
      label: 'Backend adapter',
      description:
        'Current adapter is direct BigQuery. Future adapters must implement the same probe contracts.',
    },
    {
      label: 'BigQuery client',
      description: 'Node BigQuery client issuing the actual warehouse request.',
    },
    {
      label: sourceLabel,
      description: 'Current source dataset under test.',
    },
  ];
}

export const TIMING_BREAKDOWN = [
  {
    metric: 'Client duration',
    explanation:
      'End-to-end time measured in the browser for a single probe execution.',
  },
  {
    metric: 'Server duration',
    explanation:
      'Time spent inside the Next.js route handler before the response is returned.',
  },
  {
    metric: 'Query count',
    explanation:
      'How many backend queries the probe needed. The baseline target is one query per probe.',
  },
  {
    metric: 'Bytes processed',
    explanation:
      'Warehouse-side scan work when the backend can expose it. Useful for spotting query cache effects or expensive scans.',
  },
];
