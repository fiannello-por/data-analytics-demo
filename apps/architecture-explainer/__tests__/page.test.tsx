import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/components/architecture/explorer-screen', () => ({
  ArchitectureExplorerScreen: () =>
    React.createElement(
      'section',
      { 'data-testid': 'architecture-explorer-screen' },
      'All Snapshot Trend Focus connections',
    ),
}));

describe('architecture explainer page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the graph-first shell for Sales Performance Dashboard', async () => {
    const { default: Page } = await import('@/app/page');
    const html = renderToStaticMarkup(await Page());

    expect(html).toContain('Sales Performance Dashboard');
    expect(html).toContain('Architecture Explainer');
    expect(html).toContain('All');
    expect(html).toContain('Focus connections');
  });
});
