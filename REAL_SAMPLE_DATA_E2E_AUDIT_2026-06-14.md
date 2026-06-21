# Real Sample Data E2E Audit — Production Truth Snapshot

Date: 2026-06-14  
Target: `https://lightbi.thaiduy.digital`  
Browser: Chromium on VPS  
Evidence directory: `ui-audit/real-sample-e2e-2026-06-14/`  
Raw results: `ui-audit/real-sample-e2e-2026-06-14/results.json`

## Executive Verdict

This audit does **not** prove that LightBI can currently process the Viettel Post sample pack end to end on production.

The production app accepted uploads, but every tested scenario stopped before runtime execution because the deployed frontend attempted to call:

```text
http://100.94.184.141:5172/api/project/current-source
```

from:

```text
https://lightbi.thaiduy.digital
```

Chromium blocked this as a CORS / Private Network Access / mixed-origin boundary issue.

The audit result is therefore:

```text
Real sample upload/intake: PARTIAL
Runtime query execution: NOT PROVEN
Production readiness for Viettel Post sample pack: NOT READY
```

No agent should describe this as “mỹ mãn”, “fully fixed”, “production ready”, or “sample data handled” until the same audit is rerun after the production API boundary is fixed.

## Coverage

The audit attempted:

- 17 single-file scenarios.
- 5 multi-file scenarios.
- Real files from `sample data/`.
- Audit CSVs from `sample-data-audit/`.
- Production domain only: `https://lightbi.thaiduy.digital`.

## Result Summary

| Surface | Count | PASS | PARTIAL | FAIL | Main blocker |
|---|---:|---:|---:|---:|---|
| Single files | 17 | 0 | 17 | 0 | No Run/Execute button after API boundary failure |
| Multi-file groups | 5 | 0 | 5 | 0 | No Run/Execute button after API boundary failure |

All 22 scenarios reported:

```text
uploadStatus: SUCCESS
runPreviewStatus: NO_RUN_BUTTON
status: PARTIAL
errorMessage: Could not find Run/Execute button.
```

## Repeated Browser Error

The first console error for representative scenarios was:

```text
Access to fetch at 'http://100.94.184.141:5172/api/project/current-source' from origin 'https://lightbi.thaiduy.digital' has been blocked by CORS policy: Permission was denied for this request to access the `local` address space.
```

This means the browser never reached a valid production-safe API path for the current-source call.

## Single File Results

| File | Upload | Runtime | Status |
|---|---|---|---|
| `sample data/Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx` | SUCCESS | NO_RUN_BUTTON | PARTIAL |
| `sample data/DATA_XUAT.xlsx` | SUCCESS | NO_RUN_BUTTON | PARTIAL |
| `sample data/TỒN DỰ KIẾN HUBLAN.xlsx` | SUCCESS | NO_RUN_BUTTON | PARTIAL |
| `sample data/bcctnhapTTKT_23122024.xlsx` | SUCCESS | NO_RUN_BUTTON | PARTIAL |
| `sample data/bcctnhapTTKT_24122024.xlsx` | SUCCESS | NO_RUN_BUTTON | PARTIAL |
| `sample-data-audit/customer/good_customer.csv` | SUCCESS | NO_RUN_BUTTON | PARTIAL |
| `sample-data-audit/customer/broken_customer.csv` | SUCCESS | NO_RUN_BUTTON | PARTIAL |
| `sample-data-audit/finance/good_finance.csv` | SUCCESS | NO_RUN_BUTTON | PARTIAL |
| `sample-data-audit/finance/broken_finance.csv` | SUCCESS | NO_RUN_BUTTON | PARTIAL |
| `sample-data-audit/inventory/good_inventory.csv` | SUCCESS | NO_RUN_BUTTON | PARTIAL |
| `sample-data-audit/inventory/broken_inventory.csv` | SUCCESS | NO_RUN_BUTTON | PARTIAL |
| `sample-data-audit/operations/good_operations.csv` | SUCCESS | NO_RUN_BUTTON | PARTIAL |
| `sample-data-audit/operations/broken_operations.csv` | SUCCESS | NO_RUN_BUTTON | PARTIAL |
| `sample-data-audit/performance/good_performance.csv` | SUCCESS | NO_RUN_BUTTON | PARTIAL |
| `sample-data-audit/performance/broken_performance.csv` | SUCCESS | NO_RUN_BUTTON | PARTIAL |
| `sample-data-audit/revenue/good_revenue.csv` | SUCCESS | NO_RUN_BUTTON | PARTIAL |
| `sample-data-audit/revenue/broken_revenue.csv` | SUCCESS | NO_RUN_BUTTON | PARTIAL |

## Multi-file Results

| Group | Upload | Runtime | Status |
|---|---|---|---|
| Group 1: `bcctnhapTTKT_23122024.xlsx` + `bcctnhapTTKT_24122024.xlsx` | SUCCESS | NO_RUN_BUTTON | PARTIAL |
| Group 2: `DATA_XUAT.xlsx` + `TỒN DỰ KIẾN HUBLAN.xlsx` | SUCCESS | NO_RUN_BUTTON | PARTIAL |
| Group 3: all 5 real Excel logistics files | SUCCESS | NO_RUN_BUTTON | PARTIAL |
| Group 4: all `good_*.csv` audit files | SUCCESS | NO_RUN_BUTTON | PARTIAL |
| Group 5: all audit CSVs | SUCCESS | NO_RUN_BUTTON | PARTIAL |

## Current Code State Recorded In Results

`results.json` captured a dirty worktree at the time of audit. This matters because production may not include local/uncommitted fixes.

Latest visible commit in the audit snapshot:

```text
36b6e48 feat(ai): Phase 6 — AI Semantic Briefing Contract
```

The audit snapshot also recorded many modified/untracked files, including runtime-intent fix files and the real sample audit artifacts.

## Product Truth Assessment

What is proven:

- Production page loads.
- Real files can be selected and uploaded far enough to produce intake/home screenshots.
- Multi-file input did not immediately hard-fail in the script.
- The production runtime path is currently blocked by API origin/network policy.

What is **not** proven:

- DuckDB/local executor can run on the real Viettel Post files in production.
- `table_preview` works on production.
- `record_count` / `row_count` virtual fields are isolated correctly on production.
- Guarded SUM behaves correctly on real logistics exports.
- Multi-file semantic merging works correctly after execution.
- Sample data quality/readiness numbers are trustworthy end to end.

## Smallest Next Corrective Phase

Start `Production API Boundary Fix Phase 1`.

The goal is not to change taxonomy, DuckDB, numeric trust, display formatting, or sample-data logic. The first blocker is lower:

1. Stop the production frontend from calling `http://100.94.184.141:5172` from an HTTPS public origin.
2. Route browser API calls through same-origin HTTPS, e.g. `https://lightbi.thaiduy.digital/api/...`.
3. Proxy `/api/*` to the backend service internally.
4. Verify with `curl -i https://lightbi.thaiduy.digital/api/project/current-source`.
5. Rerun the exact real sample E2E audit.

Only after the Run/Execute path works should agents claim anything about whether LightBI handles the real sample pack.

