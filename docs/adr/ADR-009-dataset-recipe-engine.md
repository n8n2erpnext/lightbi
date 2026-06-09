# ADR-009 Dataset Recipe Engine

Status:
Accepted

Context:
As outlined in ADR-006 (Visual Data Canvas), ADR-007 (Multi-Source), and ADR-008 (Optional AI), we need a universal abstraction that captures dataset transformations so that they can be understood and executed safely by the engine regardless of how they were generated.

Decision:
Dataset Recipes become the canonical representation of transformations. All dataset transformations must be represented as recipes.

* **Visual Canvas**: Generates recipes.
* **AI Assistant**: Generates recipes.
* **Future SQL Import**: Generates recipes.
* **Rust Core**: Executes recipes.

Additionally, to accommodate both UI and execution contexts, recipes must separate `nodeType` (e.g., source, transform, output) for UI canvas rendering from `operationType` (e.g., filter, aggregate, join) which dictates deterministic execution in Rust.

**Execution Boundary Rule**: `packages/query-models` contains schemas only. There is absolutely no execution logic, no DuckDB integration, no connector calls, no AI calls, and no validation engine within this package.

Consequences:
* Deterministic execution, as the recipe provides a strict set of operations.
* Explainable transformations (users can always view the recipe steps).
* Reproducible datasets (recipes can be re-run at any time).
* AI Independence: AI acts purely as a recipe generator, completely decoupled from the execution engine.
