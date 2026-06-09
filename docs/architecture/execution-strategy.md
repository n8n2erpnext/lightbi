# Execution Strategy Model

The Strategy Selector assigns one of the following execution plans to a Recipe before it is ever sent to the Runtime.

## Supported Strategies

1. **Pushdown Execution**: The compute is entirely delegated to the source database (e.g., Postgres, MySQL). The `ExecutionPlan` contains a generated SQL string for the source to run.
2. **Cache Execution**: The data is known to be small, immutable, or frequently accessed. The runtime is instructed to read from local DuckDB cache files.
3. **Incremental Execution**: The data is too large to download entirely. The plan instructs the runtime to download only new rows based on an indexed timestamp.
4. **Materialized Execution**: Used when a complex Virtual Dataset needs to be flattened into a local Parquet/DuckDB table for high-speed subsequent querying.
5. **Sampling Execution**: Used exclusively by the UI visual canvas to load the first 1000 rows instantly for immediate feedback.
