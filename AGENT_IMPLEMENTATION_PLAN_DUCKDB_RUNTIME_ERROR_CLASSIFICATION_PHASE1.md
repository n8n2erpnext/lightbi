# Implementation Plan: DuckDB Runtime Error Classification Phase 1

## 1. Codebase Reality Analysis
- `local-duckdb-executor.ts` currently acts as a blunt instrument. In its catch block, it blindly wraps almost all errors (except for Canonical Projection errors) into a single, monolithic `DUCKDB_WASM_RUNTIME_FAILED` boundary.
- `duckdb-wasm-loader.ts` correctly captures and surfaces `DUCKDB_WASM_BOOTSTRAP_FAILED` internally. However, this nuance is immediately swallowed and prefixed by `local-duckdb-executor.ts` into a nested string.
- Because of this mixing, the current Fallback Policy in `Investigation.tsx` is effectively blind. It cannot distinguish between a perfectly healthy browser running a bad SQL query (Syntax error) vs. a crashed WASM worker (Infra error). 

## 2. Error Taxonomy Matrix

| Error family | Example message patterns | Origin layer | Safe to fallback? | Intended severity | Proposed normalized code |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `duckdb_parser_error` | `Parser Error: syntax error at or near` | DuckDB Engine | **NO** | Error (Red) - Fail Fast | `DUCKDB_WASM_PARSER_ERROR` |
| `duckdb_binder_error` | `Binder Error: Referenced column not found` | DuckDB Engine | **NO** | Error (Red) - Fail Fast | `DUCKDB_WASM_BINDER_ERROR` |
| `duckdb_catalog_error` | `Catalog Error: Function/Table does not exist` | DuckDB Engine | **NO** | Error (Red) - Fail Fast | `DUCKDB_WASM_CATALOG_ERROR` |
| `duckdb_bootstrap_error` | `DUCKDB_WASM_BOOTSTRAP_FAILED`, `Worker is not defined` | WASM Loader | **YES** | Warning (Yellow) | `DUCKDB_WASM_BOOTSTRAP_ERROR` |
| `duckdb_worker_error` | `Worker thread panic`, `connection closed` | WASM Worker | **YES** | Warning (Yellow) | `DUCKDB_WASM_WORKER_ERROR` |
| `duckdb_memory_error` | `Out of Memory Error`, `memory limit exceeded` | WASM Memory | **YES** | Warning (Yellow) | `DUCKDB_WASM_MEMORY_ERROR` |
| `duckdb_unknown_runtime_error` | Unrecognized DuckDB error string | DuckDB Core | **NO** (Phase 1) | Error (Red) - Fail Fast | `DUCKDB_WASM_UNKNOWN_ERROR` |

## 3. Fallback Policy Clarification
- **SQL / Query-Generation Bugs (`parser`, `binder`, `catalog`)**: Must strictly **fail-fast**. These signify that the `safeSqlPreview` generated an invalid or incompatible query for the data. Sending this to the JS Sandbox is entirely useless and only serves to hide the semantic flaw.
- **Infrastructure / Bootstrap Bugs (`bootstrap`, `worker`, `memory`)**: These are true environment failures. They are **safe to fallback** to the JS Sandbox, provided the intent is inherently safe (`table_preview`, `distribution`).
- **Ambiguous/Unknown**: In Phase 1, any DuckDB error that doesn't match the known Infra signatures must default to **fail-fast**. This guarantees we do not blindly trust unknown failure modes.

## 4. Proposed Code Scope for Next Phase
This phase will have an extremely narrow code footprint:
- **`apps/desktop/src/lib/local-duckdb-executor.ts`**: Refactor the catch block to parse `error.message`. Extract the underlying error signatures using basic string matching and emit the new normalized codes (e.g. `DUCKDB_WASM_PARSER_ERROR`).
- **`apps/desktop/src/pages/Investigation.tsx`**: Update the `isInfraError` boolean condition. It should only evaluate to `true` if the result's errorMessage explicitly contains `BOOTSTRAP_ERROR`, `WORKER_ERROR`, `MEMORY_ERROR`, or `LOCAL_EXECUTOR_UNAVAILABLE`.
- **`apps/desktop/src/pages/Investigation.test.tsx`**: Update/add unit tests reflecting this refined string classification.
- **Avoid**: We will strictly NOT touch the Sandbox implementation, the Detector, Canonical Projection, or other UI surfaces.
