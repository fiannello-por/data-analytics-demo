# Point of Rental — RevOps Analytics Demo

Lightdash dashboards powered by BigQuery, replicating the Sales Operations LookerStudio dashboard.

## Stack

- **BI**: [Lightdash](https://lightdash-server-j1vx.onrender.com) (self-hosted on Render, standalone YAML mode)
- **Data warehouse**: BigQuery (`data-analytics-306119.sfdc`)
- **CI/CD**: GitHub Actions — auto-deploys on push to `main`

## Workflow

1. **Edit** semantic layer or charts in `lightdash/`
2. **Test** locally with `lightdash run-chart -p <path> -o output.csv`
3. **PR + merge** to `main` — CI runs `lightdash deploy` + `lightdash upload`

To sync GUI changes back to the repo:

```
lightdash download
git add lightdash/ && git commit -m "Sync from Lightdash GUI"
```

## Project structure

```
lightdash/
  models/           # Semantic layer (dimensions, metrics)
  charts/           # Chart definitions (YAML)
  dashboards/       # Dashboard layouts and filters
lightdash.config.yml  # Lightdash project config
```
