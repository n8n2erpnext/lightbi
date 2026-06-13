# Fallback Policy Alignment Phase 1 Verification

## 1. Files Changed
- `apps/desktop/src/pages/Investigation.tsx`: Updated `handleRunPreview` to strictly enforce the intent and error-based fallback logic.
- `apps/desktop/src/pages/Investigation.test.tsx`: Added and modified tests to assert the fallback behavior under specific combinations of intent and error types.

## 2. Fallback Policy Rules Applied
- **Rule 1 (Infra Error + Simple Intent):** Fallback is only allowed when an Infrastructure error (`NETWORK_UNAVAILABLE`, `LOCAL_EXECUTOR_UNAVAILABLE`, `DUCKDB_WASM_RUNTIME_FAILED`) occurs AND the intent is `table_preview` or `distribution`.
- **Rule 2 (Semantic Error / Complex Intent):** Fallback is NEVER allowed if the error is semantic (`CANONICAL_PROJECTION_MISSING` / `CONFLICT`) OR if the intent is complex (`trend`, `group_by`, `relationship`). These conditions will fail-fast transparently.

## 3. Tests Run
- `2. distribution + NETWORK_UNAVAILABLE: allows fallback and expresses degraded messaging`
- `2.0 distribution + CANONICAL_PROJECTION_MISSING: never falls back for semantic schema errors`
- `2.1 group_by + NETWORK_UNAVAILABLE: does not fallback and honestly surfaces backend failure for complex intent`
- `2.1b trend + LOCAL_EXECUTOR_UNAVAILABLE: does not fallback for complex intent even if infra error`
- `2.3 Surfaces transparent local DuckDB WASM runtime error without fallback` (pure infra error on `group_by`)

## 4. Pass/Fail
- **Passed**: All 8 tests passed successfully, directly meeting the acceptance criteria.

## 5. Remaining Ambiguity
- **Ambiguity Locked**: There are no glaring structural ambiguities remaining regarding *when* a fallback should occur in `Investigation.tsx`. The boundaries are solidly coded.
- **Future Policy Considerations**: We might need to handle edge-cases for `DUCKDB_WASM_RUNTIME_FAILED` specifically if the failure isn't truly an infra issue but rather an SQL dialect mismatch. However, for Phase 1, treating it uniformly as an infra error (which blocks complex intents from sandbox execution) is the safest boundary.
