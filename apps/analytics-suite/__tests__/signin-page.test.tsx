import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/components/auth/google-auth-card', () => ({
  GoogleAuthCard: () =>
    React.createElement('div', { 'data-testid': 'google-auth-card' }),
}));

import SignInPage from '@/app/signin/page';

describe('sign-in page', () => {
  it('uses the theme background token instead of a hardcoded black', () => {
    const markup = renderToStaticMarkup(React.createElement(SignInPage));

    expect(markup).toContain('bg-background');
    expect(markup).not.toContain('bg-[#050505]');
  });
});
