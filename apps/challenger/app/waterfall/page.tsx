// apps/challenger/app/waterfall/page.tsx
"use client";

import { useEffect, useState } from "react";
import type { QuerySpan } from "@/lib/waterfall-types";

const SECTION_COLORS: Record<string, string> = {
  scorecard: "#2563eb",
  trend: "#16a34a",
  closedWon: "#ea580c",
  filters: "#8b5cf6",
  overview: "#0891b2",
};

function getColor(section: string): string {
  return SECTION_COLORS[section] ?? "#6b7280";
}

interface TooltipState {
  spanId: string;
  x: number;
  y: number;
}

function SpanBar({
  span,
  maxMs,
  onHover,
  onLeave,
}: {
  span: QuerySpan;
  maxMs: number;
  onHover: (id: string, e: React.MouseEvent) => void;
  onLeave: () => void;
}) {
  const leftPct = (span.startMs / maxMs) * 100;
  const widthPct = ((span.endMs - span.startMs) / maxMs) * 100;

  return (
    <div
      style={{
        position: "relative",
        height: 24,
        marginBottom: 2,
        display: "flex",
        alignItems: "center",
      }}
    >
      {/* Label */}
      <div
        style={{
          position: "absolute",
          left: 0,
          width: 220,
          fontSize: 11,
          color: "#374151",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          lineHeight: "24px",
        }}
        title={span.id}
      >
        {span.id}
      </div>

      {/* Bar area */}
      <div
        style={{
          position: "absolute",
          left: 228,
          right: 0,
          height: 24,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: `${leftPct}%`,
            width: `${Math.max(widthPct, 0.3)}%`,
            height: 24,
            backgroundColor: getColor(span.section),
            borderRadius: 3,
            opacity: 0.85,
            cursor: "pointer",
          }}
          onMouseEnter={(e) => onHover(span.id, e)}
          onMouseLeave={onLeave}
        />
      </div>
    </div>
  );
}

function Tooltip({
  span,
  position,
}: {
  span: QuerySpan;
  position: { x: number; y: number };
}) {
  const duration = span.endMs - span.startMs;
  return (
    <div
      style={{
        position: "fixed",
        left: position.x + 12,
        top: position.y - 10,
        backgroundColor: "#1f2937",
        color: "#f9fafb",
        padding: "8px 12px",
        borderRadius: 6,
        fontSize: 12,
        lineHeight: 1.7,
        zIndex: 9999,
        pointerEvents: "none",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        maxWidth: 280,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4, wordBreak: "break-all" }}>
        {span.id}
      </div>
      <div>
        <span style={{ color: "#9ca3af" }}>section:</span> {span.section}
      </div>
      <div>
        <span style={{ color: "#9ca3af" }}>priority:</span> {span.priority}
      </div>
      <div>
        <span style={{ color: "#9ca3af" }}>start → end:</span> {span.startMs.toFixed(0)}ms →{" "}
        {span.endMs.toFixed(0)}ms
      </div>
      <div>
        <span style={{ color: "#9ca3af" }}>duration:</span> {duration.toFixed(0)}ms
      </div>
      <div>
        <span style={{ color: "#9ca3af" }}>limiterWait:</span> {span.limiterWaitMs.toFixed(0)}ms
      </div>
      <div>
        <span style={{ color: "#9ca3af" }}>submit:</span> {span.submitMs.toFixed(0)}ms
      </div>
      <div>
        <span style={{ color: "#9ca3af" }}>poll:</span> {span.pollMs.toFixed(0)}ms
      </div>
      <div>
        <span style={{ color: "#9ca3af" }}>ldExec:</span> {span.lightdashExecMs.toFixed(0)}ms
      </div>
      <div>
        <span style={{ color: "#9ca3af" }}>ldPage:</span> {span.lightdashPageMs.toFixed(0)}ms
      </div>
      <div>
        <span style={{ color: "#9ca3af" }}>cacheHit:</span>{" "}
        <span style={{ color: span.cacheHit ? "#4ade80" : "#f87171" }}>
          {span.cacheHit ? "yes" : "no"}
        </span>
      </div>
    </div>
  );
}

