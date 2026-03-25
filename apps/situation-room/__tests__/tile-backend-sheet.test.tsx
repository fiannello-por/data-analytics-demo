// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TileBackendTrace } from '@/lib/dashboard/contracts';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe('TileBackendSheet', () => {
  let container: HTMLDivElement;
  let root: Root;
  let previousActEnvironment: boolean | undefined;

  const trace: TileBackendTrace = {
    kind: 'composite',
    model: 'sales_dashboard_v2_opportunity_base',
    includes: ['Bookings $', 'Bookings #'],
    compiledAt: '2026-03-25T12:00:00.000Z',
    cacheStatus: 'miss',
    sqlRunnerUrl:
      'https://lightdash.example.com/projects/project-123/sqlRunner',
    githubModelUrl:
      'https://github.com/fiannello-por/data-analytics-demo/blob/codex%2Fsituation-room-dashboard-refinement/lightdash/models/sales_dashboard_v2_opportunity_base.yml',
    semanticYamlSnippet: 'name: sales_dashboard_v2_opportunity_base',
    executions: [
      {
        label: 'Current window',
        semanticRequest: {
          model: 'sales_dashboard_v2_opportunity_base',
          measures: ['bookings_amount'],
        },
        compiledSql: 'select 1',
        exploreUrl:
          'https://lightdash.example.com/projects/project-123/tables/sales_dashboard_v2_opportunity_base?create_saved_chart_version=%7B%7D',
      },
    ],
  };

  beforeEach(() => {
    previousActEnvironment = (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  it('renders semantic query and SQL tabs with trace metadata', async () => {
    const { TileBackendSheet } =
      await import('@/components/dashboard/tile-backend-sheet');

    await act(async () => {
      root.render(
        React.createElement(TileBackendSheet, {
          title: 'Bookings $',
          trace,
          defaultOpen: true,
        }),
      );
    });

    expect(document.body.textContent).toContain('Bookings $');
    expect(document.body.textContent).toContain('Composite tile');
    expect(document.body.textContent).toContain('Fields');
    expect(document.body.textContent).toContain('bookings_amount');
    expect(document.body.textContent).toContain('Semantic query');
    expect(document.body.textContent).toContain('SQL');
    expect(document.body.textContent).toContain('Current window');
    expect(document.body.textContent).toContain(
      'sales_dashboard_v2_opportunity_base',
    );
    expect(document.body.textContent).toContain('Explore in Lightdash');

    const yamlButton = Array.from(document.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Semantic source YAML',
    );

    await act(async () => {
      yamlButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(document.body.textContent).toContain('Open in GitHub');

    const sqlTab = Array.from(document.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'SQL',
    );

    expect(sqlTab).toBeTruthy();

    await act(async () => {
      sqlTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(document.body.textContent).toContain('Open in Lightdash');
  }, 15000);
});
