# ADR 108: Axum Preview Execution Endpoint Contract

## Status
Accepted

## Context
In Phase DU-7A, we audited the Runtime Execution Boundary. The analysis pipeline produces a structured `RuntimePlanPreview` indicating what analysis to run, but currently, execution stops at a Javascript mock sandbox (`DuckDBPreviewSandbox`).
We decided to use the existing Rust backend (Axum + `lightbi-duckdb`) as the true execution boundary, instead of pushing DuckDB WASM to the frontend or relying on the stub Tauri IPC.

To ensure safety, the backend must NOT execute arbitrary SQL strings sent from the frontend. Instead, it must serve as the arbiter of truth, securely mapping the frontend's logical operations into compiled SQL against the locally stored CSV dataset.

## Decision
1. Implement a generic `POST /api/preview/execute` endpoint in the Rust Axum server.
2. Define a strict JSON contract that mirrors the frontend's `RuntimePlanPreview` (`logical_operations`, `limit`).
3. Compile DuckDB SQL strictly from these `LogicalOperation` variants:
   - `scan`
   - `group_by`
   - `trend`
   - `distribution`
   - `relationship`
   - `limit`
4. Use `read_csv_auto(...)` securely by substituting the backend's known `state.current_source.file_path`.
5. Enforce safety rails: Limit queries to `max_rows` (100) and safely quote all identifiers. If a plan is blocked or contains unsupported operations, return a blocked status.

## Consequences
- **Security:** Arbitrary SQL injection is completely prevented because the backend does not accept SQL payloads.
- **Performance:** `read_csv_auto` is evaluated on the actual file on the local file system using the high-performance Rust DuckDB crate, eliminating the need to pass thousands of rows via JSON across the network.
- **Maintainability:** The SQL generation logic is heavily decoupled into a pure compilation function `compile_preview_sql` which has comprehensive test coverage for all operational cases.
