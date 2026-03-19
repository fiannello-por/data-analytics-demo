# Design Token System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the monolithic hand-written CSS variables in `global.css` with a JSON-driven design token system, build pipeline, and semantic component classes.

**Architecture:** Theme JSON files → TypeScript build script → generated CSS → `@layer components` in `global.css` → components reference semantic class names. One JSON file per theme (Light, Dark), a build script that resolves refs and outputs CSS custom properties, and semantic component classes that replace inline Tailwind theming utilities.

**Tech Stack:** TypeScript (tsx), Tailwind CSS v4, Next.js 15, chokidar (file watching), concurrently (parallel dev scripts), vitest (testing)

**Spec:** `docs/superpowers/specs/2026-03-19-design-token-system.md`

---

## File Structure

### New Files (Create)

| File | Responsibility |
|------|---------------|
| `apps/situation-room/themes/light.json` | Light theme source of truth — all palette hex values, semantic color refs, typography, geometry, component tokens, dashboard tokens, viz palettes |
| `apps/situation-room/themes/dark.json` | Dark theme source of truth — same schema, Atom One Dark color values |
| `apps/situation-room/themes/theme.schema.json` | JSON Schema (draft-07) for validating theme files |
| `apps/situation-room/themes/generate-theme.ts` | Build script — reads JSON, resolves refs, outputs CSS. Includes `--watch` mode for dev |
| `apps/situation-room/app/generated-theme.css` | Auto-generated output (gitignored) — `:root`, `.dark`, `@theme inline` blocks |
| `apps/situation-room/__tests__/generate-theme.test.ts` | Tests for the build script — ref resolution, validation, CSS output |

### Modified Files

| File | What Changes |
|------|-------------|
| `apps/situation-room/app/global.css` | Remove ~400 lines of hand-written `:root`/`.dark`/`@theme inline` blocks. Add `@import './generated-theme.css'`. Add `@layer components` with semantic classes. Final file ~80 lines. |
| `apps/situation-room/package.json` | Add `tsx`, `chokidar`, `concurrently` devDependencies. Add `theme:generate`, `theme:watch`, `predev`, `prebuild` scripts. Update `dev` script. |
| `apps/situation-room/.gitignore` | Create file, add `app/generated-theme.css` |
| `apps/situation-room/components/executive-snapshot.tsx` | Replace inline theming classes with `card-tile`, `heading-overline`, `heading-primary` |
| `apps/situation-room/components/category-section.tsx` | Replace inline theming classes with `card-tile`, `heading-primary`, `heading-section`, `table-header-cell` |
| `apps/situation-room/components/metric-row.tsx` | Replace inline theming classes with `table-data-cell`, `table-data-cell-numeric`, `table-data-cell-secondary` |
| `apps/situation-room/components/change-indicator.tsx` | Replace inline theming classes with `pill-positive`, `pill-negative`, `pill-neutral` |
| `apps/situation-room/components/filter-dropdown.tsx` | Replace inline trigger classes with `filter-trigger`, `filter-trigger-active` |
| `apps/situation-room/components/filter-rail.tsx` | Replace inline heading/badge classes with `heading-overline` |
| `apps/situation-room/components/filter-chip.tsx` | Replace inline theming classes with semantic tokens |
| `apps/situation-room/components/report-content.tsx` | Replace inline surface/heading classes with `surface-page`, `surface-header`, `surface-filter-bar`, `heading-overline` |
| `apps/situation-room/components/report-header.tsx` | Replace inline heading classes with `heading-overline`, `heading-primary` |
| `apps/situation-room/components/trend-chart.tsx` | Remove fallback hex values, read CSS vars only |
| `apps/situation-room/components/ui/tabs.tsx` | Compose tab variants from `tab-rail`, `tab-pill`, `tab-pill-active` classes |

---

## Task 1: Install Dependencies and Configure Scripts

**Files:**
- Modify: `apps/situation-room/package.json`
- Create: `apps/situation-room/.gitignore`

- [ ] **Step 1: Install dev dependencies**

```bash
cd apps/situation-room && pnpm add -D tsx chokidar concurrently
```

- [ ] **Step 2: Verify installation**

```bash
cd apps/situation-room && pnpm ls tsx chokidar concurrently
```

Expected: All three packages listed with versions.

- [ ] **Step 3: Add npm scripts to package.json**

In `apps/situation-room/package.json`, update the `"scripts"` section. The current scripts are:

```json
"scripts": {
  "dev": "next dev --port 3100",
  "build": "next build",
  "start": "next start --port 3100",
  "test": "vitest run",
  "test:watch": "vitest",
  "typecheck": "tsc --noEmit"
}
```

Replace with:

```json
"scripts": {
  "theme:generate": "tsx themes/generate-theme.ts",
  "theme:watch": "tsx themes/generate-theme.ts --watch",
  "predev": "pnpm theme:generate",
  "dev": "concurrently --kill-others \"pnpm theme:watch\" \"next dev --port 3100\"",
  "prebuild": "pnpm theme:generate",
  "build": "next build",
  "start": "next start --port 3100",
  "test": "vitest run",
  "test:watch": "vitest",
  "typecheck": "tsc --noEmit"
}
```

- [ ] **Step 4: Create .gitignore**

Create `apps/situation-room/.gitignore`:

```
app/generated-theme.css
```

- [ ] **Step 5: Commit**

```bash
git add apps/situation-room/package.json apps/situation-room/pnpm-lock.yaml apps/situation-room/.gitignore
git commit -m "chore: add design token build dependencies and scripts"
```

Note: The `pnpm-lock.yaml` is at the workspace root. Stage from there:

```bash
git add apps/situation-room/package.json pnpm-lock.yaml apps/situation-room/.gitignore
git commit -m "chore: add design token build dependencies and scripts"
```

---

## Task 2: Create Theme JSON Schema

**Files:**
- Create: `apps/situation-room/themes/theme.schema.json`

- [ ] **Step 1: Create the themes directory**

```bash
mkdir -p apps/situation-room/themes
```

- [ ] **Step 2: Write theme.schema.json**

