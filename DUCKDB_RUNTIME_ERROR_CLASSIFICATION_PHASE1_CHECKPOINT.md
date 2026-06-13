# DuckDB Runtime Error Classification Phase 1 - Checkpoint

## State of Execution
- **Normalized Runtime Families**: The `local-duckdb-executor` has successfully unbundled the monolithic `DUCKDB_WASM_RUNTIME_FAILED` error, classifying it into distinct normalized families (e.g., `PARSER`, `BINDER`, `CATALOG`, `BOOTSTRAP`, `WORKER`, `MEMORY`, `UNKNOWN`).
- **Policy Laser Focus**: The fallback policy is now strictly gated. Fallback to the JS Sandbox is exclusively authorized for **simple intents** combined with **infrastructure-related errors** (`BOOTSTRAP`, `WORKER`, `MEMORY`).
- **Absolute Fail-Fast Boundary**: Any error stemming from SQL or query generation (`PARSER`, `BINDER`, `CATALOG`) is unconditionally treated as a fail-fast, completely bypassing the fallback mechanism to preserve execution truth.
- **Conservative Ambiguity**: `UNKNOWN` runtime errors default to a conservative fail-fast posture.
- **Next Blocker Identified**: The primary blocker is no longer "blindly falling back due to opaque errors." Instead, the blocker is reducing the absolute volume of true SQL/query-generation failures happening in the real world so that complex intents can successfully execute natively rather than failing-fast.
