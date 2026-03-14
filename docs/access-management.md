# Access Management

This document describes how access control and folder organization are handled
within the Lightdash analytics platform for the RevOps Analytics project.

---

## Folder Structure

All analytics content lives under the **RevOps Analytics** top-level space.
Within it, two types of folders exist: **personal folders** and the
**shared folder**.

```text
RevOps Analytics/
├── Shared/                  ← Production (CI-managed)
│   ├── Dashboards/          ← Only dashboards
│   └── Charts/              ← Only charts
├── <User A>/                ← Personal folder
├── <User B>/                ← Personal folder
└── ...
```

---

## Personal Folders

Every user gets a personal folder named after them (e.g., `Facundo`,
`Jordan`). These folders are the workspace for day-to-day exploration,
drafting, and quick iterations.

| Action              | Own folder | Other users' folders |
| ------------------- | ---------- | -------------------- |
| View content        | Yes        | Yes (view-only)      |
| Create/edit content | Yes        | No                   |
| Delete content      | Yes        | No                   |

**When to use a personal folder:**

- Prototyping a new chart or dashboard before it goes through review.
- One-off analyses or ad-hoc requests that don't need to be standardized.
- Quick manual updates that need to be shared informally with the team.

Personal folders allow every analyst to move fast without risking production
content. Other team members can browse any personal folder for reference or
inspiration, but they cannot modify its contents.

---

## Shared Folder (Production)

The **Shared** folder is the single source of truth for standardized,
company-facing analytics. It is split into two sub-folders to enforce content
separation:

| Sub-folder   | Allowed content type |
| ------------ | -------------------- |
| `Dashboards` | Dashboards only      |
| `Charts`     | Saved charts only    |

### Who can view

Any user (or selected users/groups) that the organization wants to have access
to production analytics. The Shared folder is where finalized content is
published for broad consumption.

### Who can edit

Only **admins** have direct write access to the Shared folder inside Lightdash.
All other modifications must go through the automated deployment pipeline (see
below).

### How changes reach the Shared folder

Changes to the Shared folder follow the code-managed deployment process:

1. **Author** creates or modifies chart/dashboard YAML files in their local
   branch (under `lightdash/charts/` or `lightdash/dashboards/`).
2. **Author** opens a pull request on GitHub targeting the `main` branch.
3. **CI automation** runs on the PR:
   - Validates field references (`pnpm lightdash:validate-refs`).
   - Lints YAML syntax (`lightdash lint`).
   - Creates an ephemeral preview project for visual review.
   - Runs server-side validation against the preview.
4. **Reviewer** approves the PR after verifying correctness and business
   alignment.
5. **Admin** triggers the manual production deployment workflow
   (`lightdash-deploy`) from GitHub Actions, which pushes the approved changes
   to the live Shared folder.

This process ensures that every change to production analytics is reviewed,
validated, and traceable through version control.

```text
┌─────────────┐     ┌──────────┐     ┌───────────┐     ┌───────────────┐
│ Local edit   │────▶│ Open PR  │────▶│ CI checks │────▶│ Review &      │
│ (YAML files) │     │ on GitHub│     │ + preview │     │ approval      │
└─────────────┘     └──────────┘     └───────────┘     └──────┬────────┘
                                                              │
                                                              ▼
                                                     ┌───────────────┐
                                                     │ Manual deploy │
                                                     │ (admin only)  │
                                                     └──────┬────────┘
                                                              │
                                                              ▼
                                                     ┌───────────────┐
                                                     │ Shared folder │
                                                     │ updated       │
                                                     └───────────────┘
```

---

## Access Summary

| Folder            | View access       | Edit access             | Governed by       |
| ----------------- | ----------------- | ----------------------- | ----------------- |
| Personal (own)    | Owner + all users | Owner only              | Lightdash roles   |
| Personal (others) | All users         | None                    | Lightdash roles   |
| Shared/Dashboards | Selected users    | Admins only (via CI/CD) | GitHub PR process |
| Shared/Charts     | Selected users    | Admins only (via CI/CD) | GitHub PR process |

---

## Rationale

- **Personal folders** give analysts autonomy to iterate quickly without
  process overhead, while still keeping their work visible to the team.
- **View-only cross-access** enables knowledge sharing and prevents
  duplication of effort.
- **CI-gated Shared folder** prevents accidental modifications to
  company-facing dashboards and ensures every production change is peer-reviewed
  and validated before it goes live.
- **Content-type separation** (Dashboards vs. Charts) keeps the Shared folder
  organized and makes it easy for consumers to find what they need.
