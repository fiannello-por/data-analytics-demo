'use client';

import * as React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { ArchitectureNode } from '@/lib/architecture/contracts';
import {
  ARCHITECTURE_STAGE_TONE,
} from '@/lib/architecture/presentation';
import { cn } from '@/lib/utils';

type GraphNodeData = {
  node: ArchitectureNode;
  selected: boolean;
};

export function GraphNode({ data }: NodeProps<GraphNodeData>) {
  const { node, selected } = data;

  return (
    <div
      className={cn(
        'w-[300px] rounded-2xl border px-4 py-3.5 shadow-[0_16px_48px_-28px_rgba(15,23,42,0.82)] backdrop-blur-sm transition-all',
        ARCHITECTURE_STAGE_TONE[node.stage],
        selected
          ? 'ring-2 ring-primary/45 ring-offset-2 ring-offset-background'
          : 'hover:border-border',
      )}
    >
      <Handle type="target" position={Position.Left} className="!border-0 !bg-primary/60" />
      <div className="space-y-2.5">
        <div className="space-y-1.5">
          <p className="text-[15px] font-semibold leading-snug tracking-tight text-foreground">
            {node.title}
          </p>
          <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground/90">
            {node.summary}
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!border-0 !bg-primary/60" />
    </div>
  );
}
