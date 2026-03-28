// apps/perf-sandbox/lib/types.ts

export type RunMode = 'full-cold' | 'production-cold' | 'warm';

export type TelemetrySpan = {
  id: string;
  name: string;
  parentId?: string;
  startMs: number;
  durationMs: number;
  metadata?: Record<string, unknown>;
};

export type ExperimentRunMetrics = {
  ttfbMs: number;
  fcpMs: number;
  lcpMs: number;
  totalPageLoadMs: number;

  ssrDataFetchMs: number;
  totalCompileMs: number;
  totalExecuteMs: number;
  totalQueryCount: number;
  totalBytesProcessed: number;
  filterDictionaryMs: number;

  semanticCacheHits: number;
  semanticCacheMisses: number;

  jsDownloadMs: number;
  hydrationMs: number;

  experimentId: string;
  runMode: RunMode;
  runIndex: number;
  timestamp: string;
};

export type MetricDistribution = {
  mean: number;
  p50: number;
  p95: number;
  stddev: number;
  min: number;
  max: number;
  n: number;
};

export type ExperimentComparison = {
  metric: string;
  baselineP50: number;
  variantP50: number;
  absoluteDelta: number;
  percentDelta: number;
  ciLower95: number;
  ciUpper95: number;
  significant: boolean;
};

export type ExperimentSummary = {
  experimentId: string;
  fullCold: Record<string, MetricDistribution>;
  productionCold: Record<string, MetricDistribution>;
  warm: Record<string, MetricDistribution>;
  comparison?: ExperimentComparison[];
};

export type RunResult = {
  metrics: ExperimentRunMetrics;
  spans: TelemetrySpan[];
};