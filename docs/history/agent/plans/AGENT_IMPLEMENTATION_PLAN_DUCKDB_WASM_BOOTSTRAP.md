# Implementation Plan: DuckDB WASM Feasibility Bootstrap

## Overview
Before replacing the executor seam with a live database engine, we must prove that the project's build system (Vite) and dependency tree can successfully load, bundle, and instantiate WebAssembly workers. This phase is purely infrastructural.

## 1. Concrete Architecture Details
- **Required Package**: `@duckdb/duckdb-wasm` (installed within the `apps/desktop` workspace).
- **Vite Configuration (`vite.config.ts`)**: 
  - Must add `optimizeDeps: { exclude: ['@duckdb/duckdb-wasm'] }` to prevent Vite from pre-bundling the WebAssembly module improperly.
- **Bootstrap File Location**: `apps/desktop/src/lib/duckdb-wasm-loader.ts`.
- **Asset Loading Strategy**: 
  - Utilize Vite's `?url` import suffix to statically resolve the worker and WASM assets directly from `node_modules` during the build process, avoiding brittle public folder copying.
  - Example: `import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';`
- **Bootstrap Failure Contract**: 
  - If the worker fails to instantiate or the WASM binary fails to load, the loader will explicitly throw or return a standardized error: `"WASM_BOOTSTRAP_FAILED: Unable to load DuckDB WebAssembly engine or worker assets."`
- **Out of Scope**: No changes to `DatasetUnderstanding`, `business-signal-detector`, or `trust mapping`. The main `Investigation.tsx` flow remains totally untouched.

## 2. 3-Step Implementation Approach

### Step 1: Infrastructure & Loader Proof
- Run `npm install @duckdb/duckdb-wasm` in `apps/desktop`.
- Update `apps/desktop/vite.config.ts`.
- Create `apps/desktop/src/lib/duckdb-wasm-loader.ts` containing the core asset resolution and `ConsoleLogger` setup.

### Step 2: Smoke Testing
- Create a dedicated unit/smoke test: `apps/desktop/src/lib/duckdb-wasm-loader.test.ts`.
- The test must attempt to initialize the engine, run a trivial query (`SELECT 1 AS ready`), and assert success.
- If it fails, we diagnose Vite asset resolution here without breaking the app.

### Step 3: Seam Connection (Conditional)
- *Only* if Step 2 passes, we inject the loader into the existing `apps/desktop/src/lib/local-duckdb-executor.ts`.
- We will wire the executor to await the loader initialization before falling back to the `LOCAL_EXECUTOR_UNAVAILABLE` mock. We will *not* change `Investigation.tsx` or the live app's UI state.

## 3. Acceptance Criteria
1. `@duckdb/duckdb-wasm` can be imported and bundled without throwing Vite/ESBuild errors.
2. The engine and worker successfully initialize in an isolated test or smoke path.
3. Transparent, developer-facing errors are thrown if the WASM assets 404 or fail to parse.
4. The main execution path (`Investigation.tsx`) is absolutely not disrupted or modified during this infrastructural bootstrap.
