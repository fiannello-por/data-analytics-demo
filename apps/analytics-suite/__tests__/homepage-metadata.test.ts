import { describe, expect, it } from 'vitest';
import { dashboardModules } from '@/lib/suite/modules';
import {
  HomepageMetadataError,
  getHomepageModuleRow,
  homepageModuleMetadata,
} from '@/lib/suite/homepage-metadata';

describe('homepage metadata', () => {
  it('provides provisional metadata for every dashboard module', () => {
    expect(Object.keys(homepageModuleMetadata).sort()).toEqual(
      dashboardModules.map((module) => module.id).sort(),
    );

    dashboardModules.forEach((module) => {
      const row = getHomepageModuleRow(module);

      expect(row.id).toBe(module.id);
      expect(row.dashboardName).toBe(module.title);
      expect(row.statusLabel).toBe(module.status === 'active' ? 'Live' : 'WIP');
      expect(row.owner).toBeTruthy();
      expect(row.changelogLabel).toBeTruthy();
      expect(row.updatedAt).toBeTruthy();
      expect(row.href).toBe(module.href);
    });
  });

  it('throws a named error when metadata is missing', () => {
    const module = dashboardModules[0];
    const originalMetadata = homepageModuleMetadata[module.id];

    delete homepageModuleMetadata[module.id];

    try {
      expect(() => getHomepageModuleRow(module)).toThrow(HomepageMetadataError);
      expect(() => getHomepageModuleRow(module)).toThrow(
        `Missing homepage metadata for dashboard module id: ${module.id}`,
      );
    } finally {
      homepageModuleMetadata[module.id] = originalMetadata;
    }
  });
});
