# DuckDB Runtime Error Classification Phase 1 Verification

## 1. Files Changed
- `apps/desktop/src/lib/local-duckdb-executor.ts`: Updated catch block to parse error strings and emit normalized `DUCKDB_*` codes.
- `apps/desktop/src/pages/Investigation.tsx`: Updated `isInfraError` to specifically target `DUCKDB_BOOTSTRAP_ERROR`, `DUCKDB_WORKER_ERROR`, and `DUCKDB_MEMORY_ERROR` for fallback eligibility.
- `apps/desktop/src/lib/local-duckdb-executor.test.ts`: Added unit tests for every newly normalized DuckDB error code.
- `apps/desktop/src/pages/Investigation.test.tsx`: Updated fallback tests to use the new normalized infrastructure and logic error codes.

## 2. Normalized Error Codes
- `DUCKDB_PARSER_ERROR`
- `DUCKDB_BINDER_ERROR`
- `DUCKDB_CATALOG_ERROR`
- `DUCKDB_BOOTSTRAP_ERROR`
- `DUCKDB_WORKER_ERROR`
- `DUCKDB_MEMORY_ERROR`
- `DUCKDB_UNKNOWN_RUNTIME_ERROR`

## 3. Tests Run
The entire test suite for the Investigation page and the local executor was run, specifically targeting the required conditions:
- `normalizes parser error`, `binder error`, `catalog error`, `bootstrap error`, `worker error`, `memory error`, `unknown runtime error`
- `distribution + DUCKDB_BOOTSTRAP_ERROR` (asserts fallback)
- `distribution + DUCKDB_PARSER_ERROR` (asserts fail-fast for logic error)
- `table_preview + DUCKDB_MEMORY_ERROR` (asserts fallback for memory error)
- `group_by + DUCKDB_BOOTSTRAP_ERROR` (asserts fail-fast for complex intent)
- `unknown runtime error` (asserts fail-fast for unknown errors)

## 4. Pass/Fail
- **Passed**: All 19 tests across both suites executed successfully and cleanly verified the execution boundary logic. No logic flaws found.

## 5. Ambiguous/Unknown Families
- Any DuckDB core error that doesn't string-match `Parser Error`, `Binder Error`, `Catalog Error`, `Out of Memory`, `Worker`, `panic`, or `DUCKDB_WASM_BOOTSTRAP_FAILED` is currently dumped into `DUCKDB_UNKNOWN_RUNTIME_ERROR` and strictly fails-fast. This ensures safety but leaves a small blind spot for rare operational errors that might actually be safe to fallback for.
