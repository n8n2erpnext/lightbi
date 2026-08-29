# ADR-066: Expected Result Contract Before SQL

## Status
Accepted

## Context
Traditionally, BI tools generate SQL, execute it, and then try to visualize or understand whatever data shape comes back. This leads to unpredictable charts and confusing errors.
LightBI operates differently: we must predict and define the *shape* of the answer before we even write the SQL.

## Decision
We introduce the `ExpectedResultContract` layer immediately after the `DuckDBLogicalPlan`.

- The `ExpectedResultContract` infers the expected dimensions, measures, shape (`ranking`, `trend`, etc.), and output type (`chart`, `table`, etc.).
- This contract is passed down alongside the logical plan to the SQL compiler.
- **Crucially:** After execution, the physical runtime result must be validated against this contract. If the engine returns a scalar when a table was expected, the system will catch it deterministically.
- Query execution does not define correctness; the contract defines correctness.

## Rationale
This guarantees that LightBI knows what a successful answer looks like before spending computation resources. It allows for strict type-checking of dynamic SQL execution results and provides an immediate fallback if the generated query produces an unexpected shape.
