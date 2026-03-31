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

  it('bootstraps first-load dashboard requests through the shared refresh path', () => {
    const source = fs.readFileSync(
      path.join(appRoot, 'components/dashboard/dashboard-shell.tsx'),
      'utf8',
    );

    expect(source).toContain('export function getInitialBootstrapScope');
    expect(source).toContain(
      'const didBootstrapInitialLoadRef = React.useRef(false);',
    );
    expect(source).toContain(
      'const bootstrapScope = getInitialBootstrapScope({',
    );
    expect(source).toContain('void refreshDashboard(state, bootstrapScope);');
  });
});
