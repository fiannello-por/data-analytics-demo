import type {
  ArchitectureEdge,
  ArchitectureManifest,
  ArchitectureNode,
  ArchitecturePipeline,
  ArchitecturePipelineFilter,
} from '@/lib/architecture/contracts';

const PIPELINE_FILTER_MAP: Record<
  Exclude<ArchitecturePipelineFilter, 'All'>,
  ArchitecturePipeline
> = {
  Overview: 'overview',
  Snapshot: 'snapshot',
  Trend: 'trend',
  'Closed Won': 'closed-won',
  Filters: 'filters',
};

export function getVisibleNodesForPipeline(
  manifest: ArchitectureManifest,
  pipelineFilter: ArchitecturePipelineFilter | ArchitecturePipeline,
): ArchitectureNode[] {
  if (pipelineFilter === 'All') {
    return manifest.nodes;
  }

  const pipeline =
    pipelineFilter in PIPELINE_FILTER_MAP
      ? PIPELINE_FILTER_MAP[
          pipelineFilter as Exclude<ArchitecturePipelineFilter, 'All'>
        ]
      : (pipelineFilter as ArchitecturePipeline);

  return manifest.nodes.filter((node) => node.pipelines.includes(pipeline));
}

export function getVisibleEdgesForNodeSet(
  manifest: ArchitectureManifest,
  nodeIds: Set<string>,
): ArchitectureEdge[] {
  return manifest.edges.filter(
    (edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to),
  );
}

export function getFocusedNeighborhood(
  manifest: ArchitectureManifest,
  nodeId: string,
): {
  nodeIds: string[];
  edges: ArchitectureEdge[];
} {
  const directEdges = manifest.edges.filter(
    (edge) => edge.from === nodeId || edge.to === nodeId,
  );

  const nodeIds = Array.from(
    new Set([nodeId, ...directEdges.flatMap((edge) => [edge.from, edge.to])]),
  );

  return {
    nodeIds,
    edges: getVisibleEdgesForNodeSet(manifest, new Set(nodeIds)),
  };
}
