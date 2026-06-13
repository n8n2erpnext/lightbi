# Agent Handoff: Execution Path Unification Phase 1

## Scope Implemented
- Prevented `Investigation.tsx` and `backend-preview-executor.ts` from making blind network fetches to a phantom `/api/preview/execute` endpoint when no backend is configured.
- Established the local truth path: explicitly fail-fast (`NETWORK_UNAVAILABLE: No backend configured`) instead of attempting fake HTTP calls.
- Deprecated and isolated the disconnected mock runtime `duckdb-preview-runtime.ts`.

## Files Changed
- `apps/desktop/src/lib/backend-preview-executor.ts`
- `apps/desktop/src/lib/backend-preview-executor.test.ts`
- `apps/desktop/src/lib/duckdb-preview-runtime.ts`

## Tests Run
- `src/lib/backend-preview-executor.test.ts` (4 tests) - ✅ PASS
- `src/pages/Investigation.test.tsx` (4 tests) - ✅ PASS

## Usage Verification Result
- `duckdb-preview-runtime.ts`: Confirmed imported by `Home.tsx` and `DuckDBPreviewRuntimeCard.tsx`. Could not be safely deleted without expanding scope into the Home UI layer.
- `executeBackendPreview`: Confirmed used exclusively by `Investigation.tsx`.
- `/api/preview/execute`: Confirmed only hardcoded inside `backend-preview-executor.ts` and its test.

## What Was Proven
- Local execution orchestration now explicitly checks for backend configuration.
- Complex intents correctly fail-fast with a transparent error on the UI.
- Simple intents gracefully fallback to the JS sandbox based on the established strict boundaries, without incurring unnecessary network timeout delays.

## What Was Intentionally Not Implemented
- Did not delete `duckdb-preview-runtime.ts` completely due to Home layer dependencies.
- Did not integrate a real DuckDB WASM local executor.
- Did not touch Home understanding layer or Trust Mapping logic.
- Did not redesign the Investigation UI.

## Remaining Limits
- The system still lacks a true DuckDB WASM executor for complex local queries.
- `duckdb-preview-runtime.ts` remains in the codebase as a deprecated file, tied to legacy Home layer UI components.

## Compile / Test Truth
- 8/8 targeted scope tests pass.
- No new TypeScript errors introduced in scope files. Full repository `tsc` still fails due to pre-existing out-of-scope issues.
