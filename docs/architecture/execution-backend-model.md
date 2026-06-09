# Execution Backend Model

To ensure LightBI never becomes permanently coupled to DuckDB, the `RuntimeCoordinator` communicates through the abstract `ExecutionBackend` contract.

## The Contract
Every execution engine must implement:
1. `validate_plan()`: Ensures the backend can legally execute the instructions.
2. `estimate_cost()`: Returns a heuristic (CPU/Network) allowing the Runtime Coordinator to reject queries that are too expensive.
3. `execute_plan()`: Runs the query and returns a standardized `ResultSet`.

## Supported Backends (Future Implementation)
- **DuckDB**: Fast, in-memory execution over downloaded chunks or virtual datasets.
- **Postgres Pushdown**: Native delegation of aggregations back to the source server.
- **SQLite Metadata**: Fast lookups for system statistics.
- **Memory Cache**: Instant retrieval of previously calculated ResultSets.
