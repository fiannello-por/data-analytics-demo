import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import HomePage from '@/app/page';

describe('analytics suite shell', () => {
  it('renders a shared shell with multiple dashboard links', () => {
    const markup = renderToStaticMarkup(React.createElement(HomePage));

    expect(markup).toContain('RevOps Analytics Suite');
    expect(markup).toContain('Sales Performance');
    expect(markup).toContain('Pipeline Health');
    expect(markup).toContain('href="/dashboards/sales-performance"');
  });
});
