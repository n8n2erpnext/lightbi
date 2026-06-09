# ADR-039 Runtime Architecture

Status:
Accepted

Context:
If LightBI's execution planner talks directly to DuckDB, the application becomes tightly coupled to a single backend technology. This violates the goal of separating intent from mechanical reality. We need an orchestrator that manages executions independent of the backend.

Decision:
We establish the **Runtime Coordinator**.
- The `RuntimeCoordinator` is the absolute final entry point for execution in the system.
- It receives an `ExecutionPlan`, looks up the requested capability in the `BackendRegistry`, and delegates the workload to an `ExecutionBackend`.
- **Result Ownership**: The runtime orchestrator receives a standardized `ResultSet` back from the engine. It does not receive UI-specific chart formats. 

Consequences:
- Rule: `ExecutionPlan -> RuntimeCoordinator -> ExecutionBackend`.
- We can seamlessly add a Postgres-native backend or an Apache Spark backend without altering the planner or UI.
