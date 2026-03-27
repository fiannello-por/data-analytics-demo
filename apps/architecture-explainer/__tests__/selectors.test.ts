import { describe, expect, it } from 'vitest';
import { architectureManifest } from '@/lib/architecture/manifest';
import {
  getFocusedNeighborhood,
  getVisibleEdgesForNodeSet,
  getVisibleNodesForPipeline,
} from '@/lib/architecture/selectors';

describe('architecture selectors', () => {
  it('filters to one pipeline without leaking unrelated nodes', () => {
    const nodes = getVisibleNodesForPipeline(architectureManifest, 'trend');

    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.every((node) => node.pipelines.includes('trend'))).toBe(true);
  });

  it('returns direct dependencies and consumers for a focused node', () => {
    const result = getFocusedNeighborhood(
      architectureManifest,
      'data-api-layer',
    );

    expect(result.nodeIds).toContain('request-planner');
    expect(result.nodeIds).toContain('metric-query-layer');
  });

  it('filters edges down to the selected node set', () => {
    const nodeIds = new Set([
      'request-planner',
      'data-api-layer',
      'metric-query-layer',
    ]);

    const edges = getVisibleEdgesForNodeSet(architectureManifest, nodeIds);

    expect(
      edges.every((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to)),
    ).toBe(true);
  });
});
