# Implementation Plan: Fallback Policy Alignment Phase 1

## 1. Current Codebase Reality
- **Where is the fallback decision?** The decision logic is currently hardcoded in the UI layer inside `apps/desktop/src/pages/Investigation.tsx` (specifically the `handleRunPreview` function, lines 53-68). It evaluates intent types (`isSimpleIntent`) and error strings from the result to decide whether to invoke `executeDuckDBPreviewSandbox`.
- **What `backend-preview-executor.ts` does and doesn't do:** It acts as a routing seam. It currently tries the `executeLocalDuckDB` path if no endpoint is configured. If it fails, it simply catches the error and returns a `failed` result object. It **does not** decide whether to fall back to the JS sandbox.
- **Errors from `local-duckdb-executor.ts`:** It bubbles up three main error groups:
  1. `CANONICAL_PROJECTION_MISSING` (Semantic mapping error)
  2. `CANONICAL_PROJECTION_CONFLICT` (Semantic mapping error)
  3. `DUCKDB_WASM_RUNTIME_FAILED` (Infra/Engine error)
- **JS Sandbox Capabilities:** The JS sandbox (`preview-sandbox.ts`) uses simple in-memory JS array operations. It is only safe/capable of executing basic `distribution` (category counts) and simple `table_preview` intents. Complex intents like `trend`, `group_by` (with multiple measures), or `relationship` will yield incorrect or missing results if forced into the sandbox.

## 2. Policy Matrix
Below is the strict fallback policy matrix aligning execution capabilities with the fallback strategy.

| Intent | Primary Path | Allowed Fallback? | Fallback Target | Fail-fast Conditions | User-facing Message Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `table_preview` | Local DuckDB | Yes | JS Sandbox | Semantic Schema Errors | Warning (Yellow) if fallback |
| `distribution` | Local DuckDB | Yes | JS Sandbox | Semantic Schema Errors | Warning (Yellow) if fallback |
| `trend` | Local DuckDB | No | None (Fail Fast) | Always (if DuckDB fails) | Error (Red) - No fallback |
| `group_by` | Local DuckDB | No | None (Fail Fast) | Always (if DuckDB fails) | Error (Red) - No fallback |
| `relationship` | Local DuckDB | No | None (Fail Fast) | Always (if DuckDB fails) | Error (Red) - No fallback |

## 3. Error Classification & Rules
Fallback logic must explicitly check the root cause of the error.
- **Semantic / Schema Errors**: `CANONICAL_PROJECTION_MISSING`, `CANONICAL_PROJECTION_CONFLICT`
  - **Rule**: NEVER fallback, regardless of intent type. These are semantic data mismatches. The UI must immediately fail-fast and show a red error.
- **Infrastructure / Engine Errors**: `DUCKDB_WASM_RUNTIME_FAILED`, `LOCAL_EXECUTOR_UNAVAILABLE`, `NETWORK_UNAVAILABLE`
  - **Rule**: Allowed to fallback ONLY IF the intent type is explicitly safe for the JS sandbox (`table_preview`, `distribution`). Otherwise, fail-fast.

## 4. Scope for Upcoming Code Phase
To maintain stability and enforce the architectural boundary, the next coding phase should have a strictly narrow scope:
- **`apps/desktop/src/pages/Investigation.tsx`**: Update the `needsFallback` evaluation logic to strictly adhere to the Matrix above. Ensure the error messages reflect the true status (Red fail vs. Yellow fallback warning).
- **`apps/desktop/src/lib/backend-preview-executor.ts`**: (Optional/Only if necessary) Clean up how errors are bubbled up to the UI so `Investigation.tsx` can correctly discern Semantic vs Infra errors.
- **Avoid touching**: UI components outside of `Investigation.tsx`, Business Signal Detector, Readiness module, Canonical Row Projection, or DuckDB Loader logic.
