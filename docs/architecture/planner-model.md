# Planner Model Architecture

The Planner is the strategic brain of LightBI. It sits precisely between the abstract user intent (Recipes) and the mechanical reality of the database engine (Runtime).

## Architectural Flow

```mermaid
graph TD
    subgraph Intent Layer
        R[Recipe Payload]
    end

    subgraph Planning Engine
        R -->|Validates| V[Recipe Validator]
        V -->|Passed To| P[Planner]
        
        P -->|Inspects| SC[Source Capabilities]
        P -->|Selects| S[Strategy Selector]
        
        S -->|Yields| EP[Execution Plan]
    end

    subgraph Runtime Layer
        EP -->|Validates| PV[Plan Validator]
        PV -->|Executes| DDB[DuckDB Engine]
    end
```

## Why Planning Exists
If a user requests the total sum of sales, and the backend is a 10TB Postgres database, downloading all 10TB to DuckDB to perform a local sum is disastrous. The Planner intercepts this, checks if the Postgres connector `supports_sql_execution`, and emits a Pushdown Execution Plan instead, shifting the compute to Postgres and returning only 1 row to DuckDB.
