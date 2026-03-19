# Design Token System — Specification

## Goal

Replace the monolithic hand-written CSS variable system with a JSON-driven, centralized design token architecture. One JSON file per theme, a build script that generates CSS, and semantic component classes that eliminate inline style duplication across components.

## Problem

The current Situation Room dashboard has ~205 CSS custom properties defined directly in `global.css`, duplicated across `:root` (light) and `.dark` blocks. Changing a cross-cutting property like border radius requires editing CSS variables, Tailwind `@theme` mappings, and hunting through component files for hardcoded utility classes. There is no structured format for tokens, no validation, and no way to quickly experiment with visual directions.

## Architecture

```
themes/*.json          (source of truth — one file per theme)
       ↓
generate-theme.ts      (build script — resolves refs, outputs CSS)
       ↓
generated-theme.css    (auto-generated, .gitignored)
       ↓
global.css             (@import generated + hand-authored @layer components)
       ↓
Components (TSX)       (reference semantic class names, not inline utilities)
```

### Layer 1: Theme JSON Files

Each theme is a self-contained JSON file in `themes/`. No inheritance or merging between themes — duplicate a file to start a new variant.

**Important:** Palette key names (e.g. `"gray"`, `"blue"`) are semantic labels within each theme, not descriptions of actual hue. The dark theme's `"gray"` array contains Atom One Dark's blue-tinged grays (`#21252b`, `#282c34`, ...) while the light theme's `"gray"` contains warm neutrals (`#f7f8fa`, `#eef1f5`, ...). Both use the same key name so `colors` refs like `"gray.3"` work identically in both files — they just resolve to different hex values. This is by design.

**Location:** `apps/situation-room/themes/`
**Files:** `light.json`, `dark.json`, `theme.schema.json`

#### Schema Structure

