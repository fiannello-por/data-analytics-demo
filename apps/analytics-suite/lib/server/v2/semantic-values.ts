import type { SemanticRow } from '@por/analytics-adapter';

export function getSemanticNumber(
  row: SemanticRow | undefined,
  field: string,
): number | null {
  const value = row?.[field]?.raw;

  if (value == null) {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  throw new Error(`Expected semantic field "${field}" to be numeric.`);
}

export function getSemanticString(
  row: SemanticRow | undefined,
  field: string,
): string {
  const value = row?.[field]?.raw;

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value == null) {
    return '';
  }

  return String(value);
}

export function getSemanticOptionalString(
  row: SemanticRow | undefined,
  field: string,
): string | null {
  const value = row?.[field]?.raw;

  if (value == null) {
    return null;
  }

  return getSemanticString(row, field);
}
