# Local-First Real Sample Runtime Proof
Date: 2026-06-14

## 1. Target URL
**URL:** `http://127.0.0.1:5173`
**Mode:** LOCALHOST

## 2. Git Status & Commits
**Git Status:**
```text
 M AGENT_INBOX.md
 M apps/desktop/src/App.tsx
 M apps/desktop/src/components/analysis/AnalysisOpportunityCard.tsx
 M apps/desktop/src/content/home-guidance.ts
 M apps/desktop/src/hooks/useDatasetUpload.ts
 M apps/desktop/src/lib/analysis-opportunity-actions.test.ts
 M apps/desktop/src/lib/analysis-opportunity-actions.ts
 M apps/desktop/src/lib/analysis-runtime-contract.test.ts
 M apps/desktop/src/lib/analysis-runtime-contract.ts
 M apps/desktop/src/lib/canonical-row-projection.test.ts
 M apps/desktop/src/lib/canonical-row-projection.ts
 M apps/desktop/src/lib/investigation-session.ts
 M apps/desktop/src/lib/local-duckdb-executor.test.ts
 M apps/desktop/src/lib/runtime-planner-preview.test.ts
 M apps/desktop/src/lib/runtime-planner-preview.ts
 M apps/desktop/src/lib/safe-sql-preview.test.ts
 M apps/desktop/src/lib/safe-sql-preview.ts
 M apps/desktop/src/pages/DataSources.tsx
 M apps/desktop/src/pages/Home.tsx
 M apps/desktop/src/pages/Investigation.test.tsx
 M apps/desktop/src/pages/Investigation.tsx
 M apps/desktop/vite.config.ts
?? AGENT_HANDOFF_FRONTEND_RUNTIME_ACTION_WIRING_PHASE1.md
?? AGENT_HANDOFF_PRODUCTION_API_BOUNDARY_FIX_PHASE1.md
?? AGENT_HANDOFF_REAL_SAMPLE_DATA_E2E_AUDIT_2026-06-14.md
?? CODEX_QA_ORCHESTRATION_CONTRACT.md
?? FRONTEND_RUNTIME_ACTION_WIRING_PHASE1_VERIFICATION.md
?? LIGHTBI_INFRASTRUCTURE_BRIEF.md
?? LIGHTBI_REAL_DATA_QUALITY_GATE.md
?? PRODUCTION_API_BOUNDARY_FIX_PHASE1_VERIFICATION.md
?? REAL_SAMPLE_DATA_E2E_AUDIT_2026-06-14.md
?? apps/desktop/audit_real_samples.mjs
?? apps/desktop/audit_real_samples_one.mjs
?? apps/desktop/src/lib/api-base.ts
?? apps/desktop/ui-audit/live-*
?? migrate.js
?? "sample data/"
?? ui-audit/
```

**Latest 5 Commits:**
1. `36b6e48` feat(ai): Phase 6 — AI Semantic Briefing Contract
2. `9b308f4` fix: add missing type keywords in semantic-graph imports to prevent Vite runtime crash
3. `c9c66c3` fix: optional chaining on mappingReview.items to prevent React crash
4. `c8f44df` feat(understanding): Phase 5 — Lightweight Advanced Handoff JSON export
5. `cf8cc66` fix(execution): Guarded SUM Phase B — robust head/tail sampling and 80% safety threshold

## 3. Single-File Results Table

*Note: Cases previously marked PASS are reclassified to PARTIAL due to strict UI validation. Although the runtime reached the "EXECUTED" state, screenshots reveal `DUCKDB_UNKNOWN_RUNTIME_ERROR` when invalid legacy trend/group_by actions are triggered, violating the requirement for a non-error chart/table output.*

