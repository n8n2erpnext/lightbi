# Milestone 6: Runtime Preview & Execution Guard

## Overview
This milestone establishes the boundary where abstract plans become executable reality. Milestone 6 implements the engines necessary to convert a `VirtualDatasetPlan` into executed queries against DuckDB, while strictly enforcing safety guardrails before full materialization.

> **Note**: This document outlines the plan. No runtime execution code has been implemented yet.

## Rules for Milestone 6
- Runtime **must** consume the `VirtualDatasetPlan` contract.
- Runtime **must not** bypass the `RelationshipGraph` source of truth.
- Runtime **must** respect rejected relationships.
- Runtime **must** warn the user on many-to-many cardinality risks.
- Runtime **must** start execution with preview/sample rows only (limit payload size).
- No charts, visualizations, or dashboards should be rendered until a validated result preview exists.

## Planned Phases

### Phase K: Runtime Preview Contract (COMPLETED)
- [x] Define `RuntimePreview` contract and operations map.
- [x] Add `RuntimePreviewCard` for user confirmation.
- [x] Ensure accepted plan is stored in UI state.

### Phase L: Execution Guard (COMPLETED)
- [x] Implement middleware to explicitly block execution if a plan has a `blocked` status.
- [x] Ensure many-to-many warnings require explicit acknowledgment or are handled gracefully in sampling limits.

### Phase M: DuckDB Logical Plan Adapter (COMPLETED)
- [x] Build the adapter that transpiles `VirtualDatasetPlanStep` operations (`select_dataset`, `use_relationship`, `group_by`) into logical operations (`scan`, `join`, `aggregate`).
- [x] Integrate tightly with `ExecutionGuard` decisions.

### Phase M.5: Runtime Boundary Contract (COMPLETED)
- [x] Define a strictly validated `RuntimeBoundaryArtifact` to serialize the entire planning and approval lifecycle.
- [x] Implement final boundary validation to ensure no raw SQL leakage and guaranteed provenance.

### Phase N: Safe Materialization Sandbox
- Implement restricted materialization logic.
- Ensure joins do not run unbounded. Apply strict `LIMIT` clauses during preview stages.

### Phase O: First Result Preview
- Execute the query and return the initial dataset to the UI.
- Show raw tabular preview before generating chart suggestions.
