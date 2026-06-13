# Handoff: Local DuckDB Executor Phase 1

## Overview
Phase 1 established the **executor seam** for local DuckDB WASM execution. It guarantees that complex intents are explicitly directed toward a genuine local execution path without faking success when infrastructure is unavailable.

## Scope & Execution Truth
We explicitly **did not** claim to implement full WASM execution, as the necessary dependencies and assets (`@duckdb/duckdb-wasm`) are not yet present in the repository. Instead, we hardened the architectural boundaries.

## Files In Scope
- `apps/desktop/src/lib/local-duckdb-executor.ts`
- `apps/desktop/src/lib/backend-preview-executor.ts`
- `apps/desktop/src/pages/Investigation.tsx`
- `apps/desktop/src/pages/Investigation.test.tsx`
- `apps/desktop/src/lib/backend-preview-executor.test.ts`

*(Note: Out-of-scope files like `duckdb-preview-sandbox.ts` and `business-signal-detector.ts` were strictly untouched.)*

## Current Architecture
- **Routing**: `backend-preview-executor.ts` now orchestrates execution. If an endpoint is configured, it calls the HTTP backend. If no endpoint exists but `safeSqlPreview` and `rows` are present, it invokes `local-duckdb-executor.ts`.
- **Fail-Fast**: The local executor seam safely fails fast with a transparent `LOCAL_EXECUTOR_UNAVAILABLE` message.
- **Strict Sandbox**: `Investigation.tsx` respects the local executor failure, allowing a JS Sandbox fallback **only** for simple `distribution` intents.

## Compilation & Test Truth
- Targeted Execution Tests (9/9) **PASS**.
- Full Project `tsc` **FAILS** due to lingering legacy phase contracts and missing `@types/node`, which are strictly out of scope.
