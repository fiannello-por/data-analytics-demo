import { describe, expect, it } from 'vitest';
import { getFilterOptionClassName } from '@/components/dashboard/dashboard-filters';
import { getAnimatedUnderlineClassName } from '@/components/shadcn-studio/tabs/tabs-29';

describe('dashboard accent colors', () => {
  it('uses the accent-brand token for selected filter rows', () => {
    expect(getFilterOptionClassName(true)).toContain('var(--accent-brand)');
  });

  it('uses the lighter action accent for the active tab underline', () => {
    expect(getAnimatedUnderlineClassName()).toContain('bg-[var(--dashboard-action)]');
  });
});
