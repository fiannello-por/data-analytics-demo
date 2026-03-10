# Point of Rental Analytics

This repository is the operational home for the Point of Rental analytics stack:

- `lightdash/` contains the semantic layer, charts, and dashboards for a pure Lightdash YAML project.
- `apps/changelog-site/` is a Docusaurus site published on Vercel for the public-facing analytics changelog.
- `scripts/agents/` contains Codex-powered automation for pull request review and changelog generation.

The current architecture is intentionally dbt-free. Lightdash metadata lives in standalone YAML so the BI layer can move quickly without coupling business logic to dbt project structure. When dbt is introduced, the semantic layer standards in this repo are designed to migrate cleanly into dbt `meta:` blocks.

## Principles

- Treat the semantic layer as production software, not dashboard glue.
- Optimize for both human self-serve analysis and agentic query generation.
- Keep business definitions explicit, versioned, reviewed, and documented.
- Automate review, deployment, and changelog hygiene in CI.

## Repository Layout

```text
.
├── AGENTS.md
├── CONTRIBUTING.md
├── apps/
│   └── changelog-site/
├── docs/
├── lightdash/
│   ├── charts/
│   ├── dashboards/
│   └── models/
├── scripts/
│   └── agents/
└── lightdash.config.yml
```

## Local Development

```bash
pnpm install
pnpm validate
pnpm changelog:dev
```

Useful commands:

- `pnpm lightdash:lint` validates Lightdash YAML.
- `pnpm changelog:build` builds the Docusaurus changelog site.
- `pnpm review:pr` runs the Codex review agent locally if the required env vars are set.

## CI/CD

- `ci.yml` enforces formatting, Markdown quality, TypeScript checks, and site build integrity.
- `codex-review.yml` reviews PR diffs for semantic-layer mistakes, anti-patterns, and missing PR documentation.
- `lightdash-deploy.yml` deploys Lightdash metadata and content on merge to `main`.
- `codex-changelog.yml` generates a changelog entry from merged PR metadata and commits it back to `main`.

## Read Before Contributing

- [AGENTS.md](./AGENTS.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [docs/semantic-layer-standards.md](./docs/semantic-layer-standards.md)
- [docs/agentic-bi-principles.md](./docs/agentic-bi-principles.md)
- [docs/lightdash-playbook.md](./docs/lightdash-playbook.md)
- [docs/changelog-ops.md](./docs/changelog-ops.md)
- [docs/setup-secrets.md](./docs/setup-secrets.md)
