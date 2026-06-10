# ADR 102: Safe SQL Preview Before Execution

## Status
Accepted

## Context
In Phase DU-5B, we created the `RuntimePlanPreview` which dictates logical operations (e.g., `scan`, `group_by`, `limit`) without any SQL strings. Before running this in a real DuckDB instance (Phase DU-5D), we need an explainable, string-based artifact that developers and users can inspect to verify the engine's exact query intentions safely.

## Decision
We introduce the `SafeSqlPreview` layer (`createSafeSqlPreview(plan: RuntimePlanPreview)`).

1. **SafeSqlPreview is explainable SQL, not execution.**
2. **It acts as the last textual contract before entering the DuckDB sandbox.**
3. **It ensures all SQL syntax is built natively from logical operations**, rather than concatenating user input directly into SQL strings.
4. **Column quoting:** All dimensions and measures are safely quoted to DuckDB standards (e.g., `"Tên lái xe"`) to prevent SQL errors with spaces or special characters.

## Consequences
- **Safety**: Developers can safely log, audit, and debug the SQL strings without having a live database connected.
- **Explainability**: The Investigation Workspace can explicitly display what the "Black Box" engine is attempting to do before doing it.
- **Portability**: This preview explicitly marks its `dialect` as `"duckdb"`. If we ever switch backends, we can create a secondary generator function for that dialect while reusing the exact same `RuntimePlanPreview`.
