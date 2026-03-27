export type ArchitecturePipeline =
  | 'overview'
  | 'snapshot'
  | 'trend'
  | 'closed-won'
  | 'filters';

export type ArchitectureStage =
  | 'dashboard'
  | 'client'
  | 'api'
  | 'query'
  | 'warehouse'
  | 'render';

export type ArchitecturePipelineFilter =
  | 'All'
  | 'Overview'
  | 'Snapshot'
  | 'Trend'
  | 'Closed Won'
  | 'Filters';

export type ArchitectureNodeKind =
  | 'ui'
  | 'client-state'
  | 'request-builder'
  | 'api-route'
  | 'server-loader'
  | 'sql-builder'
  | 'bigquery'
  | 'transformer'
  | 'render-target';

export type ArchitectureCodeRef = {
  path: string;
  symbol: string;
};

export type ArchitectureNodeIO = {
  label: string;
  value: string;
};

export type ArchitectureNode = {
  id: string;
  kind: ArchitectureNodeKind;
  stage: ArchitectureStage;
  position?: {
    x: number;
    y: number;
  };
  title: string;
  summary: string;
  pipelines: ArchitecturePipeline[];
  codeRefs: ArchitectureCodeRef[];
  inputs: ArchitectureNodeIO[];
  outputs: ArchitectureNodeIO[];
};

export type ArchitectureEdgeType = 'data' | 'trigger' | 'transform' | 'render';

export type ArchitectureEdge = {
  from: string;
  to: string;
  label: string;
  type: ArchitectureEdgeType;
};

export type ArchitectureManifest = {
  systemId: string;
  systemTitle: string;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
};

export type TimingBreakdownSegment = {
  label: string;
  durationMs: number;
};

export type ArchitectureNodeTiming = {
  nodeId: string;
  durationMs: number;
  breakdown: TimingBreakdownSegment[];
};

export type ArchitectureProbeReport = {
  runId: string;
  capturedAt: string;
  nodes: ArchitectureNodeTiming[];
};
