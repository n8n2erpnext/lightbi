# ADR-040 Execution Backend Contract

Status:
Accepted

Context:
Different execution backends (DuckDB, Postgres Pushdown, Memory Cache) execute plans differently but must respond uniformly. We need a strict Rust contract so the `RuntimeCoordinator` doesn't have to write custom logic for every new engine.

Decision:
We establish the `ExecutionBackend` trait contract.
- Every execution backend must implement:
  - `validate_plan()`: Confirms the backend can actually run the given plan.
  - `estimate_cost()`: Returns heuristic cost for execution (useful for future query governors).
  - `execute_plan()`: Runs the plan and returns a formal `ResultSet`.
- A `BackendRegistry` stores all available backends instantiated for the `ProjectContext`.

Consequences:
- The Runtime Coordinator simply loops through backends, selects the optimal one (or the one prescribed by the Planner), and executes the trait method. All backend-specific oddities are encapsulated in their respective crates.
