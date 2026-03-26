import { describe, expect, it } from 'vitest';
import type { TileSpec } from '@por/dashboard-spec';
import { resolveDashboardTileSpec, getDashboardVisualizationRenderer } from '@/lib/dashboard-v2/spec-runtime';
import { selectedMetricTrendSpec } from '@/lib/dashboard-v2/specs/main-metrics';

describe('dashboard spec runtime', () => {
  it('validates and normalizes a shared tile spec', () => {
    const resolved = resolveDashboardTileSpec(selectedMetricTrendSpec, 'Selected Metric Trend');

    expect(resolved.kind).toBe('chart');
    expect(resolved.layout.minHeight).toBeGreaterThan(0);
    expect(resolved.interactions.allowInspect).toBe(false);
  });

  it('resolves a visualization renderer for a non-composite tile', () => {
    const renderer = getDashboardVisualizationRenderer(selectedMetricTrendSpec);

    expect(renderer).toBeTypeOf('function');
  });

  it('fails loudly on invalid shared specs', () => {
    const invalidSpec = {
      id: 'broken',
      kind: 'composite',
      title: 'Broken',
      children: [],
    } satisfies TileSpec;

    expect(() => resolveDashboardTileSpec(invalidSpec, 'Broken'))
      .toThrowError('Invalid Broken dashboard spec');
  });
});
