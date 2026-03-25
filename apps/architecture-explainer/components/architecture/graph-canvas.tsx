'use client';

import * as React from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Panel,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type {
  ArchitectureManifest,
  ArchitectureNode,
} from '@/lib/architecture/contracts';
import {
  ARCHITECTURE_STAGE_COLOR,
  ARCHITECTURE_STAGE_LABEL,
} from '@/lib/architecture/presentation';
import { GraphNode } from '@/components/architecture/graph-node';
import { Card } from '@/components/ui/card';

const STAGE_ORDER = [
  'dashboard',
  'client',
  'api',
  'query',
  'warehouse',
  'render',
] as const;

const nodeTypes = {
  architecture: GraphNode,
};

function GraphViewportSync({
  dependencyKey,
}: {
  dependencyKey: string;
}) {
  const { fitView } = useReactFlow();

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fitView({
        padding: 0.24,
        duration: 320,
        maxZoom: 1.15,
      });
    }, 32);

    return () => window.clearTimeout(timeoutId);
  }, [dependencyKey, fitView]);

  return null;
}

function getNodePosition(node: ArchitectureNode, manifest: ArchitectureManifest) {
  if (node.position) {
    return node.position;
  }

  const stageIndex = STAGE_ORDER.indexOf(node.stage);
  const siblings = manifest.nodes.filter((entry) => entry.stage === node.stage);
  const nodeIndex = siblings.findIndex((entry) => entry.id === node.id);

  return {
    x: stageIndex * 310,
    y: nodeIndex * 170,
  };
}

export function GraphCanvas({
  manifest,
  selectedNodeId,
  visibleNodeIds,
  visibleEdgeIds,
  onNodeSelect,
}: {
  manifest: ArchitectureManifest;
  selectedNodeId: string | null;
  visibleNodeIds: Set<string>;
  visibleEdgeIds: Set<string>;
  onNodeSelect: (nodeId: string) => void;
}) {
  const baseNodes = React.useMemo<Node[]>(
    () =>
      manifest.nodes
        .filter((node) => visibleNodeIds.has(node.id))
        .map((node) => ({
          id: node.id,
          type: 'architecture',
          position: getNodePosition(node, manifest),
          draggable: true,
          selectable: true,
          data: {
            node,
            selected: false,
          },
        })),
    [manifest, visibleNodeIds],
  );

  const computedEdges = React.useMemo<Edge[]>(
    () =>
      manifest.edges
        .filter((edge) => visibleEdgeIds.has(`${edge.from}:${edge.to}`))
        .map((edge) => ({
          id: `${edge.from}:${edge.to}`,
          source: edge.from,
          target: edge.to,
          type: 'smoothstep',
          pathOptions: {
            borderRadius: 10,
            offset: 18,
          },
          animated: edge.type === 'trigger',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 18,
            height: 18,
            color: 'rgba(226, 232, 240, 0.78)',
          },
          style: {
            stroke: edge.type === 'trigger' ? 'rgba(125, 211, 252, 0.88)' : 'rgba(226, 232, 240, 0.74)',
            strokeWidth: edge.type === 'trigger' ? 1.8 : 1.3,
            opacity: 0.82,
          },
        })),
    [manifest.edges, visibleEdgeIds],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(baseNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(computedEdges);

  React.useEffect(() => {
    setNodes((currentNodes) => {
      const currentNodeMap = new Map(currentNodes.map((node) => [node.id, node]));

      return baseNodes.map((node) => {
        const existingNode = currentNodeMap.get(node.id);

        if (!existingNode) {
          return node;
        }

        return {
          ...node,
          position: existingNode.position,
        };
      });
    });
  }, [baseNodes, setNodes]);

  React.useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          selected: node.id === selectedNodeId,
        },
      })),
    );
  }, [selectedNodeId, setNodes]);

  React.useEffect(() => {
    setEdges(
      computedEdges.map((edge) => {
        const isIncoming = selectedNodeId != null && edge.target === selectedNodeId;
        const isOutgoing = selectedNodeId != null && edge.source === selectedNodeId;
        const isRelated = isIncoming || isOutgoing;

        return {
          ...edge,
          animated: isOutgoing || edge.animated,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 18,
            height: 18,
            color: isIncoming
                ? 'rgba(248, 113, 113, 0.95)'
                : isOutgoing
                  ? 'rgba(34, 197, 94, 0.95)'
                : 'rgba(226, 232, 240, 0.82)',
          },
          style: {
            ...edge.style,
            stroke: isIncoming
              ? 'rgba(248, 113, 113, 0.92)'
              : isOutgoing
                ? 'rgba(34, 197, 94, 0.92)'
                : 'rgba(226, 232, 240, 0.62)',
            strokeWidth: isRelated ? 2.6 : 1.2,
            opacity: selectedNodeId == null ? 0.88 : isRelated ? 0.98 : 0.26,
          },
        };
      }),
    );
  }, [computedEdges, selectedNodeId, setEdges]);

  const viewportKey = React.useMemo(
    () => Array.from(visibleNodeIds).sort().join('|'),
    [visibleNodeIds],
  );

  return (
    <Card className="relative h-[calc(100vh-10rem)] min-h-[780px] overflow-hidden border-border/60 bg-card/72">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.08),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.05),transparent_30%)]" />
        <div className="absolute inset-x-6 top-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute inset-x-6 bottom-6 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-linear-to-b from-background/66 via-background/18 to-transparent" />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        nodesDraggable
        nodesConnectable={false}
        zoomOnScroll
        panOnScroll
        defaultViewport={{ x: 40, y: 24, zoom: 0.95 }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => onNodeSelect(node.id)}
        proOptions={{ hideAttribution: true }}
      >
        <GraphViewportSync dependencyKey={viewportKey} />
        <Background gap={24} size={1} color="rgba(100, 116, 139, 0.18)" />
        <MiniMap
          pannable
          zoomable
          className="!h-[96px] !w-[160px] !border !border-white/8 !bg-slate-950/90"
          nodeColor={(node) => {
            const stage = (node.data?.node as ArchitectureNode | undefined)?.stage;

            if (!stage) {
              return 'rgba(71, 85, 105, 0.85)';
            }

            return node.id === selectedNodeId
              ? ARCHITECTURE_STAGE_COLOR[stage]
              : `${ARCHITECTURE_STAGE_COLOR[stage]}cc`;
          }}
        />
        <Controls className="!overflow-hidden !rounded-xl !border !border-white/10 !bg-slate-950/88 !shadow-[0_18px_50px_-24px_rgba(15,23,42,0.95)] [&_button]:!border-b [&_button]:!border-white/8 [&_button]:!bg-slate-900/96 [&_button]:!text-slate-100 [&_button:hover]:!bg-slate-800 [&_button:hover]:!text-white" />
        <Panel
          position="top-right"
          className="rounded-2xl border border-white/8 bg-slate-950/82 px-4 py-3 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.95)] backdrop-blur-md"
        >
          <div className="space-y-2.5">
            <p className="text-[10px] font-medium tracking-[0.18em] text-slate-400 uppercase">
              Color reference
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {STAGE_ORDER.map((stage) => (
                <div key={stage} className="flex items-center gap-2 text-xs text-slate-200/92">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: ARCHITECTURE_STAGE_COLOR[stage] }}
                  />
                  <span className="whitespace-nowrap">{ARCHITECTURE_STAGE_LABEL[stage]}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </Card>
  );
}
