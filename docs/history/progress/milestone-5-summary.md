# Milestone 5 Summary: Relationship Discovery & Planning

## What Was Built
Milestone 5 successfully established the deterministic, frontend-only relationship discovery and analysis planning architecture for LightBI. It bridges the gap between disparate raw files and cohesive business-level understanding without prematurely executing database joins.

## Final Architecture Flow
1. **Raw Files**: User drops independent files (e.g., CSV, JSON).
2. **Dataset Family Detection**: Files are grouped into logical families.
3. **Business Key Detection**: Columns are profiled to find `KeyCandidates`.
4. **Relationship Scoring**: Multi-signal algorithm (Semantic, Name, Profile, Pattern, Overlap) scores potential joins.
5. **RelationshipGraph**: The absolute source of truth storing `RelationshipNode` and `RelationshipEdge` with calculated confidence and risk.
6. **Connected Components**: Graph analysis identifies isolated subgraphs.
7. **BusinessViewCandidate**: Derived views from connected components (e.g., "Product Performance", "Logistics Journey") including suggested questions.
8. **WorkspaceUnderstandingState**: Manages the user's active context (Dataset vs Business View) and user review choices (confirmed/ignored/rejected).
9. **VirtualDatasetPlan**: A deterministic planning artifact mapping a question and business view to abstract logic steps (`select_dataset`, `use_relationship`, `group_by`, etc.).
10. **Plan Preview UI**: A modal exposing the Virtual Dataset Plan to the user before any data materialization happens.

## State Management Constraints
- **Source of truth**: `RelationshipGraph`.
- **Derived views**: `DatasetCollectionCandidate`, `BusinessViewCandidate`, `VirtualDatasetPlan`.
- User confirmation updates graph/view states, **not** the raw dataset metadata.

## Explicit Non-Goals
During Milestone 5, the following were strictly avoided:
- No SQL query generation or execution.
- No DuckDB pipelines or table creation.
- No backend API interactions.
- No generative AI calls.
- No physical data materialization or joining.
- No chart rendering.

## Known Limitations
1. **In-Memory State**: Currently, `WorkspaceUnderstandingState` lives in React component state. It is lost on page reload. No persisted workspace file exists yet.
2. **Contract-Only Planner**: The `VirtualDatasetPlanner` outputs abstract `VirtualDatasetPlan` objects. It lacks an execution backend.
3. **Legacy Lints**: The `apps/desktop` module contains ~64 ESLint errors related to `@typescript-eslint/no-explicit-any`. These are isolated to legacy components (source inspector, router) that predate Milestone 5. No new lint errors were introduced by Milestone 5 architecture.

## Handoff to Milestone 6
Milestone 6 will focus on **Runtime Planning & Execution Guard**.
- The `VirtualDatasetPlan` acts as the explicit contract handed over.
- Milestone 6 must implement execution constraints (e.g., DuckDB materialization *only* happens after planner validation).
- Execution should respect all limits, rejected relationships, and warnings collected during Milestone 5.
