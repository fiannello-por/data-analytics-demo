import type { CategoryData } from "@/lib/types";
import { MetricRow } from "./metric-row";

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "New Logo": "First-time customer acquisition — tracking pipeline generation through close.",
  Expansion: "Growth within existing accounts — upsells, cross-sells, and seat expansion.",
  Migration: "Platform transitions — customers moving between product lines.",
  Renewal: "Contract renewals and retention performance across the book of business.",
  Total: "Aggregate performance across all booking categories.",
};

interface CategorySectionProps {
  data: CategoryData;
}

export function CategorySection({ data }: CategorySectionProps) {
  const description = CATEGORY_DESCRIPTIONS[data.category] ?? "";

  return (
    <section className="py-8">
      <div className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight text-text-primary">
          {data.category}
        </h2>
        <p className="mt-1 text-sm text-text-secondary leading-relaxed">
          {description}
        </p>
      </div>

      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 items-center pb-2 border-b border-border mb-1">
        <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">Metric</span>
        <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary text-right min-w-[80px]">Current</span>
        <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary text-right min-w-[80px]">Prior YTD</span>
        <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary text-right min-w-[72px]">Change</span>
      </div>

      {data.rows.map((row, i) => (
        <MetricRow key={row.sortOrder} row={row} isLast={i === data.rows.length - 1} />
      ))}
    </section>
  );
}
