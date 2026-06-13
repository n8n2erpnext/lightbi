# DU-8: Multi-Dataset Execution & Architecture Scaling (Revised Scope)

## Goal
Transition the backend execution engine from a global state bottleneck to a dataset-scoped architecture, enabling robust, concurrent multi-dataset execution without cross-contamination.

## Locked Architecture Decisions
1. **Dataset-Scoped Execution**: The execution target is strictly dataset-scoped, not generically session-scoped.
2. **Execute Payload Update**: `/api/preview/execute` must require `dataset_id` and resolve the file strictly from a dataset registry, entirely ignoring the global `current_source`.
3. **Legacy Fallback Preservation**: The global `current_source` mechanism may remain temporarily for backwards-compatible "current session source" UI hydration, but preview execution must absolutely not depend on it.
4. **Column Mapping Scope**: Do NOT add canonical-to-physical mapping into the backend payload. It remains out of scope unless runtime evidence later proves backend ownership is strictly necessary.
5. **Disk-Backed Registry**: The backend dataset registry must be disk-backed by `dataset_id`, not memory-only, preserving the server restart resilience proven in DU-7J.

## Acceptance Criteria
- Upload Dataset A and Dataset B in the exact same backend server run.
- Execute a preview for Dataset A, then Dataset B, then Dataset A again.
- Each resulting chart must clearly display the `backend_duckdb_preview` source badge.
- There must be absolutely zero cross-dataset contamination in the returned rows or columns.
- Existing DU-7J Playwright assertions (ensuring `backend_duckdb_preview` visibility) must remain green.

## Non-Goals
- No refactoring of semantic business mapping ownership (frontend continues to resolve physical columns).
- No implementation of multi-tenant auth models (focus remains on state isolation by `dataset_id`).
- No expansion to non-CSV connectors (e.g., Postgres, Snowflake).
