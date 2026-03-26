import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const appRoot = path.resolve(__dirname, '..');

describe('dashboard refresh structure', () => {
  it('does not block closed won updates behind other dashboard requests', () => {
    const source = fs.readFileSync(
      path.join(appRoot, 'components/dashboard/dashboard-shell.tsx'),
      'utf8',
    );

    expect(source).not.toContain(
      'const [overviewResult, snapshotResult, trendResult, closedWonResult] = await Promise.allSettled([',
    );
  });
});
