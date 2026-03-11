# Project Rules

## Lightdash Skill (Required)

When modifying any file under `lightdash/` (models, charts, dashboards):

1. Load the Lightdash skill first: `/developing-in-lightdash`
2. Follow the skill's workflows for editing, deploying, and testing

## Validation Before Done

Before declaring any Lightdash change complete:

1. Run `pnpm lightdash:validate-refs` — verifies every chart exploreName and field ID matches a model definition
2. Run `lightdash lint` — catches YAML syntax errors (known false positive on markdown tiles is OK)
3. If a preview project exists, run `lightdash validate --project <uuid> --skip-dbt-compile --skip-warehouse-catalog`

## Pull Requests

When creating a PR, read `.github/pull_request_template.md` and fill every section with substantive content in the `--body` flag. Do not leave placeholder text. Use `skip` for the Changelog note only when the change is fully internal.

## References

- [AGENTS.md](AGENTS.md) — agent governance and review priorities
- [CONTRIBUTING.md](CONTRIBUTING.md) — contribution workflow
