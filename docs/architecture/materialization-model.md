# Materialization Strategy Model

Materialization governs how a `RuntimeDataset` handles its underlying data over time. LightBI strongly biases toward local-first speed, but respects massive external data boundaries.

## Caching vs Materializing

1. **Virtual (Default)**: The `RuntimeDataset` points to a Recipe. The data is not stored. When a user requests it, the `RuntimeCoordinator` must re-execute the plan.
2. **Memory Cached**: The `DatasetMaterializer` holds the `ResultSet` in RAM. Extremely fast, but disappears on application restart.
3. **Local Disk Materialized**: The `ResultSet` is flushed to an optimized Parquet file or a local DuckDB table file (`cache/`). It survives restarts and can be queried instantly.
4. **Incremental**: A local disk materialization that is explicitly aware of a timestamp/cursor. It only queries the source for rows appended since the `last_refreshed_at` time.

## Dashboard Implications
When a dashboard opens, it checks the `RuntimeDatasetRegistry`. If a dataset is cached or materialized, the dashboard loads in milliseconds without touching the source Database.
