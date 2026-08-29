# Milestone 5: Relationship Discovery & Dataset Collections (COMPLETED)

**See [Milestone 5 Summary](milestone-5-summary.md) for final architecture review and handoff.**
- **ADR-059**: [Relationship Graph Source of Truth](../../adr/ADR-059-relationship-graph-source-of-truth.md)
- **ADR-060**: [Business View Before Execution](../../adr/ADR-060-business-view-before-execution.md)
- **ADR-061**: [Virtual Dataset Plan Contract](../../adr/ADR-061-virtual-dataset-plan-contract.md)

## Overview
This milestone transitions LightBI from handling independent Dataset Groups to automatically discovering relationships across disparate datasets. This enables multi-file, cross-domain querying without requiring manual data modeling.

## Core Architecture Documents
- **ADR-055**: Business Key Detection Engine
- **ADR-056**: Relationship Discovery Engine
- **ADR-057**: Dataset Collection
- **ADR-058**: Virtual Dataset Layer
- **Implementation Contract**: `docs/architecture/relationship-discovery-scoring.md`

## Planned Phases

### Phase F: Scoring Engine MVP
- [x] Implement `BusinessKeyDetector` to profile columns and find `KeyCandidates`.
- [x] Implement `RelationshipDiscoveryEngine` scoring logic (Semantic, Name, Profile, Pattern, Overlap).
- [x] Group families into `DatasetCollectionCandidate` if score >= 50.
- [x] Strictly frontend-only; no duckdb joins yet.

### Phase F.5: Relationship Graph Foundation
- [x] Refactor architecture so `DatasetCollectionCandidate` is derived from a `RelationshipGraph`.
- [x] Add graph models (`RelationshipNode`, `RelationshipEdge`, `ConnectedComponent`).
- [x] Integrate `risk`, `confidence`, and machine-readable `evidence` into `RelationshipEdge`.

### Phase F.6: Business View Generator
- [x] Business Domain Detection
- [x] Business View Candidate Generation
- [x] Suggested Question Generation
- [x] Business View tests

### Phase G: Interactive UI
- [x] Show Relationship UI in the Data Intake flow.
- [x] Allow users to confirm, edit, or ignore detected relationships.
- [x] Present Business View candidates in a non-technical way.

### Phase G.5: Business Review UX Cleanup
- [x] Improve Business View copy (hide unknown chips, explain signals).
- [x] Show relationship evidence as explanation in drawer.
- [x] Keep selected Business View context after confirmation.
- [x] Route suggested questions from Business View instead of generic fields.

### Phase H: Virtual Dataset Layer integration
- [x] Persist accepted relationships into the workspace state (`WorkspaceUnderstandingState`).
- [ ] Update Recipe Planner to support generating queries across Virtual Datasets.
- [ ] Update Semantic Engine to suggest questions utilizing the expanded Dataset Collection context.

### Phase H.5: Active Business Context Cleanup
- [x] Create `getActiveAnalysisContextLabel` helper.
- [x] Prioritize Business View suggested questions.
- [x] Filter field-level questions in Auto mode when Business View is active.

### Phase I: Virtual Dataset Planner Contract
- [x] Define `VirtualDatasetPlan` and `VirtualDatasetPlanStep`.
- [x] Implement deterministic planner mapping questions to abstract steps.
- [x] Add relationship constraints (rejected = blocked, ignored = skip, many-to-many = warning).
- [x] Write planner tests.

### Phase J: Virtual Dataset Plan Preview UI
- [x] Create `VirtualDatasetPlanPreview` component.
- [x] Integrate planner generation into business-view question clicks.
- [x] Display status, warnings, and abstract logic steps without emitting SQL.
