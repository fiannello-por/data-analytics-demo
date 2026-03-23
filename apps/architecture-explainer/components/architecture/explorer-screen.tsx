'use client';

import * as React from 'react';
import type {
  ArchitectureManifest,
  ArchitecturePipelineFilter,
  ArchitectureProbeReport,
} from '@/lib/architecture/contracts';
import { getNodeTiming } from '@/lib/architecture/report';
import {
  getFocusedNeighborhood,
  getVisibleEdgesForNodeSet,
  getVisibleNodesForPipeline,
} from '@/lib/architecture/selectors';
import { GraphCanvas } from '@/components/architecture/graph-canvas';
import { Inspector } from '@/components/architecture/inspector';
import { PipelineFilterBar } from '@/components/architecture/pipeline-filter-bar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

function getDefaultNodeIdForFilter(
  visibleNodes: ArchitectureManifest['nodes'],
) {
  const preferredStageOrder = ['api', 'query', 'warehouse', 'client', 'dashboard', 'render'];

  const orderedNodes = [...visibleNodes].sort((left, right) => {
    return preferredStageOrder.indexOf(left.stage) - preferredStageOrder.indexOf(right.stage);
  });

  return orderedNodes[0]?.id ?? null;
}

export function ArchitectureExplorerScreen({
  manifest,
  report,
}: {
  manifest: ArchitectureManifest;
  report: ArchitectureProbeReport;
}) {
  const [pipelineFilter, setPipelineFilter] =
    React.useState<ArchitecturePipelineFilter>('All');
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(() => {
    return getDefaultNodeIdForFilter(getVisibleNodesForPipeline(manifest, 'All'));
  });
  const [focusMode, setFocusMode] = React.useState(false);

  const visibleNodes = React.useMemo(
    () => getVisibleNodesForPipeline(manifest, pipelineFilter),
    [manifest, pipelineFilter],
  );

  React.useEffect(() => {
    if (!selectedNodeId || !visibleNodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(getDefaultNodeIdForFilter(visibleNodes));
      setFocusMode(false);
    }
  }, [selectedNodeId, visibleNodes]);

  function handlePipelineChange(nextFilter: ArchitecturePipelineFilter) {
    setPipelineFilter(nextFilter);
    setFocusMode(false);
    setSelectedNodeId(
      getDefaultNodeIdForFilter(getVisibleNodesForPipeline(manifest, nextFilter)),
    );
  }

  const graphSlice = React.useMemo(() => {
    const baseNodeIds = new Set(visibleNodes.map((node) => node.id));

    if (focusMode && selectedNodeId) {
      const focused = getFocusedNeighborhood(manifest, selectedNodeId);
      const focusedIds = new Set(
        focused.nodeIds.filter((nodeId) => baseNodeIds.has(nodeId)),
      );

      return {
        nodeIds: focusedIds,
        edgeIds: new Set(
          focused.edges
            .filter((edge) => focusedIds.has(edge.from) && focusedIds.has(edge.to))
            .map((edge) => `${edge.from}:${edge.to}`),
        ),
      };
    }

    return {
      nodeIds: baseNodeIds,
      edgeIds: new Set(
        getVisibleEdgesForNodeSet(manifest, baseNodeIds).map(
          (edge) => `${edge.from}:${edge.to}`,
        ),
      ),
    };
  }, [focusMode, manifest, selectedNodeId, visibleNodes]);

  const selectedNode =
    visibleNodes.find((node) => node.id === selectedNodeId) ?? null;

  const selectedTiming = selectedNodeId ? getNodeTiming(report, selectedNodeId) : null;
  const capturedAtLabel = `${new Date(report.capturedAt)
    .toISOString()
    .slice(0, 16)
    .replace('T', ' ')} UTC`;

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/60">
        <CardContent className="grid gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start xl:gap-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">System graph</p>
            <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground">
              Trace each dashboard component from user interaction to SQL generation,
              BigQuery execution, response shaping, and render output. Use pipeline
              filters to simplify the graph or focus a single node to inspect direct
              dependencies.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <Badge variant="outline">Run {report.runId}</Badge>
            <Badge variant="outline">Captured {capturedAtLabel}</Badge>
          </div>
          <PipelineFilterBar value={pipelineFilter} onValueChange={handlePipelineChange} />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(460px,0.92fr)] 2xl:grid-cols-[minmax(0,2.45fr)_minmax(500px,0.88fr)]">
        <GraphCanvas
          manifest={manifest}
          selectedNodeId={selectedNodeId}
          visibleNodeIds={graphSlice.nodeIds}
          visibleEdgeIds={graphSlice.edgeIds}
          onNodeSelect={(nodeId) => {
            setSelectedNodeId(nodeId);
            setFocusMode(false);
          }}
        />
        <Inspector
          node={selectedNode}
          timing={selectedTiming}
          focusMode={focusMode}
          onFocusConnections={() => setFocusMode(true)}
          onShowFullGraph={() => setFocusMode(false)}
        />
      </div>
    </div>
  );
}
