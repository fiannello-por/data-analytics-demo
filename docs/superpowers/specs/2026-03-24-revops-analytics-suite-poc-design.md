# RevOps Analytics Suite PoC Design

Date: 2026-03-24
Status: Draft
Related issues:

- `#55 RevOps Analytics Suite PoC: shared semantic platform on Lightdash`
  Related designs:
- `2026-03-20-situation-room-data-backend-roadmap-design.md`
- `2026-03-21-modular-analytics-adapter-design.md`
- `2026-03-23-sales-dashboard-architecture-explainer-design.md`

## 1. Summary

This document defines the scope of the `RevOps Analytics Suite` proof of
concept.

The PoC is not a single-dashboard rewrite. It is a platform prototype for an
internal BI system that uses:

- a shared `Lightdash` semantic layer
- a shared analytics runtime
- dashboard-specific semantic query registries
- a shared multi-dashboard application shell

The first concrete consumer is the existing `Sales Performance Dashboard v2`,
which already demonstrates the core semantic backend pattern:

- dashboard registry declares intent
- shared runtime compiles through Lightdash
- compiled SQL executes in BigQuery
- UI renders the same product contract with a different backend

The PoC must extend that pattern into a more complete suite-level system that
can support multiple dashboards, platform controls, and a clearer explanation
of the semantic architecture.

## 2. Problem

The current v2 implementation proves an important architectural idea, but it is
still only one dashboard consuming a shared semantic backend.

That leaves several platform questions unanswered:

- can multiple dashboards share one shell and one deployment cleanly?
- can the shared runtime serve multiple dashboard modules without turning into a
  dashboard-specific abstraction?
- can the system control performance at the dashboard level rather than only at
  the platform level?
- can the semantic architecture be explained clearly enough for future team
  adoption and future semantic-layer evolution?

The PoC must answer those questions without collapsing into over-engineering or
premature platform sprawl.

## 3. Goals

- Prove that multiple dashboards can live in one shared analytics platform
- Prove that dashboard-specific query intent can stay local while runtime
  orchestration stays shared
- Prove that the semantic layer can support both dashboards and future tooling
- Prove that the platform can enforce and report dashboard-level performance
  behavior
- Prove that the system can be explained visually at the right architectural
  hierarchy
- Keep the code centralized in one monorepo

## 4. Non-Goals

- Building a final long-term governance model for the platform
- Introducing multi-tenant architecture
- Splitting dashboards into separate repositories by default
- Creating one Vercel project per dashboard by default
- Hard infrastructural isolation between dashboards in this phase
- Reusing `scorecard_daily` for the semantic v2 system

## 5. What Exists Today

The following pieces already exist and are part of the baseline for this PoC:

- a shared semantic runtime package in `packages/analytics-adapter`
- a `Lightdash compile -> BigQuery execute` runtime path
- a dashboard-specific semantic registry for `Situation Room`
- a parallel semantic backend route for the Sales Performance Dashboard at
  `/v2`
- additive dbt app-serving entities derived from `sfdc.OpportunityViewTable`
- additive Lightdash semantic models for the v2 dashboard
- semantic-first filter dictionaries in the v2 path

These pieces prove the core backend pattern but do not yet constitute a full
suite-level platform.

## 6. Product Definition

The `RevOps Analytics Suite` PoC is a platform prototype with three visible
outcomes:

1. a real multi-dashboard suite application
2. a shared analytics platform layer used by more than one dashboard module
3. a hierarchical architecture visualization for the semantic system

The suite may include dummy dashboards if needed to prove the multi-dashboard
pattern, but those dashboards must still consume the shared platform structure
rather than bypass it.

The PoC should be evaluated as a platform demonstration, not as a collection of
isolated dashboard features.

## 7. Core Architecture Concepts

### 7.1 Semantic Query Registry

The semantic query registry is dashboard-specific.

Its job is to define the query menu for one dashboard module:

- which semantic models are used
- which measures and dimensions are required
- which filters and sorts are allowed
- which result contracts the UI expects

It does not execute anything and does not discover the semantic layer by
itself. It relies on the semantic layer as the source of truth and should be
validated against it.

### 7.2 Shared Analytics Runtime

The shared analytics runtime is reusable across dashboards.

Its job is to:

- receive semantic query requests
- compile those requests through Lightdash
- receive compiled SQL
- execute SQL in BigQuery
- normalize rows and metadata
- expose reusable runtime behavior for dashboards and future tools

This logic should not be rewritten for each dashboard.

### 7.3 Shared system, dashboard-local intent

The target architecture is one shared system with dashboard-local query intent.

That means:

- one shared runtime
- one shared semantic layer
- one shared suite shell
- one dashboard-local registry per dashboard
- one dashboard-local mapper layer per dashboard

This is the critical boundary that makes the platform modular without turning it
into a generic abstraction with no product shape.

## 8. Scope

### 8.1 Complete the partially implemented platform work

The PoC must complete the following platform-level work that is currently only
partial:

- make the shared runtime reusable beyond one real dashboard consumer
- expose semantic catalog access cleanly enough for future tooling
- strengthen benchmark and probe metadata so dashboards can be compared
- centralize the platform code path cleanly for reuse

### 8.2 Build a real multi-dashboard suite app

