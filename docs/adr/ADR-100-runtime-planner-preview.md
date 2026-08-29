# ADR 100: Runtime Planner Preview

## Status
Accepted

## Context
In Phase DU-5A, we created the `RuntimeIntent` contract to validate user actions safely. The next step before executing queries in DuckDB is to establish a logical plan of operations. Directly generating SQL at this stage skips an important abstraction layer, making it difficult to debug, audit, and preview the system's intentions to the user.

## Decision
We introduce the **Runtime Planner Preview** (`RuntimePlanPreview`).

1. **`RuntimePlanPreview` is the last explainable planning step before actual runtime execution.** It serves as the blueprint for what the DuckDB runtime will execute.
2. **It exists to show the user and developer what LightBI intends to do.** It breaks down the execution into logical operations (e.g., `scan`, `group_by`, `limit`).
3. **It is NOT SQL.** It remains declarative and engine-agnostic.
4. **It is NOT a chart.** It knows the *expected shape* but not the UI configuration.
5. **It is NOT execution.** No actual data rows are fetched or queried when generating this preview.

## Consequences
- **Transparency**: Users can see the exact logical steps the engine plans to take (e.g., "scan: route, shipment", "group_by: route / shipment").
- **Safety**: Developers can audit the `RuntimePlanPreview` and unit test it without requiring a live database connection or mocking DuckDB.
- **Flexibility**: We can easily swap out or upgrade the underlying SQL generation engine in the next phase, because the logical plan acts as a stable intermediary.
