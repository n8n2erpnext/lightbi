# Verification: Canonical Schema Projection Phase 1

## 1. Production Files Changed
- **`business-signal-detector.ts`**: Added `export` to `TAXONOMY`.
- **`canonical-row-projection.ts`** *(NEW)*: Created to act as the mapping layer between raw headers and canonical fields using the `TAXONOMY` definitions.
- **`local-duckdb-executor.ts`**: Updated to intercept and project raw `rows` to canonical rows prior to writing the `data.json` file.

## 2. Projection Rule
- For every `requiredField` in the logical SQL, it attempts to map the canonical key against all available raw headers.
- It iterates the raw headers and checks if their normalized string (`normalizeString` helper removing case & diacritics) matches any alias in `TAXONOMY[requiredField].aliases`.
- Throw boundary errors if:
  - `CANONICAL_PROJECTION_CONFLICT`: Two raw keys match the same canonical field alias.
  - `CANONICAL_PROJECTION_MISSING`: The canonical field has no matching raw header whatsoever.
- The projection copies matched data into new virtual objects without modifying the original source rows.

## 3. Tests / Probe
- **`canonical-row-projection.test.ts`**: Verifies Vietnamese mapping, exact mapping, conflict failures, and missing failures.
- **`local-duckdb-executor.test.ts`**: Updated to properly construct canonical mocks and expect valid schema registration in DuckDB. Added explicit tests confirming that projection failures are correctly preserved without generic prefixing.
- Projection failures now remain distinguishable from DuckDB runtime failures.
- **E2E Probe (`probe-e2e.mjs`)**: Traced through Chromium to run the `route` vs `Tuyến xe` E2E grouping case.

## 4. Pass/Fail
- **Passed**. All Unit tests passed and the full Playwright probe trace ran to completion.

## 5. E2E Resolution for `route` vs `Tuyến xe`
- **Fully Rescued!** DuckDB WASM evaluated the query on the dynamically projected data. `e2e-probe-result.png` proves the exact chart and table output rendered correctly from DuckDB with:
  - `EXECUTED` status
  - `local_duckdb_preview` execution source
  - Data mapped natively via `data.json`.
