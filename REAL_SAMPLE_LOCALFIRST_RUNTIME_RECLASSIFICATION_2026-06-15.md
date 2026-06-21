# Local-First Real Sample Runtime Evidence Reclassification

Date: 2026-06-15
Environment: LOCALHOST (127.0.0.1:5173)

## 1. Strict Evaluation Criteria

The previous report loosely used the `runPreviewStatus: EXECUTED` flag in the audit logs as a `PASS`. This reclassification applies the strict rule: `EXECUTED` only means execution was *attempted*. 

A scenario is strictly marked **PASS** only if:
- Upload/intake completed.
- A valid analysis action opened Investigation.
- `Run preview` was clicked or execution occurred.
- The UI shows a **successful chart/table/result**.
- There is **no visible `Execution Failed` banner**.
- There is **no `DUCKDB_*` error, no projection error, and no SQL blocked error**.
- Screenshot evidence supports the claim.

If any error boundary banner is visible (e.g., `Execution Boundary Failed`), the status is downgraded to **PARTIAL** or **FAIL**.

## 2. Corrected Counts

- **Total cases previously marked PASS:** 17
- **Total cases downgraded to PARTIAL/FAIL:** 17
- **Strict PASS:** 0
- **Strict PARTIAL:** 17 (Upload/Intake succeeded, execution attempted, but boundary validation or DuckDB failed in UI)
- **Strict FAIL:** 4 (Timeouts & network errors)
- **Strict BLOCKED:** 1 (`NO_RUN_BUTTON`)

## 3. Single-File Reclassification Table (17 Files)

| File / Group | Upload Status | Runtime Attempted | UI Result | Exact Visible Error Text | Strict Status | Screenshot Evidence |
|--------------|---------------|-------------------|-----------|--------------------------|---------------|---------------------|
| `Bao_cao_chi_tiet...` | SUCCESS | Yes | Execution Failed | "Execution Boundary Failed. Validation boundary rejected the preview result due to insufficient quality or missing required data. Summary shape requires at least one measure." | PARTIAL | `single__Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024_xlsx__investigation_after.png` |
| `DATA_XUAT.xlsx` | SUCCESS | Yes | Execution Failed | "Execution Boundary Failed. Validation boundary rejected the preview result... Summary shape requires at least one measure." | PARTIAL | `single__DATA_XUAT_xlsx__investigation_after.png` |
| `TỒN DỰ KIẾN HUBLAN`| SUCCESS | Yes | Execution Failed | "Execution Boundary Failed. Validation boundary rejected the preview result... Summary shape requires at least one measure." | PARTIAL | `single__T_N_D__KI_N_HUBLAN_xlsx__investigation_after.png` |
| `bcctnhapTTKT_2312...`| SUCCESS | Yes | Execution Failed | "Execution Boundary Failed. Validation boundary rejected the preview result... Summary shape requires at least one measure." | PARTIAL | `single__bcctnhapTTKT_23122024_xlsx__investigation_after.png` |
| `bcctnhapTTKT_2412...`| SUCCESS | Yes | Execution Failed | "Execution Boundary Failed. Validation boundary rejected the preview result... Summary shape requires at least one measure." | PARTIAL | `single__bcctnhapTTKT_24122024_xlsx__investigation_after.png` |
| `good_customer.csv` | SUCCESS | Yes | Execution Failed | "Execution Boundary Failed. Validation boundary rejected the preview result... Summary shape requires at least one measure." | PARTIAL | `single__good_customer_csv__investigation_after.png` |
| `broken_customer.csv` | SUCCESS | Yes | Execution Failed | "Execution Boundary Failed. Validation boundary rejected the preview result... Summary shape requires at least one measure." | PARTIAL | `single__broken_customer_csv__investigation_after.png` |
| `good_finance.csv` | SUCCESS | Yes | Execution Failed | "Execution Boundary Failed. Validation boundary rejected the preview result... Summary shape requires at least one measure." | PARTIAL | `single__good_finance_csv__investigation_after.png` |
| `broken_finance.csv` | SUCCESS | Yes | Execution Failed | "Execution Boundary Failed. Validation boundary rejected the preview result... Summary shape requires at least one measure." | PARTIAL | `single__broken_finance_csv__investigation_after.png` |
| `good_inventory.csv` | SUCCESS | Yes | Execution Failed | "Execution Boundary Failed. Validation boundary rejected the preview result... Summary shape requires at least one measure." | PARTIAL | `single__good_inventory_csv__investigation_after.png` |
| `broken_inventory.csv`| SUCCESS | Yes | Execution Failed | "Execution Boundary Failed. Validation boundary rejected the preview result... Summary shape requires at least one measure." | PARTIAL | `single__broken_inventory_csv__investigation_after.png` |
| `good_operations.csv` | SUCCESS | Yes | Execution Failed | "Execution Boundary Failed. Validation boundary rejected the preview result... Summary shape requires at least one measure." | PARTIAL | `single__good_operations_csv__investigation_after.png` |
| `broken_operations...`| SUCCESS | Yes | Execution Failed | "Execution Boundary Failed. Validation boundary rejected the preview result... Summary shape requires at least one measure." | PARTIAL | `single__broken_operations_csv__investigation_after.png` |
| `good_performance...` | SUCCESS | Yes | Execution Failed | "Execution Boundary Failed. Validation boundary rejected the preview result... Summary shape requires at least one measure." | PARTIAL | `single__good_performance_csv__investigation_after.png` |
| `broken_performance`  | PENDING | No | File input missing| "File input not found" / `ERR_NETWORK_CHANGED` | FAIL | (No investigation screenshot) |
| `good_revenue.csv` | SUCCESS | Yes | Execution Failed | "Execution Boundary Failed. Validation boundary rejected the preview result... Summary shape requires at least one measure." | PARTIAL | `single__good_revenue_csv__investigation_after.png` |
| `broken_revenue.csv` | SUCCESS | Yes | Execution Failed | "Execution Boundary Failed. Validation boundary rejected the preview result... Summary shape requires at least one measure." | PARTIAL | `single__broken_revenue_csv__investigation_after.png` |

