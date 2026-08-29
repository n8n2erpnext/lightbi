# ADR-061: Virtual Dataset Plan Contract

## Status
Accepted

## Context
After a user selects a Business View and a Suggested Question, LightBI needs to transition from "understanding" to "execution." To maintain a clean architectural boundary and prevent frontend components from becoming tightly coupled with DuckDB or backend SQL engines, we need an intermediate contract.

## Decision
We introduce the `VirtualDatasetPlan` as a deterministic, non-executable planning contract.

- The `VirtualDatasetPlanner` accepts a `BusinessViewCandidate`, a `QuestionSuggestion`, a `RelationshipGraph`, and the `WorkspaceUnderstandingState`.
- It deterministically produces a `VirtualDatasetPlan` containing abstract `VirtualDatasetPlanStep` instructions (`select_dataset`, `use_relationship`, `group_by`, etc.).

## Rules and Constraints
- The Plan is **not** SQL.
- The Plan is **not** DuckDB execution code.
- The Plan is **not** a materialized dataset.
- Rejected relationships strictly block the plan (`status = "blocked"`).
- Many-to-many cardinality warns the user but does not automatically block.

## Rationale
This contract allows the UI to preview the intended analysis (datasets involved, relationship risks, planned logic steps) without risking data leakage, execution overhead, or premature materialization. It provides a clean, well-defined input object for the future Runtime Execution Engine (Milestone 6).