The PoC must include a real shared application shell that hosts multiple
dashboards.

Requirements:

- one suite shell
- one deployment model
- multiple dashboards
- one shared runtime underneath
- dashboard-specific registries per dashboard module

At least one non-Sales dashboard can be dummy or simplified, but it must still
exercise the shared platform shape.

### 8.3 Introduce formal dashboard module boundaries

Dashboards must become explicit modules inside the suite.

Expected structure:

- dashboard-local registry
- dashboard-local mapping layer
- dashboard-local UI module
- shared platform code separated from dashboard-specific code

The purpose is to keep the monorepo safe through architecture, not through repo
fragmentation.

### 8.4 Add shared caching and request deduplication

The platform must support two distinct behaviors:

- in-flight deduplication for identical concurrent semantic requests
- persistent result caching for semantic requests that is safe against
  semantic-layer drift

Those two behaviors must not be treated as equivalent.

This should include:

- request-signature-based cache keys
- in-flight deduplication for identical requests
- shared behavior across dashboards
- cache namespacing by dashboard where needed
- semantic-version-aware cache invalidation for persistent cache entries

At minimum, any persistent cache key must include a semantic version component,
for example:

- semantic deploy version
- semantic-layer git SHA
- explicit semantic cache version value

TTL by itself is not sufficient, because the semantic layer is expected to
remain authoritative.

This is platform behavior, not one-off dashboard logic.

### 8.5 Add per-dashboard query budgets and traffic controls

The PoC must include lightweight but real platform controls so each dashboard
behaves as if it has its own guardrails.

Required concepts:

- dashboard-level performance budgets as code
- runtime instrumentation against those budgets
- basic rate-control hooks
- soft traffic-isolation policies
- per-dashboard reporting of budget behavior

This is not about tenant isolation. It is about preventing one dashboard from
becoming an uncontrolled hot path inside the shared platform.

### 8.6 Build a hierarchical architecture visualization

The semantic system must be explained through a proper hierarchical
visualization.

The visualization should be able to represent:

- dashboard modules
- semantic query registries
- shared analytics runtime as a subsystem
- internal runtime stages such as Lightdash compile and BigQuery execution
- serving entities and source entities

A flat node graph is not sufficient for this PoC.

## 9. System Direction

### 9.1 Repository direction

The preferred direction is:

- one monorepo
- one shared analytics platform layer
- one multi-dashboard suite application
- multiple dashboard modules inside that application
- one shared semantic layer used by many dashboards

The PoC should prove that this can be safe and scalable through clear module
boundaries rather than through early fragmentation.

### 9.2 Performance direction

The preferred performance strategy is:

- reusable micro serving entities rather than monster serving tables
- semantic request caching by request signature plus semantic version
- low query fan-out per interaction
- dashboard-level instrumentation and controls
- platform-level benchmarkability

### 9.3 Modeling direction

For the Sales Performance semantic system:

- `sfdc.OpportunityViewTable` remains the canonical source entity
- new serving entities live in `scorecard_test`
- `scorecard_daily` remains out of scope for the semantic v2 platform
- new semantic definitions continue to be additive and reusable

## 10. Acceptance Criteria

### 10.1 Architecture

- A shared analytics platform abstraction is reused by more than one dashboard
  module
- Dashboard-specific query intent is declared outside UI code
- Shared runtime and dashboard-local registry responsibilities are clearly
  separated

### 10.2 Product structure

- A real multi-dashboard suite exists in the codebase
- At least one non-Sales dashboard proves the dashboard-module pattern
- Dashboards share one shell and one deployment model

### 10.3 Performance and controls

- Semantic request caching is shared across dashboards
- Persistent cache entries use semantic-version-aware invalidation
- In-flight deduplication exists for identical semantic requests
- Dashboards declare query or performance budgets in code
- Runtime captures budget-relevant metadata per dashboard
- Basic dashboard-level traffic-isolation logic exists

### 10.4 Visualization

- The architecture visualization explains the semantic system with hierarchical
  structure rather than only flat graph rendering

### 10.5 Semantic layer

- Lightdash remains the semantic authority
- New dashboard work continues to avoid `scorecard_daily`
- `OpportunityViewTable` remains the canonical source entity for current Sales
  Performance semantics
- New serving entities remain in `scorecard_test`

## 11. Risks

- The suite app could drift into loose coupling if dashboard modules are not
  properly bounded
- Shared runtime abstractions could become dashboard-specific if registry and
  mapper responsibilities leak into the platform layer
- Caching and deduplication could become misleading if request signatures are
  underspecified or if semantic invalidation is omitted
- Performance controls could become decorative instead of useful if budgets are
  not enforced or at least reported consistently
- Architecture visualization could remain too low-level or too flat to explain
  the true system hierarchy

## 12. Open Questions Deferred Beyond the PoC

- long-term governance and ownership model
- CODEOWNERS and CI policy details
- whether and when a high-traffic dashboard should move into a separate deploy
  target
- future chatbot integration strategy
- full semantic explorer product scope

## 13. Success Question

The PoC succeeds if it answers this question credibly:

> Can the RevOps Analytics team build a modular, high-performance, shared BI
> system on top of Lightdash that supports multiple dashboards, future
> developer tooling, and future semantic exploration without rebuilding the
> stack per dashboard?
