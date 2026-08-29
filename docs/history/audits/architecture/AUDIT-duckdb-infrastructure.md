# AUDIT: DuckDB Infrastructure

## 1. Is DuckDB currently wired anywhere?
Yes. The `lightbi-duckdb` crate exists (`crates/lightbi-duckdb/src/backend.rs`) and implements the `ExecutionBackend` trait using the official `duckdb` Rust crate. It opens an in-memory connection via `Connection::open_in_memory()` and executes raw SQL from a given `ExecutionPlan`.

In `apps/server/src/main.rs`, this `DuckDBBackend` is instantiated for three endpoints (`/api/chart/:id`, `/api/export/:id/download`, and `/api/question/ask`). However, these endpoints completely mock the query logic by hardcoding `SELECT * FROM read_csv_auto('sales.csv') LIMIT 100` instead of using dynamic inputs.

## 2. Is runtime execution Rust-side or frontend-side?
Currently, the **preview execution** for the Understanding-First pipeline is **frontend-side**. It runs a purely synchronous Javascript mock inside `apps/desktop/src/lib/duckdb-preview-sandbox.ts` (`DuckDBPreviewSandbox`).

However, the target architecture for the full engine is **Rust-side**. The `lightbi-duckdb` crate and Axum backend are positioned to take over execution.

## 3. Is there an existing API endpoint that can run SQL?
**No generic execution endpoint exists.** There is no `/api/preview/execute` endpoint that accepts SQL queries or our new `SafeSqlPreview` JSON. The existing endpoints manually assemble a hardcoded `ExecutionPlan` just to trigger the `DuckDBBackend`.

## 4. Is there an existing safe execution boundary?
Yes, but it is currently mismatched with the new pipeline. The Rust backend expects an `ExecutionPlan` (from the old BVQ/planner architecture), whereas the new frontend pipeline produces `RuntimePlanPreview` and `SafeSqlPreview`. The frontend pipeline ensures safety via `SafeSqlPreview` (strict parsing, limited AST translation), but the backend has no validation endpoint to accept it safely yet.

## 5. Is there a way to register previewRows as a DuckDB table?
If we use DuckDB WASM on the frontend, we could register the `previewRows` (JSON array) as an in-memory DuckDB table.
However, because we have a Rust backend, **we don't need to pass rows**. The `import_csv` endpoint saves the dataset to the disk (`state.context.project_path.join("files")`) and stores the absolute path in `state.current_source`. The Rust DuckDB backend can execute directly against the real file using `read_csv_auto('absolute_file_path')`. 

## 6. Is there an existing project/session/dataset store?
Yes. The Axum backend uses `Arc<AppState>` which contains `state.current_source`. When a file is uploaded via `/api/project/import-csv`, the metadata (including `file_path`, `columns`, etc.) is stored in `CurrentSourceSession` and saved to disk at `project_path/session/current_source.json`.

---

## 7. What is the safest first real execution path?

**Options Evaluated:**
- **A. Frontend DuckDB WASM:** Not installed (`package.json` does not contain it). Large dependency to add.
- **B. Rust DuckDB via Tauri command:** Impossible. The Tauri app (`crates/lightbi-tauri`) is an empty "Hello World" stub.
- **C. Rust DuckDB via Axum server endpoint:** **RECOMMENDED.** The Axum server already handles file uploads, stores the file path, and has `DuckDBBackend` wired up. We just need to connect the frontend `SafeSqlPreview` to it.
- **D. Keep JS sandbox until storage/runtime ready:** Not recommended. The storage/runtime is already sufficiently ready (CSV is on disk) to support a basic execution boundary.

## 8. What files would need to change for DU-7B?
- **`apps/server/src/main.rs`**: Add a new `POST /api/preview/execute` endpoint that takes the `SafeSqlPreview` payload, looks up `state.current_source.file_path`, replaces `__LIGHTBI_PREVIEW_TABLE__` with `read_csv_auto('path')`, and returns the results.
- **`apps/desktop/src/lib/duckdb-preview-sandbox.ts`**: Replace the Javascript mock with a standard `fetch` call to the new Axum endpoint.
- **`apps/server/Cargo.toml`** (possibly): to add any missing serialization traits.
