import { describe, expect, it } from 'vitest';
import { architectureManifest } from '@/lib/architecture/manifest';

describe('architecture manifest', () => {
  it('contains unique node ids', () => {
    const ids = architectureManifest.nodes.map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ensures all edges reference existing nodes', () => {
    const ids = new Set(architectureManifest.nodes.map((node) => node.id));

    for (const edge of architectureManifest.edges) {
      expect(ids.has(edge.from)).toBe(true);
      expect(ids.has(edge.to)).toBe(true);
    }
  });
});
