# Lightdash Playbook

## Current Mode

This repo uses pure Lightdash YAML with [lightdash.config.yml](../lightdash.config.yml) and files under [lightdash/](../lightdash/). There is no dbt integration yet.

## Local Workflow

1. Edit model, chart, or dashboard YAML.
2. Run `pnpm lightdash:lint`.
3. Run a representative chart query when semantic logic or chart filters changed: `pnpm exec lightdash run-chart -p lightdash/charts/<chart-file>.yml`.
4. Build the changelog site if the change is public-facing: `pnpm changelog:build`.
5. Open a PR and complete the documentation template.

## Deployment Workflow

- Pull requests run repo validation and Codex review.
- Merges to `main` run Lightdash deploy and upload workflows once the repo matches the live dashboard baseline.
- Merges with a public-facing changelog note trigger changelog generation for the Vercel site.

## Content Synchronization

If someone makes changes in the Lightdash UI, sync them back into git immediately:

```bash
pnpm exec lightdash download
git add lightdash/
git commit -m "chore(lightdash): sync dashboard content"
```

## Future dbt Adoption

When dbt arrives:

- keep domain boundaries, naming, and review rules unchanged,
- migrate semantic definitions into dbt metadata deliberately,
- and preserve charts/dashboards-as-code plus changelog automation.
