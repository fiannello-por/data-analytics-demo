import {
  findMissingCatalogFields,
  type RequiredCatalogField,
} from '@por/analytics-adapter';

import { dashboardModules } from '@/lib/suite/modules';
import { suiteSemanticCatalogEntries } from '@/lib/suite/semantic-catalog';

export type SemanticCoverageIssue = RequiredCatalogField & {
  moduleId: string;
  surfaceId: string;
};

export type SemanticCoverageReport = {
  valid: boolean;
  modules: string[];
  issues: SemanticCoverageIssue[];
};

function collectRequiredFields(): SemanticCoverageIssue[] {
  return dashboardModules.flatMap((module) =>
    module.registry.surfaces.flatMap((surface) => [
      ...surface.measures.map((field) => ({
        moduleId: module.id,
        surfaceId: surface.id,
        model: module.registry.models[0] ?? '',
        field,
        fieldType: 'metric' as const,
      })),
      ...(surface.dimensions ?? []).map((field) => ({
        moduleId: module.id,
        surfaceId: surface.id,
        model:
          surface.id === 'closed-won-table'
            ? 'sales_dashboard_v2_closed_won'
            : module.registry.models[0] ?? '',
        field,
        fieldType: 'dimension' as const,
      })),
      ...(surface.filters ?? []).map((field) => ({
        moduleId: module.id,
        surfaceId: surface.id,
        model: module.registry.models[0] ?? '',
        field,
        fieldType: 'dimension' as const,
      })),
    ]),
  );
}

export function validateSuiteSemanticCoverage(): SemanticCoverageReport {
  const requiredFields = collectRequiredFields();
  const missing = findMissingCatalogFields(
    suiteSemanticCatalogEntries,
    requiredFields,
  );

  const issues = requiredFields.filter((requiredField) =>
    missing.some(
      (missingField) =>
        missingField.model === requiredField.model &&
        missingField.field === requiredField.field &&
        missingField.fieldType === requiredField.fieldType,
    ),
  );

  return {
    valid: issues.length === 0,
    modules: dashboardModules.map((module) => module.id),
    issues,
  };
}
