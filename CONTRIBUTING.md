# Contributing

## Workflow

1. Create a focused branch from `main`.
2. Keep semantic-layer changes, dashboard content changes, and automation changes easy to review.
3. Run `pnpm validate` before opening a PR.
4. Fill out the PR template completely.
5. Merge only after Codex review, CI, and human review all pass.

## What Belongs In This Repo

- Lightdash models, charts, and dashboards as code.
- Contributor standards for semantic modeling and analytics engineering.
- Changelog content for externally visible analytics changes.
- CI automation that improves review quality and documentation quality.

## What Does Not Belong Here

- Raw warehouse transformation logic.
- One-off analysis notebooks without an operational purpose.
- Long-lived secrets, tokens, or environment-specific credentials.

## Semantic Layer Review Checklist

- Did the business definition change?
- Does the naming work for humans and for AI agents?
- Are labels, descriptions, formats, and hidden helpers set correctly?
- Does the change require chart or dashboard updates?
- Does the PR explain how results were validated?

## Future dbt Migration

When dbt is introduced, keep this repo as the governance layer first. The likely migration path is:

1. Move model semantics into dbt-managed metadata.
2. Keep charts and dashboards as code in this repository or a sibling package.
3. Preserve the current documentation and review rules.
