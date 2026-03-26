import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getFilterOptionClassName } from '@/components/dashboard/dashboard-filters';

const appRoot = path.resolve(__dirname, '..');

describe('dashboard filter option styles', () => {
  it('uses the accent-brand token for selected filter options', () => {
    expect(getFilterOptionClassName(true)).toContain(
      'bg-[color:color-mix(in_srgb,var(--accent-brand)_16%,transparent)]',
    );
  });

  it('keeps the muted hover state for unselected filter options', () => {
    expect(getFilterOptionClassName(false)).toBe('hover:bg-muted/80');
  });

  it('applies the dashboard accent scope to portalled popovers', () => {
    const source = fs.readFileSync(
      path.join(appRoot, 'components/dashboard/dashboard-filters.tsx'),
      'utf8',
    );

    expect(source).toContain('className="sales-dashboard-accent w-fit max-w-[calc(100vw-1rem)] p-0"');
    expect(source).toContain('className="sales-dashboard-accent w-[15.5rem] p-0"');
  });
});
