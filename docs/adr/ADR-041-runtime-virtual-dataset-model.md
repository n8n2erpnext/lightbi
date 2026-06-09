# ADR-041 Runtime Virtual Dataset Model

Status:
Accepted

Context:
When an `ExecutionBackend` finishes processing an `ExecutionPlan`, it yields a raw `ResultSet`. If charts and dashboards consume raw `ResultSets`, we lose the ability to cache, share, or refresh that analytical slice.

Decision:
We establish the **Runtime Virtual Dataset Model**.
- ResultSets are strictly temporary execution artifacts.
- The `DatasetMaterializer` wraps a `ResultSet` into a `RuntimeDataset`.
- The `RuntimeDataset` tracks exactly which Execution Plan produced it, allowing the system to easily "refresh" the dataset by re-running the plan.

Consequences:
- Rule: `ExecutionPlan -> Runtime -> ResultSet -> Virtual Dataset Runtime -> Virtual Dataset -> Chart`.
- Dashboards and Charts consume `Virtual Datasets`. They never request a query directly.
