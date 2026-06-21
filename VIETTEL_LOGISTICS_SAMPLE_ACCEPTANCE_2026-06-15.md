# Viettel Logistics Sample Acceptance Report (2026-06-15)

## Objective
To strictly verify that the LightBI application can import, understand, and execute preliminary analysis on real Viettel Post logistics data exports without encountering "Execution Boundary Failed", UI blockers, or dead ends.

## Environment & Commands
- **Backend Server:** `cargo run` running on `0.0.0.0:5172`
- **Frontend Server:** `npm run dev --host` running on `0.0.0.0:5173`
- **Playwright Command:** `npx playwright test e2e/viettel_acceptance.spec.ts`

## Strict Acceptance Criteria
The test strictly asserts the UI presence of real runtime execution indicators. It will **FAIL** if:
- Any `Execution Boundary Failed`, `DUCKDB`, or `CANONICAL` error appears.
- It remains stuck on the "Expected Result Structure" contract modal.
- It remains stuck on the "Execute Query" button.

## Results

### Single Files
Single files PASS for local table preview.
| File Name | Test Status | Evidence (Screenshot Path) | Notes |
|-----------|-------------|----------------------------|-------|
| `Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx` | PASS | `ui-audit/viettel-logistics-sample-acceptance-2026-06-15/Bao_cao_chi_tiet_Ton_kho_investigation_after.png` | Successfully executed fallback table_preview. |
| `DATA_XUAT.xlsx` | PASS | `ui-audit/viettel-logistics-sample-acceptance-2026-06-15/DATA_XUAT_investigation_after.png` | Successfully executed fallback table_preview. |
| `TỒN DỰ KIẾN HUBLAN.xlsx` | PASS | `ui-audit/viettel-logistics-sample-acceptance-2026-06-15/TON_DU_KIEN_HUBLAN_investigation_after.png` | Successfully executed fallback table_preview. |
| `bcctnhapTTKT_23122024.xlsx` | PASS | `ui-audit/viettel-logistics-sample-acceptance-2026-06-15/bcctnhapTTKT_23122024_investigation_after.png` | Successfully executed fallback table_preview. |
| `bcctnhapTTKT_24122024.xlsx` | PASS | `ui-audit/viettel-logistics-sample-acceptance-2026-06-15/bcctnhapTTKT_24122024_investigation_after.png` | Successfully executed fallback table_preview. |

### Multi-File Complex Groups
Groups A/B/C PASS for local table preview. Group D is PARTIAL.
| Group | Test Status | Evidence (Screenshot Path) | Notes |
|-------|-------------|----------------------------|-------|
| **Group A** (`bcctnhapTTKT_23122024.xlsx` & `bcctnhapTTKT_24122024.xlsx`) | PASS | `ui-audit/viettel-logistics-sample-acceptance-2026-06-15/Group_A_investigation_after.png` | Standard legacy analysis action flow execution. |
| **Group B** (`DATA_XUAT.xlsx` & `TỒN DỰ KIẾN HUBLAN.xlsx`) | PASS | `ui-audit/viettel-logistics-sample-acceptance-2026-06-15/Group_B_investigation_after.png` | Standard legacy analysis action flow execution. |
| **Group C** (`Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx` & `DATA_XUAT.xlsx`) | PASS | `ui-audit/viettel-logistics-sample-acceptance-2026-06-15/Group_C_investigation_after.png` | Standard legacy analysis action flow execution. |
| **Group D** (All 5 Files) | PARTIAL | `ui-audit/viettel-logistics-sample-acceptance-2026-06-15/Group_D_investigation_after.png` | virtual-business-view preview renders DuckDB Preview Result, but the evidence is mock/preview output and explicitly says full execution has not run. |

---

## Conclusion
Viettel logistics sample pack: PARTIAL
Single files and Groups A/B/C PASS for local table preview. 
Group D PARTIAL: virtual-business-view preview renders DuckDB Preview Result, but the evidence is mock/preview output and explicitly says full execution has not run.

## Residual Risk
Group D does not yet prove real joined multi-file logistics execution over the uploaded rows. It proves the virtual business view preview UI no longer crashes and renders a mock DuckDB preview result.

## Proposed Next Phase
**Virtual Business View Real Data Execution Phase**
Goal: Group D should execute against real uploaded row data / actual virtual dataset rows, not mock routes, or be explicitly labeled as preview-only until implemented.
