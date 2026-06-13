# Fallback Policy Alignment Phase 1 - Checkpoint

## State of Execution
- **Strict Policy Enforcement**: The fallback decision in `Investigation.tsx` is now heavily guarded by explicit policies rather than blanket error catching.
- **Allowed Fallbacks**: Only rudimentary intents (`table_preview`, `distribution`) are permitted to fallback to the JS Sandbox, and only when the underlying error is infrastructure-related.
- **Fail-Fast for Schema/Semantic**: Any error tied to schema projections (`CANONICAL_PROJECTION_MISSING`, `CANONICAL_PROJECTION_CONFLICT`) strictly fails-fast without triggering a fallback.
- **Fail-Fast for Complex Intents**: Computationally heavy or complex intents (`trend`, `group_by`, `relationship`) strictly fail-fast without fallback, even if an infrastructure error occurs, preserving execution truth.
- **Remaining Ambiguity**: The only remaining structural ambiguity is the monolithic nature of the `DUCKDB_WASM_RUNTIME_FAILED` error, which currently treats SQL syntax errors and raw WASM memory errors identically.
