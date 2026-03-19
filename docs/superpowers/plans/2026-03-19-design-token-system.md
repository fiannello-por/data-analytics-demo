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
| `apps/situation-room/components/trend-chart.tsx` | Switch to `--viz-*` var names, keep fallback hex values |
| `apps/situation-room/components/ui/tabs.tsx` | Compose tab variants from `tab-rail`, `tab-pill`, `tab-pill-active` classes |

---

## Task 1: Install Dependencies and Configure Scripts

**Files:**
- Modify: `apps/situation-room/package.json`
- Create: `apps/situation-room/.gitignore`

- [ ] **Step 1: Install dev dependencies**

```bash
cd apps/situation-room && pnpm add -D tsx chokidar concurrently ajv
```

- [ ] **Step 2: Verify installation**

```bash
cd apps/situation-room && pnpm ls tsx chokidar concurrently ajv
```

Expected: All four packages listed with versions.

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
      "enum": ["Light", "Dark"],
      "description": "Theme identifier. 'Light' maps to :root, 'Dark' maps to .dark"
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
        "border", "input", "ring",
        "sidebar", "sidebarForeground", "sidebarPrimary",
        "sidebarPrimaryForeground", "sidebarAccent",
        "sidebarAccentForeground", "sidebarBorder", "sidebarRing"
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

This task extracts every CSS custom property value from the current `:root` block in `global.css` (lines 12–140) into the JSON schema format. The palette arrays include ALL hex values that appear in the current CSS — including intermediate values that don't fit a neat 10-step ramp. Every palette ref resolves to the exact hex value currently in `global.css`.

- [ ] **Step 1: Create light.json**

Create `apps/situation-room/themes/light.json`. The values below are extracted from the current `global.css` `:root` block. Every hex value must match the current CSS exactly. The palette index reference table at the end of this step lists every hex and its index for cross-checking.

```json
{
  "name": "Light",

  "palette": {
    "gray":   ["#f7f8fa", "#f0f2f5", "#eef1f5", "#e8ecf2", "#e4e8ee", "#e2e6ed", "#dce0e8", "#c5cad4", "#b0b6c4", "#8690a2", "#636a7e", "#4a5068", "#1e2028"],
    "blue":   ["#edf4fc", "#dbe9f8", "#c4daf0", "#b0cfe8", "#8db8e4", "#3574c4", "#2a5ea0", "#234e88"],
    "green":  ["#eaf7ef", "#b8e0c8", "#5c8a3e", "#3a9a5e", "#1a7f42"],
    "red":    ["#fdf0f0", "#f0c0c3", "#c9363f"],
    "amber":  ["#fef9eb", "#f0dfa0", "#c7872e", "#b07d1a"],
    "cyan":   ["#e8f8fa", "#b0e0e6", "#2e95a3"],
    "purple": ["#9556cf", "#7c6eb5"],
    "white":  "#ffffff",
    "black":  "#1e2028",
    "transparent": "transparent"
  },

  "colors": {
    "surface":  { "base": "gray.0", "elevated": "white", "sunken": "gray.2", "overlay": "white" },
    "text":     { "primary": "gray.12", "secondary": "gray.11", "tertiary": "gray.9", "inverse": "white", "link": "blue.5", "linkHover": "blue.6" },
    "border":   { "default": "gray.6", "subtle": "gray.4", "strong": "gray.7" },
    "accentBrand": { "default": "blue.5", "subtle": "blue.0", "hover": "blue.6", "muted": "blue.2" },
    "positive": { "default": "green.4", "bg": "green.0", "border": "green.1" },
    "negative": { "default": "red.2", "bg": "red.0", "border": "red.1" },
    "warning":  { "default": "amber.3", "bg": "amber.0", "border": "amber.1" },
    "info":     { "default": "blue.5", "bg": "blue.0", "border": "blue.3" },
    "neutral":  { "change": "gray.10", "changeBg": "gray.2" },
    "interactive": {
      "bg": "blue.5", "bgHover": "blue.6", "bgActive": "blue.7",
      "text": "white",
      "ghostHover": "gray.2", "ghostActive": "gray.4",
      "outlineBorder": "gray.6", "outlineHover": "gray.7",
      "focusRing": "blue.5",
      "disabledBg": "gray.2", "disabledText": "gray.8"
    }
  },

  "shadcn": {
    "background": "surface.base",
    "foreground": "text.primary",
    "card": "surface.elevated",
    "cardForeground": "text.primary",
    "popover": "surface.elevated",
    "popoverForeground": "text.primary",
    "primary": "accentBrand.default",
    "primaryForeground": "text.inverse",
    "secondary": "surface.sunken",
    "secondaryForeground": "text.primary",
    "muted": "surface.sunken",
    "mutedForeground": "gray.10",
    "accent": "gray.3",
    "accentForeground": "text.primary",
    "destructive": "negative.default",
    "border": "border.default",
    "input": "border.default",
    "ring": "accentBrand.default",
    "sidebar": "gray.1",
    "sidebarForeground": "text.primary",
    "sidebarPrimary": "accentBrand.default",
    "sidebarPrimaryForeground": "text.inverse",
    "sidebarAccent": "gray.3",
    "sidebarAccentForeground": "text.primary",
    "sidebarBorder": "border.default",
    "sidebarRing": "accentBrand.default"
  },

  "typography": {
    "fontFamily": { "sans": "Inter, system-ui, sans-serif", "mono": "'JetBrains Mono', ui-monospace, monospace" },
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
    "filterBar":     { "bg": "gray.1", "border": "border.default" },
    "filterTrigger": { "bg": "surface.elevated", "border": "border.default", "text": "text.secondary", "hoverBg": "surface.sunken", "hoverBorder": "border.strong" },
    "filterActive":  { "bg": "accentBrand.subtle", "border": "blue.4", "text": "accentBrand.hover" },
    "filterBadge":   { "bg": "accentBrand.default", "text": "text.inverse" },
    "table": {
      "headerBg": "surface.sunken", "headerText": "text.secondary", "headerBorder": "border.default",
      "rowBg": "transparent", "rowAltBg": "surface.base",
      "rowHoverBg": "accentBrand.subtle", "rowSelectedBg": "blue.1",
      "rowBorder": "border.subtle",
      "cellText": "text.primary", "cellSecondary": "text.secondary"
    },
    "tab": {
      "rail": "gray.5", "text": "text.tertiary", "hoverText": "text.secondary",
      "activeBg": "surface.elevated", "activeText": "text.primary"
    },
    "heading": { "primary": "text.primary", "section": "text.secondary", "overline": "text.tertiary" }
  },

  "viz": {
    "categorical": ["blue.5", "purple.0", "green.3", "amber.2", "cyan.2", "red.2", "purple.1", "green.2"],
    "sequential":  ["blue.0", "blue.1", "blue.2", "blue.3", "blue.5", "blue.6"],
    "diverging":   ["red.2", "red.1", "gray.2", "green.1", "green.4"]
  }
}
```

