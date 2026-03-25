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

  it('uses the denser preset-inspired card language on the home page', () => {
    const markup = renderToStaticMarkup(React.createElement(HomePage));

    expect(markup).toContain('rounded-xl bg-card p-1 ring-1 ring-foreground/10');
    expect(markup).toContain('ring-1 ring-foreground/10');
    expect(markup).toContain('text-[11px] font-medium uppercase tracking-[0.18em]');
    expect(markup).toContain('text-2xl sm:text-[2rem]');
    expect(markup).toContain('h-7 gap-1 rounded-[min(var(--radius-md),12px)]');
  });
});
