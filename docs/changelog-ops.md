# Changelog Operations

## Source Of Truth

The public changelog lives in [apps/changelog-site/blog](../apps/changelog-site/blog). Entries are generated from merged pull requests to the main branch.

## PR Requirements

The PR template includes a `Changelog note` section. Use it like this:

- Write a concise, user-facing note when the change affects reports, metrics, dashboards, reliability, or workflow.
- Write `skip` only for internal work with no user-facing effect.

## Automation Behavior

- On merge to `main`, the changelog workflow reads the PR metadata and changed files.
- If the changelog note is not `skip`, a Codex agent writes an MDX post into the Docusaurus blog.
- The resulting commit lands on `main`, which can trigger a Vercel deployment.

## Editorial Standard

- Lead with the user impact.
- Explain what improved or changed, not how the code was refactored.
- Keep entries concise and specific.
- Prefer one changelog entry per merged PR.
