// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  Tooltip: () => null,
  Legend: () => null,
}));

describe('ChartContainer', () => {
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

  it('keeps chart theming hooks without imposing layout geometry', async () => {
    const config = {
      series: {
        label: 'Series',
        color: 'var(--chart-1)',
      },
    } satisfies ChartConfig;

    await act(async () => {
      root.render(
        React.createElement(ChartContainer, {
          id: 'sales',
          config,
          children: React.createElement('div', {
            'data-testid': 'chart-child',
          }),
        }),
      );
    });

    const wrapper = container.querySelector('[data-slot="chart"]');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute('data-chart')).toBe('chart-sales');
    expect(wrapper?.getAttribute('class')).not.toContain('aspect-video');
    expect(wrapper?.getAttribute('class')).not.toContain('justify-center');
    expect(wrapper?.getAttribute('class')).not.toContain('flex');
    expect(container.querySelector('style')?.textContent).toContain(
      '[data-chart=chart-sales]',
    );
    expect(container.querySelector('style')?.textContent).toContain(
      '--color-series: var(--chart-1);',
    );
  });
});
