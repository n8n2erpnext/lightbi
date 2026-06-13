# Handoff: Canonical Schema Projection Phase 1

## Overview
Phase 1 successfully resolved the schema mismatch blocker where DuckDB WASM was failing because the logical SQL used canonical aliases (e.g., `"route"`), but the raw JSON provided to the engine contained the original keys (e.g., `"Tuyến xe"`).

## Implementation
- **Canonical Row Projection Layer**: Introduced `canonical-row-projection.ts` which provides the `projectToCanonicalRows` utility.
- **Rule Engine**: This utility leverages the existing `TAXONOMY` from the `business-signal-detector.ts` (which we gracefully exported) to dynamically match raw Vietnamese headers against English alias configurations using our custom `normalizeString` helper.
- **Safety**: The mapping guarantees non-destructive transformations. In edge-cases, it explicitly blocks execution by throwing `CANONICAL_PROJECTION_CONFLICT` (if multiple raw columns map to the same target) or `CANONICAL_PROJECTION_MISSING` (if a required canonical field cannot be found).
- **Executor Integration**: Plumbed the projection layer into `local-duckdb-executor.ts` right before data injection into DuckDB's virtual filesystem. Error handling was carefully updated so that projection failures preserve their distinguishing `CANONICAL_PROJECTION_` prefix rather than being swallowed into a generic `DUCKDB_WASM_RUNTIME_FAILED` error.

## E2E Resolution
The `"route"` vs `"Tuyến xe"` case in the Playwright E2E trace was successfully rescued! The screenshot confirms that the `group_by` analysis correctly executed on DuckDB via WASM, yielding analytical results back to the browser UI without throwing `Binder Error`.