```jsonc
{
  "name": "Light",

  // ─── Raw palette — hex values appear ONLY here ───
  // Key names are semantic labels, not hue descriptions.
  // Dark theme uses the same keys with different values.
  "palette": {
    "gray":  ["#f7f8fa", "#eef1f5", "#e4e8ee", "#dce0e8", "#c5cad4", "#8690a2", "#636a7e", "#4a5068", "#1e2028"],
    "blue":  ["#edf4fc", "#c4daf0", "#8db8e4", "#3574c4", "#2a5ea0", "#234e88"],
    "green": ["#eaf7ef", "#b8e0c8", "#1a7f42"],
    "red":   ["#fdf0f0", "#f0c0c3", "#c9363f"],
    "amber": ["#fef9eb", "#f0dfa0", "#b07d1a"],
    "cyan":  ["#e8f8fa", "#b0e0e6", "#2e95a3"],
    "white": "#ffffff",
    "black": "#1e2028",
    "transparent": "transparent"
  },

  // ─── Semantic color mappings ───
  // Refs use "paletteKey.index" (e.g. "gray.3") or "paletteKey" for scalars.
  // Refs into colors use "section.key" (e.g. "surface.elevated").
  "colors": {
    "surface":  { "base": "gray.0", "elevated": "white", "sunken": "gray.1", "overlay": "white" },
    "text":     { "primary": "gray.8", "secondary": "gray.7", "tertiary": "gray.5", "inverse": "white", "link": "blue.3", "linkHover": "blue.4" },
    "border":   { "default": "gray.3", "subtle": "gray.2", "strong": "gray.4" },
    "brand":    { "default": "blue.3", "subtle": "blue.0", "hover": "blue.4", "muted": "blue.1" },
    "positive": { "text": "green.2", "bg": "green.0", "border": "green.1" },
    "negative": { "text": "red.2", "bg": "red.0", "border": "red.1" },
    "warning":  { "text": "amber.2", "bg": "amber.0", "border": "amber.1" },
    "info":     { "text": "blue.3", "bg": "blue.0", "border": "blue.1" },
    "neutral":  { "text": "gray.6", "bg": "gray.1", "border": "gray.3" },
    "interactive": {
      "bg": "blue.3", "bgHover": "blue.4", "bgActive": "blue.5",
      "text": "white",
      "ghostHover": "gray.1", "ghostActive": "gray.2",
      "outlineBorder": "gray.3", "outlineHover": "gray.4",
      "focusRing": "blue.3",
      "disabledBg": "gray.1", "disabledText": "gray.4"
    }
  },

  // ─── shadcn compatibility tokens ───
  // Maps to the standard shadcn CSS variables that ui/ primitives depend on.
  // Refs point to colors sections defined above.
  "shadcn": {
    "background": "surface.base",
    "foreground": "text.primary",
    "card": "surface.elevated",
    "cardForeground": "text.primary",
    "popover": "surface.elevated",
    "popoverForeground": "text.primary",
    "primary": "brand.default",
    "primaryForeground": "text.inverse",
    "secondary": "surface.sunken",
    "secondaryForeground": "text.primary",
    "muted": "surface.sunken",
    "mutedForeground": "text.tertiary",
    "accent": "surface.sunken",
    "accentForeground": "text.primary",
    "destructive": "negative.text",
    "border": "border.default",
    "input": "border.default",
    "ring": "brand.default",
    "sidebar": "surface.sunken",
    "sidebarForeground": "text.primary",
    "sidebarPrimary": "brand.default",
    "sidebarPrimaryForeground": "text.inverse",
    "sidebarAccent": "surface.sunken",
    "sidebarAccentForeground": "text.primary",
    "sidebarBorder": "border.default",
    "sidebarRing": "brand.default"
  },

  // ─── Typography ───
  "typography": {
    "fontFamily": { "sans": "Inter, system-ui, sans-serif", "mono": "JetBrains Mono, monospace" },
    "fontSize":   { "xs": "0.75rem", "sm": "0.875rem", "base": "1rem", "lg": "1.125rem", "xl": "1.25rem", "2xl": "1.5rem" },
    "fontWeight": { "normal": "400", "medium": "500", "semibold": "600", "bold": "700" }
  },

  // ─── Geometry ───
  "geometry": {
    "radiusBase": "0.375rem",
    "radiusScale": { "sm": 0.6, "md": 0.8, "lg": 1.0, "xl": 1.4, "2xl": 1.8, "3xl": 2.2, "4xl": 2.6 },
    "shadow": {
      "sm": "0 1px 2px rgba(0,0,0,0.05)",
      "md": "0 4px 6px -1px rgba(0,0,0,0.1)"
    }
  },

  // ─── Dashboard component token mappings ───
  // Geometry refs resolve against geometry scales.
  // Literal CSS values (like "2rem") are used as-is.
  "components": {
    "card":   { "radius": "md", "shadow": "sm" },
    "filter": { "radius": "sm", "height": "2rem" },
    "tab":    { "railRadius": "lg", "pillRadius": "md" },
    "pill":   { "radius": "sm" },
    "table":  { "headerWeight": "medium" }
  },

  // ─── Dashboard semantic color mappings ───
  // Refs resolve against `colors` sections (e.g. "surface.sunken" → colors.surface.sunken → gray.1 → hex)
  // "transparent" is a special literal value.
  "dashboard": {
    "filterBar": {
      "bg": "surface.sunken", "border": "border.default",
      "triggerBg": "surface.elevated", "triggerBorder": "border.default",
      "triggerText": "text.tertiary",
      "triggerHoverBg": "surface.base", "triggerHoverBorder": "border.strong",
      "activeBg": "brand.subtle", "activeBorder": "brand.default", "activeText": "brand.hover",
      "badgeBg": "brand.default", "badgeText": "text.inverse"
    },
    "table": {
      "headerBg": "surface.sunken", "headerText": "text.secondary", "headerBorder": "border.default",
      "rowBg": "transparent", "rowAltBg": "surface.sunken",
      "rowHoverBg": "brand.subtle", "rowSelectedBg": "brand.muted",
      "rowBorder": "border.subtle",
      "cellText": "text.primary", "cellSecondary": "text.secondary"
    },
    "tab": {
      "railBg": "border.subtle", "text": "text.tertiary", "hoverText": "text.secondary",
      "activeBg": "surface.elevated", "activeText": "text.primary"
    },
    "heading": { "primary": "text.primary", "section": "text.secondary", "overline": "text.tertiary" }
  },

  // ─── Visualization palettes ───
  // Use palette refs so chart colors stay in sync with the palette.
  "viz": {
    "categorical": ["blue.3", "cyan.2", "green.2", "amber.2", "red.2", "blue.4", "amber.1", "green.1"],
    "sequential":  ["blue.0", "blue.1", "blue.2", "blue.3", "blue.4", "blue.5"],
    "diverging":   ["red.2", "red.1", "gray.1", "green.1", "green.2"]
  }
}
```

