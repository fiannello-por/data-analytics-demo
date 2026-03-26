import type {
  ChartTileSpec,
  CompositeTileSpec,
  LineComparisonVisualizationSpec,
  MetricTileSpec,
  MetricVisualizationSpec,
  TableTileSpec,
  TableVisualizationSpec,
  TileDataBindingSpec,
  TileSpec,
} from './spec';

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

export function validateTileSpec(spec: unknown): ValidationResult {
  const errors: string[] = [];
  validateTileSpecInternal(spec, errors, 'tile');

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true };
}

function validateTileSpecInternal(
  spec: unknown,
  errors: string[],
  path: string,
): spec is TileSpec {
  if (!isRecord(spec)) {
    errors.push(`${path} must be an object`);
    return false;
  }

  requireNonEmptyString(spec.id, `${path}.id`, errors);
  requireNonEmptyString(spec.title, `${path}.title`, errors);

  if (!isTileKind(spec.kind)) {
    errors.push(`${path}.kind must be one of metric, table, chart, or composite`);
    return false;
  }

  validateLayout(spec.layout, errors, `${path}.layout`);
  validateInteractions(spec.interactions, errors, `${path}.interactions`);

  switch (spec.kind) {
    case 'metric':
      validateDataBinding(spec.data, errors, `${path}.data`);
      validateMetricVisualization(
        spec.visualization,
        errors,
        `${path}.visualization`,
      );
      return errors.length === 0;
    case 'table':
      validateDataBinding(spec.data, errors, `${path}.data`);
      validateTableVisualization(
        spec.visualization,
        errors,
        `${path}.visualization`,
      );
      return errors.length === 0;
    case 'chart':
      validateDataBinding(spec.data, errors, `${path}.data`);
      validateChartVisualization(
        spec.visualization,
        errors,
        `${path}.visualization`,
      );
      return errors.length === 0;
    case 'composite':
      validateCompositeTile(spec, errors, path);
      return errors.length === 0;
    default:
      return false;
  }
}

function validateCompositeTile(
  spec: CompositeTileSpec | Record<string, unknown>,
  errors: string[],
  path: string,
): void {
  if (!Array.isArray(spec.children) || spec.children.length === 0) {
    errors.push('children must contain at least one tile for composite tiles');
    return;
  }

  spec.children.forEach((child, index) => {
    validateTileSpecInternal(child, errors, `${path}.children[${index}]`);
  });
}

function validateDataBinding(
  data: unknown,
  errors: string[],
  path: string,
): data is TileDataBindingSpec {
  if (!isRecord(data)) {
    errors.push(`${path} must be an object`);
    return false;
  }

  if (data.kind !== 'binding') {
    errors.push(`${path}.kind must be "binding"`);
  }

  requireNonEmptyString(data.key, `${path}.key`, errors);
  return true;
}

function validateMetricVisualization(
  visualization: unknown,
  errors: string[],
  path: string,
): visualization is MetricVisualizationSpec {
  if (!isRecord(visualization)) {
    errors.push(`${path} must be an object`);
    return false;
  }

  if (visualization.type !== 'metric') {
    errors.push(`${path}.type must be "metric"`);
  }

  requireNonEmptyString(visualization.valueField, `${path}.valueField`, errors);
  if (visualization.comparisonField !== undefined) {
    requireNonEmptyString(
      visualization.comparisonField,
      `${path}.comparisonField`,
      errors,
    );
  }
  return true;
}

function validateTableVisualization(
  visualization: unknown,
  errors: string[],
  path: string,
): visualization is TableVisualizationSpec {
  if (!isRecord(visualization)) {
    errors.push(`${path} must be an object`);
    return false;
  }

  if (visualization.type !== 'table') {
    errors.push(`${path}.type must be "table"`);
  }

  if (!Array.isArray(visualization.columns) || visualization.columns.length === 0) {
    errors.push(`${path}.columns must contain at least one column`);
    return false;
  }

  visualization.columns.forEach((column, index) => {
    if (!isRecord(column)) {
      errors.push(`${path}.columns[${index}] must be an object`);
      return;
    }

    requireNonEmptyString(column.field, `${path}.columns[${index}].field`, errors);
    requireNonEmptyString(column.label, `${path}.columns[${index}].label`, errors);
  });

  return true;
}

