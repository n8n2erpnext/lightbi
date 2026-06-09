# ADR-015 Recipe Planner

Status:
Accepted

Context:
Recipes in LightBI are declarative (e.g., "Join these two sources and filter"). However, executing a declarative recipe against multiple sources (like a local CSV and a remote Postgres table) requires resolving dependencies, managing caches, and ordering operations so the Rust core engine can process it efficiently.

Decision:
Recipe execution must be planned before runtime execution.
A dedicated Recipe Planner layer is introduced. 

Responsibilities of the Recipe Planner:
* Dependency resolution (identifying which sources must load first)
* Execution ordering
* Cache planning
* Materialization planning
* Refresh planning
* Source synchronization planning

Consequences:
* Deterministic execution is guaranteed because the Planner emits a strict Directed Acyclic Graph (DAG) for execution.
* Scalable architecture: Complex multi-source recipes will not crash or race.
* Robust multi-source stability.
