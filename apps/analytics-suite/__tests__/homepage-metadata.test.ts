import { describe, expect, it } from 'vitest';
import type { DashboardModule } from '@/lib/suite/contracts';
import { dashboardModules } from '@/lib/suite/modules';
import {
  HomepageMetadataError,
  getHomepageModuleRow,
  homepageModuleMetadata,
} from '@/lib/suite/homepage-metadata';

const CHANGELOG_SITE_URL = 'https://data-analytics-demo-orcin.vercel.app';

describe('homepage metadata', () => {
  it('provides provisional metadata for every dashboard module', () => {
    expect(Object.keys(homepageModuleMetadata).sort()).toEqual(
      dashboardModules.map((module) => module.id).sort(),
    );

    dashboardModules.forEach((module) => {
      const row = getHomepageModuleRow(module);

      expect(row.id).toBe(module.id);
      expect(row.dashboardName).toBe(module.title);
      expect(row.statusLabel).toBe(
        module.id === 'sales-performance' ? 'Live' : 'WIP',
      );
      expect(row.owner).toBeTruthy();
      expect(row.author.name).toBeTruthy();
      expect(row.author.githubUsername).toBeTruthy();
      expect(row.author.avatarUrl).toContain('https://github.com/');
      expect(row.changelogLabel).toBeTruthy();
      expect(row.changelogHref).toBe(
        `${CHANGELOG_SITE_URL}/?dashboard=${module.id}`,
      );
      expect(row.updatedAt).toBeTruthy();
      expect(row.href).toBe(
        module.id === 'sales-performance' ? module.href : undefined,
      );
    });

    expect(getHomepageModuleRow(dashboardModules[0]).owner).toBe('RevOps');
    expect(getHomepageModuleRow(dashboardModules[0]).author.name).toBe(
      'Facundo Iannello',
    );
    expect(getHomepageModuleRow(dashboardModules[0]).author.githubUsername).toBe(
      'facundoiannello',
    );
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
