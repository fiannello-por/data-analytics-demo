// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import {
  CHART_PALETTE_FALLBACK,
  resolveChartColor,
  withAlpha,
} from '@/lib/chart-palette';

describe('chart palette', () => {
  afterEach(() => {
    document.documentElement.style.removeProperty('--chart-1');
  });

  it('uses the configured fallback palette when no CSS variable is set', () => {
    expect(resolveChartColor(1)).toBe(CHART_PALETTE_FALLBACK[0]);
    expect(resolveChartColor(2)).toBe(CHART_PALETTE_FALLBACK[1]);
  });

  it('reads chart colors from CSS variables when available', () => {
    document.documentElement.style.setProperty('--chart-1', '#123456');

    expect(resolveChartColor(1)).toBe('#123456');
  });

  it('converts hex palette colors to rgba strings for fills', () => {
    expect(withAlpha('#66b2f0', 0.16)).toBe('rgba(102, 178, 240, 0.16)');
  });
});
