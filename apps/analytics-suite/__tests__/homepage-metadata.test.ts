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

    dashboardModules.forEach((module) => {
      const row = getHomepageModuleRow(module);

      expect(row.id).toBe(module.id);
      expect(row.dashboardName).toBe(module.title);
      expect(row.statusLabel).toBe(module.status === 'active' ? 'Live' : 'WIP');
      expect(row.owner).toBeTruthy();
      expect(row.changelogLabel).toBeTruthy();
    });
  });
});
