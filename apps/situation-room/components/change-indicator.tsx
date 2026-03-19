export type ChangeDirection = "positive" | "negative" | "neutral";

export interface ParsedChange {
  direction: ChangeDirection;
  display: string;
}

export function parseChange(raw: string): ParsedChange {
  if (!raw || raw === "-") {
    return { direction: "neutral", display: raw || "-" };
  }

  const numeric = parseFloat(raw.replace(/[^0-9.\-+]/g, ""));

  if (isNaN(numeric) || numeric === 0) {
    return { direction: "neutral", display: raw };
  }

  if (numeric > 0 || raw.startsWith("+")) {
    return { direction: "positive", display: raw };
  }

  if (numeric < 0) {
    return { direction: "negative", display: raw };
  }

  return { direction: "neutral", display: raw };
}

const directionStyles: Record<ChangeDirection, string> = {
  positive: "text-positive bg-positive-bg",
  negative: "text-negative bg-negative-bg",
  neutral: "text-neutral-change bg-surface-sunken",
};

interface ChangeIndicatorProps {
  value: string;
}

export function ChangeIndicator({ value }: ChangeIndicatorProps) {
  const { direction, display } = parseChange(value);

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium tabular-nums ${directionStyles[direction]}`}
    >
      {display}
    </span>
  );
}
