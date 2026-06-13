# DuckDB Runtime Error Classification Phase 1 Handoff

## Execution Summary
The monolithic `DUCKDB_WASM_RUNTIME_FAILED` error boundary has been completely dismantled. `local-duckdb-executor.ts` now inspects the raw DuckDB error strings and surfaces highly specific normalized codes.
- **SQL / Query Generation Errors**: `DUCKDB_PARSER_ERROR`, `DUCKDB_BINDER_ERROR`, `DUCKDB_CATALOG_ERROR`.
- **Infrastructure / Engine Errors**: `DUCKDB_BOOTSTRAP_ERROR`, `DUCKDB_WORKER_ERROR`, `DUCKDB_MEMORY_ERROR`.
- **Unknown/Uncategorized Errors**: `DUCKDB_UNKNOWN_RUNTIME_ERROR`.

The fallback policy in `Investigation.tsx` has been tightly synchronized with this new taxonomy. Fallbacks to the JS Sandbox are now **exclusively** triggered for Infrastructure/Engine errors (when paired with safe, simple intents like `table_preview` or `distribution`). If a Parser/Binder/Catalog error is detected, the UI strictly fails-fast, refusing to fallback to a sandbox that cannot fix a broken query.

## Policy Lock
- Semantic projection errors (`CANONICAL_PROJECTION_*`) remain untouched and strictly fail-fast.
- Unknown DuckDB runtime errors also strictly fail-fast as a precaution.
- Complex intents always fail-fast, regardless of the error type.

## Next Phase Consideration
The system is now capable of correctly discerning between "The engine crashed" and "The query is structurally bad". The next immediate blocker will be exploring how to actually recover from or gracefully report the SQL query generation errors, rather than just blindly failing.
