# Changelog Operations

## Source Of Truth

The public changelog lives in [apps/changelog/blog](../apps/changelog/blog). Entries are generated from merged pull requests to the main branch and land through a follow-up automation PR.

## PR Requirements

The PR template includes a `Changelog note` section. Use it like this:

- Write a concise, user-facing note when the change affects reports, metrics, dashboards, reliability, or workflow.
- Write `skip` only for internal work with no user-facing effect.

## Automation Behavior

- On merge to `main`, the changelog workflow reads the PR metadata and changed files.
- If the changelog note is not `skip`, a Codex agent writes an MDX post into the Docusaurus blog.
- Generated content is sanitized before it is written so unsafe MDX instructions, imports, and script tags do not ship directly.
- The workflow pushes the result to an `automation/changelog-pr-*` branch and opens or updates a follow-up pull request instead of writing to `main` directly.

## Editorial Standard

- Lead with the user impact.
- Explain what improved or changed, not how the code was refactored.
- Keep entries concise and specific.
- Prefer one changelog entry per merged PR.

## Release Strategy

- Merge changelog follow-up PRs regularly so the public site stays close to the product state.
- Use git tags for notable external milestones, not every internal semantic-layer tweak.
- Keep each changelog PR scoped to one merged source PR so auditability stays simple.
