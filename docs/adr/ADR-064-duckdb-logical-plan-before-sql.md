# ADR-064: DuckDB Logical Plan Before SQL Execution

## Status
Accepted

## Context
After successfully passing the `ExecutionGuard`, the system has a validated `VirtualDatasetPlan`. However, translating this abstract plan directly into raw SQL strings is brittle, difficult to test, and prone to injection or logical syntax errors. We need a deterministic intermediate layer to map abstract steps (like `select_dataset`, `use_relationship`) into execution engine operations (like `scan`, `join`).

## Decision
We introduce the `DuckDBLogicalPlan` as the final abstract layer before SQL compilation.

- `VirtualDatasetPlan` translates into `DuckDBLogicalPlan` operations.
- The `DuckDBLogicalPlan` captures the exact ordered graph of operations (`scan`, `join`, `aggregate`, `filter`, `sort`, `limit`, `derive`).
- The `DuckDBLogicalPlan` maintains dependency arrays (`dependsOn`) ensuring the future SQL compiler knows the exact pipeline structure.
- The `DuckDBLogicalPlan` inherits status and warnings from the `ExecutionGuard` decision.

## Rules
- `DuckDBLogicalPlan` is **not** SQL.
- `DuckDBLogicalPlan` is **not** executable on its own.
- It must only be constructed *after* the `ExecutionGuard` has allowed or warned the plan.
- The future SQL compiling layer must strictly consume the `DuckDBLogicalPlan` and never attempt to compile directly from the user's raw question or the `VirtualDatasetPlan` directly.

## Rationale
By establishing a strict separation between logical operations and physical SQL syntax, we make the system extremely testable. We can verify that an abstract `join` logically depends on a `scan` without needing to parse SQL ASTs or worry about DuckDB syntax idiosyncrasies until the very last stage. It also provides a structured input for the upcoming safe materialization sandbox.
