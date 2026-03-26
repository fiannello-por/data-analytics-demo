import { describe, expect, it } from 'vitest';

import { authOptions } from '@/lib/auth';

describe('auth options', () => {
  it('uses Google as the only provider with JWT sessions and a custom sign-in page', () => {
    expect(authOptions.providers).toHaveLength(1);
    expect(authOptions.providers?.[0]?.id).toBe('google');
    expect(authOptions.session?.strategy).toBe('jwt');
    expect(authOptions.pages?.signIn).toBe('/signin');
  });
});
