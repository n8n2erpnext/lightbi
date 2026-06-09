# ADR-035 Planner Architecture

Status:
Accepted

Context:
LightBI requires a strict boundary between what the user wants to calculate (Recipes) and how the calculation mechanically occurs (Runtime SQL/DuckDB). If a Recipe gets passed directly into DuckDB, we lose the opportunity to optimize queries, inject caching, or delegate work to external databases via pushdowns.

Decision:
We establish the **Planner Layer**.
- The Planner sits squarely between the Recipe and the Runtime Engine.
- **Responsibilities:** The Planner reads a Recipe, inspects the associated Datasets and Source Capabilities, and generates an `ExecutionPlan`.
- **Execution Plan Ownership:** The `ExecutionPlan` contains deterministic runtime instructions. It is owned by the Project and can be re-run indefinitely without invoking the Planner again, unless the underlying schema changes.

Consequences:
- Rule Established: `Recipe -> Planner -> Execution Plan`. Never `Recipe -> Runtime`.
- This enables complex optimizations like skipping DuckDB entirely if the source Postgres database can execute the aggregation perfectly.
