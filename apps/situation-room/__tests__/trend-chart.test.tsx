// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrendChart } from '@/components/trend-chart';
import type { TileTrendPayload } from '@/lib/dashboard/contracts';

vi.mock('@/lib/trend-chart-model', async () => {
  const actual = await vi.importActual<typeof import('@/lib/trend-chart-model')>(
    '@/lib/trend-chart-model',
  );

  return {
    ...actual,
    getTrendAxisWidth: () => 52,
  };
});

const lineProps: Array<Record<string, unknown>> = [];
const axisProps: Array<{ type: 'x' | 'y'; props: Record<string, unknown> }> = [];
const tooltipProps: Array<Record<string, unknown>> = [];
const chartTooltipProps: Array<Record<string, unknown>> = [];
const gridProps: Array<Record<string, unknown>> = [];
const chartContainerProps: Array<Record<string, unknown>> = [];

vi.mock('recharts', () => ({
  CartesianGrid: (props: Record<string, unknown>) => {
    gridProps.push(props);
    return React.createElement('div', { 'data-testid': 'cartesian-grid', ...props });
  },
  LineChart: ({ children, ...props }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'line-chart', ...props }, children),
  Line: (props: Record<string, unknown>) => {
    lineProps.push(props);
    return React.createElement('div', { 'data-testid': `line-${String(props.dataKey)}` });
  },
  XAxis: (props: Record<string, unknown>) => {
    axisProps.push({ type: 'x', props });
    return React.createElement('div', { 'data-testid': 'x-axis' });
  },
  YAxis: (props: Record<string, unknown>) => {
    axisProps.push({ type: 'y', props });
    return React.createElement('div', { 'data-testid': 'y-axis' });
  },
}));

vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({
    children,
    className,
    id,
  }: {
    children: React.ReactNode;
    className?: string;
    id?: string;
  }) => {
    chartContainerProps.push({ className, id });
    return React.createElement('div', { 'data-testid': 'chart-container', className, id }, children);
  },
  ChartTooltip: (props: Record<string, unknown>) => {
    chartTooltipProps.push(props);
    return React.createElement(
      'div',
      { 'data-testid': 'chart-tooltip' },
      props.content as React.ReactNode,
    );
  },
  ChartTooltipContent: (props: Record<string, unknown>) => {
    tooltipProps.push(props);
    return React.createElement('div', { 'data-testid': 'chart-tooltip-content' });
  },
}));

describe('TrendChart', () => {
  let container: HTMLDivElement;
  let root: Root;

  const trend: TileTrendPayload = {
    category: 'New Logo',
    tileId: 'new_logo_bookings_amount',
    label: 'Bookings $',
    grain: 'weekly',
    currentWindowLabel: 'Jan 1, 2026 - Mar 31, 2026',
    previousWindowLabel: 'Jan 1, 2025 - Mar 31, 2025',
    points: [
      {
        bucketKey: '1',
        bucketLabel: 'Jan 05',
        currentValue: 12432,
        previousValue: 9021,
      },
    ],
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    lineProps.length = 0;
    axisProps.length = 0;
    tooltipProps.length = 0;
    chartTooltipProps.length = 0;
    gridProps.length = 0;
    chartContainerProps.length = 0;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('uses compact inline legend styling and keeps the previous line solid but lighter', async () => {
    await act(async () => {
      root.render(React.createElement(TrendChart, { trend }));
    });

    expect(container.textContent).toContain('Current period');
    expect(container.textContent).toContain('Previous year');

    const currentLine = lineProps.find((line) => line.dataKey === 'current');
    const previousLine = lineProps.find((line) => line.dataKey === 'previous');
    expect(lineProps.map((line) => line.dataKey)).toEqual(['previous', 'current']);
    expect(currentLine?.type).toBe('monotone');
    expect(previousLine?.type).toBe('monotone');
    expect(currentLine?.strokeWidth).toBe(3);
    expect(previousLine?.strokeWidth).toBe(1.5);
    expect(previousLine?.strokeDasharray).toBeUndefined();
    expect(previousLine?.strokeOpacity).toBe(0.68);

    const xAxis = axisProps.find((axis) => axis.type === 'x');
    const yAxis = axisProps.find((axis) => axis.type === 'y');
    expect(typeof xAxis?.props.tickFormatter).toBe('function');
    expect((xAxis?.props.tickFormatter as (value: string) => string)('Jan 05')).toBe('Jan 5');
    expect(xAxis?.props.tickLine).toEqual(
      expect.objectContaining({ stroke: 'var(--border)', strokeWidth: 1 }),
    );
    expect(xAxis?.props.tickSize).toBe(6);
    expect(xAxis?.props.axisLine).toEqual(
      expect.objectContaining({ stroke: 'var(--border)', strokeWidth: 1 }),
    );
    expect(typeof yAxis?.props.tickFormatter).toBe('function');
    expect((yAxis?.props.tickFormatter as (value: number) => string)(12432)).toBe('$12.4K');
    expect(yAxis?.props.width).toBe(52);
    expect(yAxis?.props.tickLine).toEqual(
      expect.objectContaining({ stroke: 'var(--border)', strokeWidth: 1 }),
    );
    expect(yAxis?.props.tickSize).toBe(6);
    expect(yAxis?.props.axisLine).toEqual(
      expect.objectContaining({ stroke: 'var(--border)', strokeWidth: 1 }),
    );
    const grid = gridProps.at(-1);
    expect(grid).toEqual(
      expect.objectContaining({
        vertical: false,
        stroke: 'var(--border)',
        strokeWidth: 1,
      }),
    );
    const tooltip = tooltipProps.at(-1) ?? (chartTooltipProps.at(-1)?.content as { props?: Record<string, unknown> } | undefined)?.props;
    expect(tooltip?.formatter).toBeUndefined();
    expect(typeof tooltip?.valueFormatter).toBe('function');
    expect(
      (tooltip?.valueFormatter as (value: number) => React.ReactNode)(12432),
    ).toBe('$12,432');
    expect(
      container.querySelector('[data-testid="chart-container"]')?.getAttribute('class'),
    ).toContain('aspect-auto');
    expect(
      container.querySelector('[data-testid="chart-container"]')?.getAttribute('class'),
    ).toContain('h-full');
    expect(
      container.querySelector('[data-testid="chart-container"]')?.getAttribute('class'),
    ).toContain('flex-1');
    expect(chartContainerProps.at(-1)?.id).toBe(
      'trend-chart-new-logo-new-logo-bookings-amount',
    );
  });
});