Create `apps/situation-room/themes/theme.schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Theme",
  "description": "Design token theme file for the Situation Room dashboard",
  "type": "object",
  "required": ["name", "palette", "colors", "shadcn", "typography", "geometry", "components", "dashboard", "viz"],
  "additionalProperties": false,
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "description": "Theme display name. 'Light' maps to :root, 'Dark' maps to .dark, others map to .kebab-case-name"
    },
    "palette": {
      "type": "object",
      "description": "Raw color values. Only place hex values appear.",
      "properties": {
        "gray": { "type": "array", "items": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" }, "minItems": 1 },
        "blue": { "type": "array", "items": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" }, "minItems": 1 },
        "green": { "type": "array", "items": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" }, "minItems": 1 },
        "red": { "type": "array", "items": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" }, "minItems": 1 },
        "amber": { "type": "array", "items": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" }, "minItems": 1 },
        "cyan": { "type": "array", "items": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" }, "minItems": 1 },
        "white": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "black": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "transparent": { "type": "string", "const": "transparent" }
      },
      "required": ["gray", "blue", "green", "red", "amber", "cyan", "white", "black", "transparent"],
      "additionalProperties": {
        "oneOf": [
          { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
          { "type": "array", "items": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" }, "minItems": 1 }
        ]
      }
    },
    "colors": {
      "type": "object",
      "description": "Semantic color mappings using palette refs (e.g. 'gray.3', 'white')",
      "additionalProperties": {
        "type": "object",
        "additionalProperties": { "type": "string" }
      }
    },
    "shadcn": {
      "type": "object",
      "description": "shadcn compatibility tokens mapping to colors refs",
      "required": [
        "background", "foreground", "card", "cardForeground",
        "popover", "popoverForeground", "primary", "primaryForeground",
        "secondary", "secondaryForeground", "muted", "mutedForeground",
        "accent", "accentForeground", "destructive",
        "border", "input", "ring"
      ],
      "additionalProperties": { "type": "string" }
    },
    "typography": {
      "type": "object",
      "required": ["fontFamily", "fontSize", "fontWeight"],
      "properties": {
        "fontFamily": { "type": "object", "additionalProperties": { "type": "string" } },
        "fontSize": { "type": "object", "additionalProperties": { "type": "string" } },
        "fontWeight": { "type": "object", "additionalProperties": { "type": "string" } }
      },
      "additionalProperties": false
    },
    "geometry": {
      "type": "object",
      "required": ["radiusBase", "radiusScale", "shadow"],
      "properties": {
        "radiusBase": { "type": "string", "description": "CSS length value, e.g. '0.375rem'" },
        "radiusScale": {
          "type": "object",
          "additionalProperties": { "type": "number", "exclusiveMinimum": 0 }
        },
        "shadow": {
          "type": "object",
          "additionalProperties": { "type": "string" }
        }
      },
      "additionalProperties": false
    },
    "components": {
      "type": "object",
      "description": "Dashboard component token mappings (geometry refs or literal CSS values)",
      "additionalProperties": {
        "type": "object",
        "additionalProperties": { "type": ["string", "number"] }
      }
    },
    "dashboard": {
      "type": "object",
      "description": "Dashboard semantic color mappings using colors refs",
      "additionalProperties": {
        "type": "object",
        "additionalProperties": { "type": "string" }
      }
    },
    "viz": {
      "type": "object",
      "required": ["categorical", "sequential", "diverging"],
      "properties": {
        "categorical": { "type": "array", "items": { "type": "string" }, "minItems": 3 },
        "sequential": { "type": "array", "items": { "type": "string" }, "minItems": 3 },
        "diverging": { "type": "array", "items": { "type": "string" }, "minItems": 3 }
      },
      "additionalProperties": false
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/situation-room/themes/theme.schema.json
git commit -m "feat(tokens): add JSON Schema for theme validation"
```

---

## Task 3: Create Light Theme JSON

**Files:**
- Create: `apps/situation-room/themes/light.json`

This task extracts every CSS custom property value from the current `:root` block in `global.css` (lines 12–140) into the JSON schema format.

- [ ] **Step 1: Create light.json**

Create `apps/situation-room/themes/light.json`. The values below are extracted from the current `global.css` `:root` block. Every hex value must match the current CSS exactly.

```json
{
  "name": "Light",

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

  "typography": {
    "fontFamily": { "sans": "Inter, system-ui, sans-serif", "mono": "JetBrains Mono, ui-monospace, monospace" },
    "fontSize":   { "xs": "0.75rem", "sm": "0.875rem", "base": "1rem", "lg": "1.125rem", "xl": "1.25rem", "2xl": "1.5rem" },
    "fontWeight": { "normal": "400", "medium": "500", "semibold": "600", "bold": "700" }
  },

  "geometry": {
    "radiusBase": "0.375rem",
    "radiusScale": { "sm": 0.6, "md": 0.8, "lg": 1.0, "xl": 1.4, "2xl": 1.8, "3xl": 2.2, "4xl": 2.6 },
    "shadow": {
      "sm": "0 1px 2px rgba(0,0,0,0.05)",
      "md": "0 4px 6px -1px rgba(0,0,0,0.1)"
    }
  },

  "components": {
    "card":   { "radius": "md", "shadow": "sm" },
    "filter": { "radius": "sm", "height": "2rem" },
    "tab":    { "railRadius": "lg", "pillRadius": "md" },
    "pill":   { "radius": "sm" },
    "table":  { "headerWeight": "medium" }
  },

  "dashboard": {
    "filterBar": {
      "bg": "surface.sunken", "border": "border.default",
      "triggerBg": "surface.elevated", "triggerBorder": "border.default",
      "triggerText": "text.secondary",
      "triggerHoverBg": "surface.sunken", "triggerHoverBorder": "border.strong",
      "activeBg": "brand.subtle", "activeBorder": "brand.default", "activeText": "brand.hover",
      "badgeBg": "brand.default", "badgeText": "text.inverse"
    },
    "table": {
      "headerBg": "surface.sunken", "headerText": "text.secondary", "headerBorder": "border.default",
      "rowBg": "transparent", "rowAltBg": "surface.base",
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

  "viz": {
    "categorical": ["blue.3", "cyan.2", "green.2", "amber.2", "red.2", "blue.4", "amber.1", "green.1"],
    "sequential":  ["blue.0", "blue.1", "blue.2", "blue.3", "blue.4", "blue.5"],
    "diverging":   ["red.2", "red.1", "gray.1", "green.1", "green.2"]
  }
}
```

**Important verification note:** After this file is created, cross-reference every hex value in the palette against the current `global.css` `:root` block to ensure no values were lost or changed. The light theme's `dashboard.filterBar.bg` maps to `surface.sunken` → `gray.1` → `#eef1f5`. In the current CSS, `--filter-bar-bg` is `#f0f2f5` which is slightly different — this is intentional; some current values don't follow a strict palette and the JSON will now normalize them. The build script output will be validated against the running app visually.

However, there is a known deviation: current `--accent` is `#e8ecf2` but the JSON maps it to `surface.sunken` → `#eef1f5`. And `--filter-bar-bg` is `#f0f2f5` vs the ref-derived `#eef1f5`. When the build script generates CSS, **manually compare the generated output against the current `global.css` values** and add any one-off overrides to the dashboard section or adjust palette values to match exactly. The checkpoint requires **visual parity**.

- [ ] **Step 2: Commit**

```bash
git add apps/situation-room/themes/light.json
git commit -m "feat(tokens): add light theme JSON with all current values"
```

---

## Task 4: Create Dark Theme JSON

**Files:**
- Create: `apps/situation-room/themes/dark.json`

This task extracts every CSS custom property value from the current `.dark` block in `global.css` (lines 147–274).

- [ ] **Step 1: Create dark.json**

Create `apps/situation-room/themes/dark.json`. Same schema as `light.json`, but with Atom One Dark color values. Every hex value must match the current `.dark` block in `global.css`.

