# ADR-069: Preview Result Contract Before Runtime

## Status
Accepted

## Context
When a user approves a sandbox policy to execute a query, we need to know exactly what the expected physical shape of the data will look like *before* handing it over to the runtime engine. This serves as the target skeleton. If the physical runtime returns data that does not fit into this skeleton, it proves the query generation or execution failed, rather than crashing the visualization logic.

## Decision
Introduce the `PreviewResultContract` generation step.
- This layer transforms the logical `ExpectedResultContract` and `CompiledQueryContract` into a physical column definition structure.
- It specifies exact `columns` (with `id`, `label`, `role` (dimension vs measure)).
- At this stage, `rows` is explicitly an empty array (`[]`).
- It retains any warnings from the Sandbox.
- Before it is considered "ready", it is validated against the `ExpectedResultContract` to guarantee no expected dimensions/measures were mysteriously dropped during query compilation planning.

## Rules
- The contract generation must **NOT** execute anything.
- It must explicitly warn the user that this is just a structural preview and no data has been populated.
- When the runtime executes in the future, it must populate the `rows` array of this exact contract.

## Rationale
This completes the Frontend Planning Boundary. The system now knows the Question, the Plan, the Compiled Query, the Sandbox limits, and the exact physical Column structure it expects to receive back. The entire pipeline is verified before a single DuckDB query runs.