| File | Status | Row Count | Quality/Trust | Action Selected | Runtime Preview | Error / Blocker |
|------|--------|-----------|---------------|-----------------|-----------------|-----------------|
| `Bao_cao_chi_tiet_...` | PARTIAL | NOT VISIBLE | NOT VISIBLE | Explore dataset structure | EXECUTED (SQL Blocked) | UI Error: DUCKDB_UNKNOWN_RUNTIME_ERROR |
| `DATA_XUAT.xlsx` | PARTIAL | NOT VISIBLE | NOT VISIBLE | Explore dataset structure | EXECUTED (SQL Blocked) | UI Error: DUCKDB_UNKNOWN_RUNTIME_ERROR |
| `TỒN DỰ KIẾN HUBLAN.xlsx` | PARTIAL | NOT VISIBLE | NOT VISIBLE | Explore dataset structure | EXECUTED (SQL Blocked) | UI Error: DUCKDB_UNKNOWN_RUNTIME_ERROR |
| `bcctnhapTTKT_23122024.xlsx` | PARTIAL | NOT VISIBLE | NOT VISIBLE | Explore dataset structure | EXECUTED (SQL Blocked) | UI Error: DUCKDB_UNKNOWN_RUNTIME_ERROR |
| `bcctnhapTTKT_24122024.xlsx` | PARTIAL | NOT VISIBLE | NOT VISIBLE | Explore dataset structure | EXECUTED (SQL Blocked) | UI Error: DUCKDB_UNKNOWN_RUNTIME_ERROR |
| `good_customer.csv` | PARTIAL | 15 | NOT VISIBLE | Explore dataset structure | EXECUTED (SQL Blocked) | UI Error: DUCKDB_UNKNOWN_RUNTIME_ERROR |
| `broken_customer.csv` | PARTIAL | 15 | NOT VISIBLE | Explore dataset structure | EXECUTED (SQL Blocked) | UI Error: DUCKDB_UNKNOWN_RUNTIME_ERROR |
| `good_finance.csv` | PARTIAL | 15 | NOT VISIBLE | Explore dataset structure | EXECUTED (SQL Blocked) | UI Error: DUCKDB_UNKNOWN_RUNTIME_ERROR |
| `broken_finance.csv` | PARTIAL | 15 | NOT VISIBLE | Explore dataset structure | EXECUTED (SQL Blocked) | UI Error: DUCKDB_UNKNOWN_RUNTIME_ERROR |
| `good_inventory.csv` | PARTIAL | 15 | NOT VISIBLE | Explore dataset structure | EXECUTED (SQL Blocked) | UI Error: DUCKDB_UNKNOWN_RUNTIME_ERROR |
| `broken_inventory.csv` | PARTIAL | 15 | NOT VISIBLE | Explore dataset structure | EXECUTED (SQL Blocked) | UI Error: DUCKDB_UNKNOWN_RUNTIME_ERROR |
| `good_operations.csv` | PARTIAL | 15 | NOT VISIBLE | Explore dataset structure | EXECUTED (SQL Blocked) | UI Error: DUCKDB_UNKNOWN_RUNTIME_ERROR |
| `broken_operations.csv` | PARTIAL | 15 | NOT VISIBLE | Explore dataset structure | EXECUTED (SQL Blocked) | UI Error: DUCKDB_UNKNOWN_RUNTIME_ERROR |
| `good_performance.csv` | PARTIAL | 15 | NOT VISIBLE | Explore dataset structure | EXECUTED (SQL Blocked) | UI Error: DUCKDB_UNKNOWN_RUNTIME_ERROR |
| `broken_performance.csv` | FAIL | NOT VISIBLE | NOT VISIBLE | - | PENDING | File input not found (ERR_NETWORK_CHANGED) |
| `good_revenue.csv` | PARTIAL | 15 | NOT VISIBLE | Explore dataset structure | EXECUTED (SQL Blocked) | UI Error: DUCKDB_UNKNOWN_RUNTIME_ERROR |
| `broken_revenue.csv` | PARTIAL | 15 | NOT VISIBLE | Explore dataset structure | EXECUTED (SQL Blocked) | UI Error: DUCKDB_UNKNOWN_RUNTIME_ERROR |

## 4. Multi-File Results Table