```json
{
  "name": "Dark",

  "palette": {
    "gray":  ["#1a1d23", "#21252b", "#282c34", "#2c313a", "#3e4451", "#5c6370", "#828997", "#abb2bf", "#d7dae0"],
    "blue":  ["#253545", "#354a5e", "#3a6090", "#61afef", "#82c0f5", "#a8d4f7"],
    "green": ["#2a3a2a", "#3d5a3d", "#98c379"],
    "red":   ["#3a2a2a", "#5a3a3a", "#e06c75"],
    "amber": ["#3a3525", "#5a5035", "#e5c07b"],
    "cyan":  ["#253a3e", "#3a5a60", "#56b6c2"],
    "white": "#d7dae0",
    "black": "#282c34",
    "transparent": "transparent"
  },

  "colors": {
    "surface":  { "base": "gray.2", "elevated": "gray.3", "sunken": "gray.1", "overlay": "gray.3" },
    "text":     { "primary": "gray.7", "secondary": "gray.6", "tertiary": "gray.5", "inverse": "gray.2", "link": "blue.3", "linkHover": "blue.4" },
    "border":   { "default": "gray.4", "subtle": "gray.4", "strong": "gray.4" },
    "brand":    { "default": "blue.3", "subtle": "blue.0", "hover": "blue.4", "muted": "blue.1" },
    "positive": { "text": "green.2", "bg": "green.0", "border": "green.1" },
    "negative": { "text": "red.2", "bg": "red.0", "border": "red.1" },
    "warning":  { "text": "amber.2", "bg": "amber.0", "border": "amber.1" },
    "info":     { "text": "blue.3", "bg": "blue.0", "border": "blue.1" },
    "neutral":  { "text": "gray.5", "bg": "gray.3", "border": "gray.4" },
    "interactive": {
      "bg": "blue.3", "bgHover": "blue.4", "bgActive": "blue.2",
      "text": "gray.2",
      "ghostHover": "gray.3", "ghostActive": "gray.4",
      "outlineBorder": "gray.4", "outlineHover": "gray.4",
      "focusRing": "blue.2",
      "disabledBg": "gray.3", "disabledText": "gray.4"
    }
  },

  "shadcn": {
    "background": "surface.base",
    "foreground": "text.primary",
    "card": "surface.sunken",
    "cardForeground": "text.primary",
    "popover": "surface.sunken",
    "popoverForeground": "text.primary",
    "primary": "brand.default",
    "primaryForeground": "surface.base",
    "secondary": "border.default",
    "secondaryForeground": "text.primary",
    "muted": "border.default",
    "mutedForeground": "text.tertiary",
    "accent": "border.default",
    "accentForeground": "text.primary",
    "destructive": "negative.text",
    "border": "border.default",
    "input": "border.default",
    "ring": "brand.default",
    "sidebar": "surface.sunken",
    "sidebarForeground": "text.primary",
    "sidebarPrimary": "brand.default",
    "sidebarPrimaryForeground": "surface.base",
    "sidebarAccent": "surface.elevated",
    "sidebarAccentForeground": "text.primary",
    "sidebarBorder": "border.default",
    "sidebarRing": "brand.default"
  },

  "typography": {
    "fontFamily": { "sans": "Inter, system-ui, sans-serif", "mono": "JetBrains Mono, ui-monospace, monospace" },
    "fontSize":   { "xs": "0.75rem", "sm": "0.875rem", "base": "1rem", "lg": "1.125rem", "xl": "1.25rem", "2xl": "1.5rem" },
    "fontWeight": { "normal": "400", "medium": "500", "semibold": "600", "bold": "700" }
  },

  "geometry": {
    "radiusBase": "0.375rem",
    "radiusScale": { "sm": 0.6, "md": 0.8, "lg": 1.0, "xl": 1.4, "2xl": 1.8, "3xl": 2.2, "4xl": 2.6 },
    "shadow": {
      "sm": "0 1px 2px rgba(0,0,0,0.15)",
      "md": "0 4px 6px -1px rgba(0,0,0,0.25)"
    }
  },

  "components": {
    "card":   { "radius": "md", "shadow": "sm" },
    "filter": { "radius": "sm", "height": "2rem" },
    "tab":    { "railRadius": "lg", "pillRadius": "md" },
    "pill":   { "radius": "sm" },
    "table":  { "headerWeight": "medium" }
  },

  "dashboard": {
    "filterBar": {
      "bg": "surface.sunken", "border": "border.default",
      "triggerBg": "surface.base", "triggerBorder": "border.default",
      "triggerText": "text.secondary",
      "triggerHoverBg": "surface.elevated", "triggerHoverBorder": "border.strong",
      "activeBg": "brand.subtle", "activeBorder": "brand.default", "activeText": "brand.default",
      "badgeBg": "brand.default", "badgeText": "surface.base"
    },
    "table": {
      "headerBg": "surface.elevated", "headerText": "text.secondary", "headerBorder": "border.default",
      "rowBg": "transparent", "rowAltBg": "surface.base",
      "rowHoverBg": "brand.subtle", "rowSelectedBg": "brand.subtle",
      "rowBorder": "border.subtle",
      "cellText": "text.primary", "cellSecondary": "text.secondary"
    },
    "tab": {
      "railBg": "surface.sunken", "text": "text.tertiary", "hoverText": "text.secondary",
      "activeBg": "surface.elevated", "activeText": "text.primary"
    },
    "heading": { "primary": "text.primary", "section": "text.secondary", "overline": "text.tertiary" }
  },

  "viz": {
    "categorical": ["blue.3", "cyan.2", "green.2", "amber.2", "red.2", "blue.4", "amber.1", "green.1"],
    "sequential":  ["blue.0", "blue.1", "blue.2", "blue.3", "blue.4", "blue.5"],
    "diverging":   ["red.2", "red.1", "gray.2", "green.1", "green.2"]
  }
}
```

**Critical note on dark palette:** The dark theme palette arrays are ordered from darkest to lightest (opposite of light). `gray.0` in dark is `#1a1d23` (deepest dark), `gray.8` is `#d7dae0` (lightest text). This means `colors.text.primary` = `"gray.7"` = `#abb2bf` matches the current dark `--text-primary` value. Cross-reference every resolved hex against the current `.dark` block after the build script is working.

