# Sample Data Domain Coverage (2026-06-15)

This report details the execution of the domain coverage e2e tests across sample data files.

## Coverage Results

### Runtime Preview Coverage
- **PARTIAL**: 8 out of 9 files processed cleanly via `local_duckdb_preview` without backend crashes or CANONICAL mapping errors. One file (`QUAN LY`) timed out navigating to the Investigation view.

### Semantic Summary Coverage
- **PASS**: Successfully prevented the `LogisticsDatasetSummary` from bleeding over to Generic, Retail, and Inventory datasets (e.g., `BHX_PHIEUXUAT.xlsx` and `PLU`). Additionally, Excel numeric dates incorrectly casting to `1/1/1970` have been sanitized.

| File | Result Status | Semantic Component Rendered | Screenshot |
|---|---|---|---|
| `BHX_PHIEUXUAT.xlsx` | **PASS** | `Retail & Sales Dataset` | [View Home](file:/home/ubuntu/n8n2erpnext/LightBI/ui-audit/sample-data-domain-coverage-2026-06-15/BHX_PHIEUXUAT_xlsx_home.png) / [View After](file:/home/ubuntu/n8n2erpnext/LightBI/ui-audit/sample-data-domain-coverage-2026-06-15/BHX_PHIEUXUAT_xlsx_investigation_after.png) |
| `PLU ALL FRESH 22.03.2021.xlsx` | **PASS** | `Inventory & Product Dataset` | [View Home](file:/home/ubuntu/n8n2erpnext/LightBI/ui-audit/sample-data-domain-coverage-2026-06-15/PLU_ALL_FRESH_22_03_2021_xlsx_home.png) / [View After](file:/home/ubuntu/n8n2erpnext/LightBI/ui-audit/sample-data-domain-coverage-2026-06-15/PLU_ALL_FRESH_22_03_2021_xlsx_investigation_after.png) |
| `2017-06-22 DANH SACH XEP HANG QUAN LY TOAN QUOC.xlsx` | **FAIL** | Not reached | [View Home](file:/home/ubuntu/n8n2erpnext/LightBI/ui-audit/sample-data-domain-coverage-2026-06-15/2017_06_22_DANH_SACH_XEP_HANG_QUAN_LY_TOAN_QUOC_xlsx_home.png) |
