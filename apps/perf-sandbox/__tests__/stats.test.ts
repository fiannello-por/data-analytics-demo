// apps/perf-sandbox/__tests__/stats.test.ts
import { describe, expect, it } from 'vitest';
import { computeDistribution, bootstrapP50CI } from '@/lib/stats';

describe('computeDistribution', () => {
  it('computes distribution from sample values', () => {
    const values = [10, 20, 30, 40, 50];
    const dist = computeDistribution(values);

    expect(dist.n).toBe(5);
    expect(dist.mean).toBe(30);
    expect(dist.p50).toBe(30);
    expect(dist.min).toBe(10);
    expect(dist.max).toBe(50);
    expect(dist.stddev).toBeCloseTo(15.81, 1);
  });

  it('computes p95 from larger sample', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    const dist = computeDistribution(values);

    expect(dist.p50).toBe(50.5);
    expect(dist.p95).toBeCloseTo(95.5, 0);
  });

  it('returns zeros for empty array', () => {
    const dist = computeDistribution([]);
    expect(dist.n).toBe(0);
    expect(dist.mean).toBe(0);
    expect(dist.p50).toBe(0);
  });
});

describe('bootstrapP50CI', () => {
  it('detects significant difference between clearly separated samples', () => {
    const baseline = [100, 110, 105, 108, 102];
    const variant = [50, 55, 48, 52, 51];
    const result = bootstrapP50CI(baseline, variant, 10_000);

    expect(result.significant).toBe(true);
    expect(result.ciUpper95).toBeLessThan(0);
  });

  it('detects no significance for overlapping samples', () => {
    const baseline = [100, 110, 105, 108, 102];
    const variant = [101, 109, 106, 107, 103];
    const result = bootstrapP50CI(baseline, variant, 10_000);

    expect(result.significant).toBe(false);
  });
});