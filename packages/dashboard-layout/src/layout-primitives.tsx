import type { CSSProperties } from "react";

import type {
  DashboardGridProps,
  DashboardSplitProps,
  DashboardStackProps,
} from "./types";

function toGapValue(gap: number | string | undefined, fallback: string) {
  return typeof gap === "number" ? `${gap}px` : gap ?? fallback;
}

export function DashboardSplit({
  leading,
  trailing,
  gap = "1rem",
  align = "stretch",
  style,
}: DashboardSplitProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: align,
        gap: toGapValue(gap, "1rem"),
        minWidth: 0,
        ...style,
      }}
    >
      <div data-dashboard-split-slot="leading" style={{ flex: "0 0 auto" }}>
        {leading}
      </div>
      <div
        data-dashboard-split-slot="trailing"
        style={{ flex: "1 1 0%", minWidth: 0 }}
      >
        {trailing}
      </div>
    </div>
  );
}

export function DashboardGrid({
  children,
  columns,
  minColumnWidth = "16rem",
  gap = "1rem",
  style,
}: DashboardGridProps) {
  const resolvedMinWidth =
    typeof minColumnWidth === "number" ? `${minColumnWidth}px` : minColumnWidth;
  const templateColumns =
    typeof columns === "number"
      ? `repeat(${columns}, minmax(0, 1fr))`
      : `repeat(auto-fit, minmax(${resolvedMinWidth}, 1fr))`;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: templateColumns,
        gap: toGapValue(gap, "1rem"),
        minWidth: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function DashboardStack({
  children,
  gap = "1rem",
  style,
}: DashboardStackProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: toGapValue(gap, "1rem"),
        minWidth: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
