import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/app/signin/google-auth-button', () => ({
  GoogleAuthButton: () => <button type="button">Continue with Google</button>,
}));

import { GoogleAuthCard } from '@/components/auth/google-auth-card';

describe('google auth card', () => {
  it('renders the gated access copy inside a card', () => {
    const markup = renderToStaticMarkup(React.createElement(GoogleAuthCard));

    expect(markup).toContain('Ligthdash as a Semantic Layer POC');
    expect(markup).toContain(
      'Sign in or create an account with Google to access the analytics suite.',
    );
    expect(markup).toContain('Continue with Google');
  });
});