#### Ref Resolution Algorithm

The build script uses a deterministic resolution algorithm based on context:

1. **Palette refs** (in `colors`, `viz`): Format `"key.index"` or `"key"`. Resolved against `palette`.
   - `"gray.3"` → `palette.gray[3]` → `"#dce0e8"`
   - `"white"` → `palette.white` → `"#ffffff"`
   - `"transparent"` → literal `"transparent"` (special case)

2. **Color refs** (in `dashboard`, `shadcn`): Format `"section.key"`. Resolved against `colors`, then palette.
   - `"surface.elevated"` → `colors.surface.elevated` → `"white"` → `palette.white` → `"#ffffff"`
   - `"brand.default"` → `colors.brand.default` → `"blue.3"` → `palette.blue[3]` → `"#3574c4"`

3. **Geometry refs** (in `components`): Depends on the property name:
   - Properties named `*radius*` → resolve against `geometry.radiusScale` (multiplied by `geometry.radiusBase`)
   - Properties named `*shadow*` → resolve against `geometry.shadow`
   - Properties named `*weight*` → resolve against `typography.fontWeight`
   - Other values (e.g. `"2rem"`) → used as literal CSS values

4. **Validation:** If any ref fails to resolve, the build script exits with code 1 and prints all unresolved refs with their location in the JSON. This fails CI early.

#### Radius System

The radius system uses a base value + multiplier scale, matching the current approach:

```
geometry.radiusBase = "0.375rem"
geometry.radiusScale.sm = 0.6  → calc(0.375rem * 0.6) = ~0.225rem
geometry.radiusScale.md = 0.8  → calc(0.375rem * 0.8) = ~0.3rem
geometry.radiusScale.lg = 1.0  → 0.375rem
geometry.radiusScale.xl = 1.4  → calc(0.375rem * 1.4) = ~0.525rem
```

The generated CSS uses `calc()` expressions, preserving the multiplicative relationship. When `components.card.radius = "md"`, the build script resolves it to `calc(var(--radius) * 0.8)` in the `@theme inline` block, and to the computed pixel value in the `:root`/`.dark` blocks.

#### JSON Schema Validation

`theme.schema.json` (JSON Schema draft-07) validates:
- All required top-level sections exist: `name`, `palette`, `colors`, `shadcn`, `typography`, `geometry`, `components`, `dashboard`, `viz`
- Palette entries are hex strings or arrays of hex strings
- Color refs match the pattern `word.word` or `word`
- `geometry.radiusBase` is a valid CSS length
- `geometry.radiusScale` values are positive numbers
- Component geometry values are either scale names or valid CSS literal values
- Viz palette arrays have at least 3 entries
- All `shadcn` keys are present (the full set shadcn components expect)

The schema file itself is an implementation detail — the build script should generate helpful error messages rather than raw JSON Schema validation output.

### Layer 2: Build Script

**Location:** `apps/situation-room/themes/generate-theme.ts`

A TypeScript script (run via `tsx`) that:

1. Reads all `themes/*.json` files (excluding `theme.schema.json`)
2. Validates each against the schema
3. Resolves all refs to final hex/CSS values (all colors emitted as bare hex for Tailwind alpha modifier compatibility)
4. Derives `--chart-1` through `--chart-N` from `viz.categorical` entries
5. Outputs `app/generated-theme.css` containing:
   - `:root { ... }` block from the theme where `name` is `"Light"`
   - `.dark { ... }` block from the theme where `name` is `"Dark"`
   - Additional `.[kebab-name] { ... }` blocks for any other themes discovered
   - `@theme inline { ... }` block mapping all properties to Tailwind utilities

**Error handling:** On any validation or resolution failure, the script exits with code 1 and prints a human-readable list of all errors. Partial output is never written — the previous `generated-theme.css` is preserved so the app doesn't break.

#### Tailwind v4 Theme Mapping Rules

The `@theme inline` block maps CSS custom properties to Tailwind's utility namespace using these conventions:

