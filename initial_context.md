# Lightdash Investigation — Full Context Handoff

> Created: 2026-03-06
> Purpose: Enable another Claude Code agent to continue this conversation with full context.
> Project: Point Of Rental

---

## 1. What Is Lightdash

Lightdash is an open-source BI tool. Originally dbt-native (reads metrics/dimensions from dbt YAML files), it now also supports a **standalone YAML mode** that requires no dbt at all.

Key capabilities:
- Semantic layer defined in YAML (metrics, dimensions, joins, explores)
- Self-serve dashboards and chart exploration
- AI Agents (natural language → governed queries via the semantic layer)
- MCP Server for connecting Claude/Cursor directly to Lightdash data
- Dashboards-as-code (charts/dashboards stored as YAML in git)
- Granular role-based access (Viewer, Interactive Viewer, Editor, Developer, Admin)

### Docs Access

The Context7 MCP is configured and working. Use:
```
libraryId: /websites/lightdash
```
with `mcp__plugin_compound-engineering_context7__query-docs` to query Lightdash docs directly. 1,094 snippets, high reputation, benchmark score 87.

---

## 2. Architecture Decision: Standalone Lightdash YAML (No dbt Meta Tags)

### The problem
Integrating Lightdash with dbt requires adding `meta:` blocks inside dbt model YAML files. The user (and team) strongly disliked polluting dbt YAMLs with BI-specific configuration.

### The decision
Use **Lightdash's standalone YAML mode** in a separate repo, completely decoupled from dbt.

### How it works

There are three modes — the team chose option 2:

| Mode | How it works | Chosen? |
|------|-------------|---------|
| 1. dbt + Lightdash | `meta:` tags in dbt YAMLs. No way to avoid meta tags if using dbt integration. | No |
| 2. Standalone Lightdash YAML | Separate repo with `lightdash.config.yml` + `lightdash/models/*.yml`. Points at warehouse tables via `sql_from`. No dbt needed. | **Yes** |
| 3. Hybrid | Not supported. It's one or the other per project (`dbt_project.yml` OR `lightdash.config.yml`). | N/A |

### Repo structure for Point Of Rental

```
data-analytics-demo/
├── lightdash.config.yml           # type: bigquery
└── lightdash/
    └── models/
        └── user.yml               # sql_from: 'data-analytics-306119.sfdc.User'
```

### Example model file (standalone syntax — no meta nesting)

```yaml
type: model
name: orders
sql_from: 'public.orders'
label: 'Orders'
group_label: 'Sales'

dimensions:
  - name: id
    type: string
    primary_key: true
  - name: created_at
    type: date
    time_intervals: [day, week, month, year]
  - name: status
    type: string
  - name: total_amount
    type: number

metrics:
  order_count:
    type: count
  total_revenue:
    type: sum
    sql: ${TABLE}.total_amount

joins:
  - join: customers
    sql_on: ${orders.customer_id} = ${customers.id}
    relationship: many-to-one
```

### Key fact
If they later adopt dbt, the YAML formats are compatible — they'd just nest under `meta:` blocks.

### VSCode schema validation

```json
{
  "yaml.schemas": {
    "https://raw.githubusercontent.com/lightdash/lightdash/refs/heads/main/packages/common/src/schemas/json/lightdash-dbt-2.0.json": [
      "/**/models/**/*.yml"
    ],
    "https://raw.githubusercontent.com/lightdash/lightdash/refs/heads/main/packages/common/src/schemas/json/lightdash-project-config-1.0.json": [
      "lightdash.config.yml"
    ]
  }
}
```

---

## 3. User/Viewer Model

- **4-person data team**: Editors/Developers — create and maintain all dashboards and semantic layer
- **~150 users**: Viewers only — cannot create, edit, or delete anything
- Lightdash supports this via granular roles: Viewer, Interactive Viewer, Editor, Developer, Admin
- Space-level permissions allow restricting dashboard visibility per team

### Implication for data loss risk
Since only 4 people create content and they enforce dashboards-as-code, Postgres loss mainly means re-inviting viewers and re-setting permissions — annoying but recoverable.

---

## 4. Hosting Decision: Deployed to Render

### Options evaluated (ranked by headache avoidance)

