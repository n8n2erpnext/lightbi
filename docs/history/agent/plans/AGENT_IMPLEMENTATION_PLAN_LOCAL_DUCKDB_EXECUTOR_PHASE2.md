# Implementation Plan: Local DuckDB Executor Phase 2

## 1. Codebase Verification Reality
- **Package Installation**: `apps/desktop` is the workspace that requires `@duckdb/duckdb-wasm` and optionally `@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js`.
- **Existing Asset/Worker Pattern**: The repo currently has **no** existing web worker or WASM bundling pattern. `vite.config.ts` is purely a standard React setup with no `optimizeDeps.exclude` for WASM. This means we are starting from scratch regarding WASM bundling.
- **Local Executor Location**: `apps/desktop/src/lib/local-duckdb-executor.ts` (already established as a seam in Phase 1) will house the execution logic. We will also need a new `apps/desktop/src/lib/duckdb-wasm-loader.ts` to manage the singleton worker lifecycle.
- **Executor Routing Path**: `Investigation.tsx` -> `backend-preview-executor.ts` -> `local-duckdb-executor.ts`. This path was successfully hardwired in Phase 1.
- **`Investigation.tsx` Updates**: Should require **no structural changes** to fallback logic, as it already expects a `DuckDBPreviewResult` and seamlessly handles `LOCAL_EXECUTOR_UNAVAILABLE`. However, we may need to add a generic "Initializing Engine..." UI state if WASM loading takes substantial time.

## 2. Two-Pronged Implementation Strategy

### Branch A: Feasibility OK (WASM & Bundling Succeed)
If `npm install @duckdb/duckdb-wasm` and the Vite worker configuration succeed without breaking the build:
1. Implement `duckdb-wasm-loader.ts` to instantiate the WebAssembly module and worker.
2. In `local-duckdb-executor.ts`, mount the `rows` input as a JSON table (e.g., `duckdb.insertJSONFromPath()`).
3. Execute `safeSqlPreview.sql`.
4. Parse the Apache Arrow result into an array of objects.
5. Return a successful `DuckDBPreviewResult` with `source: 'local_duckdb_preview'`, effectively bypassing the `LOCAL_EXECUTOR_UNAVAILABLE` error.

### Branch B: Feasibility Blocked (Bundling/Asset Issues)
If `@duckdb/duckdb-wasm` fails to resolve under the current Vite setup or introduces unfixable bundling errors:
1. Implement the `duckdb-wasm-loader.ts` strictly as an extended seam that explicitly checks for asset availability.
2. `local-duckdb-executor.ts` gracefully degrades: `LOCAL_EXECUTOR_UNAVAILABLE: WASM engine failed to initialize due to missing assets/bundling limitations.`
3. We do not block the app or throw unhandled exceptions.

## 3. Targeted Testing Strategy
Phase 2 must introduce the following tests:
1. **Bootstrap/Init Path Unit Test**: A test verifying `duckdb-wasm-loader.ts` accurately reports initialization success or failure.
2. **Executor Test for `trend`**: Ensure `local-duckdb-executor.ts` can execute a time-series aggregation SQL query against an injected row-set.
3. **Executor Test for `group_by`**: Ensure multi-dimensional grouping SQL succeeds and correctly maps into the expected columnar layout.
4. **End-to-End Truth Test**: A test proving that when the infrastructure is ready, `executeLocalDuckDB` returns a `status: 'executed'` and valid rows, meaning it **no longer returns** `LOCAL_EXECUTOR_UNAVAILABLE`.

## 4. Why This Approach?
Because `@duckdb/duckdb-wasm` often requires explicit bundler configuration (especially in Vite) to handle the `.wasm` and `.worker.js` files, we must be prepared for the infrastructure to push back. The two-branched strategy guarantees that even if WASM bundling fails, the application architecture remains rock solid.