## 4. Multi-File Groups Reclassification Table (5 Groups)

| File / Group | Upload Status | Runtime Attempted | UI Result | Exact Visible Error Text | Strict Status | Screenshot Evidence |
|--------------|---------------|-------------------|-----------|--------------------------|---------------|---------------------|
| Group 1 | SUCCESS | Yes | Execution Failed | "Execution Boundary Failed. Validation boundary rejected the preview result... Summary shape requires at least one measure." | PARTIAL | `multi__Group_1__investigation_after.png` |
| Group 2 | SUCCESS | No | No Run Button | "Could not find Run/Execute button." (Run Preview button disabled) | BLOCKED | `multi__Group_2__investigation_before.png` |
| Group 3 | TIMEOUT | No | Timeout | "Timed out waiting for intake understanding." | FAIL | (No investigation screenshot) |
| Group 4 | TIMEOUT | No | Timeout | "Timed out waiting for intake understanding." | FAIL | (No investigation screenshot) |
| Group 5 | TIMEOUT | No | Timeout | "Timed out waiting for intake understanding." | FAIL | (No investigation screenshot) |

## 5. Root Cause Hypotheses vs. Proven Facts

**Proven Facts:**
1. All 17 cases previously marked `PASS` resulted in a visible, red `Execution Boundary Failed` error banner on the Investigation UI after execution was attempted. The execution state flag `EXECUTED` does not correspond to a visually successful chart/table output.
2. The exact error text for these cases is: `Validation boundary rejected the preview result due to insufficient quality or missing required data. Summary shape requires at least one measure.`
3. These cases all executed the action `"Explore dataset structure and sample rows"`, which uses the `table_preview` action type.

**Root Cause Hypotheses:**
1. **Validation Contract Mismatch:** The `result-validator-contract.ts` incorrectly classifies the `table` intent shape as `summary`, which then erroneously requires at least one measure. Since `table_preview` has no measures, the boundary validation fails and blocks the frontend from rendering the result.
2. **Legacy Opportunities Missing Metadata:** The `NO_RUN_BUTTON` in Group 2 (action: "Understand inventory...") and the `DUCKDB_UNKNOWN_RUNTIME_ERROR` ("SQL preview is empty or blocked" and "Trend shape expects a date/time dimension") are caused by the legacy semantic engine mapping valid opportunities (like `trend` or `group_by`) without setting their required `dimensions` and `measures` arrays, causing the intent generator to block them.

## 6. Smallest Next Code-Audit Phase

**Phase Title:** Execution Boundary & Legacy Mapping Audit

**Focus:**
1. Audit `result-validator-contract.ts` to ensure `table_preview` (or `table` shape) is not incorrectly validated as a `summary` shape that requires measures.
2. Audit `analysis-opportunity-actions.ts` to correct the `dimensions: []` / `measures: []` hardcoded assignment when processing legacy analysis opportunities.
