import { describe, expect, it } from 'vitest';
import { dashboardModules } from '@/lib/suite/modules';
import {
  getHomepageModuleRow,
  homepageModuleMetadata,
} from '@/lib/suite/homepage-metadata';

describe('homepage metadata', () => {
  it('provides provisional metadata for every dashboard module', () => {
    expect(Object.keys(homepageModuleMetadata)).toEqual(
      dashboardModules.map((module) => module.id),
    );

    const rows = dashboardModules.map(getHomepageModuleRow);

    expect(rows[0].statusLabel).toBe('Live');
    expect(rows[1].statusLabel).toBe('WIP');
    expect(rows[0].owner).toBeTruthy();
    expect(rows[1].owner).toBeTruthy();
    expect(rows[0].changelogLabel).toBeTruthy();
    expect(rows[1].changelogLabel).toBeTruthy();
  });
});
