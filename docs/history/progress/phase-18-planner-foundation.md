# LightBI Phase 18 - Planner & Execution Strategy Foundation

**Date:** 2026-06-01

## New Architectural Decisions
- **ADR-035 (Planner Architecture)**: Decided that an execution plan is required before any query runs. This completely severs the UI from knowing about SQL. Planners read Recipes and generate plans.
- **ADR-036 (Execution Strategy Model)**: Codified the 5 possible routes data can take (Pushdown, Cache, Incremental, Materialized, Sampling). This sets the stage for extreme performance optimizations by skipping local execution when sources support pushdowns.

## Rust Implementation (`lightbi-planner`)
- Created `crates/lightbi-planner`.
- Modeled the `ExecutionPlan` and `ExecutionStep` representing deterministic runtime instructions.
- Authored the `StrategySelector` logic to eventually govern whether a query is pushed down or run locally.
- Authored the `PlanValidator` to protect the Runtime Engine from executing dangerous or incompatible instructions.
- Authored the `PlannerRegistry` to hold plans in memory, preventing recompilation of common queries.

## Extensibility & Persistence
- Authored `migrations/20260601070000_planner_foundation.sql` establishing the SQLite state for `execution_plans` and `execution_plan_steps`.
- Merged the `PlannerRegistry`, `StrategySelector`, and `PlanValidator` directly into `ProjectContext`.
