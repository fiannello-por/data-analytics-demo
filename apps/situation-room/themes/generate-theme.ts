import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  components?: Record<string, Record<string, string | number>>;
  dashboard?: Record<string, Record<string, string>>;
  viz?: {
    categorical: string[];
    sequential: string[];
    diverging: string[];
  };
}

// ─── Ref Resolution ───

/**
 * Check if a string is a literal CSS value (not a palette/color ref).
 * Literal values include: oklch(...), #hex, rgb(...), hsl(...), transparent, etc.
 */
export function isLiteralCssValue(value: string): boolean {
  return (
    value.startsWith('#') ||
    value.startsWith('oklch(') ||
    value.startsWith('rgb') ||
    value.startsWith('hsl') ||
    value === 'transparent'
  );
}

export function resolvePaletteRef(ref: string, palette: Palette): string {
  // If the ref is a literal CSS value, return it as-is
  if (isLiteralCssValue(ref)) return ref;

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
  // If the ref is a literal CSS value, return it as-is
  if (isLiteralCssValue(ref)) return ref;

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
  return refs.map((ref) =>
    isLiteralCssValue(ref) ? ref : resolvePaletteRef(ref, palette),
  );
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
  const isLight = theme.name === 'Light';

  const selector = isLight ? ':root' : '.dark';
  lines.push(`${selector} {`);

  // 1. shadcn tokens — use Set to track emitted var names and avoid duplicates
  //    Emit non-sidebar shadcn first, then charts, then radius, then sidebar
  lines.push('  /* shadcn base tokens (neutral) */');
  const emitted = new Set<string>();
  const sidebarEntries: [string, string][] = [];

  for (const [key, ref] of Object.entries(shadcn)) {
    if (key.startsWith('sidebar')) {
      sidebarEntries.push([key, ref]);
      continue;
    }
    const resolved = resolveColorRef(ref, colors, palette);
    const varName = shadcnVarName(key);
    lines.push(`  ${varName}: ${resolved};`);
    emitted.add(varName);
  }

  // 2. Chart tokens from viz.categorical (--chart-N only)
  if (viz) {
    const resolvedCategorical = resolveVizPalette(viz.categorical, palette);
    resolvedCategorical.forEach((value, i) => {
      const varName = `--chart-${i + 1}`;
      lines.push(`  ${varName}: ${value};`);
      emitted.add(varName);
    });
  }

  // 3. Radius base — only in :root, not in .dark
  if (isLight) {
    lines.push(`  --radius: ${geometry.radiusBase};`);
    emitted.add('--radius');
  }

  // 4. Sidebar tokens from shadcn
  for (const [key, ref] of sidebarEntries) {
    const resolved = resolveColorRef(ref, colors, palette);
    const varName = shadcnVarName(key);
    lines.push(`  ${varName}: ${resolved};`);
    emitted.add(varName);
  }

  // 5. Surface/text/border/accentBrand/status colors from `colors`
  const modeLabel = isLight ? 'light' : 'dark';
  lines.push('');
  lines.push(`  /* project custom tokens \u2013 ${modeLabel} */`);
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

  // 6. Dashboard tokens (optional, Phase 2)
  if (dashboard && Object.keys(dashboard).length > 0) {
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
  }

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
  shadcnVarNames: string[],
  customVarNames: string[],
  opts: ThemeInlineOpts,
): string {
  const lines: string[] = ['@theme inline {'];

  // 1. Font sans (first, matching global.css order)
  lines.push('  /* shadcn \u2192 Tailwind mappings */');
  lines.push('  --font-sans: var(--font-sans);');

  // 2. shadcn color token mappings
  for (const varName of shadcnVarNames) {
    if (varName === '--radius') continue;
    const name = varName.replace('--', '');
    lines.push(`  --color-${name}: var(${varName});`);
  }

  // 3. Radius scale
  for (const [name, multiplier] of Object.entries(opts.geometry.radiusScale)) {
    if (multiplier === 1 || multiplier === 1.0) {
      lines.push(`  --radius-${name}: var(--radius);`);
    } else {
      lines.push(`  --radius-${name}: calc(var(--radius) * ${multiplier});`);
    }
  }

  // 4. Project custom color token mappings
  if (customVarNames.length > 0) {
    lines.push('');
    lines.push('  /* project custom token \u2192 Tailwind mappings */');
    for (const varName of customVarNames) {
      const name = varName.replace('--', '');
      lines.push(`  --color-${name}: var(${varName});`);
    }
  }

  // 5. Font mono (last, matching global.css order)
  const monoFamily = opts.typography.fontFamily.mono;
  if (monoFamily) {
    lines.push(`  --font-mono: ${monoFamily};`);
  }

  lines.push('}');
  return lines.join('\n');
}

// ─── Validation ───

let _ajvValidate: ReturnType<Ajv['compile']> | null = null;

