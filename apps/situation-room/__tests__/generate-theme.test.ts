import { describe, it, expect } from 'vitest';
import {
  resolvePaletteRef,
  resolveColorRef,
  resolveGeometryRef,
  resolveVizPalette,
  generateCssFromTheme,
  type Theme,
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

describe('resolveVizPalette', () => {
  it('resolves categorical palette refs to hex values', () => {
    const vizCategorical = ['blue.3', 'gray.0', 'white'];
    const result = resolveVizPalette(vizCategorical, testPalette);
    expect(result).toEqual(['#3574c4', '#f7f8fa', '#ffffff']);
  });
});

describe('generateCssFromTheme', () => {
  it('generates CSS with correct variable names for a minimal theme', () => {
    const minimalTheme: Theme = {
      name: 'Light',
      palette: {
        gray: ['#aaa', '#bbb'],
        blue: ['#ccc'],
        green: ['#ddd'],
        red: ['#eee'],
        amber: ['#fff'],
        cyan: ['#111'],
        white: '#ffffff',
        black: '#000000',
        transparent: 'transparent',
      },
      colors: {
        surface: { base: 'gray.0', elevated: 'white' },
        text: { primary: 'gray.1' },
        border: { default: 'gray.0' },
        accentBrand: { default: 'blue.0' },
        positive: { default: 'green.0', bg: 'green.0', border: 'green.0' },
        negative: { default: 'red.0', bg: 'red.0', border: 'red.0' },
        neutral: { change: 'gray.1', changeBg: 'gray.0' },
        interactive: { bg: 'blue.0', text: 'white', focusRing: 'blue.0' },
      },
      shadcn: {
        background: 'surface.base',
        foreground: 'text.primary',
        card: 'surface.elevated',
        cardForeground: 'text.primary',
        popover: 'surface.elevated',
        popoverForeground: 'text.primary',
        primary: 'accentBrand.default',
        primaryForeground: 'text.primary',
        secondary: 'surface.base',
        secondaryForeground: 'text.primary',
        muted: 'surface.base',
        mutedForeground: 'text.primary',
        accent: 'surface.base',
        accentForeground: 'text.primary',
        destructive: 'negative.default',
        border: 'border.default',
        input: 'border.default',
        ring: 'accentBrand.default',
        sidebar: 'surface.base',
        sidebarForeground: 'text.primary',
        sidebarPrimary: 'accentBrand.default',
        sidebarPrimaryForeground: 'text.primary',
        sidebarAccent: 'surface.base',
        sidebarAccentForeground: 'text.primary',
        sidebarBorder: 'border.default',
        sidebarRing: 'accentBrand.default',
      },
      typography: {
        fontFamily: { sans: 'Inter', mono: 'monospace' },
        fontSize: { xs: '0.75rem' },
        fontWeight: { normal: '400', medium: '500' },
      },
      geometry: {
        radiusBase: '0.5rem',
        radiusScale: { sm: 0.5, md: 1.0 },
        shadow: { sm: '0 1px 2px rgba(0,0,0,0.05)' },
      },
      components: {
        card: { radius: 'md', shadow: 'sm' },
        filter: { radius: 'sm', height: '2rem' },
        tab: { railRadius: 'md', pillRadius: 'sm' },
        pill: { radius: 'sm' },
      },
      dashboard: {
        filterBar: { bg: 'gray.0', border: 'border.default' },
        filterTrigger: {
          bg: 'surface.elevated',
          border: 'border.default',
          text: 'text.primary',
        },
        filterActive: {
          bg: 'accentBrand.default',
          border: 'blue.0',
          text: 'accentBrand.default',
        },
        filterBadge: { bg: 'accentBrand.default', text: 'white' },
        tab: { rail: 'surface.base', text: 'text.primary' },
        table: { headerBg: 'surface.base', headerText: 'text.primary' },
        heading: { overline: 'text.primary', section: 'text.primary' },
      },
      viz: {
        categorical: ['blue.0', 'green.0', 'red.0'],
        sequential: ['gray.0', 'gray.1', 'blue.0'],
        diverging: ['red.0', 'gray.0', 'green.0'],
      },
    };

    const css = generateCssFromTheme(minimalTheme);

    // Check that it has the :root selector
    expect(css).toContain(':root {');

    // Check shadcn vars are resolved
    expect(css).toContain('--background: #aaa');
    expect(css).toContain('--foreground: #bbb');
    expect(css).toContain('--primary: #ccc');

    // Check surface vars
    expect(css).toContain('--surface: #aaa');
    expect(css).toContain('--surface-elevated: #ffffff');

    // Check radius
    expect(css).toContain('--radius: 0.5rem');

    // Check chart derivation from viz
    expect(css).toContain('--chart-1: #ccc');
    expect(css).toContain('--chart-2: #ddd');
    expect(css).toContain('--chart-3: #eee');

    // Phase 1 exclusions — these vars don't exist in current CSS
    expect(css).not.toContain('--viz-1');
    expect(css).not.toContain('--card-radius');
    expect(css).not.toContain('--filter-height');
    // --font-sans and --font-mono live only in @theme inline, not in :root/.dark
    expect(css).not.toMatch(/^\s+--font-sans:/m);
    expect(css).not.toMatch(/^\s+--font-mono:/m);
  });
});
