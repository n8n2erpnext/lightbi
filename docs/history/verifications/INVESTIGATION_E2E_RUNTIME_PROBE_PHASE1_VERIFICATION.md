# Verification: Investigation E2E Runtime Probe Phase 1

## 1. Production Code Modified
- **None**. No changes were made to the core runtime codebase. A standalone Playwright script (`probe-e2e.mjs`) was introduced purely for end-to-end testability in the browser.

## 2. E2E Probe Path
- **Browser**: Chromium (Playwright).
- **Flow**: Upload CSV (`delivery_performance_reports.csv`) -> Parse dataset -> Click Investigate -> Click "Run preview".
- **Execution Path**: The UI triggered the standard pipeline `Investigation.tsx` -> `backend-preview-executor.ts` -> `local-duckdb-executor.ts` -> DuckDB WASM Engine.

## 3. Query Executed
- A `group_by` analytical intent ("Shipment activity by route").
- The logical planner generated: `SELECT "route", COUNT("shipment") AS "shipment" FROM __LIGHTBI_PREVIEW_TABLE__ WHERE "route" IS NOT NULL GROUP BY "route"`.

## 4. Evidence
- **Test Assertion**: The script explicitly awaited and captured the Execution Boundary state.
- **Screenshot**: Captured as `e2e-probe-result.png`. It clearly displays the native `DUCKDB_WASM_RUNTIME_FAILED` error inside the UI, validating that the execution bypassed mock fallbacks and directly interfaced with the real WASM engine.

## 5. Final Blocker Before Default Enablement
- **Schema Alias / Data Mapping Mismatch**.
- The `safeSqlPreview` utilizes English schema aliases (e.g., `"route"`). However, the in-memory `rows` injected into DuckDB still contain the raw native headers (e.g., `"Tuyến xe"`).
- DuckDB throws: `Binder Error: Referenced column "route" not found in FROM clause! Candidate bindings: "Tuyến xe"`.
- **Next Steps**: We must either map the keys in the JSON objects before inserting them into DuckDB, or dynamically generate `SELECT "Tuyến xe" AS "route"` in the View creation DDL.
