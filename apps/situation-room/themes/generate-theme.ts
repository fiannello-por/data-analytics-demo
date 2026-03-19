import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import Ajv from 'ajv';

// ─── Types ───

interface Palette {
  [key: string]: string | string[];
}

interface Theme {
  name: string;
  palette: Palette;
  colors: Record<string, Record<string, string>>;
  shadcn: Record<string, string>;
  typography: {
    fontFamily: Record<string, string>;
    fontSize: Record<string, string>;
    fontWeight: Record<string, string>;
  };
  geometry: {
    radiusBase: string;
    radiusScale: Record<string, number>;
    shadow: Record<string, string>;
  };
  components: Record<string, Record<string, string | number>>;
  dashboard: Record<string, Record<string, string>>;
  viz: {
    categorical: string[];
    sequential: string[];
    diverging: string[];
  };
}

// ─── Ref Resolution ───

export function resolvePaletteRef(ref: string, palette: Palette): string {
  if (ref === 'transparent') return 'transparent';

  const dotIndex = ref.indexOf('.');
  if (dotIndex === -1) {
    const val = palette[ref];
    if (val === undefined) throw new Error(`Invalid palette ref: "${ref}"`);
    if (typeof val !== 'string')
      throw new Error(`Palette ref "${ref}" is an array, needs index`);
    return val;
  }

  const key = ref.slice(0, dotIndex);
  const index = parseInt(ref.slice(dotIndex + 1), 10);
  const arr = palette[key];
  if (arr === undefined) throw new Error(`Invalid palette key: "${key}"`);
  if (!Array.isArray(arr))
    throw new Error(`Palette key "${key}" is not an array`);
  if (index < 0 || index >= arr.length)
    throw new Error(
      `Index ${index} out of bounds for palette.${key} (length ${arr.length})`,
    );
  return arr[index];
}

export function resolveColorRef(
  ref: string,
  colors: Record<string, Record<string, string>>,
  palette: Palette,
): string {
  if (ref === 'transparent') return 'transparent';

  const dotIndex = ref.indexOf('.');
  if (dotIndex === -1) {
    return resolvePaletteRef(ref, palette);
  }

  const section = ref.slice(0, dotIndex);
  const key = ref.slice(dotIndex + 1);

  const sectionObj = colors[section];
  if (!sectionObj) {
    return resolvePaletteRef(ref, palette);
  }

  const paletteRef = sectionObj[key];
  if (paletteRef === undefined)
    throw new Error(`Invalid color key: "${key}" in section "${section}"`);

  return resolvePaletteRef(paletteRef, palette);
}

export function resolveGeometryRef(
  value: string | number,
  propertyName: string,
  geometry: Theme['geometry'],
  typography: Theme['typography'],
): string {
  const strValue = String(value);
  const lowerProp = propertyName.toLowerCase();

  if (lowerProp.includes('radius')) {
    const scale = geometry.radiusScale[strValue];
    if (scale !== undefined) {
      return `calc(${geometry.radiusBase} * ${scale})`;
    }
  }

  if (lowerProp.includes('shadow')) {
    const shadow = geometry.shadow[strValue];
    if (shadow !== undefined) return shadow;
  }

  if (lowerProp.includes('weight')) {
    const weight = typography.fontWeight[strValue];
    if (weight !== undefined) return weight;
  }

  return strValue;
}

export function resolveVizPalette(refs: string[], palette: Palette): string[] {
  return refs.map((ref) => resolvePaletteRef(ref, palette));
}

// ─── CSS Generation ───

export { type Theme };

function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function cssVarName(section: string, key: string): string {
  return `--${kebabCase(section)}-${kebabCase(key)}`;
}

function shadcnVarName(key: string): string {
  return `--${kebabCase(key)}`;
}

export function generateCssFromTheme(theme: Theme): string {
  const lines: string[] = [];
  const { palette, colors, shadcn, geometry, dashboard, viz } = theme;

  const selector = theme.name === 'Light' ? ':root' : '.dark';
  lines.push(`${selector} {`);

  // 1. shadcn tokens — use Set to track emitted var names and avoid duplicates
  const emitted = new Set<string>();
  for (const [key, ref] of Object.entries(shadcn)) {
    const resolved = resolveColorRef(ref, colors, palette);
    const varName = shadcnVarName(key);
    lines.push(`  ${varName}: ${resolved};`);
    emitted.add(varName);
  }

  // 2. Radius base
  lines.push(`  --radius: ${geometry.radiusBase};`);
  emitted.add('--radius');

  // 3. Surface/text/border/accentBrand/status colors from `colors`
  for (const [section, entries] of Object.entries(colors)) {
    for (const [key, ref] of Object.entries(entries)) {
      const resolved = resolvePaletteRef(ref, palette);
      let varName: string;
      if (section === 'surface' && key === 'base') {
        varName = '--surface';
      } else if (key === 'default') {
        varName = `--${kebabCase(section)}`;
      } else {
        varName = cssVarName(section, key);
      }
      // Dedup: skip if already emitted by shadcn (e.g. --border)
      if (!emitted.has(varName)) {
        lines.push(`  ${varName}: ${resolved};`);
        emitted.add(varName);
      }
    }
  }

  // 4. Dashboard tokens
  for (const [section, entries] of Object.entries(dashboard)) {
    for (const [key, ref] of Object.entries(entries)) {
      const resolved = resolveColorRef(ref, colors, palette);
      const varName = cssVarName(section, key);
      if (!emitted.has(varName)) {
        lines.push(`  ${varName}: ${resolved};`);
        emitted.add(varName);
      }
    }
  }

  // 5. Chart tokens from viz.categorical (--chart-N only, no --viz-N yet)
  const resolvedCategorical = resolveVizPalette(viz.categorical, palette);
  resolvedCategorical.forEach((hex, i) => {
    lines.push(`  --chart-${i + 1}: ${hex};`);
  });

  // NOTE: Component geometry (--card-radius, --filter-height, etc.) and --viz-N aliases
  // are NOT emitted here. They will be added in Task 7a after parity verification.

  lines.push('}');
  return lines.join('\n');
}

