export const CHART_PALETTE_FALLBACK = [
  '#66b2f0',
  '#c87ddf',
  '#5db8c4',
  '#9cc57e',
  '#e1717a',
  '#d39d6c',
] as const;

export function resolveChartColor(index: number): string {
  const fallback =
    CHART_PALETTE_FALLBACK[index - 1] ?? CHART_PALETTE_FALLBACK[0];

  if (typeof window === 'undefined') {
    return fallback;
  }

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(`--chart-${index}`)
    .trim();

  return value || fallback;
}

export function withAlpha(color: string, alpha: number): string {
  const normalized = color.trim();
  const hex = normalized.startsWith('#') ? normalized.slice(1) : normalized;

  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    const red = Number.parseInt(hex.slice(0, 2), 16);
    const green = Number.parseInt(hex.slice(2, 4), 16);
    const blue = Number.parseInt(hex.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  return normalized;
}
