import { describe, it, expect } from 'vitest';
import { resolvePaletteRef, resolveColorRef } from '../themes/generate-theme';

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
