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
    <span className="pill-status" data-direction={direction}>
      {arrow && <span>{arrow}</span>}
      {display}
    </span>
  );
}