export default function WaterfallPage() {
  const [spans, setSpans] = useState<QuerySpan[] | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const raw = sessionStorage.getItem("challenger-waterfall");
    if (raw) {
      try {
        setSpans(JSON.parse(raw) as QuerySpan[]);
      } catch {
        setSpans([]);
      }
    } else {
      setSpans([]);
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  if (spans === null) {
    return (
      <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        Loading...
      </div>
    );
  }

  if (spans.length === 0) {
    return (
      <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Waterfall</h1>
        <p style={{ color: "#6b7280" }}>
          No waterfall data. Load a dashboard tab first, then navigate here.
        </p>
      </div>
    );
  }

  // Compute stats
  const maxMs = Math.max(...spans.map((s) => s.endMs));
  const totalDuration = spans.reduce((sum, s) => sum + (s.endMs - s.startMs), 0);
  const effectiveParallelism = maxMs > 0 ? totalDuration / maxMs : 1;

  // Group by section, preserving insertion order of first appearance
  const sectionOrder: string[] = [];
  const grouped: Record<string, QuerySpan[]> = {};
  for (const span of spans) {
    if (!grouped[span.section]) {
      grouped[span.section] = [];
      sectionOrder.push(span.section);
    }
    grouped[span.section].push(span);
  }

  // Sort spans within each section by startMs
  for (const sec of sectionOrder) {
    grouped[sec].sort((a, b) => a.startMs - b.startMs);
  }

  const activeSpan = tooltip ? spans.find((s) => s.id === tooltip.spanId) : null;

  // Time axis markers
  const markers = [0, 25, 50, 75, 100];

  return (
    <div
      style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}
      onMouseMove={handleMouseMove}
    >
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Waterfall Visualization</h1>

      {/* Summary stats */}
      <div
        style={{
          display: "flex",
          gap: 32,
          marginBottom: 24,
          padding: "12px 16px",
          backgroundColor: "#f3f4f6",
          borderRadius: 6,
          fontSize: 13,
        }}
      >
        <div>
          <span style={{ color: "#6b7280" }}>Total spans: </span>
          <strong>{spans.length}</strong>
        </div>
        <div>
          <span style={{ color: "#6b7280" }}>Wall time: </span>
          <strong>{maxMs.toFixed(0)} ms</strong>
        </div>
        <div>
          <span style={{ color: "#6b7280" }}>Effective parallelism: </span>
          <strong>{effectiveParallelism.toFixed(2)}×</strong>
        </div>
      </div>

      {/* Chart */}
      <div style={{ position: "relative" }}>
        {sectionOrder.map((section) => (
          <div key={section} style={{ marginBottom: 16 }}>
            {/* Section header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  backgroundColor: getColor(section),
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#111827",
                  textTransform: "capitalize",
                }}
              >
                {section}
              </span>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>
                ({grouped[section].length} span{grouped[section].length !== 1 ? "s" : ""})
              </span>
            </div>

            {/* Spans */}
            {grouped[section].map((span) => (
              <SpanBar
                key={span.id}
                span={span}
                maxMs={maxMs}
                onHover={(id, e) => {
                  setTooltip({ spanId: id, x: e.clientX, y: e.clientY });
                  setTooltipPos({ x: e.clientX, y: e.clientY });
                }}
                onLeave={() => setTooltip(null)}
              />
            ))}
          </div>
        ))}

        {/* Time axis */}
        <div
          style={{
            position: "relative",
            marginTop: 8,
            paddingLeft: 228,
          }}
        >
          <div
            style={{
              position: "relative",
              height: 20,
              borderTop: "1px solid #d1d5db",
            }}
          >
            {markers.map((pct) => (
              <div
                key={pct}
                style={{
                  position: "absolute",
                  left: `${pct}%`,
                  transform: "translateX(-50%)",
                  top: 4,
                  fontSize: 10,
                  color: "#6b7280",
                  whiteSpace: "nowrap",
                }}
              >
                {pct === 0
                  ? "0"
                  : pct === 100
                  ? `${maxMs.toFixed(0)}ms`
                  : `${((pct / 100) * maxMs).toFixed(0)}ms`}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && activeSpan && (
        <Tooltip span={activeSpan} position={tooltipPos} />
      )}
    </div>
  );
}
