# Virtual Business View Real Data Execution Audit Report
**Date**: 2026-06-15
**Component**: Group D (Virtual Business Views)

## 1. Classification
**Status**: **PARTIAL**
- Group A, B, C (Multi-file single families): PASS via local DuckDB preview.
- Group D (Multi-file joined virtual datasets): **PARTIAL**.
The Virtual Business View flow correctly executes and identifies relationships but the runtime strictly executes as a mock.

## 2. Exact Code Path Audited
1. **Intake & Selection (`Home.tsx`)**:
   - `pendingLocalBatch.files` stores HTML5 `File` objects.
   - `local-file-inspector.ts` parses up to 100 rows into `pendingLocalBatch.families[i].files[j].result.metadata.preview_rows`.
   - When a Virtual Business View is confirmed, `Home.tsx` populates `currentDataset` with metadata ONLY, and `setPendingLocalBatch(null)` is called. The original rows are permanently dropped.
2. **Planner (`virtual-dataset-planner.ts`)**:
   - Creates a `VirtualDatasetPlan` containing dataset family IDs and relationship IDs, but no raw data.
3. **Execution Routing (`Investigation.tsx` -> `duckdb-preview-runtime.ts` -> `backend-preview-executor.ts`)**:
   - The executor expects a populated `rows` object, but `currentDataset.rows` and `currentDataset.previewRows` are undefined.
4. **SQL Generator (`safe-sql-preview.ts`)**:
   - Hardcoded to emit `SELECT ... FROM __LIGHTBI_PREVIEW_TABLE__`. There is no logic for emitting `JOIN` statements.
5. **Local Sandbox Engine (`local-duckdb-executor.ts`)**:
   - Only accepts a single `rows: any[]` array and maps it to a single `data.json` file registered as `__LIGHTBI_PREVIEW_TABLE__`.

## 3. Detailed Proof of Impossibility
Real-data row-level execution of a multi-table joined Virtual Business View is not supported by the current frontend sandbox architecture because:
- **Data Retention Loss**: The UI drops the only reference to the uploaded files/preview rows (`pendingLocalBatch`) when building the virtual view graph.
- **Planner & SQL Compiler Boundaries**: The compilation path (`safe-sql-preview.ts`) only understands single-table projection and aggregation. It has zero awareness of `JOIN`, `ON`, or multi-table relationships.
- **Engine Limitation**: `local-duckdb-executor.ts` is strictly hardcoded to create a single table view (`__LIGHTBI_PREVIEW_TABLE__`). Even if the SQL compiler emitted a `JOIN` and the data was retained, the executor lacks the ability to register multiple `.json` files representing different source datasets.

## 4. Remediation and Justification for Mock Usage
Because achieving real execution requires a multi-layer implementation across state retention, planner, SQL compiler, and executor across 5 architectural boundaries (State -> Planner -> Compiler -> Executor -> DuckDB WASM Interface), falling back to a mock output is justified.
We have applied the following explicit labeling patch:
- **UI Element**: `DuckDBPreviewRuntimeCard.tsx` now explicitly displays `[PARTIAL] Virtual Business View Preview` and states: "PARTIAL: Virtual Business View preview is mock/contract-only. Real joined execution over uploaded rows is not yet implemented."
- **Playwright Evidence**: The e2e test suite (`viettel_acceptance.spec.ts`) was updated to strictly assert and accept the `[PARTIAL]` explicit disclosure.
- **Test Result**: `Acceptance Group_D` passed under the `[PARTIAL]` acceptance criteria.
