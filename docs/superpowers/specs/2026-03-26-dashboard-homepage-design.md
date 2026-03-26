# Dashboard Homepage Design

**Date:** 2026-03-26
**Status:** Approved

## Summary

Replace the current homepage (`/`) with a data table listing all available dashboards. Each row shows metadata (author, owner team, last edited, status) and navigates to the dashboard on click. The current v1 dashboard moves from `/` to `/situation-room`.

## Route Changes

| Before | After |
|--------|-------|
| `/` → v1 executive dashboard | `/` → dashboards table (new homepage) |
| `/v2` → spec dashboard v2 | `/v2` → unchanged |
| — | `/situation-room` → v1 executive dashboard (moved) |

## Data Source

### POC (current scope)

Static TypeScript config file at `lib/dashboards-registry.ts`. Exports an array of dashboard entries:

```ts
interface DashboardEntry {
  slug: string;
  name: string;
  description: string;
  href: string;
  author: string;       // GitHub username
  ownerTeam: string;
  lastEdited: string;   // ISO date string — last push to main that modified the dashboard
  status: 'live' | 'beta' | 'deprecated';
}
```

### Future (out of scope)

- Supabase `dashboard_metadata` table for editable fields (owner team, description, status)
- Build-time GitHub API calls for git-derived fields (author, last edited)

## Table Columns

| Column | Type | Notes |
|--------|------|-------|
| Name | Text, bold | Dashboard display name |
| Description | Text, muted | One-line summary |
| Author | Text | GitHub username |
| Owner Team | Badge | Team responsible for the dashboard |
| Last Edited | Text, muted | Formatted date (e.g., "Mar 24, 2026") |
| Status | Colored badge | Live (green), Beta (yellow), Deprecated (red) |

Default sort: last edited, descending.

## Page Layout

- Heading: "Dashboards" (h1)
- No subtitle, search, or filters
- Full-width data table below the heading
- Clicking any row navigates to that dashboard's `href`

## Components

| File | Type | Responsibility |
|------|------|----------------|
| `app/page.tsx` | Server component | Imports registry, renders page with heading + table |
| `app/situation-room/page.tsx` | Server component | Moved v1 dashboard (copy of current `app/page.tsx`) |
| `components/dashboard/dashboards-table.tsx` | Client component | TanStack Table + shadcn `<Table>`, row click navigation |
| `lib/dashboards-registry.ts` | Static config | Array of `DashboardEntry` objects |

## Behavior

- Row hover: subtle background highlight (standard shadcn table hover)
- Row click: `router.push(entry.href)`
- Status badges: colored using shadcn `<Badge>` variant or custom className
  - Live → green background
  - Beta → yellow background
  - Deprecated → red background
- Owner team: neutral badge styling

## Initial Dashboard Entries

| Name | Route | Author | Owner Team | Status |
|------|-------|--------|------------|--------|
| Situation Room | `/situation-room` | (from git) | (hardcoded) | Live |
| Spec Dashboard v2 | `/v2` | (from git) | (hardcoded) | Beta |

## Tech Stack

- shadcn `<Table>` component (already installed)
- `@tanstack/react-table` (already installed)
- shadcn `<Badge>` component (already installed)
- Next.js App Router
- No new dependencies required

## Out of Scope

- Search/filter functionality
- Metadata editor UI
- Supabase integration
- App renaming (tracked separately)
