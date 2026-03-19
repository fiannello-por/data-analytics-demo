import { describe, it, expect } from 'vitest';
import {
  resolvePaletteRef,
  resolveColorRef,
  resolveGeometryRef,
  resolveVizPalette,
  generateCssFromTheme,
  generateThemeInlineBlock,
  validateTheme,
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

describe('generateThemeInlineBlock', () => {
  const baseOpts = {
    geometry: {
      radiusBase: '0.375rem',
      radiusScale: { sm: 0.6 },
      shadow: {},
    },
    typography: {
      fontFamily: {
        sans: 'Inter, system-ui, sans-serif',
        mono: "'JetBrains Mono', ui-monospace, monospace",
      },
    },
  };

  it('maps color vars to --color- prefix', () => {
    const vars = [
      '--surface',
      '--surface-elevated',
      '--text-primary',
      '--background',
      '--chart-1',
    ];
    const block = generateThemeInlineBlock(vars, baseOpts);
    expect(block).toContain('--color-surface: var(--surface)');
    expect(block).toContain('--color-surface-elevated: var(--surface-elevated)');
    expect(block).toContain('--color-text-primary: var(--text-primary)');
    expect(block).toContain('--color-background: var(--background)');
    expect(block).toContain('--color-chart-1: var(--chart-1)');
  });

  it('maps radius scale to calc expressions', () => {
    const block = generateThemeInlineBlock([], baseOpts);
    expect(block).toContain('--radius-sm: calc(var(--radius) * 0.6)');
  });

  it('emits --font-sans as var(--font-sans) for Next.js delegation', () => {
    const block = generateThemeInlineBlock([], baseOpts);
    expect(block).toContain('--font-sans: var(--font-sans)');
    expect(block).not.toContain('--font-sans: Inter');
  });

  it('emits --font-mono as literal font stack', () => {
    const block = generateThemeInlineBlock([], baseOpts);
    expect(block).toContain(
      "--font-mono: 'JetBrains Mono', ui-monospace, monospace",
    );
  });
});

describe('validateTheme', () => {
  function validTheme(): Theme {
    return {
      name: 'Light',
      palette: {
        gray: ['#aaaaaa'],
        blue: ['#bbbbbb'],
        green: ['#cccccc'],
        red: ['#dddddd'],
        amber: ['#eeeeee'],
        cyan: ['#ffffff'],
        white: '#ffffff',
        black: '#000000',
        transparent: 'transparent',
      },
      colors: {
        surface: { base: 'gray.0' },
        text: { primary: 'gray.0' },
        border: { default: 'gray.0' },
        accentBrand: { default: 'blue.0' },
        positive: { default: 'green.0', bg: 'green.0', border: 'green.0' },
        negative: { default: 'red.0', bg: 'red.0', border: 'red.0' },
        neutral: { change: 'gray.0', changeBg: 'gray.0' },
        interactive: { bg: 'blue.0', text: 'white', focusRing: 'blue.0' },
      },
      shadcn: {
        background: 'surface.base',
        foreground: 'text.primary',
        card: 'surface.base',
        cardForeground: 'text.primary',
        popover: 'surface.base',
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
        fontFamily: { sans: 'Inter' },
        fontSize: { xs: '0.75rem' },
        fontWeight: { normal: '400' },
      },
      geometry: {
        radiusBase: '0.375rem',
        radiusScale: { sm: 0.5 },
        shadow: { sm: '0 1px 2px rgba(0,0,0,0.05)' },
      },
      components: { card: { radius: 'sm' } },
      dashboard: {
        filterBar: { bg: 'gray.0' },
        filterTrigger: { bg: 'gray.0' },
        filterActive: { bg: 'blue.0' },
        filterBadge: { bg: 'blue.0' },
        tab: { rail: 'gray.0' },
        table: { headerBg: 'gray.0' },
        heading: { overline: 'gray.0' },
      },
      viz: {
        categorical: ['blue.0', 'green.0', 'red.0'],
        sequential: ['gray.0', 'blue.0', 'green.0'],
        diverging: ['red.0', 'gray.0', 'green.0'],
      },
    };
  }

  it('accepts a valid theme', () => {
    expect(validateTheme(validTheme())).toEqual([]);
  });

  it('rejects missing required top-level sections', () => {
    const t = validTheme();
    delete (t as any).palette;
    delete (t as any).viz;
    const errors = validateTheme(t);
    expect(errors.some((e) => e.includes('palette'))).toBe(true);
    expect(errors.some((e) => e.includes('viz'))).toBe(true);
  });

  it('rejects invalid hex in palette', () => {
    const t = validTheme();
    t.palette.gray = ['not-a-hex'];
    const errors = validateTheme(t);
    expect(errors.some((e) => e.includes('pattern'))).toBe(true);
  });

  it('rejects missing required shadcn keys', () => {
    const t = validTheme();
    delete (t.shadcn as any).background;
    delete (t.shadcn as any).ring;
    const errors = validateTheme(t);
    expect(errors.some((e) => e.includes('background'))).toBe(true);
    expect(errors.some((e) => e.includes('ring'))).toBe(true);
  });

  it('rejects negative radius scale values', () => {
    const t = validTheme();
    t.geometry.radiusScale.bad = -1;
    const errors = validateTheme(t);
    expect(errors.some((e) => e.includes('radiusScale'))).toBe(true);
  });

  it('rejects viz palette with fewer than 3 entries', () => {
    const t = validTheme();
    t.viz.categorical = ['blue.0'];
    const errors = validateTheme(t);
    expect(errors.some((e) => e.includes('categorical'))).toBe(true);
  });

  it('rejects unresolvable palette refs in colors', () => {
    const t = validTheme();
    t.colors.surface.base = 'purple.99';
    const errors = validateTheme(t);
    expect(errors.some((e) => e.includes('purple'))).toBe(true);
  });

  it('rejects unresolvable color refs in shadcn', () => {
    const t = validTheme();
    t.shadcn.background = 'nonexistent.section';
    const errors = validateTheme(t);
    expect(errors.some((e) => e.includes('nonexistent'))).toBe(true);
  });
});
