// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  Tooltip: () => null,
  Legend: () => null,
}));

describe('ChartTooltipContent', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('uses an explicit horizontal gap between the series label and value', async () => {
    const config = {
      previous: {
        label: 'Previous year',
        color: 'var(--chart-2)',
      },
    } satisfies ChartConfig;

    await act(async () => {
      root.render(
        React.createElement(
          ChartContainer,
          {
            config,
            children: React.createElement(ChartTooltipContent, {
              active: true,
              indicator: 'line',
              payload: [
                {
                  dataKey: 'previous',
                  name: 'previous',
                  value: 9,
                  color: 'var(--chart-2)',
                  payload: { fill: 'var(--chart-2)' },
                },
              ],
            }),
          },
        ),
      );
    });

    const layoutRow = container.querySelector('.grid.grid-cols-\\[minmax\\(0\\2c 1fr\\)_auto\\]');
    expect(layoutRow).not.toBeNull();
    expect(layoutRow?.getAttribute('class')).toContain('gap-x-4');
  });

  it('preserves the series label while formatting only the numeric value', async () => {
    const config = {
      previous: {
        label: 'Previous year',
        color: 'var(--chart-2)',
      },
    } satisfies ChartConfig;

    await act(async () => {
      root.render(
        React.createElement(ChartContainer, {
          config,
          children: React.createElement(ChartTooltipContent, {
            active: true,
            indicator: 'line',
            valueFormatter: (value: number) => `$${value.toLocaleString()}`,
            payload: [
              {
                dataKey: 'previous',
                name: 'previous',
                value: 9021,
                color: 'var(--chart-2)',
                payload: { fill: 'var(--chart-2)' },
              },
            ],
          }),
        }),
      );
    });

    expect(container.textContent).toContain('Previous year');
    expect(container.textContent).toContain('$9,021');
  });
});
