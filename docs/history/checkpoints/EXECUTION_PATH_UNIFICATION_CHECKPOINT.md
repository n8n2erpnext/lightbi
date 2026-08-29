# Checkpoint: Execution Path Unification

## What Phase 1 unified
The execution orchestration has been unified to strictly check for a configured backend, completely eliminating blind phantom network calls (`/api/preview/execute`) and preventing fake timeouts from masking real execution limits.

## What path is now considered truthful
The current truthful execution path is: **explicit fail-fast for unavailable backends** plus a **restricted JS sandbox** that solely handles allowed simple intents. We no longer overclaim the sandbox as a "backend executor".

## What was deprecated instead of removed
`duckdb-preview-runtime.ts` (the disconnected mock executor) was formally marked as `@deprecated` and isolated. It could not be safely removed due to lingering dependencies in the legacy Home layer UI components.

## What still blocks real execution
The application still fundamentally lacks a genuine local execution engine (such as a DuckDB WASM integration) capable of processing complex queries (like `trend`, `group_by`) when the network backend is unavailable.

## Recommended next phase
**Local DuckDB Executor Phase 1**