| Group | Status | Row Count | Quality/Trust | Action Selected | Runtime Preview | Error / Blocker |
|-------|--------|-----------|---------------|-----------------|-----------------|-----------------|
| Group 1 (2 Excel files) | PASS | NOT VISIBLE | NOT VISIBLE | Explore dataset structure | EXECUTED | - |
| Group 2 (2 Excel files) | PARTIAL| NOT VISIBLE | NOT VISIBLE | Understand inventoryDiscover... | NO_RUN_BUTTON | Could not find Run/Execute button. |
| Group 3 (5 Excel files) | FAIL | NOT VISIBLE | NOT VISIBLE | - | PENDING | TIMEOUT: Timed out waiting for intake understanding. |
| Group 4 (All good CSVs) | FAIL | NOT VISIBLE | NOT VISIBLE | - | PENDING | TIMEOUT: Timed out waiting for intake understanding. |
| Group 5 (All CSVs) | FAIL | NOT VISIBLE | NOT VISIBLE | - | PENDING | TIMEOUT: Timed out waiting for intake understanding. |

## 5. Execution Counts
- **Total single files structurally processed:** 16/17 (Reclassified to PARTIAL due to DUCKDB UI Errors)
- **Total multi-file groups reaching runtime execution:** 1/5
- **Overall files/groups effectively verified:** 0 (Strict validation requires non-error chart output)

## 6. Blockers
- **Count blocked by `NO_RUN_BUTTON`:** 1 (Group 2)
- **Count blocked by `TIMEOUT`:** 3 (Groups 3, 4, 5)
- **Count blocked by `DUCKDB_UNKNOWN_RUNTIME_ERROR`:** 16 (All Single Files & Group 1 reclassified)
- **Count blocked by other errors:** 1 (`ERR_NETWORK_CHANGED` on `broken_performance.csv`)

## 7. Exact Runtime Errors
- **DUCKDB_UNKNOWN_RUNTIME_ERROR / SQL Blocked:** "SQL preview is empty or blocked." Occurs when legacy `trend` or `group_by` actions are triggered without required `dimensions` or `measures`. The `status` loosely registered as "EXECUTED" but the chart/table output failed strictly.
- **NO_RUN_BUTTON Error:** "Could not find Run/Execute button." (Occurred when attempting to execute `"Understand inventoryDiscover stock movement and inventory value."` in Group 2). Hypothesis: The generated `AnalysisOpportunity` lacks valid `dimensions` or `measures` needed by the `Investigation` session to construct a valid runtime plan, causing the UI to disable navigation.
- **TIMEOUT Error:** "Timed out waiting for intake understanding." (Occurred during intake of > 2 files in Groups 3, 4, 5).
- **Console Errors (broken_performance.csv):** Multiple instances of `Failed to load resource: net::ERR_NETWORK_CHANGED`.

## 8. Paths
- **Results JSON:** `/home/ubuntu/n8n2erpnext/LightBI/ui-audit/real-sample-e2e-localfirst-runtime-2026-06-14/results.json`
- **Screenshots:** `/home/ubuntu/n8n2erpnext/LightBI/ui-audit/real-sample-e2e-localfirst-runtime-2026-06-14/`

## 9. Product Truth Statement
**FAIL / LOCAL-FIRST PARTIAL:** The initial report evaluated PASS too loosely based purely on reaching an `EXECUTED` state. Strict evaluation requires a successful preview result, no `Execution Failed` banner, no `DUCKDB_*` error, and a non-error chart/table output. Under this strict criteria, all 16 previously passed single files are reclassified to PARTIAL/FAIL because screenshots reveal they suffer from `DUCKDB_UNKNOWN_RUNTIME_ERROR`.

This happens because invalid `trend` and `group_by` actions are generated from legacy opportunities without the required dimensions (e.g., trend shape expects a date/time dimension but none detected explicitly), resulting in an empty or blocked SQL preview. The application cannot claim the frontend is fully correct until the `AnalysisOpportunity` validation pipeline ensures no invalid actions are offered to the user.
