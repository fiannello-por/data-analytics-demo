import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/font/google', () => ({
  Inter: () => ({ variable: '--font-sans' }),
}));

const themeProviderSpy = vi.fn(
  ({
    children,
    defaultTheme,
  }: {
    children: React.ReactNode;
    defaultTheme?: string;
  }) => React.createElement('div', { 'data-theme-default': defaultTheme }, children),
);

vi.mock('@/components/theme-provider', () => ({
  ThemeProvider: themeProviderSpy,
}));

describe('root layout', () => {
  it('defaults the app theme to dark', async () => {
    const { default: RootLayout } = await import('@/app/layout');
    const html = renderToStaticMarkup(
      React.createElement(RootLayout, {
        children: React.createElement('div', null, 'content'),
      }),
    );

    expect(themeProviderSpy).toHaveBeenCalled();
    expect(html).toContain('data-theme-default="dark"');
  });
});
