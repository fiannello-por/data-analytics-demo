import type {
  ArchitectureNodeTiming,
  ArchitectureProbeReport,
  TimingBreakdownSegment,
} from '@/lib/architecture/contracts';

function normalizeBreakdown(
  breakdown: TimingBreakdownSegment[] | undefined,
): TimingBreakdownSegment[] {
  if (!breakdown || breakdown.length === 0) {
    return [{ label: 'server', durationMs: 0 }];
  }

  return breakdown;
}

export function normalizeArchitectureReport(
  report: ArchitectureProbeReport,
): ArchitectureProbeReport {
  return {
    ...report,
    nodes: report.nodes.map((node) => ({
      ...node,
      breakdown: normalizeBreakdown(node.breakdown),
    })),
  };
}

export function getNodeTiming(
  report: ArchitectureProbeReport,
  nodeId: string,
): ArchitectureNodeTiming | null {
  return report.nodes.find((node) => node.nodeId === nodeId) ?? null;
}

export const sampleArchitectureReport: ArchitectureProbeReport =
  normalizeArchitectureReport({
    runId: 'baseline-direct-bigquery',
    capturedAt: '2026-03-23T18:00:00.000Z',
    nodes: [
      {
        nodeId: 'data-api-layer',
        durationMs: 96,
        breakdown: [
          { label: 'network', durationMs: 12 },
          { label: 'server', durationMs: 84 },
        ],
      },
      {
        nodeId: 'metric-query-layer',
        durationMs: 52,
        breakdown: [
          { label: 'server', durationMs: 18 },
          { label: 'transform', durationMs: 34 },
        ],
      },
      {
        nodeId: 'bigquery-warehouse',
        durationMs: 194,
        breakdown: [
          { label: 'BigQuery', durationMs: 194 },
        ],
      },
      {
        nodeId: 'response-mapper',
        durationMs: 37,
        breakdown: [
          { label: 'transform', durationMs: 37 },
        ],
      },
    ],
  });
