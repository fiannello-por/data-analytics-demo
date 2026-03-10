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

Create a Vercel project with the repo root directory set to `apps/changelog-site`.

Recommended settings:

- Framework preset: `Other`
- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Output directory: `build`

## Branch Protection

Only turn on required checks after the secrets above are configured. Otherwise the new agent workflows will fail by design.
