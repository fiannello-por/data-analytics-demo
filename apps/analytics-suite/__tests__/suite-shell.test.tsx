import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import HomePage from '@/app/page';

describe('analytics suite shell', () => {
  it('renders the homepage dashboard registry surface', () => {
    const markup = renderToStaticMarkup(React.createElement(HomePage));

    expect(markup).toContain('Dashboard registry');
    expect(markup).toContain('RevOps Analytics Suite');
    expect(markup).toContain('Dashboard name');
    expect(markup).toContain('Owner');
    expect(markup).toContain('Updated at');
    expect(markup).toContain('Changelog');
    expect(markup).toContain('Status');
    expect(markup).toContain('Sales Performance');
    expect(markup).toContain('Pipeline Health');
    expect(markup).toContain('Live');
    expect(markup).toContain('WIP');
    expect(markup).toContain('Action');
    expect(markup).toContain('Rows per page');
    expect(markup).toContain('Previous');
    expect(markup).toContain('Next');
  });
});
