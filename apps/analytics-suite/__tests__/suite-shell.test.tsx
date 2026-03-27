import * as React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import HomePage from '@/app/page';

const appRoot = path.resolve(__dirname, '..');

describe('analytics suite homepage registry', () => {
  it('renders a centered workflow table without shell framing', () => {
    const markup = renderToStaticMarkup(React.createElement(HomePage));

    expect(markup).toContain('Ligthdash as a Semantic Layer POC');
    expect(markup).toContain('<table');
    expect(markup).toContain('Dashboard name');
    expect(markup).toContain('Owner');
    expect(markup).toContain('Author');
    expect(markup).toContain('Updated at');
    expect(markup).toContain('Status');
    expect(markup).toContain('Open actions for Sales Performance');
    expect(markup).toContain('Open actions for Pipeline Health');
    expect(markup).toContain('Revenue Velocity');
    expect(markup).toContain('RevOps');
    expect(markup).toContain('Facundo Iannello');
    expect(markup).toContain('Open actions for Revenue Velocity');
    expect(markup).toContain('Rows per page');
    expect(markup).toContain('Page 1 of 2');
    expect(markup).toContain(
      'href="https://data-analytics-demo-orcin.vercel.app/?dashboard=sales-performance"',
    );
    expect(markup).toContain('href="/dashboards/sales-performance"');
    expect(markup).not.toContain('RevOps Analytics Suite');
  });

  it('maps status labels to the correct dashboard rows', () => {
    const markup = renderToStaticMarkup(React.createElement(HomePage));

    expect(markup).toMatch(
      /<tr[^>]*>[\s\S]*?href="\/dashboards\/sales-performance"[\s\S]*?Sales Performance[\s\S]*?Live[\s\S]*?<\/tr>/,
    );
    expect(markup).toMatch(
      /<tr[^>]*>[\s\S]*?Pipeline Health[\s\S]*?WIP[\s\S]*?<\/tr>/,
    );
    expect(markup).not.toContain('href="/dashboards/pipeline-health"');
    expect(markup).not.toContain('href="/dashboards/revenue-velocity"');
  });

  it('keeps internal dashboard navigation in the same tab', () => {
    const source = fs.readFileSync(
      path.join(appRoot, 'components/homepage/dashboard-modules-table.tsx'),
      'utf8',
    );

    expect(source).not.toContain(
      'href={row.original.href}\n          target="_blank"',
    );
    expect(source).not.toContain(
      '<Link href={row.href} target="_blank" rel="noreferrer" />',
    );
  });

  it('removes the stale shell card-grid copy', () => {
    const markup = renderToStaticMarkup(React.createElement(HomePage));

    expect(markup).not.toContain('Shared shell, local analytical intent');
    expect(markup).not.toContain('Homepage registry');
    expect(markup).not.toContain('Dashboard registry');
  });
});
