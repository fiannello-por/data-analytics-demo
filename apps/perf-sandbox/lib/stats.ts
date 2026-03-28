// apps/perf-sandbox/lib/stats.ts
import type { MetricDistribution, ExperimentComparison } from './types';

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function computeDistribution(values: number[]): MetricDistribution {
  if (values.length === 0) {
    return { mean: 0, p50: 0, p95: 0, stddev: 0, min: 0, max: 0, n: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((sum, v) => sum + v, 0) / n;
  const variance =
    sorted.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n > 1 ? n - 1 : 1);

  return {
    mean,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    stddev: Math.sqrt(variance),
    min: sorted[0],
    max: sorted[n - 1],
    n,
  };
}

function sampleMedian(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  return percentile(sorted, 50);
}

export function bootstrapP50CI(
  baseline: number[],
  variant: number[],
  iterations = 10_000,
): Pick<
  ExperimentComparison,
  'ciLower95' | 'ciUpper95' | 'significant'
> {
  const deltas: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const bSample = Array.from(
      { length: baseline.length },
      () => baseline[Math.floor(Math.random() * baseline.length)],
    );
    const vSample = Array.from(
      { length: variant.length },
      () => variant[Math.floor(Math.random() * variant.length)],
    );
    deltas.push(sampleMedian(vSample) - sampleMedian(bSample));
  }

  deltas.sort((a, b) => a - b);
  const ciLower95 = percentile(deltas, 2.5);
  const ciUpper95 = percentile(deltas, 97.5);

  return {
    ciLower95,
    ciUpper95,
    significant: ciLower95 > 0 || ciUpper95 < 0,
  };
}