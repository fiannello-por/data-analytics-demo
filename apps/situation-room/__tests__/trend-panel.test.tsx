// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrendPanel } from '@/components/dashboard/trend-panel';
import type { TileTrendPayload } from '@/lib/dashboard/contracts';

vi.mock('@/components/trend-chart', () => ({
  TrendChart: () => React.createElement('div', { 'data-testid': 'trend-chart' }, 'chart'),
}));

describe('TrendPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  const trend: TileTrendPayload = {
    category: 'New Logo',
    tileId: 'new_logo_sql',
    label: 'SQL',
    grain: 'weekly',
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

  it('renders compact trend context without the grain badge', async () => {
    await act(async () => {
      root.render(React.createElement(TrendPanel, { trend }));
    });

    expect(container.textContent).toContain('Weekly trend');
    expect(container.textContent).toContain('Jan 1, 2026 to Mar 31, 2026');
    expect(container.textContent).toContain('Compared with Jan 1, 2025 to Mar 31, 2025');
    expect(container.textContent).not.toContain('weekly');
    expect(container.querySelector('[data-slot="card"]')?.getAttribute('class')).toContain(
      'h-full',
    );
    expect(container.querySelector('[data-slot="card"]')?.getAttribute('class')).toContain(
      'ring-0',
    );
    expect(
      container.querySelector('[data-slot="card-content"]')?.getAttribute('class'),
    ).toContain('flex-1');
  });
});
