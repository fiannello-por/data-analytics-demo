import type { CategoryData } from "@/lib/types";
import { ChangeIndicator } from "./change-indicator";

interface ExecutiveSnapshotProps {
  data: CategoryData[];
}

export function ExecutiveSnapshot({ data }: ExecutiveSnapshotProps) {
  const highlights = data
    .filter((d) => d.rows.length > 0)
    .map((d) => ({ category: d.category, metric: d.rows[0] }));

  if (highlights.length === 0) return null;

  return (
    <section className="py-8 border-b border-border-subtle">
      <h2 className="text-xs font-medium uppercase tracking-[0.15em] text-text-tertiary mb-5">
        Executive Snapshot
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {highlights.map(({ category, metric }) => (
          <div key={category} className="rounded-lg bg-surface-elevated px-4 py-4 border border-border-subtle">
            <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">{category}</p>
            <p className="text-xs text-text-secondary mb-3">{metric.metricName}</p>
            <p className="text-2xl font-semibold tabular-nums text-text-primary tracking-tight">{metric.currentPeriod}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-text-tertiary tabular-nums">vs {metric.previousPeriod}</span>
              <ChangeIndicator value={metric.pctChange} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
