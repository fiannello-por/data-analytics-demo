import { describe, expect, it } from 'vitest';
import { dashboardModules, getDashboardModule } from '@/lib/suite/modules';

describe('suite dashboard modules', () => {
  it('enumerates multiple dashboard modules without UI coupling', () => {
    expect(dashboardModules.map((module) => module.id)).toEqual([
      'sales-performance',
      'pipeline-health',
    ]);
    expect(getDashboardModule('pipeline-health')?.registry.surfaces[0]?.label).toBe(
      'Pipeline health summary',
    );
  });
});
