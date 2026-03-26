import { describe, expect, it } from 'vitest';
import type { DashboardModule } from '@/lib/suite/contracts';
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
      expect(row.statusLabel).toBe('WIP');
      expect(row.owner).toBeTruthy();
      expect(row.changelogLabel).toBeTruthy();
      expect(row.changelogHref).toBeUndefined();
      expect(row.updatedAt).toBeTruthy();
      expect(row.href).toBe(
        module.id === 'sales-performance' ? `${module.href}?view=v2` : undefined,
      );
    });
  });

  it('throws a named error when metadata is missing', () => {
    const module = dashboardModules[0];
    const moduleId = 'missing-dashboard';
    const missingMetadataModule = {
      ...module,
      id: moduleId,
    } as DashboardModule;

    expect(() => getHomepageModuleRow(missingMetadataModule)).toThrow(
      HomepageMetadataError,
    );
    expect(() => getHomepageModuleRow(missingMetadataModule)).toThrow(
      `Missing homepage metadata for dashboard module id: ${moduleId}`,
    );
  });
});
