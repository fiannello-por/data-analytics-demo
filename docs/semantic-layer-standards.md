# Semantic Layer Standards

## Goal

Build a semantic layer that is safe for executives, analysts, and AI agents to query without hidden business logic.

## Modeling Rules

- One model per durable business entity or curated mart.
- Use `group_label` to reflect business domains, not org chart names.
- Prefer business-facing labels and keep warehouse naming details out of the UI.
- Treat raw IDs, links, helper booleans, and implementation columns as hidden by default.
- Expose only fields that are analytically meaningful or operationally necessary.

## Metric Rules

- Every metric should answer one stable business question.
- Do not redefine the same business concept across multiple models without a clear reason.
- Use formatting, rounding, and labels consistently.
- Avoid chart-specific metrics when a reusable model metric would work.
- Document any intentional historical discontinuity in the PR and changelog note.

## Dimension Rules

- Names must be domain-specific enough for humans and agents to disambiguate them.
- Dates should expose standard time intervals unless there is a strong reason not to.
- Categorical dimensions should use business vocabulary, not raw source-system enumerations, when possible.
- Add labels whenever the field name would otherwise be cryptic.

## Agent-Friendly Metadata

- Prefer explicit names like `booking_plan_opportunity_type_2025` over overloaded names like `type`.
- Add a short description for non-obvious business fields during future semantic cleanups.
- Keep synonyms stable. Agents are much more reliable when the vocabulary does not churn.
- Avoid exposing multiple near-identical metrics with unclear ownership.

## Change Management

- Breaking semantic changes require a dedicated note in the PR body.
- Deprecated fields should be hidden and documented before deletion where feasible.
- Dashboard changes should be reviewed together with the semantic changes they depend on.
