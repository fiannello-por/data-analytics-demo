import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

describe('analytics suite platform page', () => {
  it('renders dashboard budget summaries and cache indicators', async () => {
    const { default: Page } = await import('@/app/platform/page');
    const html = renderToStaticMarkup(await Page());

    expect(html).toContain('Platform reporting');
    expect(html).toContain('Sales Performance');
    expect(html).toContain('Pipeline Health');
    expect(html).toContain('Cache hit rate');
    expect(html).toContain('Query count');
    expect(html).toContain('Bytes processed');
  }, 15000);
});
