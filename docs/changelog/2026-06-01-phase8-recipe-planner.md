# Development Log: Phase 8 - Recipe Planner Architecture

**Date:** 2026-06-01
**Phase:** Phase 8 Recipe Planner Architecture

## Summary
Introduced the Recipe Planner Architecture, the mandatory execution preparation layer that bridges Declarative Recipes (Phase 5) and the future Rust/DuckDB runtime.

## Architecture Decisions
- **ADR-015 (Recipe Planner):** Recipes are declarative and must be translated into an `ExecutionPlan` containing an ordered Directed Acyclic Graph (DAG) before execution. This prevents race conditions and ensures deterministic queries.
- **ADR-016 (Refresh & Revalidation Model):** Defined structured refresh strategies (`manual`, `periodic`, `live`, `sourceTriggered`) enabling LightBI to efficiently manage multi-source staleness (e.g., reacting to a modified CSV file without constantly querying it).

## Schema Decisions
- Created `packages/query-models/src/planner.ts` housing the abstractions: `ExecutionPlan`, `ExecutionNode`, `ExecutionDependency`, `RefreshStrategy`, and `MaterializationStrategy`.
- Documented clearly that `virtual`, `cached`, `materialized`, and `temporary` are supported strategies to optimize execution memory and disk storage.

## Execution Boundary
- The Planner ≠ Executor. The Planner builds the `ExecutionPlan` object and determines execution order and invalidation. The physical execution remains completely deferred to the Rust Engine.
