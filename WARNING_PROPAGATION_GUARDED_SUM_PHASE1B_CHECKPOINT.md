# Checkpoint: Warning Propagation for Guarded SUM (Phase 1B)

## Locked Accomplishments
- **E2E Traceability**: The "silent cleansing" warning now successfully propagates across the entire stack: from the `guarded-sum-bridge` -> `RuntimePlanPreview` -> `SafeSqlPreview` -> Executors (`local-duckdb-executor`, `backend-preview-executor`, `duckdb-preview-sandbox`) -> `Investigation.tsx` UI state.
- **Precision Triggers**: The UI warning strictly appears only when a measure is successfully elevated to `SUM` but genuinely required regex-based string cleansing or dropping invalid rows.
- **No False Positives**: Columns failing the 95% threshold are automatically downgraded to `COUNT` without triggering any confusing `SUM` cleansing warnings.
- **Truthful Telemetry**: The JS Sandbox degraded execution message has been completely overhauled to truthfully reflect its role as a constrained fallback, eliminating outdated WASM state claims and respecting the local-DuckDB-first architectural vision.
- **Next Horizon**: The silent cleansing vulnerability has been closed. The next major objective is to expand the numeric trust surface safely, moving beyond component tests into physical execution audits.