**Palette index reference (light):**

| Palette | Indices |
|---------|---------|
| gray | 0:#f7f8fa 1:#f0f2f5 2:#eef1f5 3:#e8ecf2 4:#e4e8ee 5:#e2e6ed 6:#dce0e8 7:#c5cad4 8:#b0b6c4 9:#8690a2 10:#636a7e 11:#4a5068 12:#1e2028 |
| blue | 0:#edf4fc 1:#dbe9f8 2:#c4daf0 3:#b0cfe8 4:#8db8e4 5:#3574c4 6:#2a5ea0 7:#234e88 |
| green | 0:#eaf7ef 1:#b8e0c8 2:#5c8a3e 3:#3a9a5e 4:#1a7f42 |
| red | 0:#fdf0f0 1:#f0c0c3 2:#c9363f |
| amber | 0:#fef9eb 1:#f0dfa0 2:#c7872e 3:#b07d1a |
| cyan | 0:#e8f8fa 1:#b0e0e6 2:#2e95a3 |
| purple | 0:#9556cf 1:#7c6eb5 |

Every hex value in `global.css` `:root` (lines 12–140) has a corresponding palette entry. Every ref in the JSON resolves to the exact hex in the current CSS. The generated output must be byte-identical to the current variables — no "close enough" approximations, no manual reconciliation step.

- [ ] **Step 2: Commit**

```bash
git add apps/situation-room/themes/light.json
git commit -m "feat(tokens): add light theme JSON with all current values"
```

---

## Task 4: Create Dark Theme JSON

**Files:**
- Create: `apps/situation-room/themes/dark.json`

This task extracts every CSS custom property value from the current `.dark` block in `global.css` (lines 147–274). The palette arrays include ALL hex values — including intermediates like `#262a31`, `#333842`, `#1c2027` that appear between the core Atom One Dark steps. Additional palettes (`purple`, `orange`) are added for chart colors that don't fit the status color palettes.

- [ ] **Step 1: Create dark.json**

Create `apps/situation-room/themes/dark.json`. Same schema as `light.json`, but with Atom One Dark color values. Every hex value must match the current `.dark` block in `global.css`. The palette index reference table at the end of this step lists every hex and its index for cross-checking.

```json
{
  "name": "Dark",

  "palette": {
    "gray":   ["#1a1d23", "#1c2027", "#21252b", "#262a31", "#282c34", "#2c313a", "#2e3440", "#333842", "#3e4451", "#4d5566", "#5c6370", "#828997", "#abb2bf", "#d7dae0"],
    "blue":   ["#253545", "#354a5e", "#355565", "#3a6090", "#4a9be0", "#528bff", "#61afef", "#82c0f5", "#a8d4f7"],
    "green":  ["#2a3a2a", "#3d5a3d", "#98c379"],
    "red":    ["#3a2a2a", "#5a3a3a", "#e06c75"],
    "amber":  ["#3a3525", "#5a5035", "#e5c07b"],
    "cyan":   ["#253a3e", "#3a5a60", "#56b6c2"],
    "purple": ["#c678dd"],
    "orange": ["#be5046", "#d19a66"],
    "white":  "#d7dae0",
    "black":  "#282c34",
    "transparent": "transparent"
  },

  "colors": {
    "surface":  { "base": "gray.4", "elevated": "gray.5", "sunken": "gray.2", "overlay": "gray.5" },
    "text":     { "primary": "gray.12", "secondary": "gray.11", "tertiary": "gray.10", "inverse": "gray.4", "link": "blue.6", "linkHover": "blue.7" },
    "border":   { "default": "gray.8", "subtle": "gray.8", "strong": "gray.9" },
    "accentBrand": { "default": "blue.6", "subtle": "blue.0", "hover": "blue.7", "muted": "blue.1" },
    "positive": { "default": "green.2", "bg": "green.0", "border": "green.1" },
    "negative": { "default": "red.2", "bg": "red.0", "border": "red.1" },
    "warning":  { "default": "amber.2", "bg": "amber.0", "border": "amber.1" },
    "info":     { "default": "blue.6", "bg": "blue.0", "border": "blue.2" },
    "neutral":  { "change": "gray.10", "changeBg": "gray.5" },
    "interactive": {
      "bg": "blue.6", "bgHover": "blue.7", "bgActive": "blue.4",
      "text": "gray.4",
      "ghostHover": "gray.5", "ghostActive": "gray.7",
      "outlineBorder": "gray.8", "outlineHover": "gray.9",
      "focusRing": "blue.5",
      "disabledBg": "gray.5", "disabledText": "gray.9"
    }
  },

  "shadcn": {
    "background": "surface.base",
    "foreground": "text.primary",
    "card": "surface.sunken",
    "cardForeground": "text.primary",
    "popover": "surface.sunken",
    "popoverForeground": "text.primary",
    "primary": "accentBrand.default",
    "primaryForeground": "surface.base",
    "secondary": "border.default",
    "secondaryForeground": "text.primary",
    "muted": "border.default",
    "mutedForeground": "text.tertiary",
    "accent": "border.default",
    "accentForeground": "text.primary",
    "destructive": "negative.default",
    "border": "border.default",
    "input": "border.default",
    "ring": "blue.5",
    "sidebar": "surface.sunken",
    "sidebarForeground": "text.primary",
    "sidebarPrimary": "accentBrand.default",
    "sidebarPrimaryForeground": "surface.base",
    "sidebarAccent": "surface.elevated",
    "sidebarAccentForeground": "text.primary",
    "sidebarBorder": "border.default",
    "sidebarRing": "blue.5"
  },

  "typography": {
    "fontFamily": { "sans": "Inter, system-ui, sans-serif", "mono": "'JetBrains Mono', ui-monospace, monospace" },
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
    "filterBar":     { "bg": "surface.sunken", "border": "border.default" },
    "filterTrigger": { "bg": "surface.base", "border": "border.default", "text": "text.secondary", "hoverBg": "surface.elevated", "hoverBorder": "border.strong" },
    "filterActive":  { "bg": "accentBrand.subtle", "border": "blue.3", "text": "accentBrand.default" },
    "filterBadge":   { "bg": "accentBrand.default", "text": "surface.base" },
    "table": {
      "headerBg": "surface.elevated", "headerText": "text.secondary", "headerBorder": "border.default",
      "rowBg": "transparent", "rowAltBg": "gray.3",
      "rowHoverBg": "gray.6", "rowSelectedBg": "accentBrand.subtle",
      "rowBorder": "gray.7",
      "cellText": "text.primary", "cellSecondary": "text.secondary"
    },
    "tab": {
      "rail": "gray.1", "text": "text.tertiary", "hoverText": "text.secondary",
      "activeBg": "surface.elevated", "activeText": "text.primary"
    },
    "heading": { "primary": "text.primary", "section": "text.secondary", "overline": "text.tertiary" }
  },

  "viz": {
    "categorical": ["blue.6", "purple.0", "green.2", "amber.2", "cyan.2", "red.2", "orange.1", "orange.0"],
    "sequential":  ["blue.0", "blue.1", "blue.3", "blue.4", "blue.6", "blue.7"],
    "diverging":   ["red.2", "red.1", "gray.4", "green.1", "green.2"]
  }
}
```