function validateChartVisualization(
  visualization: unknown,
  errors: string[],
  path: string,
): visualization is LineComparisonVisualizationSpec {
  if (!isRecord(visualization)) {
    errors.push(`${path} must be an object`);
    return false;
  }

  if (!('type' in visualization) || !isNonEmptyString(visualization.type)) {
    errors.push('visualization.type is required for chart tiles');
    return false;
  }

  if (visualization.type !== 'line-comparison') {
    errors.push(`${path}.type must be "line-comparison"`);
    return false;
  }

  requireNonEmptyString(visualization.xField, `${path}.xField`, errors);

  if (!Array.isArray(visualization.series) || visualization.series.length === 0) {
    errors.push(`${path}.series must contain at least one series`);
    return false;
  }

  visualization.series.forEach((series, index) => {
    if (!isRecord(series)) {
      errors.push(`${path}.series[${index}] must be an object`);
      return;
    }

    requireNonEmptyString(series.field, `${path}.series[${index}].field`, errors);
    requireNonEmptyString(series.label, `${path}.series[${index}].label`, errors);
  });

  return true;
}

function validateLayout(layout: unknown, errors: string[], path: string): void {
  if (layout === undefined) {
    return;
  }

  if (!isRecord(layout)) {
    errors.push(`${path} must be an object`);
    return;
  }

  validatePositiveInteger(layout.colSpan, `${path}.colSpan`, errors);
  validatePositiveInteger(layout.rowSpan, `${path}.rowSpan`, errors);
  validatePositiveInteger(layout.minHeight, `${path}.minHeight`, errors);

  if (!('type' in layout) || layout.type === undefined) {
    return;
  }

  switch (layout.type) {
    case 'split':
      validateSplitLayout(layout, errors, path);
      return;
    case 'grid':
      validateGridLayout(layout, errors, path);
      return;
    case 'stack':
      validateStackLayout(layout, errors, path);
      return;
    default:
      errors.push(`${path}.type must be one of split, grid, or stack`);
  }
}

function validateSplitLayout(
  layout: Record<string, unknown>,
  errors: string[],
  path: string,
): void {
  if (
    layout.direction !== undefined &&
    layout.direction !== 'horizontal' &&
    layout.direction !== 'vertical'
  ) {
    errors.push(`${path}.direction must be "horizontal" or "vertical"`);
  }
}

function validateGridLayout(
  layout: Record<string, unknown>,
  errors: string[],
  path: string,
): void {
  validatePositiveInteger(layout.columns, `${path}.columns`, errors);
  validateNonNegativeInteger(layout.gap, `${path}.gap`, errors);
}

function validateStackLayout(
  layout: Record<string, unknown>,
  errors: string[],
  path: string,
): void {
  validateNonNegativeInteger(layout.gap, `${path}.gap`, errors);
}

function validateInteractions(
  interactions: unknown,
  errors: string[],
  path: string,
): void {
  if (interactions === undefined) {
    return;
  }

  if (!isRecord(interactions)) {
    errors.push(`${path} must be an object`);
    return;
  }

  validateBoolean(interactions.allowInspect, `${path}.allowInspect`, errors);
  validateBoolean(interactions.allowDownload, `${path}.allowDownload`, errors);
}

function requireNonEmptyString(
  value: unknown,
  path: string,
  errors: string[],
): value is string {
  if (!isNonEmptyString(value)) {
    errors.push(`${path} must be a non-empty string`);
    return false;
  }

  return true;
}

function validatePositiveInteger(
  value: unknown,
  path: string,
  errors: string[],
): void {
  if (value === undefined) {
    return;
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    errors.push(`${path} must be a positive integer`);
  }
}

function validateNonNegativeInteger(
  value: unknown,
  path: string,
  errors: string[],
): void {
  if (value === undefined) {
    return;
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    errors.push(`${path} must be a non-negative integer`);
  }
}

function validateBoolean(value: unknown, path: string, errors: string[]): void {
  if (value === undefined) {
    return;
  }

  if (typeof value !== 'boolean') {
    errors.push(`${path} must be a boolean`);
  }
}

function isTileKind(
  value: unknown,
): value is MetricTileSpec['kind'] | TableTileSpec['kind'] | ChartTileSpec['kind'] | CompositeTileSpec['kind'] {
  return (
    value === 'metric' ||
    value === 'table' ||
    value === 'chart' ||
    value === 'composite'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
