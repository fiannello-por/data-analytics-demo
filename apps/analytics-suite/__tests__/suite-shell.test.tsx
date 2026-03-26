import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import HomePage from '@/app/page';

describe('analytics suite homepage registry', () => {
  it('renders a real table surface with actionable dashboard rows', () => {
    const markup = renderToStaticMarkup(React.createElement(HomePage));

    expect(markup).toMatch(/registry/i);
    expect(markup).toContain('<table');
    expect(markup).toContain('Dashboard name');
    expect(markup).toContain('Owner');
    expect(markup).toContain('Updated at');
    expect(markup).toContain('Changelog');
    expect(markup).toContain('Status');
    expect(markup).toContain('Sales Performance');
    expect(markup).toContain('Pipeline Health');
    expect(markup).toContain('href="/dashboards/sales-performance"');
    expect(markup).toContain('href="/dashboards/pipeline-health"');
    expect(markup).toContain('Rows per page');
    expect(markup).toContain('Previous');
    expect(markup).toContain('Next');
  });

  it('maps status labels to the correct dashboard rows', () => {
    const markup = renderToStaticMarkup(React.createElement(HomePage));

    expect(markup).toMatch(/Sales Performance[\s\S]{0,260}Live/);
    expect(markup).toMatch(/Pipeline Health[\s\S]{0,260}WIP/);
    expect(markup).not.toContain('active');
    expect(markup).not.toContain('demo');
  });

  it('removes the stale shell card-grid copy', () => {
    const markup = renderToStaticMarkup(React.createElement(HomePage));

    expect(markup).not.toContain('Shared shell, local analytical intent');
  });
});
