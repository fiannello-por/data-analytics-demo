import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

describe('semantic system page', () => {
  it('renders hierarchical semantic system containers and nested runtime stages', async () => {
    const { default: Page } = await import('@/app/semantic-system/page');
    const html = renderToStaticMarkup(await Page());

    expect(html).toContain('Semantic system');
    expect(html).toContain('Sales Performance module');
    expect(html).toContain('Pipeline Health module');
    expect(html).toContain('Local semantic registry');
    expect(html).toContain('Shared analytics runtime');
    expect(html).toContain('Lightdash compile');
    expect(html).toContain('BigQuery execute');
    expect(html).toContain('OpportunityViewTable');
  });
});
