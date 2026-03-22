import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('server-only', () => ({}));

describe('lab page', () => {
  it('keeps the Analytics Lab available on /lab', async () => {
    const { default: LabPage } = await import('@/app/lab/page');
    const html = renderToStaticMarkup(await LabPage());

    expect(html).toContain('Analytics Lab');
  });
});
