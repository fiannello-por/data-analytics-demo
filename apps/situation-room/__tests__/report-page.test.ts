import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';

async function renderPage() {
  const { default: Page } = await import('../app/page');
  return Page({});
}

describe('SituationRoomPage', () => {
  it('renders an empty homepage placeholder on the root route', async () => {
    const element = await renderPage();
    const markup = renderToStaticMarkup(element as ReactElement);

    expect(markup).toContain('aria-label="Situation Room home"');
    expect(markup).not.toContain('Sales Performance');
    expect(markup).not.toContain('Filters');
  });
});
