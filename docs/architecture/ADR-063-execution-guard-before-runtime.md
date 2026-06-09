# ADR-063: Execution Guard Before Runtime

## Status
Accepted

## Context
We have established a rigorous planning phase using `VirtualDatasetPlan` and a review phase using `RuntimePreview`. Before we build the DuckDB engine adapter, we need a robust programmatic safety mechanism. A purely UI-driven review process is not enough; the core system needs an explicit "execution guard" that evaluates the plan, the user's workspace decisions, and the accepted preview.

## Decision
We introduce `ExecutionGuard` which sits strictly between the UI Acceptance flow and the Runtime Engine. 

The `ExecutionGuard` consumes:
- `RuntimePreview`
- `VirtualDatasetPlan`
- `WorkspaceUnderstandingState`

It evaluates conditions in priority order:
1. **BLOCK**: Missing previews, unaccepted previews, explicitly blocked plans (due to rejected relationships), or multi-dataset plans missing relationships.
2. **WARN**: Many-to-many relationship risks, or plans utilizing low-confidence relationships.
3. **ALLOW**: Clean plans with no outstanding warnings or blocks.

## Rules
- The Runtime engine **must never** be called directly from the UI.
- The Runtime engine may **only** receive input after `ExecutionGuard` returns `canExecute: true`.
- The `ExecutionGuard` itself **does not execute** any code. It only outputs a deterministic decision (`allow`, `warn`, `block`) and reasons.

## Rationale
This centralizes our safety logic. Instead of duplicating checks in the UI or burying them inside DuckDB queries, the `ExecutionGuard` clearly documents why an execution is permitted or denied. It natively integrates the user's `WorkspaceUnderstandingState` (like rejected relationships) so the execution layer doesn't need to know about the user's UI preferences.
