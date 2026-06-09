# Runtime Model Architecture

The Runtime Layer is the ultimate entry point for mechanical execution. It accepts optimized `ExecutionPlans` from the Planner and returns deterministic `ResultSets`.

## Architectural Flow

```mermaid
graph TD
    subgraph Planning
        P[Planner] -->|Generates| EP[Execution Plan]
    end

    subgraph Runtime Orchestrator
        EP -->|Passed To| RC[Runtime Coordinator]
        RC -->|Looks up Capability| BR[Backend Registry]
        BR -->|Returns| B[Execution Backend]
        
        RC -->|Delegates to| B
    end

    subgraph Backends
        B -->|Executes Local| DDB[DuckDB]
        B -->|Executes Remote| PG[Postgres]
        
        DDB -->|Yields| RS[ResultSet]
        PG -->|Yields| RS
    end
    
    RS --> RC
```

## Absolute Boundary
The `RuntimeCoordinator` is completely blind to UI rendering, Dashboards, and AI logic. It only cares about taking a sequence of deterministic steps and handing back a strongly typed table of data.
