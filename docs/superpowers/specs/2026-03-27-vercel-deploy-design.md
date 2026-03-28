# Vercel Deploy Workflow Design

**Date:** 2026-03-27

## Goal

Deploy the three retained web apps to Vercel automatically after successful
merges to `main`, while keeping deployments isolated per app and avoiding
duplicated workflow logic.

## Scope

Apps covered by this design:

- `apps/analytics-suite`
- `apps/docs-site`
- `apps/changelog`

This design does not cover preview deployments, local development, or first-time
Vercel project creation.

## Recommended Approach

Use a single GitHub Actions workflow that runs after the `CI` workflow succeeds
for a `push` to `main`, and deploys apps through a matrix strategy.

Each matrix target represents one Vercel app deployment:

- `analytics-suite`
- `docs-site`
- `changelog`

The workflow should:

1. detect changed paths from the merged commit range
2. decide which apps need deployment
3. fan out into a matrix for the affected apps
4. run Vercel CLI deploy steps per app

## Why One Matrix Workflow

This is the best balance of clarity and maintainability:

- one deployment workflow instead of three drifting copies
- one operational pattern for all apps
- independent deploy jobs and summaries per app
- shared changes can intentionally fan out to all apps
- app-specific changes still deploy only the affected app

## Trigger Model

The workflow should trigger on:

- `workflow_dispatch`
- `workflow_run` for `CI`, type `completed`

The automatic production deploy path should only proceed when:

- the triggering workflow is `CI`
- the CI conclusion is `success`
- the originating event was `push`
- the target branch is `main`

This preserves the current deployment discipline: production deploys only happen
after the main CI pipeline has passed on `main`.

## Change Detection Rules

### App-local deploy triggers

If only one app subtree changed, deploy only that app:

- `apps/analytics-suite/**` -> deploy `analytics-suite`
- `apps/docs-site/**` -> deploy `docs-site`
- `apps/changelog/**` -> deploy `changelog`

### Shared deploy triggers

If shared root or shared dependency areas changed, deploy all three apps:

- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `tooling/**`
- `packages/semantic-runtime/**`

The intent is conservative: when a shared surface changes, all three deployed
apps are treated as potentially affected.

## Secrets And Variables

Use one shared Vercel token and org ID, plus one project ID per app.

Required configuration:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID_ANALYTICS_SUITE`
- `VERCEL_PROJECT_ID_DOCS_SITE`
- `VERCEL_PROJECT_ID_CHANGELOG`

The workflow should fail early with clear errors if any required value is
missing for a target being deployed.

## Deployment Steps Per App

Each deploy job should:

1. check out the exact commit being deployed
2. install Node and `pnpm`
3. install dependencies with `pnpm install --frozen-lockfile`
4. install the Vercel CLI
5. run `vercel pull --yes --environment=production`
6. run `vercel build --prod`
7. run `vercel deploy --prebuilt --prod`
8. publish the deployment URL in the job summary

Each step should run from the target app directory.

## Matrix Shape

Each matrix item should define:

- `app_name`
- `working_directory`
- `project_id_var`

Example conceptual matrix:

- `analytics-suite` / `apps/analytics-suite` / `VERCEL_PROJECT_ID_ANALYTICS_SUITE`
- `docs-site` / `apps/docs-site` / `VERCEL_PROJECT_ID_DOCS_SITE`
- `changelog` / `apps/changelog` / `VERCEL_PROJECT_ID_CHANGELOG`

## Operational Constraints

- Deploy jobs must be independent. A failure in one app should clearly identify
  which target failed.
- The workflow should not assume `.vercel/project.json` is committed.
- Project identity must come from GitHub secrets or variables, not local Vercel
  metadata files.
- The workflow should remain compatible with manual `workflow_dispatch`.

## Acceptance Criteria

- A successful merge to `main` can trigger production deployments through Vercel
  CLI for all retained apps.
- App-local changes deploy only the touched app.
- Shared changes deploy all three apps.
- Deployment credentials are isolated by project ID.
- The workflow is centralized in one GitHub Actions file instead of duplicated
  across multiple files.
