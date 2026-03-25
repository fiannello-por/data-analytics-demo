import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const scriptPath = new URL(
  '../scripts/benchmark-report.mjs',
  import.meta.url,
);

describe('benchmark report script', () => {
  it('includes the dashboard probe endpoints and tile timing header handling', () => {
    const contents = readFileSync(scriptPath, 'utf8');

    expect(contents).toContain('/api/dashboard/category/New%20Logo');
    expect(contents).toContain('/api/dashboard/trend/new_logo_bookings_amount');
    expect(contents).toContain('/api/dashboard/filter-dictionaries/Division');
    expect(contents).toContain('x-situation-room-tile-timings');
  });
});
