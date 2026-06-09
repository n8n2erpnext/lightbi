# Virtual Dataset Planner Architecture

## Overview
The **Virtual Dataset Planner** acts as the bridge between the interactive Business View UI (where users approve/reject high-level business definitions) and the future Virtual Dataset Execution Engine (which will execute SQL or DuckDB queries).

## Core Principles
1. **Frontend-Only Mapping**: The planner purely maps intents into abstract logic steps (`select_dataset`, `use_relationship`, `group_by`, etc.).
2. **No Execution**: It does not emit executable SQL, build DuckDB pipelines, or instantiate materializations.
3. **Relationship Constraints**:
   - `rejected`: Immediately flags the plan as `blocked`.
   - `ignored`: Silently excludes the relationship.
   - `many_to_many`: Keeps the plan `ready` but attaches a user-facing warning about potential row duplication.
4. **Deterministic Behavior**: A given `BusinessViewCandidate` + `QuestionSuggestion` + `WorkspaceUnderstandingState` will always produce the identical `VirtualDatasetPlan`.

## Pipeline Flow
1. **Input**: User selects a suggested question within a Business View.
2. **Validation**: The planner validates if required domains exist, and checks the status of supporting relationships.
3. **Step Generation**: It dynamically generates a list of `VirtualDatasetPlanStep` objects based on the `intent` of the question.
   - `rank` -> group_by, sort, limit
   - `diagnose` -> group_by, validate
4. **Output**: A finalized `VirtualDatasetPlan` that the UI can render as "Analysis Steps" and which a future engine can compile to SQL.

## Phase Limitations
In Phase I, the planner is exclusively a contract validation tool. Functions like `canExecuteVirtualDatasetPlan` are provided to gate the UI, but the execution layer remains unimplemented.
