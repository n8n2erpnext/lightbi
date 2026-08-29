# ADR-065: Runtime Boundary Contract

## Status
Accepted

## Context
As we reach the edge of the frontend planning capabilities, we must cleanly hand off the analysis intent to the backend execution layer (DuckDB). Directly sending raw strings, arbitrary IDs, or isolated logical plans is dangerous. We need a single, serialized, validated payload that proves the entire planning and approval lifecycle was followed.

## Decision
We introduce the `RuntimeBoundaryArtifact` as the sole mechanism for handoff to the future execution engine.

- The runtime engine **must never** accept a raw question string or an isolated logical plan.
- The `RuntimeBoundaryArtifact` serves as a sealed ledger containing:
  - Source IDs (`questionId`, `businessViewId`, `virtualPlanId`, etc.) to guarantee provenance.
  - The deterministic `DuckDBLogicalPlan`.
  - The approvals array proving that the user accepted the `RuntimePreview` and the `ExecutionGuard` granted permission (`canExecute: true`).

## Validation
Before handoff, `validateRuntimeBoundaryArtifact` runs a final check to ensure:
- The version matches (`runtime-boundary/v1`).
- The status logic is coherent (`handoff_ready` only if `canExecute` is true).
- No raw SQL logic is leaked inside the logical plan.
- Basic logical safety (multi-dataset analysis must have relationships).

## Rationale
This creates an unbreachable wall between Frontend Intent and Backend Execution. The backend will only need to parse this verified artifact and compile the logical operations into SQL. It preserves auditability—every executed query can trace back to the user's explicit question and the guard's explicit decision.
