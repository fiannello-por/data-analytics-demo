import type {
  CategorySnapshotPayload,
  DashboardSpecBindingOutputMap,
  TileTrendPayload,
} from '@/lib/dashboard/contracts';

export function buildMainMetricsSnapshotBinding(
  snapshot: CategorySnapshotPayload,
): DashboardSpecBindingOutputMap['mainMetricsSnapshot'] {
  return {
    status: snapshot.rows.length > 0 ? 'ready' : 'empty',
    rows: snapshot.rows.map((row) => ({
      tileId: row.tileId,
      label: row.label,
      currentValue: row.currentValue,
      previousValue: row.previousValue,
      pctChange: row.pctChange,
    })),
    traces: Object.fromEntries(
      snapshot.rows.map((row) => [row.tileId, row.backendTrace]),
    ),
  };
}

export function buildSelectedMetricTrendBinding(
  trend: TileTrendPayload,
): DashboardSpecBindingOutputMap['selectedMetricTrend'] {
  if (!trend.xAxisFieldLabel) {
    throw new Error(
      'Selected metric trend binding requires a semantic x-axis field label.',
    );
  }

  return {
    status: trend.points.length > 0 ? 'ready' : 'empty',
    xAxisLabel: trend.xAxisFieldLabel,
    rows: trend.points.map((point) => ({
      bucketKey: point.bucketKey,
      bucketLabel: point.bucketLabel,
      currentValue: point.currentValue,
      previousValue: point.previousValue,
    })),
    trace: trend.backendTrace,
  };
}