| Option | Verdict |
|--------|---------|
| **Lightdash Cloud** | Best option. Zero ops. ~$800-2,400/mo (verify with sales — pricing from third-party source, not confirmed on their site). |
| **Render** | **CHOSEN.** One-click deploy available. Managed infra, auto-scaling, managed Postgres with backups, automatic SSL. ~$50-150/mo. |
| **Restack** | Initially promising (officially documented by Lightdash, deploys into your own cloud). BUT: Restack has pivoted to AI agent infrastructure. Open-source app deployment is a legacy product. Risky dependency. Supports AWS, GCP, Azure. |
| **Coolify + VPS** | Cheapest ($40-80/mo) but requires managing a server. SSH access needed. No auto-scaling. Not suitable for zero DevOps experience. |
| **Railway** | Worse than Render for this use case: no free tier, 5-min request timeout (bad for BI queries), no docker-compose blueprint, manual scaling, containerized Postgres (you manage backups). |
| **Northflank** | More abstracted than Render for multi-container apps, but overkill for deploying a single BI tool. Better for 5-10 services. |
| **Vercel** | Not possible. Vercel is serverless/frontend only. No Docker, no persistent processes, no multi-container, 10-60s timeout. Architecturally incompatible with Lightdash. |
| **Porter** | Managed K8s in your cloud account. Good "deploy into our own GCP" story for IT. Not explored deeply. |

### Why Render won
- No DevOps experience on team
- One-click deploy available for Lightdash
- Managed Postgres with automatic backups
- Auto-scaling
- Automatic SSL
- No servers to manage
- ~$50-150/mo

### Self-hosting risks acknowledged

| Risk | Mitigation |
|------|-----------|
| DB loss | Render managed Postgres has auto backups. Plus dashboards-as-code recovers BI content. |
| No monitoring | Render has basic dashboard. Not as good as Lightdash Cloud's on-call team. |
| Version upgrades | Manual redeploy required. Test in staging first. |
| Security patches | Team's responsibility. IT will care about this. Container images, base OS, Postgres, Chrome all need patching. Lightdash Cloud is SOC 2 compliant; self-host is not. |
| SSL expiration | Let's Encrypt + auto-renewal. Both Render and Coolify handle this automatically. Solved problem. |
| Scaling | Render has auto-scaling. 150 BI users is low-volume, bursty traffic — should be fine. |
| Bus factor | User acknowledged: "If I leave the company then this is not my problem" |

---

## 5. Current State: Deployed but Hitting BigQuery Error

### Status
Lightdash is **deployed on Render** and **connected to BigQuery**.

### Current error
```
SELECT User.lastname FROM `data-analytics-306119`.`sfdc`.`User` LIMIT 10

Could not fetch SQL query results
Native pagination not supported. Please configure S3 Storage to use bigquery
```

### Root cause
BigQuery doesn't support cursor-based pagination. Lightdash needs object storage to temporarily store large query results.

### Fix (not yet applied)
Add these environment variables to the Render service:

```bash
S3_ENDPOINT=https://storage.googleapis.com
S3_REGION=us-central1                        # their GCS region
S3_BUCKET=lightdash-demo-results              # create in GCS first
S3_ACCESS_KEY=<gcs-hmac-access-key>
S3_SECRET_KEY=<gcs-hmac-secret-key>
```

Steps:
1. Create a GCS bucket (e.g. `lightdash-demo-results`)
2. Create HMAC keys: GCP Console → Cloud Storage → Settings → Interoperability → Create key for service account
3. Add the env vars to Render service's Environment settings
4. Redeploy

GCS is S3-compatible via HMAC keys, so Lightdash's S3 config works directly with GCS. Since Point Of Rental is already on GCP, this is the natural path.

### Next steps after fixing the error
- Verify queries work end-to-end
- Set up the standalone Lightdash YAML repo
- Create initial model files pointing at BigQuery tables
- Configure user roles (4 editors, invite viewers)
- Consider dashboards-as-code workflow

---

## 6. Company Context

- **Point Of Rental**: Rental management software company
- **Company size**: 300 people
- **Dashboard consumers**: ~150 (viewers only)
- **Data team**: 4 people (create/edit dashboards)
- **DevOps team**: None. Zero DevOps experience.
- **Cloud**: GCP
- **Warehouse**: BigQuery (`data-analytics-306119` project, `sfdc` dataset observed)

---

## 7. Key Reference Links

- [Lightdash YAML guide (standalone)](https://docs.lightdash.com/guides/lightdash-yaml)
- [External object storage config](https://docs.lightdash.com/self-host/customize-deployment/configure-lightdash-to-use-external-object-storage)
- [Environment variables reference](https://docs.lightdash.com/self-host/customize-deployment/environment-variables)
- [Self-host overview](https://docs.lightdash.com/self-host/self-host-lightdash)
- [Roles reference](https://docs.lightdash.com/references/roles)
- [Dashboards as code](https://docs.lightdash.com/references/dashboards-as-code)
- [Tables/models reference](https://docs.lightdash.com/references/tables)
- [AI Agents](https://www.lightdash.com/ai-agents)
- [MCP Server / AI overview](https://docs.lightdash.com/guides/ai-overview)
- [Lightdash pricing](https://www.lightdash.com/pricing)
- [GCS HMAC keys](https://cloud.google.com/storage/docs/authentication/hmackeys)
- [Render](https://render.com)