**Palette index reference (dark):**

| Palette | Indices |
|---------|---------|
| gray | 0:#1a1d23 1:#1c2027 2:#21252b 3:#262a31 4:#282c34 5:#2c313a 6:#2e3440 7:#333842 8:#3e4451 9:#4d5566 10:#5c6370 11:#828997 12:#abb2bf 13:#d7dae0 |
| blue | 0:#253545 1:#354a5e 2:#355565 3:#3a6090 4:#4a9be0 5:#528bff 6:#61afef 7:#82c0f5 8:#a8d4f7 |
| green | 0:#2a3a2a 1:#3d5a3d 2:#98c379 |
| red | 0:#3a2a2a 1:#5a3a3a 2:#e06c75 |
| amber | 0:#3a3525 1:#5a5035 2:#e5c07b |
| cyan | 0:#253a3e 1:#3a5a60 2:#56b6c2 |
| purple | 0:#c678dd |
| orange | 0:#be5046 1:#d19a66 |

Every hex value in `global.css` `.dark` (lines 147–274) has a corresponding palette entry. Every ref resolves to the exact hex in the current CSS. No approximations, no manual reconciliation.

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
  accentBrand: { default: 'blue.3', subtle: 'blue.0' },
  negative: { default: 'blue.3' },
};

describe('resolveColorRef', () => {
  it('resolves two-part color ref like "surface.elevated"', () => {
    expect(resolveColorRef('surface.elevated', testColors, testPalette)).toBe('#ffffff');
  });

  it('resolves chained ref (color → palette)', () => {
    expect(resolveColorRef('accentBrand.default', testColors, testPalette)).toBe('#3574c4');
  });

  it('resolves "transparent" as literal', () => {
    expect(resolveColorRef('transparent', testColors, testPalette)).toBe('transparent');
  });

  it('falls back to palette ref when section not in colors', () => {
    // "gray.3" is not a colors section — should resolve as a palette ref
    expect(resolveColorRef('gray.3', testColors, testPalette)).toBe('#dce0e8');
    expect(resolveColorRef('blue.0', testColors, testPalette)).toBe('#edf4fc');
  });

  it('throws on completely invalid ref', () => {
    expect(() => resolveColorRef('nonexistent.99', testColors, testPalette)).toThrow();
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
  if (!sectionObj) {
    // Not a colors section — try as a direct palette ref (e.g. "gray.10", "blue.4")
    return resolvePaletteRef(ref, palette);
  }

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
        filterTrigger: { bg: 'surface.elevated', border: 'border.default', text: 'text.primary' },
        filterActive: { bg: 'accentBrand.default', border: 'blue.0', text: 'accentBrand.default' },
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
    // Note: --card-radius NOT emitted in Phase 1 (component geometry is Task 7a)

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
9. Return the full CSS string with the correct selector (`:root` for Light, `.dark` for Dark)

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
  const selector = theme.name === 'Light' ? ':root' : '.dark';

  lines.push(`${selector} {`);

  // 1. shadcn tokens
  for (const [key, ref] of Object.entries(shadcn)) {
    const resolved = resolveColorRef(ref, colors, palette);
    lines.push(`  ${shadcnVarName(key)}: ${resolved};`);
  }

  // 2. Radius base
  lines.push(`  --radius: ${geometry.radiusBase};`);

  // 3. Surface/text/border/accentBrand/status colors from `colors`
  for (const [section, entries] of Object.entries(colors)) {
    for (const [key, ref] of Object.entries(entries)) {
      const resolved = resolvePaletteRef(ref, palette);
      if (section === 'surface' && key === 'base') {
        lines.push(`  --surface: ${resolved};`);
      } else if (key === 'default') {
        // border.default → --border, accentBrand.default → --accent-brand
        lines.push(`  --${kebabCase(section)}: ${resolved};`);
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

  // 5. Chart tokens from viz.categorical (--chart-N only, no --viz-N alias yet)
  const resolvedCategorical = resolveVizPalette(viz.categorical, palette);
  resolvedCategorical.forEach((hex, i) => {
    lines.push(`  --chart-${i + 1}: ${hex};`);
  });

  // NOTE: Component geometry (--card-radius, --filter-height, etc.) and --viz-N aliases
  // are NOT emitted here. They don't exist in the current CSS and will be added in Task 7a
  // after parity verification passes in Task 6. --font-* vars are also not emitted in :root
  // because the current CSS only defines them in @theme inline.

  lines.push('}');

  return lines.join('\n');
}
```

**Note:** The above generates ONLY the variables that exist in the current `global.css`. This is intentional — the first generated output must be byte-identical to the current CSS. Special cases: `surface.base` → `--surface` (not `--surface-base`); `key === 'default'` → `--{section}` (e.g. `accentBrand.default` → `--accent-brand`, `border.default` → `--border`). The `neutral` section uses keys `change` and `changeBg`, generating `--neutral-change` and `--neutral-change-bg`. Component geometry vars (`--card-radius`, `--filter-height`, etc.), `--viz-N` aliases, and `--font-*` in `:root` are added later in Task 7a after parity is verified.

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
  const baseOpts = {
    geometry: { radiusBase: '0.375rem', radiusScale: { sm: 0.6 }, shadow: {} },
    typography: { fontFamily: { sans: 'Inter, system-ui, sans-serif', mono: "'JetBrains Mono', ui-monospace, monospace" } },
  };

  it('maps color vars to --color- prefix', () => {
    const vars = ['--surface', '--surface-elevated', '--text-primary', '--background', '--chart-1'];
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
    // Must NOT hardcode the font stack — Next.js injects the optimized value
    expect(block).not.toContain('--font-sans: Inter');
  });

  it('emits --font-mono as literal font stack', () => {
    const block = generateThemeInlineBlock([], baseOpts);
    expect(block).toContain("--font-mono: 'JetBrains Mono', ui-monospace, monospace");
  });
});
```

- [ ] **Step 25: Implement generateThemeInlineBlock**

Add to `themes/generate-theme.ts`:

```typescript
interface ThemeInlineOpts {
  geometry: { radiusBase: string; radiusScale: Record<string, number>; shadow: Record<string, string> };
  typography: { fontFamily: Record<string, string> };
}

export function generateThemeInlineBlock(
  allVarNames: string[],
  opts: ThemeInlineOpts,
): string {
  const lines: string[] = ['@theme inline {'];

  // Color vars → --color-{name}: var(--{name})
  // Match every var except --radius (handled separately)
  const colorVarPrefixes = [
    '--surface', '--text-', '--border', '--positive', '--negative',
    '--warning', '--info', '--neutral', '--interactive', '--filter-', '--table-',
    '--tab-', '--heading-', '--chart-', '--accent',
    // shadcn vars
    '--background', '--foreground', '--card', '--popover', '--primary',
    '--secondary', '--muted', '--destructive', '--input', '--ring', '--sidebar',
  ];

  for (const varName of allVarNames) {
    if (varName === '--radius') continue;
    if (colorVarPrefixes.some(prefix => varName.startsWith(prefix))) {
      const name = varName.replace('--', '');
      lines.push(`  --color-${name}: var(${varName});`);
    }
  }

  // Radius scale
  for (const [name, multiplier] of Object.entries(opts.geometry.radiusScale)) {
    lines.push(`  --radius-${name}: calc(var(--radius) * ${multiplier});`);
  }

  // Font families — emitted from typography, not from :root vars
  // (current CSS defines these only in @theme inline, not in :root)
  // Special case: --font-sans uses var(--font-sans) to delegate to Next.js font optimization.
  // Next.js injects a --font-sans CSS custom property with its optimized font; @theme inline
  // just re-exports it. Other font families are emitted as literals.
  for (const [key, value] of Object.entries(opts.typography.fontFamily)) {
    if (key === 'sans') {
      // Delegate to Next.js-provided var — do NOT hardcode the font stack
      lines.push(`  --font-${key}: var(--font-${key});`);
    } else {
      // Literal font stack — wrap multi-word names in single quotes for CSS
      lines.push(`  --font-${key}: ${value};`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}
```

**Note:** In Phase 1 (parity), `allVarNames` comes from the union of both theme `:root` and `.dark` blocks. Since Phase 1 does not emit `--viz-N`, `--card-radius`, `--font-*` etc. in `:root`/`.dark`, they won't appear in `allVarNames` and won't get `@theme inline` entries — matching the current CSS's `@theme inline` exactly. When Phase 2 (Task 7a) adds new vars to the theme blocks, they automatically get picked up by the prefix matching.

- [ ] **Step 26: Run tests to verify they pass**

```bash
cd apps/situation-room && pnpm test -- __tests__/generate-theme.test.ts
```

- [ ] **Step 27: Commit**

```bash
git add apps/situation-room/__tests__/generate-theme.test.ts apps/situation-room/themes/generate-theme.ts
git commit -m "feat(tokens): add @theme inline block generation with tests"
```

### Part G: Theme Validation

Validation has two layers: (1) JSON Schema validation via `ajv` using `theme.schema.json` from Task 2, and (2) semantic validation that schemas can't express (ref resolution, cross-section consistency). Both run on every generation. Tests first.

- [ ] **Step 28: Write failing tests for validateTheme**

Add to `__tests__/generate-theme.test.ts`:

```typescript
import { validateTheme } from '../themes/generate-theme';

describe('validateTheme', () => {
  // Use a valid minimal theme as baseline, then break one thing at a time

  function validTheme(): Theme {
    return {
      name: 'Light',
      palette: { gray: ['#aaa'], blue: ['#bbb'], green: ['#ccc'], red: ['#ddd'], amber: ['#eee'], cyan: ['#fff'], white: '#ffffff', black: '#000000', transparent: 'transparent' },
      colors: { surface: { base: 'gray.0' }, text: { primary: 'gray.0' }, border: { default: 'gray.0' }, accentBrand: { default: 'blue.0' }, positive: { default: 'green.0', bg: 'green.0', border: 'green.0' }, negative: { default: 'red.0', bg: 'red.0', border: 'red.0' }, neutral: { change: 'gray.0', changeBg: 'gray.0' }, interactive: { bg: 'blue.0', text: 'white', focusRing: 'blue.0' } },
      shadcn: { background: 'surface.base', foreground: 'text.primary', card: 'surface.base', cardForeground: 'text.primary', popover: 'surface.base', popoverForeground: 'text.primary', primary: 'accentBrand.default', primaryForeground: 'text.primary', secondary: 'surface.base', secondaryForeground: 'text.primary', muted: 'surface.base', mutedForeground: 'text.primary', accent: 'surface.base', accentForeground: 'text.primary', destructive: 'negative.default', border: 'border.default', input: 'border.default', ring: 'accentBrand.default', sidebar: 'surface.base', sidebarForeground: 'text.primary', sidebarPrimary: 'accentBrand.default', sidebarPrimaryForeground: 'text.primary', sidebarAccent: 'surface.base', sidebarAccentForeground: 'text.primary', sidebarBorder: 'border.default', sidebarRing: 'accentBrand.default' },
      typography: { fontFamily: { sans: 'Inter' }, fontSize: { xs: '0.75rem' }, fontWeight: { normal: '400' } },
      geometry: { radiusBase: '0.375rem', radiusScale: { sm: 0.5 }, shadow: { sm: '0 1px 2px rgba(0,0,0,0.05)' } },
      components: { card: { radius: 'sm' } },
      dashboard: { filterBar: { bg: 'gray.0' }, filterTrigger: { bg: 'gray.0' }, filterActive: { bg: 'blue.0' }, filterBadge: { bg: 'blue.0' }, tab: { rail: 'gray.0' }, table: { headerBg: 'gray.0' }, heading: { overline: 'gray.0' } },
      viz: { categorical: ['blue.0', 'green.0', 'red.0'], sequential: ['gray.0', 'blue.0', 'green.0'], diverging: ['red.0', 'gray.0', 'green.0'] },
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
    expect(errors.some(e => e.includes('palette'))).toBe(true);
    expect(errors.some(e => e.includes('viz'))).toBe(true);
  });

  it('rejects invalid hex in palette', () => {
    const t = validTheme();
    t.palette.gray = ['not-a-hex'];
    const errors = validateTheme(t);
    expect(errors.some(e => e.includes('pattern'))).toBe(true);
  });

  it('rejects missing required shadcn keys', () => {
    const t = validTheme();
    delete (t.shadcn as any).background;
    delete (t.shadcn as any).ring;
    const errors = validateTheme(t);
    expect(errors.some(e => e.includes('background'))).toBe(true);
    expect(errors.some(e => e.includes('ring'))).toBe(true);
  });

  it('rejects negative radius scale values', () => {
    const t = validTheme();
    t.geometry.radiusScale.bad = -1;
    const errors = validateTheme(t);
    expect(errors.some(e => e.includes('radiusScale'))).toBe(true);
  });

  it('rejects viz palette with fewer than 3 entries', () => {
    const t = validTheme();
    t.viz.categorical = ['blue.0'];
    const errors = validateTheme(t);
    expect(errors.some(e => e.includes('categorical'))).toBe(true);
  });

  it('rejects unresolvable palette refs in colors', () => {
    const t = validTheme();
    t.colors.surface.base = 'purple.99';
    const errors = validateTheme(t);
    expect(errors.some(e => e.includes('purple'))).toBe(true);
  });

  it('rejects unresolvable color refs in shadcn', () => {
    const t = validTheme();
    t.shadcn.background = 'nonexistent.section';
    const errors = validateTheme(t);
    expect(errors.some(e => e.includes('nonexistent'))).toBe(true);
  });
});
```

- [ ] **Step 29: Run tests to verify they fail**

```bash
cd apps/situation-room && pnpm test -- __tests__/generate-theme.test.ts
```

- [ ] **Step 30: Implement validateTheme**

Add to `themes/generate-theme.ts`:

```typescript
import Ajv from 'ajv';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let _ajvValidate: ReturnType<Ajv['compile']> | null = null;

function getSchemaValidator(): ReturnType<Ajv['compile']> {
  if (!_ajvValidate) {
    const schemaPath = join(import.meta.dirname, 'theme.schema.json');
    const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
    const ajv = new Ajv({ allErrors: true });
    _ajvValidate = ajv.compile(schema);
  }
  return _ajvValidate;
}

export function validateTheme(theme: any): string[] {
  const errors: string[] = [];

  // Layer 1: JSON Schema validation (structure, types, hex patterns, required fields)
  const validate = getSchemaValidator();
  if (!validate(theme)) {
    for (const err of validate.errors ?? []) {
      const path = err.instancePath || '(root)';
      errors.push(`schema: ${path} ${err.message}`);
    }
    return errors; // Can't validate refs if structure is invalid
  }

  // Layer 2: Semantic validation (ref resolution — schemas can't express this)

  // 6. Validate all refs actually resolve (catches typos early)
  if (theme.colors && theme.palette) {
    for (const [section, entries] of Object.entries(theme.colors)) {
      for (const [key, ref] of Object.entries(entries as Record<string, string>)) {
        try { resolvePaletteRef(ref, theme.palette); }
        catch { errors.push(`colors.${section}.${key}: unresolvable palette ref "${ref}"`); }
      }
    }
  }

  if (theme.shadcn && theme.colors && theme.palette) {
    for (const [key, ref] of Object.entries(theme.shadcn as Record<string, string>)) {
      try { resolveColorRef(ref, theme.colors, theme.palette); }
      catch { errors.push(`shadcn.${key}: unresolvable color ref "${ref}"`); }
    }
  }

  if (theme.dashboard && theme.colors && theme.palette) {
    for (const [section, entries] of Object.entries(theme.dashboard)) {
      for (const [key, ref] of Object.entries(entries as Record<string, string>)) {
        try { resolveColorRef(ref, theme.colors, theme.palette); }
        catch { errors.push(`dashboard.${section}.${key}: unresolvable color ref "${ref}"`); }
      }
    }
  }

  if (theme.viz && theme.palette) {
    for (const key of ['categorical', 'sequential', 'diverging'] as const) {
      if (theme.viz[key]) {
        theme.viz[key].forEach((ref: string, i: number) => {
          try { resolvePaletteRef(ref, theme.palette); }
          catch { errors.push(`viz.${key}[${i}]: unresolvable palette ref "${ref}"`); }
        });
      }
    }
  }

  return errors;
}
```

- [ ] **Step 31: Run tests to verify they pass**

```bash
cd apps/situation-room && pnpm test -- __tests__/generate-theme.test.ts
```

- [ ] **Step 32: Commit**

```bash
git add apps/situation-room/__tests__/generate-theme.test.ts apps/situation-room/themes/generate-theme.ts
git commit -m "feat(tokens): add comprehensive theme validation with tests"
```

### Part H: Main Script (File I/O + Watch Mode)

- [ ] **Step 33: Implement main() function and CLI**

Add to `themes/generate-theme.ts` the main orchestration code.

**Critical design decisions:**
- **Build mode** (`pnpm theme:generate`): validate → generate → write. On any error, throw and exit with code 1. Hard failure is correct here — CI and `prebuild` should not silently produce bad CSS.
- **Watch mode** (`pnpm theme:watch`): same pipeline, but errors are caught and logged. The previous `generated-theme.css` is preserved on disk so the running dev server keeps working. The watcher stays alive and regenerates on the next save. `process.exit(1)` is **never** called in watch mode.
- The script reads exactly two theme files: `light.json` (→ `:root`) and `dark.json` (→ `.dark`). No dynamic discovery. The system is explicitly constrained to these two themes.
- Variable names for `@theme inline` are computed from the **union** of both theme objects' generated var inventories (extracted from the CSS output of both themes via regex). This ensures any variable present in either theme is registered with Tailwind, making the inline block resilient to theme divergence.
- Typography and geometry for the `@theme inline` come from the Light theme (the base theme).

```typescript
class ThemeGenerationError extends Error {
  constructor(public readonly errors: string[]) {
    super(`Theme generation failed:\n${errors.map(e => `  ✗ ${e}`).join('\n')}`);
    this.name = 'ThemeGenerationError';
  }
}

function generate(themesDir: string, outputPath: string): void {
  const lightPath = join(themesDir, 'light.json');
  const darkPath = join(themesDir, 'dark.json');

  const errors: string[] = [];

  // Parse both theme files
  let lightTheme: Theme;
  let darkTheme: Theme;
  try {
    lightTheme = JSON.parse(readFileSync(lightPath, 'utf-8'));
  } catch (e) {
    throw new ThemeGenerationError([`light.json: ${(e as Error).message}`]);
  }
  try {
    darkTheme = JSON.parse(readFileSync(darkPath, 'utf-8'));
  } catch (e) {
    throw new ThemeGenerationError([`dark.json: ${(e as Error).message}`]);
  }

  // Validate both
  errors.push(...validateTheme(lightTheme).map(e => `light.json: ${e}`));
  errors.push(...validateTheme(darkTheme).map(e => `dark.json: ${e}`));
  if (errors.length > 0) throw new ThemeGenerationError(errors);

  // Generate CSS blocks
  const lightCss = generateCssFromTheme(lightTheme);
  const darkCss = generateCssFromTheme(darkTheme);

  // Merge var names from BOTH themes for @theme inline
  const varSet = new Set<string>();
  for (const css of [lightCss, darkCss]) {
    for (const match of css.matchAll(/\s+(--[\w-]+):/g)) {
      varSet.add(match[1]);
    }
  }

  // Use Light theme geometry + typography for @theme inline (base theme)
  const inlineBlock = generateThemeInlineBlock(
    [...varSet],
    { geometry: lightTheme.geometry, typography: lightTheme.typography },
  );

  const output = [
    '/* DO NOT EDIT — generated by theme:generate */',
    '',
    lightCss,
    '',
    darkCss,
    '',
    inlineBlock,
    '',
  ].join('\n');

  writeFileSync(outputPath, output, 'utf-8');
  console.log(`✓ Generated ${outputPath}`);
}

function main() {
  const themesDir = resolve(import.meta.dirname, '.');
  const outputPath = resolve(import.meta.dirname, '../app/generated-theme.css');
  const isWatch = process.argv.includes('--watch');

  // One-shot generation — exit on failure
  try {
    generate(themesDir, outputPath);
  } catch (e) {
    console.error((e as Error).message);
    if (!isWatch) process.exit(1);
    // In watch mode, the initial generation failed but we keep watching
    // so the developer can fix the JSON and save again.
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
          // Log error but DO NOT exit — keep watching.
          // Previous generated-theme.css is preserved.
          console.error((e as Error).message);
        }
      }

      watcher.on('change', regenerate);
      watcher.on('add', regenerate);
    });
  }
}

// Only run main when executed directly (not when imported for tests)
const isDirectExecution = process.argv[1] && import.meta.filename === resolve(process.argv[1]);
if (isDirectExecution) {
  main();
}
```

- [ ] **Step 34: Run the generator and verify output**

```bash
cd apps/situation-room && pnpm theme:generate
```

Expected: `✓ Generated app/generated-theme.css`. Check the output file:

```bash
head -50 apps/situation-room/app/generated-theme.css
```

Verify it has `:root { ... }`, `.dark { ... }`, and `@theme inline { ... }`.

- [ ] **Step 35: Run all tests**

```bash
cd apps/situation-room && pnpm test
```

Expected: All tests pass (both new generate-theme tests and existing tests).

- [ ] **Step 36: Commit**

```bash
git add apps/situation-room/themes/generate-theme.ts
git commit -m "feat(tokens): add main script with file I/O and watch mode"
```

---

## Task 6: Verify Generated CSS Matches Current CSS Exactly

**Files:**
- None modified (verification only). If mismatches are found, go back and fix the theme JSON files before proceeding.

This task verifies that the generated CSS is **identical** to the current hand-written CSS for all existing variables. Phase 1 generation emits only variables that exist in the current `global.css` — no new vars, no missing vars, no different values. If any discrepancy is found, fix the theme JSON, not the generator.

- [ ] **Step 1: Generate CSS**

```bash
cd apps/situation-room && pnpm theme:generate
```

Expected: `✓ Generated app/generated-theme.css`

- [ ] **Step 2: Extract and diff variable values**

Extract all `--var: value` pairs from the current `global.css` `:root`, `.dark`, and `@theme inline` blocks AND from `generated-theme.css`. Compare them. There should be **zero** differences — no extra vars, no missing vars, no value mismatches.

```bash
# Extract sorted var declarations from both files
cd apps/situation-room
grep -oP '\-\-[\w-]+:\s*[^;]+' app/global.css | sort > /tmp/current-vars.txt
grep -oP '\-\-[\w-]+:\s*[^;]+' app/generated-theme.css | sort > /tmp/generated-vars.txt
diff /tmp/current-vars.txt /tmp/generated-vars.txt
```

Expected: **Empty diff.** If there are ANY differences — extra vars in generated output, missing vars, or value mismatches — **stop**. Go back to the theme JSON or the generator and fix the source of the discrepancy. Do not proceed until the diff is clean.

**Known items to watch for:**
- Duplicate `--border` declarations: the shadcn loop emits `--border` (from `shadcn.border → border.default`) and the colors loop also emits `--border` (from `colors.border.default` via `key === 'default'`). Fix: use a `Set<string>` of already-emitted var names; skip if already present. The shadcn block runs first, so the colors loop should skip `--border`.
- `@theme inline` font entries must match current CSS exactly (e.g. `--font-mono` may use an inline value rather than `var()`)
- Variable ordering may differ from current CSS — sort both sides before comparing values

- [ ] **Step 3: Start dev server and visually verify**

```bash
cd apps/situation-room && pnpm dev
```

Open `http://localhost:3100`. The app should look identical to its current state in both light and dark themes. There should be zero visible differences.

- [ ] **Step 4: Commit verification (no file changes expected)**

If the verification passed with no JSON adjustments needed:

```bash
git log --oneline -1
# Should be the Part H commit. No new commit needed.
```

If JSON files were adjusted to fix mismatches, commit the fixes:

```bash
git add apps/situation-room/themes/light.json apps/situation-room/themes/dark.json
git commit -m "fix(tokens): correct theme values to match current CSS exactly"
```

---

## Task 7a: Extend Generator with Phase 2 Variables

**Files:**
- Modify: `apps/situation-room/themes/generate-theme.ts`
- Modify: `apps/situation-room/__tests__/generate-theme.test.ts`

Now that Task 6 has confirmed byte-level parity with the current CSS, extend `generateCssFromTheme` to emit additional variables that don't exist in the current CSS but are needed by the switchover (Task 7b) and component migrations (Tasks 8-18). These vars are NEW — they extend beyond what the current CSS has, but the current CSS is still serving the app until Task 7b replaces it.

- [ ] **Step 1: Add component geometry vars to generateCssFromTheme**

After the chart tokens section (section 5), add a new section 6 that emits component-resolved geometry:

```typescript
  // 6. Component-resolved geometry (NEW — not in original CSS)
  // Handles both simple keys (radius, shadow, height) and compound keys (railRadius, pillRadius).
  // Simple: card.radius → --card-radius
  // Compound: tab.railRadius → --tab-rail-radius, tab.pillRadius → --tab-pill-radius
  if (theme.components) {
    for (const [comp, config] of Object.entries(theme.components)) {
      for (const [key, value] of Object.entries(config)) {
        if (key === 'radius') {
          const resolvedRadius = `calc(${radiusBase} * ${radiusScale[value as string]})`;
          lines.push(`  --${kebabCase(comp)}-radius: ${resolvedRadius};`);
        } else if (key.endsWith('Radius')) {
          // e.g. railRadius → rail-radius
          const stem = kebabCase(key); // "railRadius" → "rail-radius"
          const resolvedRadius = `calc(${radiusBase} * ${radiusScale[value as string]})`;
          lines.push(`  --${kebabCase(comp)}-${stem}: ${resolvedRadius};`);
        } else if (key === 'shadow') {
          lines.push(`  --${kebabCase(comp)}-shadow: ${shadow[value as string]};`);
        } else if (key === 'height') {
          lines.push(`  --${kebabCase(comp)}-height: ${value};`);
        }
        // Other keys (like headerWeight) are informational, not emitted as CSS vars
      }
    }
  }
```

This produces:
- `card: { radius: "md", shadow: "sm" }` → `--card-radius: calc(...)`, `--card-shadow: 0 1px 2px ...`
- `filter: { radius: "sm", height: "2rem" }` → `--filter-radius: calc(...)`, `--filter-height: 2rem`
- `tab: { railRadius: "lg", pillRadius: "md" }` → `--tab-rail-radius: calc(...)`, `--tab-pill-radius: calc(...)`
- `pill: { radius: "sm" }` → `--pill-radius: calc(...)`

- [ ] **Step 2: Add --viz-N aliases**

After the component geometry section, add `--viz-N` aliases that mirror `--chart-N`:

```typescript
  // 7. --viz-N aliases for chart colors (NEW — convenience aliases)
  resolvedCategorical.forEach((hex, i) => {
    lines.push(`  --viz-${i + 1}: ${hex};`);
  });
```

- [ ] **Step 3: Update @theme inline to include new vars**

The `generateThemeInlineBlock` already picks up new vars from the merged var set. Since the new vars (`--viz-*`, `--card-radius`, `--tab-rail-radius`, `--filter-height`) will now appear in `:root`/`.dark`, they'll be included in `allVarNames` and get `@theme inline` entries automatically via prefix matching. Verify this works by checking the generated output includes entries like:
- `--color-viz-1: var(--viz-1);` (matched by `'--viz'` prefix — add `'--viz'` to `colorVarPrefixes`)
- `--radius-card: var(--card-radius);` → enables `rounded-card`
- `--radius-tab-rail: var(--tab-rail-radius);` → enables `rounded-tab-rail`
- `--radius-tab-pill: var(--tab-pill-radius);` → enables `rounded-tab-pill`
- `--radius-filter: var(--filter-radius);` → enables `rounded-filter`
- `--radius-pill: var(--pill-radius);` → enables `rounded-pill`
- `--shadow-card: var(--card-shadow);` → enables `shadow-card`

Add to `colorVarPrefixes`: `'--viz'`

Add component geometry mapping after the font entries in `generateThemeInlineBlock`:

```typescript
  // Component-resolved geometry → Tailwind utilities
  // Regex uses [\w-]+ to match hyphenated stems like --tab-rail-radius, --tab-pill-radius
  for (const varName of allVarNames) {
    if (varName.match(/^--[\w-]+-radius$/)) {
      const name = varName.replace(/^--/, '').replace(/-radius$/, '');
      lines.push(`  --radius-${name}: var(${varName});`);
    }
    if (varName.match(/^--[\w-]+-shadow$/)) {
      const name = varName.replace(/^--/, '').replace(/-shadow$/, '');
      lines.push(`  --shadow-${name}: var(${varName});`);
    }
  }
```

- [ ] **Step 4: Add tests for new vars**

```typescript
describe('Phase 2 vars', () => {
  it('emits --viz-N aliases', () => {
    const css = generateCssFromTheme(minimalTheme);
    expect(css).toContain('--viz-1: #ccc');
    expect(css).toContain('--viz-2: #ddd');
  });

  it('emits component geometry vars including hyphenated stems', () => {
    const css = generateCssFromTheme(minimalTheme);
    expect(css).toContain('--card-radius:');
    expect(css).toContain('--card-shadow:');
  });

  it('emits --filter-height from components.filter.height', () => {
    const css = generateCssFromTheme(minimalTheme);
    expect(css).toContain('--filter-height: 2rem');
  });

  it('emits hyphenated geometry for tab sub-components', () => {
    // tab: { railRadius: "lg", pillRadius: "md" }
    const css = generateCssFromTheme(minimalTheme);
    expect(css).toContain('--tab-rail-radius:');
    expect(css).toContain('--tab-pill-radius:');
  });
});

describe('Phase 2 @theme inline', () => {
  it('maps component radius vars to Tailwind --radius-* aliases', () => {
    const varNames = ['--card-radius', '--tab-rail-radius', '--tab-pill-radius', '--filter-radius', '--pill-radius'];
    const block = generateThemeInlineBlock(varNames, baseOpts);
    expect(block).toContain('--radius-card: var(--card-radius)');
    expect(block).toContain('--radius-tab-rail: var(--tab-rail-radius)');
    expect(block).toContain('--radius-tab-pill: var(--tab-pill-radius)');
    expect(block).toContain('--radius-filter: var(--filter-radius)');
    expect(block).toContain('--radius-pill: var(--pill-radius)');
  });

  it('maps component shadow vars to Tailwind --shadow-* aliases', () => {
    const varNames = ['--card-shadow'];
    const block = generateThemeInlineBlock(varNames, baseOpts);
    expect(block).toContain('--shadow-card: var(--card-shadow)');
  });
});
```

- [ ] **Step 5: Run tests and commit**

```bash
cd apps/situation-room && pnpm test -- __tests__/generate-theme.test.ts
git add apps/situation-room/themes/generate-theme.ts apps/situation-room/__tests__/generate-theme.test.ts
git commit -m "feat(tokens): add Phase 2 vars — component geometry, --viz-N, --filter-height"
```

---

## Task 7b: Replace global.css with Generated Import + Component Classes

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
  .pill-neutral  { @apply pill-status bg-neutral-change-bg text-neutral-change border-border-subtle; }

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

- [ ] **Step 1: Update CSS var names to use `--viz-*` — keep fallbacks**

The `useCssVar` hook (line 29) calls `getComputedStyle` synchronously and returns `''` during SSR. Chart.js config runs during render, so removing fallbacks would produce invisible charts on first paint before hydration. **Keep all `|| '#...'` fallbacks** — they are a safety net, not dead code.

Only change the var names to use the new `--viz-*` tokens (available since Task 7a):

```typescript
// Before:
const accent = useCssVar('--accent-brand');
// After:
const accent = useCssVar('--viz-1');
```

Do NOT remove any `|| '#...'` fallbacks. The fallbacks can be removed in a future task if/when `useCssVar` is made reactive (e.g. with `useEffect` + state), but that is out of scope for this plan.

- [ ] **Step 2: Verify chart still renders in both themes and commit**

```bash
git add apps/situation-room/components/trend-chart.tsx
git commit -m "refactor(tokens): switch trend-chart to --viz-* vars, keep fallbacks"
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
| Task 7a (Phase 2 vars) | — | `themes/generate-theme.ts`, `__tests__/generate-theme.test.ts` |
| Task 7b (switchover) | — | `app/global.css` |
| Tasks 8-18 (migrate) | — | 10 component files |
| Task 19 (validate) | — | — |
