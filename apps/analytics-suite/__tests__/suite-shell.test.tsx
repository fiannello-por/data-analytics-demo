import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import HomePage from '@/app/page';

describe('analytics suite homepage registry', () => {
  it('renders a real table surface with actionable dashboard rows', () => {
    const markup = renderToStaticMarkup(React.createElement(HomePage));

    expect(markup).toContain('Dashboard registry');
    expect(markup).toContain('<table');
    expect(markup).toContain('Dashboard name');
    expect(markup).toContain('Owner');
    expect(markup).toContain('Updated at');
    expect(markup).toContain('Changelog');
    expect(markup).toContain('Status');
    expect(markup).toContain('Open actions for Sales Performance');
    expect(markup).toContain('Rows per page');
    expect(markup).toContain('Previous');
    expect(markup).toContain('Next');
    expect(markup).not.toContain('Suite pattern in progress');
  });

  it('maps status labels to the correct dashboard rows', () => {
    const markup = renderToStaticMarkup(React.createElement(HomePage));

    expect(markup).toMatch(
      /<tr[^>]*>[\s\S]*?href="\/dashboards\/sales-performance"[\s\S]*?Sales Performance[\s\S]*?Live[\s\S]*?<\/tr>/,
    );
    expect(markup).toMatch(
      /<tr[^>]*>[\s\S]*?href="\/dashboards\/pipeline-health"[\s\S]*?Pipeline Health[\s\S]*?WIP[\s\S]*?<\/tr>/,
    );
  });

  it('removes the stale shell card-grid copy', () => {
    const markup = renderToStaticMarkup(React.createElement(HomePage));

    expect(markup).not.toContain('Shared shell, local analytical intent');
  });
});
