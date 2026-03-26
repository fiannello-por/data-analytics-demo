import type {
  CategorySnapshotPayload,
  DashboardSpecBindingKey,
  DashboardSpecBindingOutputMap,
  TileTrendPayload,
} from '@/lib/dashboard/contracts';
import {
  buildMainMetricsSnapshotBinding,
  buildSelectedMetricTrendBinding,
} from '@/lib/dashboard-v2/spec-builders';

type DashboardSpecBindingRegistry = {
  mainMetricsSnapshot: (
    payload: CategorySnapshotPayload,
  ) => DashboardSpecBindingOutputMap['mainMetricsSnapshot'];
  selectedMetricTrend: (
    payload: TileTrendPayload,
  ) => DashboardSpecBindingOutputMap['selectedMetricTrend'];
};

export const dashboardSpecBindingRegistry: DashboardSpecBindingRegistry = {
  mainMetricsSnapshot: (payload) =>
    payload.specBindings?.mainMetricsSnapshot ??
    buildMainMetricsSnapshotBinding(payload),
  selectedMetricTrend: (payload) =>
    payload.specBindings?.selectedMetricTrend ??
    buildSelectedMetricTrendBinding(payload),
};

export function getDashboardSpecBinding<TKey extends DashboardSpecBindingKey>(
  key: TKey,
): DashboardSpecBindingRegistry[TKey] {
  return dashboardSpecBindingRegistry[key];
}