function getSchemaValidator(): ReturnType<Ajv['compile']> {
  if (!_ajvValidate) {
    const schemaPath = join(__dirname, 'theme.schema.json');
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
      // Literal CSS values (oklch, #hex, etc.) don't need resolution
      if (isLiteralCssValue(ref)) continue;
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
          // Literal CSS values don't need resolution
          if (isLiteralCssValue(ref)) return;
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

// ─── Main Script ───

class ThemeGenerationError extends Error {
  constructor(public readonly errors: string[]) {
    super(
      `Theme generation failed:\n${errors.map((e) => `  \u2717 ${e}`).join('\n')}`,
    );
    this.name = 'ThemeGenerationError';
  }
}

function generate(themesDir: string, outputPath: string): void {
  const lightPath = join(themesDir, 'light.json');
  const darkPath = join(themesDir, 'dark.json');

  const errors: string[] = [];

  let lightTheme: Theme;
  let darkTheme: Theme;
  try {
    lightTheme = JSON.parse(readFileSync(lightPath, 'utf-8'));
  } catch (e) {
    throw new ThemeGenerationError([
      `light.json: ${(e as Error).message}`,
    ]);
  }
  try {
    darkTheme = JSON.parse(readFileSync(darkPath, 'utf-8'));
  } catch (e) {
    throw new ThemeGenerationError([`dark.json: ${(e as Error).message}`]);
  }

  errors.push(...validateTheme(lightTheme).map((e) => `light.json: ${e}`));
  errors.push(...validateTheme(darkTheme).map((e) => `dark.json: ${e}`));
  if (errors.length > 0) throw new ThemeGenerationError(errors);

  const lightCss = generateCssFromTheme(lightTheme);
  const darkCss = generateCssFromTheme(darkTheme);

  // Collect shadcn var names (from the shadcn section) and chart var names
  // Order: non-sidebar shadcn, then charts, then sidebar (matches global.css)
  const shadcnVarNames: string[] = [];
  const sidebarVarNames: string[] = [];
  for (const key of Object.keys(lightTheme.shadcn)) {
    if (key.startsWith('sidebar')) {
      sidebarVarNames.push(shadcnVarName(key));
    } else {
      shadcnVarNames.push(shadcnVarName(key));
    }
  }
  // Add chart vars between non-sidebar and sidebar
  if (lightTheme.viz) {
    lightTheme.viz.categorical.forEach((_val, i) => {
      shadcnVarNames.push(`--chart-${i + 1}`);
    });
  }
  // Append sidebar vars
  shadcnVarNames.push(...sidebarVarNames);

  // Collect project custom var names (from colors section)
  const customVarNames: string[] = [];
  for (const [section, entries] of Object.entries(lightTheme.colors)) {
    for (const key of Object.keys(entries)) {
      let varName: string;
      if (section === 'surface' && key === 'base') {
        varName = '--surface';
      } else if (key === 'default') {
        varName = `--${kebabCase(section)}`;
      } else {
        varName = cssVarName(section, key);
      }
      // Don't include vars already in shadcn
      if (!shadcnVarNames.includes(varName)) {
        customVarNames.push(varName);
      }
    }
  }

  // Add dashboard vars if present
  if (lightTheme.dashboard) {
    for (const [section, entries] of Object.entries(lightTheme.dashboard)) {
      for (const key of Object.keys(entries)) {
        const varName = cssVarName(section, key);
        if (!shadcnVarNames.includes(varName) && !customVarNames.includes(varName)) {
          customVarNames.push(varName);
        }
      }
    }
  }

  const inlineBlock = generateThemeInlineBlock(shadcnVarNames, customVarNames, {
    geometry: lightTheme.geometry,
    typography: lightTheme.typography,
  });

  const output = [
    '/* DO NOT EDIT \u2014 generated by theme:generate */',
    '',
    lightCss,
    '',
    darkCss,
    '',
    inlineBlock,
    '',
  ].join('\n');

  writeFileSync(outputPath, output, 'utf-8');
  console.log(`\u2713 Generated ${outputPath}`);
}

function main() {
  const themesDir = resolve(__dirname, '.');
  const outputPath = resolve(__dirname, '../app/generated-theme.css');
  const isWatch = process.argv.includes('--watch');

  try {
    generate(themesDir, outputPath);
  } catch (e) {
    console.error((e as Error).message);
    if (!isWatch) process.exit(1);
  }

  if (isWatch) {
    import('chokidar').then(({ watch }) => {
      const watcher = watch(join(themesDir, '*.json'), {
        ignoreInitial: true,
        ignored: /theme\.schema\.json$/,
      });
      console.log('Watching themes/*.json for changes...');

      function regenerate(path: string) {
        console.log(`Theme file changed: ${path}`);
        try {
          generate(themesDir, outputPath);
        } catch (e) {
          console.error((e as Error).message);
        }
      }

      watcher.on('change', regenerate);
      watcher.on('add', regenerate);
    });
  }
}

const isDirectExecution =
  process.argv[1] && __filename === resolve(process.argv[1]);
if (isDirectExecution) {
  main();
}