| CSS variable pattern | Tailwind prefix | Example |
|---|---|---|
| `--surface-*`, `--text-*`, `--border-*`, `--brand-*`, `--positive-*`, `--negative-*`, `--warning-*`, `--info-*`, `--neutral-*`, `--interactive-*`, `--filter-*`, `--table-*`, `--tab-*`, `--heading-*`, `--viz-*` | `--color-` | `--color-surface: var(--surface)` → `bg-surface` |
| All shadcn color vars: `--background`, `--foreground`, `--card`, `--primary`, etc. | `--color-` | `--color-background: var(--background)` → `bg-background` |
| `--chart-1` through `--chart-N` (derived from `viz.categorical`) | `--color-` | `--color-chart-1: var(--chart-1)` → `bg-chart-1` |
| `--radius` (base) | No prefix, as `--radius` | Used by shadcn computed radius scale |
| `--card-radius`, `--filter-radius`, `--tab-*-radius`, `--pill-radius` | `--radius-` | `--radius-card: var(--card-radius)` → `rounded-card` |
| `--card-shadow` | `--shadow-` | `--shadow-card: var(--card-shadow)` → `shadow-card` |
| `--font-sans`, `--font-mono` | `--font-` | `--font-sans: var(--font-sans)` |

The shadcn radius scale (`--radius-sm`, `--radius-md`, etc.) is generated using `calc(var(--radius) * multiplier)` from `geometry.radiusScale`, preserving the current behavior where all radii scale proportionally from a single base value.

#### Alpha / Opacity Variants

The current codebase relies on Tailwind's opacity modifier syntax (`bg-destructive/10`, `ring-ring/50`, `ring-foreground/10`, `dark:bg-input/30`). Tailwind v4 supports this natively when the color value uses a format that allows alpha injection — either `oklch()`, `hsl()`, or bare hex without an existing alpha channel.

**Strategy:** The build script emits **all** color custom properties as bare hex values (e.g. `--destructive: #c9363f`). Tailwind v4's `@theme inline` color mapping automatically enables the `/opacity` modifier for any color registered through `--color-*`. No additional tokens are needed — `bg-destructive/10` works out of the box because Tailwind decomposes the hex into its color space and applies the alpha at build time.

**Constraint:** Theme JSON palette values MUST be opaque hex colors (no `rgba()` or `hsla()` with baked-in alpha). If a semi-transparent color is genuinely needed as a token (not just a utility modifier), add it as a separate semantic token with an explicit alpha value (e.g. `"overlayBackdrop": "rgba(0,0,0,0.5)"`), which the build script passes through as a literal.

#### Chart Token Derivation

The shadcn chart system expects `--chart-1` through `--chart-5` (minimum). The build script derives these from `viz.categorical`:

```
--chart-1: {resolved viz.categorical[0]}
--chart-2: {resolved viz.categorical[1]}
--chart-3: {resolved viz.categorical[2]}
--chart-4: {resolved viz.categorical[3]}
--chart-5: {resolved viz.categorical[4]}
```

If `viz.categorical` has more than 5 entries, additional `--chart-N` vars are emitted up to the array length. The `@theme inline` block registers each as `--color-chart-N: var(--chart-N)`, enabling utilities like `text-chart-1`, `bg-chart-2`, etc.

The `--viz-*` variables are also emitted separately (1-indexed: `--viz-1`, `--viz-2`, ...) for components that reference visualization colors directly (e.g. `trend-chart.tsx`). Both `--chart-*` and `--viz-*` resolve to the same underlying colors but serve different consumers (shadcn charts vs. custom dashboard charts).

#### Theme Activation & Additional Variants

The build script discovers themes dynamically — it reads **all** `themes/*.json` files (excluding `theme.schema.json`) and uses the `name` field to determine how each theme is emitted:

| `name` value | CSS selector | Notes |
|---|---|---|
| `"Light"` | `:root { ... }` | Default theme (no class needed) |
| `"Dark"` | `.dark { ... }` | Activated by `next-themes` adding `.dark` to `<html>` |
| Any other value | `.[kebab-case-name] { ... }` | e.g. `"High Contrast"` → `.high-contrast { ... }` |

To add a new theme variant:
1. Duplicate an existing JSON file (e.g. `cp light.json high-contrast.json`)
2. Change `"name"` to your variant name (e.g. `"High Contrast"`)
3. Modify palette/color values as needed
4. The build script automatically emits the new CSS block
5. Activate in the app by adding the corresponding class to `<html>` (wire into `next-themes` or a custom theme switcher)

The `prebuild` hook and dev watcher pick up new files automatically — no script changes needed.

