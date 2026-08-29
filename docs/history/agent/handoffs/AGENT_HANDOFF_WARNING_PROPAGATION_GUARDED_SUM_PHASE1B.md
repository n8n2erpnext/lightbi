# Warning Propagation for Guarded SUM (Phase 1B) Handoff

## Summary
The "Silent Cleansing" gap has been successfully mitigated. When the `evaluateNumericHealth` gate promotes a dirty string column to `SUM` (by stripping out currency symbols or dropping a small percentage of invalid rows), it now actively propagates a warning trace up to the presentation layer. The user is now fully aware that their numbers were computed using a cleansing guard.

## Core Flow Refactoring
1. **Bridge Logic (`guarded-sum-bridge.ts`)**: 
   - Intercepts the boolean `needsCleansing` and the exact `parseSuccessRate`.
   - Injects a formatted warning string (`underwent silent cleansing (drop rate: X%...)`) into the `RuntimePlanPreview` state.
2. **Executor Pipelines (`backend-preview-executor.ts`, `local-duckdb-executor.ts`, `duckdb-preview-sandbox.ts`)**:
   - Upgraded all executor payloads to deeply copy and echo the frontend-generated plan warnings back into the `DuckDBPreviewResult`, merging them with any backend-originated warnings.
   - Refactored `duckdb-preview-sandbox.ts` fallback wording to truthfully reflect that it acts as a constrained fallback because primary paths (Local DuckDB/Cloud) are unavailable, abandoning the outdated "WASM not wired" claim.
3. **UI Transparency (`Investigation.tsx`)**:
   - Intercepts `previewResult.warnings`.
   - Dynamically mounts a prominent `Data Cleansing Active` (amber `<AlertTriangle />`) alert box directly above the table/chart boundaries whenever cleansing traces are detected.
   - The alert clearly informs users that the "Safe Numeric Guard" dropped or stripped dirty strings to prevent execution failure.

## Guardrails
- **No Chart/Table Disruption**: The warning box flows naturally into the DOM hierarchy without breaking grid layouts or chart canvases.
- **Fail-Fast Intact**: Columns that severely fail the parsing threshold (<95%) are still correctly downgraded to `COUNT` without triggering a fake `SUM` cleansing warning.
