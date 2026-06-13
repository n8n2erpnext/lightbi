# Fallback Policy Alignment Phase 1 Handoff

## Summary
The fallback logic in `Investigation.tsx` has been strictly aligned with the policy matrix defined in the implementation plan. 
- It now categorizes runtime failures as explicitly infrastructure-related (`NETWORK_UNAVAILABLE`, `LOCAL_EXECUTOR_UNAVAILABLE`, `DUCKDB_WASM_RUNTIME_FAILED`) vs. semantic schema-related (`CANONICAL_PROJECTION_MISSING`, `CANONICAL_PROJECTION_CONFLICT`).
- Fallback to the in-browser `executeDuckDBPreviewSandbox` is now **exclusively** permitted when:
  1. The runtime intent is simple (`table_preview`, `distribution`).
  2. AND the error is classified as an infrastructure failure (or missing dataset warning).
- Complex intents (`trend`, `group_by`, `relationship`) and Semantic Schema errors will **always** fail-fast transparently, presenting the exact error boundary to the user without attempting to mask it via a sandbox fallback.

## Ambiguity Resolved
Previously, any query could potentially fallback to the sandbox if an unknown network error surfaced. Now, the boundaries are locked in, and `JS_Sandbox` is treated strictly as an offline grace-mode for rudimentary actions.

## State
- **Phase Status**: Completed.
- No `backend-preview-executor.ts` code was altered, preserving its role as a pure routing seam.

## Next Steps
This concludes the fallback policy alignment. The execution boundaries between the DuckDB local path, Cloud Sandbox, and Semantic Projection are now strictly governed and stable.
