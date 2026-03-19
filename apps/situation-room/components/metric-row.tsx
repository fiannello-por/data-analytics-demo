import type { ScorecardRow } from "@/lib/types";
import { ChangeIndicator } from "./change-indicator";

interface MetricRowProps {
  row: ScorecardRow;
  isLast?: boolean;
}

export function MetricRow({ row, isLast = false }: MetricRowProps) {
  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-[1fr_auto_auto_auto] gap-x-4 sm:gap-x-6 items-center py-3 ${
        isLast ? "" : "border-b border-border-subtle"
      }`}
    >
      <span className="text-sm font-medium text-text-primary">
        {row.metricName}
      </span>
      <span className="text-sm tabular-nums text-text-primary font-semibold text-right min-w-[80px]">
        {row.currentPeriod}
      </span>
      <span className="hidden sm:block text-sm tabular-nums text-text-secondary text-right min-w-[80px]">
        {row.previousPeriod}
      </span>
      <div className="text-right min-w-[72px]">
        <ChangeIndicator value={row.pctChange} />
      </div>
    </div>
  );
}
