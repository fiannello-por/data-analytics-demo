import type { SemanticCatalogEntry } from './types';

export type SemanticCatalogIndex = Record<
  string,
  {
    metrics: SemanticCatalogEntry[];
    dimensions: SemanticCatalogEntry[];
  }
>;

export function indexCatalogEntries(
  entries: SemanticCatalogEntry[],
): SemanticCatalogIndex {
  return entries.reduce<SemanticCatalogIndex>((index, entry) => {
    const bucket = index[entry.model] ?? {
      metrics: [],
      dimensions: [],
    };

    if (entry.fieldType === 'metric') {
      bucket.metrics.push(entry);
    } else {
      bucket.dimensions.push(entry);
    }

    index[entry.model] = bucket;
    return index;
  }, {});
}

export function getCatalogFields(
  entries: SemanticCatalogEntry[],
  model: string,
  fieldType?: SemanticCatalogEntry['fieldType'],
): SemanticCatalogEntry[] {
  return entries.filter(
    (entry) =>
      entry.model === model && (fieldType == null || entry.fieldType === fieldType),
  );
}

export type RequiredCatalogField = {
  model: string;
  field: string;
  fieldType: SemanticCatalogEntry['fieldType'];
};

export function findMissingCatalogFields(
  entries: SemanticCatalogEntry[],
  requiredFields: RequiredCatalogField[],
): RequiredCatalogField[] {
  return requiredFields.filter(
    (requiredField) =>
      !entries.some(
        (entry) =>
          entry.model === requiredField.model &&
          entry.field === requiredField.field &&
          entry.fieldType === requiredField.fieldType,
      ),
  );
}
