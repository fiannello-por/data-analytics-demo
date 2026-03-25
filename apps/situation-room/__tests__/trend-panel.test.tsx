// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrendPanel } from '@/components/dashboard/trend-panel';
import type { TileTrendPayload } from '@/lib/dashboard/contracts';

vi.mock('@/components/trend-chart', () => ({
  TrendChart: () =>
    React.createElement('div', { 'data-testid': 'trend-chart' }, 'chart'),
}));

describe('TrendPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  const trend: TileTrendPayload = {
    category: 'New Logo',
    tileId: 'new_logo_sql',
    label: 'SQL',
    grain: 'weekly',
    xAxisFieldLabel: 'Created Date',
    currentWindowLabel: 'Jan 1, 2026 - Mar 31, 2026',
    previousWindowLabel: 'Jan 1, 2025 - Mar 31, 2025',
    points: [],
  };

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

  it('renders the trend subsection with semantic x-axis context', async () => {
    await act(async () => {
      root.render(React.createElement(TrendPanel, { trend, isVisible: true }));
    });

    expect(container.textContent).toContain('SQL');
    expect(container.textContent).toContain('Weekly trend');
    expect(container.textContent).toContain('Jan 1, 2026 to Mar 31, 2026');
    expect(container.textContent).toContain(
      'Compared with Jan 1, 2025 to Mar 31, 2025',
    );
    expect(container.textContent).not.toContain('weekly');
    expect(
      container.querySelector('[data-testid="trend-chart"]'),
    ).not.toBeNull();
  });

  it('renders an instructional empty state before a metric is selected', async () => {
    await act(async () => {
      root.render(React.createElement(TrendPanel, { trend, isVisible: false }));
    });

    expect(container.textContent).toContain('See the line chart');
    expect(container.textContent).toContain('Click any metric in the table');
    expect(container.querySelector('[data-testid="trend-chart"]')).toBeNull();
  });
});
