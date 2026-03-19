export type ChangeDirection = 'positive' | 'negative' | 'neutral';

export interface ParsedChange {
  direction: ChangeDirection;
  display: string;
}

export function parseChange(raw: string): ParsedChange {
  if (!raw || raw === '-') {
    return { direction: 'neutral', display: raw || '-' };
  }

  const numeric = parseFloat(raw.replace(/[^0-9.\-+]/g, ''));

  if (isNaN(numeric) || numeric === 0) {
    return { direction: 'neutral', display: raw };
  }

  if (numeric > 0 || raw.startsWith('+')) {
    return { direction: 'positive', display: raw };
  }

  if (numeric < 0) {
    return { direction: 'negative', display: raw };
  }

  return { direction: 'neutral', display: raw };
}

const directionStyles: Record<ChangeDirection, string> = {
  positive: 'text-positive bg-positive-bg border border-positive-border',
  negative: 'text-negative bg-negative-bg border border-negative-border',
  neutral: 'text-neutral-change bg-neutral-change-bg border border-border-subtle',
};

const directionArrows: Record<ChangeDirection, string> = {
  positive: '↑',
  negative: '↓',
  neutral: '',
};

interface ChangeIndicatorProps {
  value: string;
}

export function ChangeIndicator({ value }: ChangeIndicatorProps) {
  const { direction, display } = parseChange(value);
  const arrow = directionArrows[direction];

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-medium tabular-nums ${directionStyles[direction]}`}
    >
      {arrow && <span>{arrow}</span>}
      {display}
    </span>
  );
}
