import { describe, it, expect } from 'vitest';
import {
  resolvePaletteRef,
  resolveColorRef,
  resolveGeometryRef,
} from '../themes/generate-theme';

const testPalette = {
  gray: ['#f7f8fa', '#eef1f5', '#e4e8ee', '#dce0e8'],
  blue: ['#edf4fc', '#c4daf0', '#8db8e4', '#3574c4'],
  white: '#ffffff',
  black: '#1e2028',
  transparent: 'transparent',
};

describe('resolvePaletteRef', () => {
  it('resolves indexed array ref like "gray.3"', () => {
    expect(resolvePaletteRef('gray.3', testPalette)).toBe('#dce0e8');
  });

  it('resolves scalar ref like "white"', () => {
    expect(resolvePaletteRef('white', testPalette)).toBe('#ffffff');
  });

  it('resolves "transparent" as literal', () => {
    expect(resolvePaletteRef('transparent', testPalette)).toBe('transparent');
  });

  it('throws on invalid ref', () => {
    expect(() => resolvePaletteRef('purple.0', testPalette)).toThrow();
  });

  it('throws on out-of-bounds index', () => {
    expect(() => resolvePaletteRef('gray.99', testPalette)).toThrow();
  });
});

const testColors = {
  surface: { base: 'gray.0', elevated: 'white', sunken: 'gray.1' },
  text: { primary: 'gray.3', inverse: 'white' },
  accentBrand: { default: 'blue.3', subtle: 'blue.0' },
  negative: { default: 'blue.3' },
};

describe('resolveColorRef', () => {
  it('resolves two-part color ref like "surface.elevated"', () => {
    expect(resolveColorRef('surface.elevated', testColors, testPalette)).toBe(
      '#ffffff',
    );
  });

  it('resolves chained ref (color → palette)', () => {
    expect(
      resolveColorRef('accentBrand.default', testColors, testPalette),
    ).toBe('#3574c4');
  });

  it('resolves "transparent" as literal', () => {
    expect(resolveColorRef('transparent', testColors, testPalette)).toBe(
      'transparent',
    );
  });

  it('falls back to palette ref when section not in colors', () => {
    expect(resolveColorRef('gray.3', testColors, testPalette)).toBe('#dce0e8');
    expect(resolveColorRef('blue.0', testColors, testPalette)).toBe('#edf4fc');
  });

  it('throws on completely invalid ref', () => {
    expect(() =>
      resolveColorRef('nonexistent.99', testColors, testPalette),
    ).toThrow();
  });
});

const testGeometry = {
  radiusBase: '0.375rem',
  radiusScale: { sm: 0.6, md: 0.8, lg: 1.0 },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px -1px rgba(0,0,0,0.1)',
  },
};

const testTypography = {
  fontFamily: { sans: 'Inter, system-ui, sans-serif' },
  fontSize: { xs: '0.75rem' },
  fontWeight: { normal: '400', medium: '500' },
};

describe('resolveGeometryRef', () => {
  it('resolves radius ref "md" for property named "radius"', () => {
    expect(
      resolveGeometryRef('md', 'radius', testGeometry, testTypography),
    ).toBe('calc(0.375rem * 0.8)');
  });

  it('resolves shadow ref "sm" for property named "shadow"', () => {
    expect(
      resolveGeometryRef('sm', 'shadow', testGeometry, testTypography),
    ).toBe('0 1px 2px rgba(0,0,0,0.05)');
  });

  it('resolves weight ref "medium" for property named "headerWeight"', () => {
    expect(
      resolveGeometryRef('medium', 'headerWeight', testGeometry, testTypography),
    ).toBe('500');
  });

  it('passes through literal CSS values like "2rem"', () => {
    expect(
      resolveGeometryRef('2rem', 'height', testGeometry, testTypography),
    ).toBe('2rem');
  });
});
