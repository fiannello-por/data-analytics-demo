# Shared Folder Validation

The shared folder validator (`pnpm lightdash:validate-shared`) enforces structure
rules for production Lightdash content. It runs in CI and locally.

## Folder structure

```text
{project}/{shared-folder}/
├── charts-prod/     ← shared charts
└── dashboards/      ← shared dashboards
```

## Rules

| Rule | Description                                         | Severity |
| ---- | --------------------------------------------------- | -------- |
| A1   | No charts in the Dashboards folder                  | error    |
| A2   | No dashboards in the Charts folder                  | error    |
| B1   | Shared dashboards must only reference shared charts | error    |
| B2   | Warn on unresolvable chart references               | warning  |
| D1   | No unexpected subfolders under the shared root      | error    |
| D2   | No content directly in the shared folder root       | error    |

## Legacy exclusions

Items in legacy space slugs (e.g., `sales-dashboard`, `shared/demo`, or the
shared root itself) are excluded from validation. These pre-date the subfolder
structure and will be migrated in a follow-up.

## Running locally

```bash
pnpm lightdash:validate-shared
# or directly:
cd tooling && uv run python ../semantic/lightdash/tooling/validate_shared.py
```
