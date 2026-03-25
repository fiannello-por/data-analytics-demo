import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

describe('not-found page', () => {
  it('renders a simple not-found state', async () => {
    const { default: NotFoundPage } = await import('@/app/not-found');
    const html = renderToStaticMarkup(NotFoundPage());

    expect(html).toContain('Page not found');
    expect(html).toContain('Situation Room');
  });
});
