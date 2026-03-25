import { describe, expect, it } from 'vitest';
import {
  BENCHMARKABLE_PROBE_IDS,
  LAB_CACHE_MODES,
  LAB_BACKENDS,
  LAB_PROBES,
  LAB_TABS,
  getArchitectureSteps,
} from '@/lib/analytics-lab';

describe('analytics lab registry', () => {
  it('defines the expected docs-style tab set', () => {
    expect(LAB_TABS.map((tab) => tab.id)).toEqual([
      'overview',
      'probes',
      'benchmarks',
      'architecture',
      'backends',
    ]);
  });

  it('exposes direct BigQuery as the initial backend', () => {
    expect(LAB_BACKENDS).toEqual([
      expect.objectContaining({
        id: 'direct-bigquery',
        label: 'Direct BigQuery',
        status: 'active',
      }),
    ]);
  });

  it('registers the baseline probes in benchmark order', () => {
    expect(LAB_PROBES.map((probe) => probe.id)).toEqual([
      'ping',
      'summary',
      'division-options',
      'dashboard-category-snapshot',
      'dashboard-tile-trend',
      'dashboard-filter-dictionary',
    ]);
    expect(BENCHMARKABLE_PROBE_IDS).toEqual([
      'ping',
      'summary',
      'division-options',
      'dashboard-category-snapshot',
      'dashboard-tile-trend',
      'dashboard-filter-dictionary',
    ]);
    expect(
      LAB_PROBES.every((probe) =>
        probe.supportedBackends.includes('direct-bigquery'),
      ),
    ).toBe(true);
  });

  it('defines the supported BigQuery query cache modes', () => {
    expect(LAB_CACHE_MODES).toEqual([
      expect.objectContaining({
        id: 'auto',
        label: 'Auto',
      }),
      expect.objectContaining({
        id: 'off',
        label: 'Off',
      }),
    ]);
  });

  it('builds architecture steps with the active source label', () => {
    expect(
      getArchitectureSteps('custom_dataset.scorecard_daily').at(-1),
    ).toEqual({
      label: 'custom_dataset.scorecard_daily',
      description: 'Current source dataset under test.',
    });
  });
});
