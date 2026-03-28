# Setup Secrets

## GitHub Actions Secrets

Required for Lightdash deploy:

- `LIGHTDASH_API_TOKEN`
- `LIGHTDASH_URL`
- `LIGHTDASH_PROJECT_UUID`

Required for Codex automation:

- `OPENAI_API_KEY`

Runtime mapping in CI:

- `LIGHTDASH_API_TOKEN` is exported to the CLI as `LIGHTDASH_API_KEY`
- `LIGHTDASH_PROJECT_UUID` is exported to the CLI as `LIGHTDASH_PROJECT`

Optional GitHub Actions variables:

- `OPENAI_CODEX_MODEL` default recommendation: `gpt-5.2-codex`

## Vercel

Create three Vercel projects, one per retained app:

- `apps/analytics-suite`
- `apps/docs-site`
- `apps/changelog`

Required GitHub Actions configuration for production deploys:

- secret: `VERCEL_TOKEN`
- variable or secret: `VERCEL_ORG_ID`
- variable or secret: `VERCEL_PROJECT_ID_ANALYTICS_SUITE`
- variable or secret: `VERCEL_PROJECT_ID_DOCS_SITE`
- variable or secret: `VERCEL_PROJECT_ID_CHANGELOG`

Recommended per-project settings:

- Set the Vercel project root directory to the corresponding app directory.
- Let Vercel auto-detect the framework where possible.
- Use the app's normal production build settings instead of forcing one shared
  build/output configuration across all three apps.

Deployment behavior:

- merges to `main` deploy through `.github/workflows/vercel-deploy.yml` after `CI` succeeds
- app-local changes deploy only the affected app
- shared root changes fan out and deploy all three apps

## Branch Protection

Only turn on required checks after the secrets above are configured. Otherwise the new agent workflows will fail by design.
