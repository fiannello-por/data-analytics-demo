# Repository Agent Guide

This repository is optimized for both human contributors and coding agents.

## Non-Negotiables

- Preserve semantic correctness over stylistic preference.
- Review changes as if they can affect executive reporting, forecast decisions, and AI-generated analysis.
- Never hide breaking metric changes inside unrelated PRs.
- Every PR must explain the business impact of the change, not only the code diff.

## What Review Agents Should Prioritize

1. Metric definition drift or changes that silently alter historical reporting.
2. Ambiguous, duplicated, or leaky business terminology in the semantic layer.
3. New dimensions or metrics that are missing labels, descriptions, or safe defaults.
4. Broken dashboard references, invalid chart queries, or missing content updates.
5. Weak PR documentation, especially missing validation steps and missing changelog guidance.

## Lightdash Conventions

- Use standalone Lightdash YAML only. Do not introduce `dbt_project.yml` yet.
- Prefer domain-oriented model names and stable business vocabulary.
- Hide helper columns and raw warehouse identifiers unless they are intentionally user-facing.
- Add labels for any field whose warehouse name is not business-friendly.
- Favor reusable semantic definitions over chart-specific custom SQL.

## Agentic BI Conventions

- Descriptions must be explicit enough for an agent to choose the correct field without guesswork.
- Avoid generic names like `status`, `type`, `amount`, or `date` unless they are domain-qualified.
- Model one business concept once; alias only when needed for adoption or backward compatibility.
- Document deprecations before removing fields that downstream humans or agents might reference.

## PR Documentation Rules

PRs are expected to use the repository template and complete every section with substantive content. `skip` is only valid in the changelog section when the change is truly internal.

## Changelog Rules

- Public-facing changes must include a concise changelog note in the PR body.
- Internal-only work may use `skip` in the changelog section.
- The changelog automation should summarize user impact, not implementation trivia.
