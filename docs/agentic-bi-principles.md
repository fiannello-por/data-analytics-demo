# Human And Agentic BI Principles

## Why This Matters

The same semantic layer now serves dashboards, ad hoc exploration, and AI systems that translate natural language into governed queries. That raises the bar for naming, clarity, and change management.

## Design Rules

- Favor explicit, stable vocabulary over short clever names.
- Make the correct field easy to choose and the wrong field hard to choose.
- Hide implementation details that confuse retrieval and query planning.
- Keep business logic centralized in the semantic layer, not scattered across charts.
- Write PRs as operational handoffs, because agents and humans both read them.

## Anti-Patterns

- Multiple metrics that mean almost the same thing but differ in quiet ways.
- Labels that are business-friendly but inconsistent with the underlying field purpose.
- Raw warehouse columns exposed because a chart happened to need them once.
- Field names that require tribal knowledge to interpret.
- PRs that say what changed in code but not what changed in reporting behavior.

## Definition Of Done

A change is not done when it merely builds. It is done when:

- the semantic behavior is clear,
- the affected users are identifiable,
- the PR explains validation and risk,
- the changelog note matches the actual impact,
- and the change can be safely interpreted by a BI agent.