**Some current dark values don't map cleanly to palette refs.** For example:
- Current `--table-row-alt-bg: #262a31` is between `gray.1` (#21252b) and `gray.2` (#282c34). Use `gray.2` and note the small visual difference, OR add `#262a31` to the gray palette. The implementer should choose based on visual comparison.
- Current `--table-row-border: #333842` falls between gray indexes. Same approach — use nearest or extend palette.
- Current `--tab-rail: #1c2027` is between `gray.0` and `gray.1`. Use `gray.0` or adjust.

**Resolution strategy:** Start with the closest palette refs. After the build script generates CSS, do a **side-by-side visual comparison** of the running app vs the current hard-coded version. Adjust palette arrays or add intermediate values as needed until visual parity is achieved.

- [ ] **Step 2: Commit**

```bash
git add apps/situation-room/themes/dark.json
git commit -m "feat(tokens): add dark theme JSON with Atom One Dark values"
```

---

## Task 5: Build the Theme Generator Script — Tests First

**Files:**
- Create: `apps/situation-room/__tests__/generate-theme.test.ts`
- Create: `apps/situation-room/themes/generate-theme.ts`

This is the core of the system. The build script reads JSON theme files, resolves all refs, and outputs CSS. We build it TDD-style: write tests first for each piece of logic, then implement.

### Part A: Palette Ref Resolution

- [ ] **Step 1: Write failing tests for palette ref resolution**

Create `apps/situation-room/__tests__/generate-theme.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { resolvePaletteRef, resolveColorRef, resolveGeometryRef, resolveVizPalette } from '../themes/generate-theme';

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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/situation-room && pnpm test -- __tests__/generate-theme.test.ts
```

Expected: FAIL — `resolvePaletteRef` is not exported / does not exist.

- [ ] **Step 3: Implement palette ref resolution**

Create `apps/situation-room/themes/generate-theme.ts` with:

```typescript
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
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
    // Scalar ref like "white"
    const val = palette[ref];
    if (val === undefined) throw new Error(`Invalid palette ref: "${ref}"`);
    if (typeof val !== 'string') throw new Error(`Palette ref "${ref}" is an array, needs index`);
    return val;
  }

  const key = ref.slice(0, dotIndex);
  const index = parseInt(ref.slice(dotIndex + 1), 10);
  const arr = palette[key];
  if (arr === undefined) throw new Error(`Invalid palette key: "${key}"`);
  if (!Array.isArray(arr)) throw new Error(`Palette key "${key}" is not an array`);
  if (index < 0 || index >= arr.length) throw new Error(`Index ${index} out of bounds for palette.${key} (length ${arr.length})`);
  return arr[index];
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/situation-room && pnpm test -- __tests__/generate-theme.test.ts
```

Expected: All 5 `resolvePaletteRef` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/situation-room/__tests__/generate-theme.test.ts apps/situation-room/themes/generate-theme.ts
git commit -m "feat(tokens): add palette ref resolution with tests"
```

### Part B: Color Ref Resolution

- [ ] **Step 6: Write failing tests for color ref resolution**

Add to `__tests__/generate-theme.test.ts`:

```typescript
const testColors = {
  surface: { base: 'gray.0', elevated: 'white', sunken: 'gray.1' },
  text: { primary: 'gray.3', inverse: 'white' },
  brand: { default: 'blue.3', subtle: 'blue.0' },
  negative: { text: 'blue.3' },
};

describe('resolveColorRef', () => {
  it('resolves two-part color ref like "surface.elevated"', () => {
    expect(resolveColorRef('surface.elevated', testColors, testPalette)).toBe('#ffffff');
  });

  it('resolves chained ref (color → palette)', () => {
    expect(resolveColorRef('brand.default', testColors, testPalette)).toBe('#3574c4');
  });

  it('resolves "transparent" as literal', () => {
    expect(resolveColorRef('transparent', testColors, testPalette)).toBe('transparent');
  });

  it('throws on invalid section', () => {
    expect(() => resolveColorRef('nonexistent.key', testColors, testPalette)).toThrow();
  });
});
```

- [ ] **Step 7: Run tests to verify they fail**

```bash
cd apps/situation-room && pnpm test -- __tests__/generate-theme.test.ts
```

Expected: New `resolveColorRef` tests FAIL.

- [ ] **Step 8: Implement color ref resolution**

Add to `themes/generate-theme.ts`:

```typescript
export function resolveColorRef(
  ref: string,
  colors: Record<string, Record<string, string>>,
  palette: Palette,
): string {
  if (ref === 'transparent') return 'transparent';

  const dotIndex = ref.indexOf('.');
  if (dotIndex === -1) {
    // Could be a direct palette scalar (e.g. "white") — try palette first
    return resolvePaletteRef(ref, palette);
  }

  const section = ref.slice(0, dotIndex);
  const key = ref.slice(dotIndex + 1);

  const sectionObj = colors[section];
  if (!sectionObj) throw new Error(`Invalid color section: "${section}" in ref "${ref}"`);

  const paletteRef = sectionObj[key];
  if (paletteRef === undefined) throw new Error(`Invalid color key: "${key}" in section "${section}"`);

  return resolvePaletteRef(paletteRef, palette);
}
```

- [ ] **Step 9: Run tests to verify they pass**

```bash
cd apps/situation-room && pnpm test -- __tests__/generate-theme.test.ts
```

Expected: All color ref tests PASS.

- [ ] **Step 10: Commit**

```bash
git add apps/situation-room/__tests__/generate-theme.test.ts apps/situation-room/themes/generate-theme.ts
git commit -m "feat(tokens): add color ref resolution with tests"
```

### Part C: Geometry Ref Resolution

- [ ] **Step 11: Write failing tests for geometry ref resolution**

Add to `__tests__/generate-theme.test.ts`:

```typescript
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
    expect(resolveGeometryRef('md', 'radius', testGeometry, testTypography)).toBe('calc(0.375rem * 0.8)');
  });

  it('resolves shadow ref "sm" for property named "shadow"', () => {
    expect(resolveGeometryRef('sm', 'shadow', testGeometry, testTypography)).toBe('0 1px 2px rgba(0,0,0,0.05)');
  });

  it('resolves weight ref "medium" for property named "headerWeight"', () => {
    expect(resolveGeometryRef('medium', 'headerWeight', testGeometry, testTypography)).toBe('500');
  });

  it('passes through literal CSS values like "2rem"', () => {
    expect(resolveGeometryRef('2rem', 'height', testGeometry, testTypography)).toBe('2rem');
  });
});
```

- [ ] **Step 12: Run tests to verify they fail**

```bash
cd apps/situation-room && pnpm test -- __tests__/generate-theme.test.ts
```

- [ ] **Step 13: Implement geometry ref resolution**

Add to `themes/generate-theme.ts`:

```typescript
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

  // Literal CSS value
  return strValue;
}
```

- [ ] **Step 14: Run tests to verify they pass**

```bash
cd apps/situation-room && pnpm test -- __tests__/generate-theme.test.ts
```

- [ ] **Step 15: Commit**

```bash
git add apps/situation-room/__tests__/generate-theme.test.ts apps/situation-room/themes/generate-theme.ts
git commit -m "feat(tokens): add geometry ref resolution with tests"
```

### Part D: Viz Palette Resolution

- [ ] **Step 16: Write failing tests for viz palette resolution**

Add to `__tests__/generate-theme.test.ts`:

```typescript
describe('resolveVizPalette', () => {
  it('resolves categorical palette refs to hex values', () => {
    const vizCategorical = ['blue.3', 'gray.0', 'white'];
    const result = resolveVizPalette(vizCategorical, testPalette);
    expect(result).toEqual(['#3574c4', '#f7f8fa', '#ffffff']);
  });
});
```

- [ ] **Step 17: Implement viz palette resolution**

Add to `themes/generate-theme.ts`:

```typescript
export function resolveVizPalette(refs: string[], palette: Palette): string[] {
  return refs.map((ref) => resolvePaletteRef(ref, palette));
}
```

- [ ] **Step 18: Run tests to verify they pass**

```bash
cd apps/situation-room && pnpm test -- __tests__/generate-theme.test.ts
```

- [ ] **Step 19: Commit**

```bash
git add apps/situation-room/__tests__/generate-theme.test.ts apps/situation-room/themes/generate-theme.ts
git commit -m "feat(tokens): add viz palette resolution with tests"
```

### Part E: Full CSS Generation

- [ ] **Step 20: Write failing test for CSS generation**

Add to `__tests__/generate-theme.test.ts`:

```typescript
import { generateCssFromTheme } from '../themes/generate-theme';

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
        brand: { default: 'blue.0' },
        positive: { text: 'green.0', bg: 'green.0', border: 'green.0' },
        negative: { text: 'red.0', bg: 'red.0', border: 'red.0' },
        neutral: { text: 'gray.1', bg: 'gray.0', border: 'gray.0' },
        interactive: { bg: 'blue.0', text: 'white', focusRing: 'blue.0' },
      },
      shadcn: {
        background: 'surface.base',
        foreground: 'text.primary',
        card: 'surface.elevated',
        cardForeground: 'text.primary',
        popover: 'surface.elevated',
        popoverForeground: 'text.primary',
        primary: 'brand.default',
        primaryForeground: 'text.primary',
        secondary: 'surface.base',
        secondaryForeground: 'text.primary',
        muted: 'surface.base',
        mutedForeground: 'text.primary',
        accent: 'surface.base',
        accentForeground: 'text.primary',
        destructive: 'negative.text',
        border: 'border.default',
        input: 'border.default',
        ring: 'brand.default',
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
      },
      dashboard: {
        tab: { railBg: 'surface.base', text: 'text.primary' },
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
    expect(css).toContain('--card-radius: calc(0.5rem * 1)');

    // Check chart derivation from viz
    expect(css).toContain('--chart-1: #ccc');
    expect(css).toContain('--chart-2: #ddd');
    expect(css).toContain('--chart-3: #eee');

    // Check viz vars
    expect(css).toContain('--viz-1: #ccc');
  });
});
```

(You'll need to export the `Theme` type from `generate-theme.ts` for this test.)

- [ ] **Step 21: Implement generateCssFromTheme**

Add to `themes/generate-theme.ts` the function that takes a parsed `Theme` and returns a CSS string. This is the core generation logic. It must:

1. Resolve all `colors` sections → flat `--{section}-{key}: #hex` variables
2. Resolve all `shadcn` refs → standard shadcn variables (`--background`, `--foreground`, etc.)
3. Emit `--radius: {radiusBase}`
4. Resolve `components` → `--{component}-{property}: value` variables
5. Resolve `dashboard` sections → `--{section}-{key}: #hex` variables
6. Derive `--chart-N` from resolved `viz.categorical`
7. Emit `--viz-N` from resolved `viz.categorical`
8. Emit `--font-sans` and `--font-mono` from typography
9. Return the full CSS string with the correct selector (`:root`, `.dark`, or `.kebab-name`)

