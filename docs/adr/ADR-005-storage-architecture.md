# ADR-005 Storage Architecture

Status:
Accepted

Context:
LightBI requires a robust, local-first storage mechanism that balances the need for persisting application metadata (like projects, dashboards, and settings) with the need for high-performance analytical query execution on potentially large datasets.

Decision:
LightBI uses a dual-storage model.

SQLite:
* project metadata
* dashboard metadata
* chart metadata
* settings
* preferences

DuckDB:
* analytical execution
* local query processing
* temporary datasets
* cached datasets

Consequences:
* Fast analytics driven by DuckDB's columnar execution engine.
* Simple persistence managed reliably by SQLite for structured metadata.
* Clean separation of concerns between state/configuration and data processing.
