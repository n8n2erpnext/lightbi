# AUDIT: Runtime Execution Boundary

## Context
Phase DU-7A aims to audit the execution boundary between the new Understanding-First pipeline (which currently stops at a Javascript mock in `DuckDBPreviewSandbox`) and the backend Rust execution engine.

## Existing Capabilities Found

### Frontend
- **Sandbox Boundary:** `DuckDBPreviewSandbox` acts as a facade. It accepts `RuntimePlanPreview` and `SafeSqlPreview` and currently synchronously manipulates arrays.
- **SQL Generation:** `SafeSqlPreview.sql` is successfully generated with safe quotes, limits, and grouping, but it relies on a placeholder table name `__LIGHTBI_PREVIEW_TABLE__`.

### Backend (Rust/Axum)
- **DuckDB Integration:** The `lightbi-duckdb` crate successfully compiles and wraps the official `duckdb` crate. `DuckDBBackend` can run raw SQL on an in-memory database instance.
- **Dataset Storage:** The `/api/project/import-csv` endpoint successfully writes the uploaded CSV to `project_path/files/` and stores the absolute path in the `state.current_source` session context.
- **API Server:** An Axum HTTP server is running and accessible at `http://localhost:3000`. It currently has placeholder endpoints like `/api/chart/:id` but they use hardcoded CSV paths.

## Missing Pieces
- **Execution Endpoint:** There is no generic `/api/preview/execute` endpoint that bridges the gap. The frontend currently has no network `fetch()` call for previews.
- **Placeholder Replacement:** The backend has no logic to swap `__LIGHTBI_PREVIEW_TABLE__` with the actual dataset path `read_csv_auto('...')` stored in `state.current_source`.

## Architecture Recommendation for DU-7B

**Recommendation:** Use Rust/Axum preview execution endpoint

**Why:**
1. **No New Dependencies:** DuckDB is already wired into the Rust Axum server, so we do not need to introduce `duckdb-wasm` to the frontend, which would heavily bloat the browser payload.
2. **Tauri is Not Active:** The `lightbi-tauri` workspace is just a "Hello World" stub, meaning we cannot use `#[tauri::command]` IPC yet. The communication must be HTTP `fetch`.
3. **Data Proximity:** The CSV file is already persisted on the Rust server's disk during the upload phase. It is fundamentally safer and faster for the Rust server to run `read_csv_auto()` on its local disk than to ship rows back and forth.

## Risks
- The frontend `SafeSqlPreview` currently passes `__LIGHTBI_PREVIEW_TABLE__`. We must ensure the backend safely strings-replaces this identifier with `read_csv_auto('path')` without exposing SQL injection paths. Since `SafeSqlPreview` only contains AST-verified columns, this is low risk.

## Preferred DU-7B Path
Create a `POST /api/preview/execute` endpoint in `apps/server/src/main.rs`.
Modify `executeDuckDBPreviewSandbox` in the frontend to `fetch()` this endpoint, passing the generated `SafeSqlPreview.sql`. The backend will inject the file path and return the `DuckDBPreviewResult`.
