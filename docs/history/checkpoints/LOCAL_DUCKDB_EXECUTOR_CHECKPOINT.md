# Checkpoint: Local DuckDB Executor Phase 1

## Status: Seam Locked

Phase 1 has securely laid down the architectural foundation for local SQL execution. We have proven and locked in the following guarantees:

1. **Executor Seam Established**: Phase 1 successfully completed the `executor seam`. No WASM database is currently spun up, but the execution pipes are connected and awaiting the engine.
2. **Deterministic Routing**: `backend-preview-executor.ts` properly routes execution:
   - If an endpoint exists -> Sends to HTTP path.
   - If no endpoint exists + has `safeSqlPreview` and `rows` -> Sends to `local-duckdb-executor.ts`.
3. **Transparent Failure**: The local seam currently returns a transparent `LOCAL_EXECUTOR_UNAVAILABLE` error, acknowledging the missing infrastructure instead of falsely claiming a network failure.
4. **Guarded Fallback**: `Investigation.tsx` only allows the JS sandbox fallback for the simplest intent (`distribution`). Complex intents no longer pretend to succeed via sandbox approximations.
5. **Quality Gate**: Targeted tests explicitly pass. Full `tsc -p tsconfig.app.json --noEmit` still fails strictly due to pre-existing/out-of-scope issues; we do **not** claim full repo type-cleanliness.

---

## Recommended Next Phase: Local DuckDB Executor Phase 2

**Goal**: Breathe life into the executor seam by integrating a genuine WASM-based DuckDB engine.

### Phase 2 Plan framing
1. **Infrastructure Status**: The repo currently **does not** have `@duckdb/duckdb-wasm`, required WASM worker files, or assets.
2. **Bootstrapping**: We must install the `@duckdb/duckdb-wasm` package and inject minimum bootstrap code (e.g., async worker instantiation and bundle loading) directly into `apps/desktop/src/lib/local-duckdb-executor.ts` (or a dedicated `duckdb-wasm-loader.ts` helper).
3. **Targeted Complex Intents**: The real engine will prioritize proving local execution for **`trend`** (time-series aggregation) and **`group_by`** (multi-dimensional grouping).
4. **Verification Strategy**: We will write unit/integration tests directly calling `executeLocalDuckDB` with `trend` SQL and raw JSON rows, asserting that the output is a calculated tabular `DuckDBPreviewResult` instead of `LOCAL_EXECUTOR_UNAVAILABLE`.