**npm scripts in `package.json`:**
- `"theme:generate"`: `tsx themes/generate-theme.ts`
- `"theme:watch"`: watches `themes/*.json` via chokidar and re-runs generation (the script itself contains the watcher loop, activated by a `--watch` flag)
- `"predev"`: `pnpm theme:generate` (ensures `generated-theme.css` exists before Next.js starts — critical for fresh clones where the gitignored file doesn't exist yet)
- `"dev"`: `concurrently \"pnpm theme:watch\" \"next dev -p 3100\"`
- `"prebuild"`: `pnpm theme:generate` (ensures CI generates before `next build`)

**Generated file:** `app/generated-theme.css` — added to `.gitignore`.

### Layer 3: Component Classes

**Location:** `apps/situation-room/app/global.css` (hand-authored, committed)

After migration, `global.css` contains:

```css
@import './generated-theme.css';
@import 'tailwindcss';
@import 'tw-animate-css';
@import 'shadcn/tailwind.css';

@custom-variant dark (&:is(.dark *));

@layer components {
  /* ── Cards & Tiles ── */
  .card-tile { @apply bg-surface-elevated rounded-card shadow-card ring-1 ring-border-subtle; }
  .card-tile-header { @apply px-4 py-3 text-heading-primary text-lg font-semibold tracking-tight; }

  /* ── Filters ── */
  .filter-trigger {
    @apply flex items-center gap-1.5 h-[var(--filter-height)] rounded-filter
           border border-filter-trigger-border bg-filter-trigger-bg
           text-filter-trigger-text text-xs select-none cursor-pointer px-2.5
           transition-all;
  }
  .filter-trigger-active {
    @apply border-filter-active-border bg-filter-active-bg
           text-filter-active-text font-medium;
  }

  /* ── Tabs ── */
  .tab-rail { @apply inline-flex items-center gap-0.5 rounded-tab-rail bg-tab-rail p-1; }
  .tab-pill {
    @apply rounded-tab-pill px-4 py-1.5 text-sm font-medium text-tab-text
           select-none cursor-pointer transition-[background-color,box-shadow,color,transform]
           duration-200 ease-out;
  }
  .tab-pill:hover { @apply text-tab-hover-text; }
  .tab-pill:active { @apply scale-[0.97]; }
  .tab-pill-active { @apply bg-tab-active-bg text-tab-active-text shadow-sm font-semibold; }

  /* ── Table ── */
  .table-header-cell { @apply text-xs font-medium uppercase tracking-wider text-table-header-text; }
  .table-data-cell { @apply text-table-cell-text; }
  .table-data-cell-numeric { @apply text-table-cell-text tabular-nums font-semibold text-right; }
  .table-data-cell-secondary { @apply text-table-cell-secondary tabular-nums text-right; }

  /* ── Status Pills ── */
  .pill-status {
    @apply inline-flex items-center gap-0.5 px-2 py-0.5 rounded-pill
           text-xs font-medium tabular-nums border;
  }
  .pill-positive { @apply pill-status bg-positive-bg text-positive border-positive-border; }
  .pill-negative { @apply pill-status bg-negative-bg text-negative border-negative-border; }
  .pill-neutral  { @apply pill-status bg-neutral-bg text-neutral border-neutral-border; }

  /* ── Headings ── */
  .heading-overline { @apply text-xs font-medium uppercase tracking-[0.15em] text-heading-overline; }
  .heading-section { @apply text-heading-section leading-relaxed; }
  .heading-primary { @apply text-lg font-semibold tracking-tight text-heading-primary; }

  /* ── Page Surfaces ── */
  .surface-page { @apply bg-surface-sunken min-h-screen w-full; }
  .surface-header { @apply bg-surface border-b border-border-subtle; }
  .surface-filter-bar { @apply bg-filter-bar-bg border-b border-filter-bar-border; }
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body {
    @apply bg-background text-foreground;
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}

@media print {
  body { background: white !important; color: black !important; }
  .no-print { display: none !important; }
}
```

### Layer 4: Component Migration

Components switch from inline Tailwind utility strings to semantic class names.

**What gets semantic classes:**
- Visual theming: colors, radii, shadows, typography styles, borders
- Repeated patterns: every card, every filter trigger, every table header

**What stays as inline Tailwind:**
- Layout: `flex`, `grid`, `gap-4`, `px-6`, `w-full`, `mt-8`
- Responsive breakpoints: `md:grid-cols-3`, `hidden sm:table-cell`
- One-off structural styles unique to a single component

**Example migration — `executive-snapshot.tsx`:**

Before:
```tsx
<Card size="sm" className="bg-surface-elevated shadow-sm hover:shadow-md transition-shadow duration-200">
  <CardHeader>
    <CardDescription className="text-xs font-medium text-heading-overline uppercase tracking-wider">
      {category}
    </CardDescription>
```

After:
```tsx
<Card size="sm" className="card-tile hover:shadow-md transition-shadow duration-200">
  <CardHeader>
    <CardDescription className="heading-overline">
      {category}
    </CardDescription>
```

### What Stays Untouched

**shadcn `ui/` primitives** (`button.tsx`, `card.tsx`, `popover.tsx`, etc.) — these reference shadcn's own token system (`bg-primary`, `bg-muted`, `text-foreground`). The generated theme feeds those variables via the `shadcn` section in the JSON, which maps to standard `--primary`, `--muted`, `--foreground` etc. No need to refactor their internal classNames.

**Layout utilities** — Tailwind structural classes (`flex`, `grid`, `gap-*`, `px-*`, `w-full`, responsive prefixes) stay inline. These express layout structure, not visual theme.

## Migration Phases

### Phase 1: Foundation
- Create `themes/` directory with `light.json`, `dark.json`, `theme.schema.json`
- Extract all current CSS variable values into JSON files (full audit of all ~205 variables)
- Build `generate-theme.ts` script with ref resolution, validation, and CSS output
- Add `theme:generate`, `theme:watch`, and updated `dev` npm scripts
- Add `generated-theme.css` to `.gitignore`
- **Checkpoint:** Generated CSS produces identical variables to current `global.css`. App looks exactly the same.

### Phase 2: Switchover
- Replace hand-written variable blocks in `global.css` with `@import './generated-theme.css'`
- Keep `@import 'shadcn/tailwind.css'` (required by shadcn ui primitives)
- Add all `@layer components` class definitions
- Add `theme:generate` as `prebuild` and `predev` hooks (ensures `generated-theme.css` exists before Next.js starts — critical for fresh clones)
- **Checkpoint:** `global.css` is ~80 lines. All tokens flow from JSON. App looks identical.

### Phase 3: Component Refactor
Each component migrated in its own commit, verifying zero visual change:
1. `executive-snapshot.tsx` — card + heading styles
2. `category-section.tsx` — card + table header styles
3. `metric-row.tsx` — table cell styles
4. `change-indicator.tsx` — status pill styles
5. `filter-dropdown.tsx` — trigger + active styles
6. `filter-rail.tsx` — badge + heading styles
7. `filter-chip.tsx` — chip styles
8. `report-content.tsx` — page surface + error banner styles
9. `report-header.tsx` — heading styles
10. `trend-chart.tsx` — remove fallback hex, use `--viz-*` vars
11. `tabs.tsx` (ui) — compose from semantic tab classes

### Phase 4: Validation
Smoke test by editing JSON values and confirming propagation:
- Change `geometry.radiusBase` → all radii scale proportionally
- Change `palette.blue[3]` → brand color changes everywhere
- Change `components.filter.radius` → only filters change
- Change `typography.fontFamily.sans` → entire app font changes
- Change `viz.categorical[0]` → chart primary color updates
- Verify both light and dark themes independently

## Dependencies

All added to `apps/situation-room/package.json` as `devDependencies`:
- `tsx` — run TypeScript build script without compilation step
- `chokidar` — file watching in dev mode (inside `generate-theme.ts` via `--watch` flag)
- `concurrently` — run watcher + Next.js dev server in parallel

JSON Schema validation is done with basic runtime checks in the build script (no `ajv` dependency needed for this scope).

## Success Criteria

1. Changing any visual property (color, radius, font, shadow) requires editing exactly one JSON value
2. No hex color values appear outside of `themes/*.json` palette blocks
3. No component file contains inline Tailwind classes for theming (colors, radii, shadows, typography styles)
4. Layout utilities remain inline (structural, not thematic)
5. Generated CSS is identical in structure to production CSS — zero runtime cost
6. Both light and dark themes render correctly after full migration
7. Dev mode: editing JSON auto-regenerates CSS within 1 second
8. Build script exits non-zero with clear error messages on invalid refs
9. All ~205 current CSS variables are accounted for in the JSON schema (no regressions)
