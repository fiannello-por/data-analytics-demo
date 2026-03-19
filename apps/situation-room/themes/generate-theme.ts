import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

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
