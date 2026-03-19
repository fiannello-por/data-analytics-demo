# Project Rules

## Bundled Repo Skills

This repository includes project-local skills under `.claude/skills/`. They
mirror pinned snapshots from `obra/superpowers` and `pbakaus/impeccable`, plus
repo-specific skills mirrored from `.agents/skills/`.

To refresh those vendored copies, run:

```bash
uv run sync-agent-skillsets
```

## Lightdash Skill (Required)

When modifying any file under `lightdash/` (models, charts, dashboards):

1. Load the Lightdash skill first: `/developing-in-lightdash`
2. Follow the skill's workflows for editing, deploying, and testing

## Validation Before Done

Before declaring any Lightdash change complete:

1. Run `pnpm lightdash:validate-refs` — verifies every chart exploreName and field ID matches a model definition
2. Run `pnpm lightdash:validate-shared` — enforces shared folder structure rules
3. Run `lightdash lint` — catches YAML syntax errors (known false positive on markdown tiles is OK)
4. If a preview project exists, run `lightdash validate --project <uuid> --skip-dbt-compile --skip-warehouse-catalog`

## Lightdash Shared Folder Structure (CI-enforced)

CI runs `validate-refs` and `validate-shared` on every PR touching `lightdash/`. These rules are **blocking** — PRs fail if violated.

### Space slug rules (validate-shared)

All shared content lives under `point-of-rental-revops-analytics-demo/revenue/`. Charts and dashboards go in **separate subfolders**:

| Content type | Correct `spaceSlug`                                         |
| ------------ | ----------------------------------------------------------- |
| Charts       | `point-of-rental-revops-analytics-demo/revenue/charts-prod` |
| Dashboards   | `point-of-rental-revops-analytics-demo/revenue/dashboards`  |

**Enforced rules:**

- **A1**: No charts in the dashboards subfolder
- **A2**: No dashboards in the charts subfolder
- **B1**: Shared dashboards may only reference charts that are also in the shared charts folder
- **D1**: No unexpected subfolders under the shared root (only `charts-prod` and `dashboards` are allowed)
- **D2**: No content placed directly at the shared root — must be in a subfolder

**Never** copy a `spaceSlug` from a chart file to a dashboard file or vice versa. When creating a new file, check an existing file of the **same type** for the correct path.

### Reference validation (validate-refs)

Every non-SQL chart must have:

- `exploreName` matching an existing model `name` in `lightdash/models/`
- All field IDs (`{explore}_{field}`) matching a dimension or metric in that model (time-interval suffixes like `_year`, `_month` are auto-resolved)

## Pull Requests

When creating a PR, read `.github/pull_request_template.md` and fill every section with substantive content in the `--body` flag. Do not leave placeholder text. Use `skip` for the Changelog note only when the change is fully internal.

## References

- [AGENTS.md](AGENTS.md) — agent governance and review priorities
- [CONTRIBUTING.md](CONTRIBUTING.md) — contribution workflow