Then add a `generateThemeInlineBlock` function that emits the `@theme inline` block mapping all vars to Tailwind utility prefixes.

```typescript
export { type Theme };

function kebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase().replace(/\s+/g, '-');
}

function cssVarName(section: string, key: string): string {
  return `--${kebabCase(section)}-${kebabCase(key)}`;
}

function shadcnVarName(key: string): string {
  // camelCase → kebab-case for CSS: cardForeground → card-foreground
  return `--${kebabCase(key)}`;
}

export function generateCssFromTheme(theme: Theme): string {
  const lines: string[] = [];
  const { palette, colors, shadcn, typography, geometry, components, dashboard, viz } = theme;

  // Determine CSS selector
  const selector = theme.name === 'Light' ? ':root' : theme.name === 'Dark' ? '.dark' : `.${kebabCase(theme.name)}`;

  lines.push(`${selector} {`);

  // 1. shadcn tokens
  for (const [key, ref] of Object.entries(shadcn)) {
    const resolved = resolveColorRef(ref, colors, palette);
    lines.push(`  ${shadcnVarName(key)}: ${resolved};`);
  }

  // 2. Radius base
  lines.push(`  --radius: ${geometry.radiusBase};`);

  // 3. Surface/text/border/brand/status colors from `colors`
  for (const [section, entries] of Object.entries(colors)) {
    for (const [key, ref] of Object.entries(entries)) {
      const resolved = resolvePaletteRef(ref, palette);
      if (section === 'surface' && key === 'base') {
        lines.push(`  --surface: ${resolved};`);
      } else {
        lines.push(`  ${cssVarName(section, key)}: ${resolved};`);
      }
    }
  }

  // 4. Dashboard tokens
  for (const [section, entries] of Object.entries(dashboard)) {
    for (const [key, ref] of Object.entries(entries)) {
      const resolved = resolveColorRef(ref, colors, palette);
      lines.push(`  ${cssVarName(section, key)}: ${resolved};`);
    }
  }

  // 5. Component geometry tokens
  for (const [comp, props] of Object.entries(components)) {
    for (const [prop, value] of Object.entries(props)) {
      const resolved = resolveGeometryRef(value, prop, geometry, typography);
      lines.push(`  --${kebabCase(comp)}-${kebabCase(prop)}: ${resolved};`);
    }
  }

  // 6. Chart + Viz tokens from viz.categorical
  const resolvedCategorical = resolveVizPalette(viz.categorical, palette);
  resolvedCategorical.forEach((hex, i) => {
    lines.push(`  --chart-${i + 1}: ${hex};`);
    lines.push(`  --viz-${i + 1}: ${hex};`);
  });

  // 7. Typography
  for (const [key, value] of Object.entries(typography.fontFamily)) {
    lines.push(`  --font-${key}: ${value};`);
  }

  lines.push('}');

  return lines.join('\n');
}
```

**Note:** The above is a starting implementation. The implementer must verify that every CSS variable name in the generated output matches what the current `global.css` uses. For instance, the `surface.base` colors section should emit `--surface` (not `--surface-base`). The `neutral` status section currently emits `--neutral-change` and `--neutral-change-bg` in the current CSS — but per the spec revision, these become `--neutral-text`, `--neutral-bg`, `--neutral-border`. The implementer will need to update component references accordingly.

- [ ] **Step 22: Run tests to verify they pass**

```bash
cd apps/situation-room && pnpm test -- __tests__/generate-theme.test.ts
```

- [ ] **Step 23: Commit**

```bash
git add apps/situation-room/__tests__/generate-theme.test.ts apps/situation-room/themes/generate-theme.ts
git commit -m "feat(tokens): add CSS generation from theme JSON with tests"
```

### Part F: @theme inline Block Generation

- [ ] **Step 24: Write failing test for @theme inline generation**

Add to `__tests__/generate-theme.test.ts`:

```typescript
import { generateThemeInlineBlock } from '../themes/generate-theme';

describe('generateThemeInlineBlock', () => {
  it('maps color vars to --color- prefix', () => {
    const vars = ['--surface', '--surface-elevated', '--text-primary', '--background', '--chart-1', '--viz-1'];
    const block = generateThemeInlineBlock(vars, { radiusBase: '0.375rem', radiusScale: { sm: 0.6 }, shadow: {} });
    expect(block).toContain('--color-surface: var(--surface)');
    expect(block).toContain('--color-surface-elevated: var(--surface-elevated)');
    expect(block).toContain('--color-text-primary: var(--text-primary)');
    expect(block).toContain('--color-background: var(--background)');
    expect(block).toContain('--color-chart-1: var(--chart-1)');
    expect(block).toContain('--color-viz-1: var(--viz-1)');
  });

  it('maps radius scale to calc expressions', () => {
    const vars: string[] = [];
    const block = generateThemeInlineBlock(vars, { radiusBase: '0.375rem', radiusScale: { sm: 0.6 }, shadow: {} });
    expect(block).toContain('--radius-sm: calc(var(--radius) * 0.6)');
  });

  it('maps component radius vars to --radius- prefix', () => {
    const vars = ['--card-radius', '--filter-radius'];
    const block = generateThemeInlineBlock(vars, { radiusBase: '0.375rem', radiusScale: {}, shadow: {} });
    expect(block).toContain('--radius-card: var(--card-radius)');
    expect(block).toContain('--radius-filter: var(--filter-radius)');
  });

  it('maps shadow vars to --shadow- prefix', () => {
    const vars = ['--card-shadow'];
    const block = generateThemeInlineBlock(vars, { radiusBase: '0.375rem', radiusScale: {}, shadow: {} });
    expect(block).toContain('--shadow-card: var(--card-shadow)');
  });

  it('maps font vars to --font- prefix', () => {
    const vars = ['--font-sans', '--font-mono'];
    const block = generateThemeInlineBlock(vars, { radiusBase: '0.375rem', radiusScale: {}, shadow: {} });
    expect(block).toContain('--font-sans: var(--font-sans)');
    expect(block).toContain('--font-mono: var(--font-mono)');
  });
});
```

- [ ] **Step 25: Implement generateThemeInlineBlock**

Add to `themes/generate-theme.ts`:

```typescript
export function generateThemeInlineBlock(
  allVarNames: string[],
  geometry: { radiusBase: string; radiusScale: Record<string, number>; shadow: Record<string, string> },
): string {
  const lines: string[] = ['@theme inline {'];

  // Color vars: everything except --radius*, --font-*, and component geometry
  const colorVarPrefixes = [
    '--surface', '--text-', '--border-', '--brand-', '--positive', '--negative',
    '--warning', '--info', '--neutral', '--interactive', '--filter-', '--table-',
    '--tab-', '--heading-', '--viz-', '--chart-', '--accent',
    // shadcn vars
    '--background', '--foreground', '--card', '--popover', '--primary',
    '--secondary', '--muted', '--destructive', '--input', '--ring', '--sidebar',
  ];

  for (const varName of allVarNames) {
    if (varName === '--radius' || varName.startsWith('--font-')) continue;

    // Component radius → --radius-{component}
    if (varName.endsWith('-radius')) {
      const component = varName.replace('--', '').replace('-radius', '');
      lines.push(`  --radius-${component}: var(${varName});`);
      continue;
    }

    // Component shadow → --shadow-{component}
    if (varName.endsWith('-shadow')) {
      const component = varName.replace('--', '').replace('-shadow', '');
      lines.push(`  --shadow-${component}: var(${varName});`);
      continue;
    }

    // Color vars → --color-{name}
    if (colorVarPrefixes.some(prefix => varName.startsWith(prefix))) {
      const name = varName.replace('--', '');
      lines.push(`  --color-${name}: var(${varName});`);
    }
  }

  // Radius scale
  for (const [name, multiplier] of Object.entries(geometry.radiusScale)) {
    lines.push(`  --radius-${name}: calc(var(--radius) * ${multiplier});`);
  }

  // Font vars
  for (const varName of allVarNames) {
    if (varName.startsWith('--font-')) {
      const name = varName.replace('--', '');
      lines.push(`  --${name}: var(${varName});`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}
```

- [ ] **Step 26: Run tests to verify they pass**

```bash
cd apps/situation-room && pnpm test -- __tests__/generate-theme.test.ts
```

- [ ] **Step 27: Commit**

```bash
git add apps/situation-room/__tests__/generate-theme.test.ts apps/situation-room/themes/generate-theme.ts
git commit -m "feat(tokens): add @theme inline block generation with tests"
```

### Part G: Main Script (File I/O + Watch Mode)

- [ ] **Step 28: Implement main() function and CLI**

Add to `themes/generate-theme.ts` the main orchestration code:

```typescript
function main() {
  const themesDir = resolve(import.meta.dirname, '.');
  const outputPath = resolve(import.meta.dirname, '../app/generated-theme.css');
  const isWatch = process.argv.includes('--watch');

  function generate() {
    const files = readdirSync(themesDir)
      .filter(f => f.endsWith('.json') && f !== 'theme.schema.json');

    if (files.length === 0) {
      console.error('No theme JSON files found in', themesDir);
      process.exit(1);
    }

    const errors: string[] = [];
    const themeBlocks: string[] = [];
    let allVarNames: string[] = [];
    let geometryForInline: Theme['geometry'] | null = null;

    for (const file of files) {
      const raw = readFileSync(join(themesDir, file), 'utf-8');
      let theme: Theme;
      try {
        theme = JSON.parse(raw);
      } catch (e) {
        errors.push(`${file}: Invalid JSON — ${(e as Error).message}`);
        continue;
      }

      // Basic validation
      if (!theme.name) errors.push(`${file}: Missing "name" field`);
      if (!theme.palette) errors.push(`${file}: Missing "palette" field`);
      if (errors.length > 0) continue;

      try {
        const css = generateCssFromTheme(theme);
        themeBlocks.push(css);

        // Collect var names from the CSS for @theme inline
        const varMatches = css.matchAll(/\s+(--[\w-]+):/g);
        const names = [...varMatches].map(m => m[1]);
        if (allVarNames.length === 0) {
          allVarNames = names;
          geometryForInline = theme.geometry;
        }
      } catch (e) {
        errors.push(`${file}: ${(e as Error).message}`);
      }
    }

    if (errors.length > 0) {
      console.error('Theme generation failed:');
      errors.forEach(e => console.error(`  ✗ ${e}`));
      process.exit(1);
    }

    const inlineBlock = generateThemeInlineBlock(allVarNames, geometryForInline!);
    const output = [
      '/* DO NOT EDIT — generated by theme:generate */',
      '',
      ...themeBlocks,
      '',
      inlineBlock,
      '',
    ].join('\n');

    writeFileSync(outputPath, output, 'utf-8');
    console.log(`✓ Generated ${outputPath} (${files.length} theme(s))`);
  }

  generate();

  if (isWatch) {
    import('chokidar').then(({ watch }) => {
      const watcher = watch(join(themesDir, '*.json'), {
        ignoreInitial: true,
        ignored: /theme\.schema\.json$/,
      });
      console.log('Watching themes/*.json for changes...');
      watcher.on('change', (path) => {
        console.log(`Theme file changed: ${path}`);
        try {
          generate();
        } catch (e) {
          console.error('Regeneration failed:', (e as Error).message);
        }
      });
      watcher.on('add', (path) => {
        console.log(`New theme file: ${path}`);
        try {
          generate();
        } catch (e) {
          console.error('Regeneration failed:', (e as Error).message);
        }
      });
    });
  }
}

// Only run main when executed directly (not when imported for tests)
if (process.argv[1] && resolve(process.argv[1]).includes('generate-theme')) {
  main();
}
```

- [ ] **Step 29: Run the generator and verify output**

```bash
cd apps/situation-room && pnpm theme:generate
```

Expected: `✓ Generated ... (2 theme(s))`. Check the output file:

```bash
head -50 apps/situation-room/app/generated-theme.css
```

Verify it has `:root { ... }`, `.dark { ... }`, and `@theme inline { ... }`.

- [ ] **Step 30: Run all tests**

```bash
cd apps/situation-room && pnpm test
```

Expected: All tests pass (both new generate-theme tests and existing tests).

- [ ] **Step 31: Commit**

```bash
git add apps/situation-room/themes/generate-theme.ts
git commit -m "feat(tokens): add main script with file I/O and watch mode"
```

---

## Task 6: Validate Generated CSS Against Current CSS

**Files:**
- Modify: `apps/situation-room/themes/light.json` (may need value adjustments)
- Modify: `apps/situation-room/themes/dark.json` (may need value adjustments)

This task ensures the generated CSS produces identical visual results to the current hand-written CSS.

- [ ] **Step 1: Generate CSS and diff against current variables**

```bash
cd apps/situation-room && pnpm theme:generate
```

Then manually compare. Extract current variable names and values from `global.css` and compare with `generated-theme.css`. Look for:
- Missing variables (present in current CSS but not generated)
- Different values (same variable name, different hex/value)
- Renamed variables (the spec renames `--neutral-change` → `--neutral-text`)

- [ ] **Step 2: Fix any value mismatches in theme JSON files**

For each mismatch found in Step 1:
- If the current CSS has a value that doesn't match any palette entry, either:
  a. Add the value to the palette array, OR
  b. Add a direct override in the `dashboard` section

Common mismatches to watch for:
- `--accent` (current: `#e8ecf2` light, `#3e4451` dark) — map to closest palette ref or add to palette
- `--filter-bar-bg` (current: `#f0f2f5` light) — may need palette addition
- `--info-border` (current: `#b0cfe8` light) — may need palette addition
- Dark theme intermediate values (e.g. `#262a31`, `#333842`, `#1c2027`)

For each fix, update the JSON and re-run `pnpm theme:generate` until the diff is minimal.

- [ ] **Step 3: Start the dev server and visually verify**

```bash
cd apps/situation-room && pnpm dev
```

Open `http://localhost:3100` in the browser. Compare against the current app (git stash the generated file, run with current CSS, take a screenshot, then restore). Both light and dark themes should look identical.

- [ ] **Step 4: Commit any JSON adjustments**

```bash
git add apps/situation-room/themes/light.json apps/situation-room/themes/dark.json
git commit -m "fix(tokens): adjust theme values to match current CSS exactly"
```

---

## Task 7: Replace global.css with Generated Import + Component Classes

**Files:**
- Modify: `apps/situation-room/app/global.css`

This is the switchover: the ~440-line `global.css` becomes ~80 lines. All `:root`, `.dark`, and `@theme inline` blocks are removed and replaced by `@import './generated-theme.css'`. The `@layer components` classes are added.

- [ ] **Step 1: Rewrite global.css**

Replace the entire contents of `apps/situation-room/app/global.css` with:

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
  .filter-trigger:hover {
    @apply bg-filter-trigger-hover-bg border-filter-trigger-hover-border;
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

- [ ] **Step 2: Verify the app still works**

```bash
cd apps/situation-room && pnpm dev
```

Open `http://localhost:3100`. The app should look exactly the same as before. Test both light and dark themes.

- [ ] **Step 3: Run existing tests**

```bash
cd apps/situation-room && pnpm test
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/situation-room/app/global.css
git commit -m "feat(tokens): replace hand-written CSS vars with generated import + component classes"
```

---

## Task 8: Migrate executive-snapshot.tsx

**Files:**
- Modify: `apps/situation-room/components/executive-snapshot.tsx`

- [ ] **Step 1: Replace theming classes with semantic classes**

Current code and replacements:

| Line | Current | Replace with |
|------|---------|-------------|
| 29 | `"text-xs font-medium uppercase tracking-[0.15em] text-heading-overline mb-5"` | `"heading-overline mb-5"` |
| 37 | `"bg-surface-elevated shadow-sm hover:shadow-md transition-shadow duration-200"` | `"card-tile hover:shadow-md transition-shadow duration-200"` |
| 40 | `"text-xs font-medium text-heading-overline uppercase tracking-wider"` | `"heading-overline"` |
| 43 | `"text-xs text-text-secondary font-normal"` | `"text-xs text-text-secondary font-normal"` (keep — one-off typography) |
| 48 | `"text-2xl font-bold tabular-nums text-heading-primary tracking-tight"` | `"text-2xl font-bold tabular-nums text-heading-primary tracking-tight"` (keep — one-off heading style) |

- [ ] **Step 2: Verify visually**

```bash
cd apps/situation-room && pnpm dev
```

Check the Executive Snapshot section looks identical.

- [ ] **Step 3: Commit**

```bash
git add apps/situation-room/components/executive-snapshot.tsx
git commit -m "refactor(tokens): migrate executive-snapshot to semantic classes"
```

---

## Task 9: Migrate category-section.tsx

**Files:**
- Modify: `apps/situation-room/components/category-section.tsx`

- [ ] **Step 1: Replace theming classes**

| Line | Current | Replace with |
|------|---------|-------------|
| 31 | `"bg-surface-elevated overflow-hidden"` | `"card-tile overflow-hidden"` |
| 33 | `"text-lg font-semibold tracking-tight text-heading-primary"` | `"heading-primary"` |
| 36 | `"text-heading-section leading-relaxed"` | `"heading-section"` |
| 43 | `"bg-table-header-bg border-table-header-border hover:bg-table-header-bg"` | Keep as-is (TableRow-level, not a reusable pattern) |
| 44,47,50,53 | `"... text-xs font-medium uppercase tracking-wider text-table-header-text ..."` | Replace the theming part with `table-header-cell`, keep `pl-4`, `text-right`, `hidden sm:table-cell`, `pr-4` as layout |

Example for line 44:
```tsx
// Before:
<TableHead className="pl-4 text-xs font-medium uppercase tracking-wider text-table-header-text">
// After:
<TableHead className="pl-4 table-header-cell">
```

- [ ] **Step 2: Verify visually and commit**

```bash
git add apps/situation-room/components/category-section.tsx
git commit -m "refactor(tokens): migrate category-section to semantic classes"
```

---

## Task 10: Migrate metric-row.tsx

**Files:**
- Modify: `apps/situation-room/components/metric-row.tsx`

- [ ] **Step 1: Replace theming classes**

| Line | Current | Replace with |
|------|---------|-------------|
| 17 | `"pl-4 font-medium text-table-cell-text"` | `"pl-4 font-medium table-data-cell"` |
| 20 | `"tabular-nums text-table-cell-text font-semibold text-right"` | `"table-data-cell-numeric"` |
| 23 | `"hidden sm:table-cell tabular-nums text-table-cell-secondary text-right"` | `"hidden sm:table-cell table-data-cell-secondary"` |

- [ ] **Step 2: Verify visually and commit**

```bash
git add apps/situation-room/components/metric-row.tsx
git commit -m "refactor(tokens): migrate metric-row to semantic classes"
```

---

## Task 11: Migrate change-indicator.tsx

**Files:**
- Modify: `apps/situation-room/components/change-indicator.tsx`

- [ ] **Step 1: Replace direction styles with semantic pill classes**

Replace the `directionStyles` map:

```typescript
// Before:
const directionStyles: Record<ChangeDirection, string> = {
  positive: 'text-positive bg-positive-bg border border-positive-border',
  negative: 'text-negative bg-negative-bg border border-negative-border',
  neutral: 'text-neutral-change bg-neutral-change-bg border border-border-subtle',
};
```

```typescript
// After:
const directionStyles: Record<ChangeDirection, string> = {
  positive: 'pill-positive',
  negative: 'pill-negative',
  neutral: 'pill-neutral',
};
```

And simplify the JSX — remove the duplicate base classes since they're now in `.pill-status`:

```tsx
// Before:
<span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-medium tabular-nums ${directionStyles[direction]}`}>
// After:
<span className={directionStyles[direction]}>
```

- [ ] **Step 2: Run existing change-indicator tests**

```bash
cd apps/situation-room && pnpm test -- __tests__/change-indicator.test.ts
```

Expected: All tests pass (they test `parseChange`, not className output).

- [ ] **Step 3: Verify visually and commit**

```bash
git add apps/situation-room/components/change-indicator.tsx
git commit -m "refactor(tokens): migrate change-indicator to semantic pill classes"
```

---

## Task 12: Migrate filter-dropdown.tsx

**Files:**
- Modify: `apps/situation-room/components/filter-dropdown.tsx`

- [ ] **Step 1: Replace trigger classes**

Replace the PopoverTrigger className (lines 91-95):

```tsx
// Before:
<PopoverTrigger
  className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-all select-none cursor-pointer ${
    hasValues
      ? 'border-filter-active-border bg-filter-active-bg text-filter-active-text font-medium'
      : 'border-filter-trigger-border bg-filter-trigger-bg text-filter-trigger-text hover:bg-filter-trigger-hover-bg hover:border-filter-trigger-hover-border'
  }`}
>

// After:
<PopoverTrigger
  className={`filter-trigger ${hasValues ? 'filter-trigger-active' : ''}`}
>
```

The rest of the file uses interactive tokens (`hover:bg-interactive-ghost-hover`, `border-accent-brand`, etc.) which are one-off internal patterns — leave those as inline Tailwind since they're not reusable dashboard patterns.

- [ ] **Step 2: Verify visually and commit**

```bash
git add apps/situation-room/components/filter-dropdown.tsx
git commit -m "refactor(tokens): migrate filter-dropdown trigger to semantic classes"
```

---

## Task 13: Migrate filter-rail.tsx

**Files:**
- Modify: `apps/situation-room/components/filter-rail.tsx`

- [ ] **Step 1: Replace heading overline**

```tsx
// Before (line 23):
<p className="text-xs font-medium uppercase tracking-[0.15em] text-heading-overline">
// After:
<p className="heading-overline">
```

The badge and button classes are one-off patterns — leave as inline Tailwind.

- [ ] **Step 2: Verify visually and commit**

```bash
git add apps/situation-room/components/filter-rail.tsx
git commit -m "refactor(tokens): migrate filter-rail heading to semantic class"
```

---

## Task 14: Migrate filter-chip.tsx

**Files:**
- Modify: `apps/situation-room/components/filter-chip.tsx`

- [ ] **Step 1: Simplify theming classes**

The filter chip uses `bg-accent-brand-subtle text-text-primary border border-border-subtle` — these are brand/semantic tokens that are already parametrized via the generated CSS. No semantic class needed for this one-off chip pattern. Leave as-is since the tokens already flow from JSON.

Mark this task as **no-op** — the chip already uses semantic tokens, just not a reusable class. Creating a single-use class would over-abstract.

- [ ] **Step 2: Commit (skip if no changes)**

No commit needed.

---

## Task 15: Migrate report-content.tsx

**Files:**
- Modify: `apps/situation-room/components/report-content.tsx`

- [ ] **Step 1: Replace surface and heading classes**

| Line | Current | Replace with |
|------|---------|-------------|
| 20 | `"min-h-screen w-full bg-surface-sunken"` | `"surface-page"` |
| 21 | `"bg-surface border-b border-border-subtle"` | `"surface-header"` |
| 27 | `"no-print bg-filter-bar-bg border-b border-filter-bar-border"` | `"no-print surface-filter-bar"` |
| 63 | `"text-xs font-medium uppercase tracking-[0.15em] text-heading-overline"` | `"heading-overline"` |
| 61 | `"mt-8 bg-surface-elevated"` | `"mt-8 card-tile"` |

- [ ] **Step 2: Verify visually and commit**

```bash
git add apps/situation-room/components/report-content.tsx
git commit -m "refactor(tokens): migrate report-content to semantic surface and heading classes"
```

---

## Task 16: Migrate report-header.tsx

**Files:**
- Modify: `apps/situation-room/components/report-header.tsx`

- [ ] **Step 1: Replace heading classes**

| Line | Current | Replace with |
|------|---------|-------------|
| 15 | `"text-xs font-medium uppercase tracking-[0.15em] text-heading-overline mb-2"` | `"heading-overline mb-2"` |
| 18 | `"text-3xl font-semibold tracking-tight text-heading-primary leading-tight"` | Keep as-is — this is a unique hero heading, not the standard `heading-primary` size |

- [ ] **Step 2: Verify visually and commit**

```bash
git add apps/situation-room/components/report-header.tsx
git commit -m "refactor(tokens): migrate report-header to semantic heading class"
```

---

## Task 17: Migrate trend-chart.tsx

**Files:**
- Modify: `apps/situation-room/components/trend-chart.tsx`

- [ ] **Step 1: Remove fallback hex values**

The component currently uses `useCssVar()` with fallback hex values in Chart.js config:

```typescript
// Before:
backgroundColor: accent || '#1e40af',
// After:
backgroundColor: accent,
```

Remove ALL `|| '#...'` fallbacks. The CSS vars will always be available since the generated theme is imported before any rendering.

Specifically remove fallbacks from:
- Line 73: `accent || '#1e40af'` → `accent`
- Line 80: `border || '#e5e7eb'` → `border`
- Line 100: `textSecondary || '#6b7280'` → `textSecondary`
- Line 104: `surfaceElevated || '#f8f9fa'` → `surfaceElevated`
- Line 105: `textPrimary || '#111827'` → `textPrimary`
- Line 106: `textSecondary || '#6b7280'` → `textSecondary`
- Line 107: `border || '#e5e7eb'` → `border`
- Line 120: `textTertiary || '#9ca3af'` → `textTertiary`
- Line 126: `borderSubtle || '#f0f0f0'` → `borderSubtle`
- Line 128: `textTertiary || '#9ca3af'` → `textTertiary`

Also update the CSS var names to use `--viz-*` for chart colors:
```typescript
// Before:
const accent = useCssVar('--accent-brand');
// After:
const accent = useCssVar('--viz-1');
```

- [ ] **Step 2: Verify chart still renders in both themes and commit**

```bash
git add apps/situation-room/components/trend-chart.tsx
git commit -m "refactor(tokens): remove fallback hex values from trend-chart, use --viz-* vars"
```

---

## Task 18: Migrate ui/tabs.tsx

**Files:**
- Modify: `apps/situation-room/components/ui/tabs.tsx`

- [ ] **Step 1: Simplify TabsList default variant**

The tabs component already uses `bg-tab-rail` and tab tokens. The default variant in `tabsListVariants` already matches the `tab-rail` semantic class. No changes needed to the CVA definition since it's already using the correct token classes.

Review and confirm: the existing implementation already uses `bg-tab-rail`, `text-tab-text`, `text-tab-hover-text`, `bg-tab-active-bg`, `text-tab-active-text` — all of which are generated theme tokens. The tabs component was already migrated as part of the earlier tab redesign work.

Mark this as **verified, no changes needed**.

- [ ] **Step 2: Commit (skip if no changes)**

No commit needed.

---

## Task 19: Final Validation — Smoke Test

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

```bash
cd apps/situation-room && pnpm test
```

Expected: All tests pass.

- [ ] **Step 2: Run typecheck**

```bash
cd apps/situation-room && pnpm typecheck
```

Expected: No type errors.

- [ ] **Step 3: Test JSON-driven changes propagate**

Start dev server:
```bash
cd apps/situation-room && pnpm dev
```

Then edit `themes/light.json`:
1. Change `geometry.radiusBase` from `"0.375rem"` to `"0.75rem"` → verify all card corners and borders get rounder, revert
2. Change `palette.blue[3]` from `"#3574c4"` to `"#e06c75"` → verify brand color goes red everywhere, revert
3. Change `components.filter.radius` from `"sm"` to `"lg"` → verify only filter triggers change, revert
4. Change `typography.fontFamily.sans` to `"Georgia, serif"` → verify entire app font changes, revert
5. Change `viz.categorical[0]` from `"blue.3"` to `"red.2"` → verify chart primary color changes, revert

Each change should auto-regenerate within 1 second and appear on hot-reload.

- [ ] **Step 4: Verify dark theme**

Toggle to dark theme and repeat spot checks 1-2. Both themes should be independently correct.

- [ ] **Step 5: Build for production**

```bash
cd apps/situation-room && pnpm build
```

Expected: Build succeeds with no errors. The `prebuild` hook generates fresh CSS before Next.js compiles.

- [ ] **Step 6: Final commit (if any remaining changes)**

```bash
git add -A
git commit -m "chore(tokens): finalize design token system migration"
```

---

## Summary of File Changes

| Phase | Files Created | Files Modified |
|-------|-------------|----------------|
| Task 1 (deps) | `.gitignore` | `package.json` |
| Task 2 (schema) | `themes/theme.schema.json` | — |
| Task 3 (light) | `themes/light.json` | — |
| Task 4 (dark) | `themes/dark.json` | — |
| Task 5 (script) | `themes/generate-theme.ts`, `__tests__/generate-theme.test.ts` | — |
| Task 6 (validate) | — | `themes/light.json`, `themes/dark.json` |
| Task 7 (switchover) | — | `app/global.css` |
| Tasks 8-18 (migrate) | — | 10 component files |
| Task 19 (validate) | — | — |