// ─── @theme inline Block ───

interface ThemeInlineOpts {
  geometry: {
    radiusBase: string;
    radiusScale: Record<string, number>;
    shadow: Record<string, string>;
  };
  typography: { fontFamily: Record<string, string> };
}

export function generateThemeInlineBlock(
  allVarNames: string[],
  opts: ThemeInlineOpts,
): string {
  const lines: string[] = ['@theme inline {'];

  const colorVarPrefixes = [
    '--surface',
    '--text-',
    '--border',
    '--positive',
    '--negative',
    '--warning',
    '--info',
    '--neutral',
    '--interactive',
    '--filter-',
    '--table-',
    '--tab-',
    '--heading-',
    '--chart-',
    '--accent',
    '--background',
    '--foreground',
    '--card',
    '--popover',
    '--primary',
    '--secondary',
    '--muted',
    '--destructive',
    '--input',
    '--ring',
    '--sidebar',
  ];

  for (const varName of allVarNames) {
    if (varName === '--radius') continue;
    if (colorVarPrefixes.some((prefix) => varName.startsWith(prefix))) {
      const name = varName.replace('--', '');
      lines.push(`  --color-${name}: var(${varName});`);
    }
  }

  // Radius scale
  for (const [name, multiplier] of Object.entries(opts.geometry.radiusScale)) {
    lines.push(`  --radius-${name}: calc(var(--radius) * ${multiplier});`);
  }

  // Font families
  for (const [key, value] of Object.entries(opts.typography.fontFamily)) {
    if (key === 'sans') {
      lines.push(`  --font-${key}: var(--font-${key});`);
    } else {
      lines.push(`  --font-${key}: ${value};`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}

// ─── Validation ───

let _ajvValidate: ReturnType<Ajv['compile']> | null = null;

function getSchemaValidator(): ReturnType<Ajv['compile']> {
  if (!_ajvValidate) {
    const schemaPath = join(import.meta.dirname, 'theme.schema.json');
    const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
    const ajv = new Ajv({ allErrors: true, strict: false });
    _ajvValidate = ajv.compile(schema);
  }
  return _ajvValidate;
}

export function validateTheme(theme: unknown): string[] {
  const errors: string[] = [];

  const validate = getSchemaValidator();
  if (!validate(theme)) {
    for (const err of validate.errors ?? []) {
      const path = err.instancePath || '(root)';
      errors.push(`schema: ${path} ${err.message}`);
    }
    return errors;
  }

  // Layer 2: Semantic validation — refs resolve correctly
  const t = theme as Theme;

  if (t.colors && t.palette) {
    for (const [section, entries] of Object.entries(t.colors)) {
      for (const [key, ref] of Object.entries(
        entries as Record<string, string>,
      )) {
        try {
          resolvePaletteRef(ref, t.palette);
        } catch {
          errors.push(
            `colors.${section}.${key}: unresolvable palette ref "${ref}"`,
          );
        }
      }
    }
  }

  if (t.shadcn && t.colors && t.palette) {
    for (const [key, ref] of Object.entries(
      t.shadcn as Record<string, string>,
    )) {
      try {
        resolveColorRef(ref, t.colors, t.palette);
      } catch {
        errors.push(`shadcn.${key}: unresolvable color ref "${ref}"`);
      }
    }
  }

  if (t.dashboard && t.colors && t.palette) {
    for (const [section, entries] of Object.entries(t.dashboard)) {
      for (const [key, ref] of Object.entries(
        entries as Record<string, string>,
      )) {
        try {
          resolveColorRef(ref, t.colors, t.palette);
        } catch {
          errors.push(
            `dashboard.${section}.${key}: unresolvable color ref "${ref}"`,
          );
        }
      }
    }
  }

  if (t.viz && t.palette) {
    for (const vizKey of ['categorical', 'sequential', 'diverging'] as const) {
      if (t.viz[vizKey]) {
        t.viz[vizKey].forEach((ref: string, i: number) => {
          try {
            resolvePaletteRef(ref, t.palette);
          } catch {
            errors.push(
              `viz.${vizKey}[${i}]: unresolvable palette ref "${ref}"`,
            );
          }
        });
      }
    }
  }

  return errors;
}
