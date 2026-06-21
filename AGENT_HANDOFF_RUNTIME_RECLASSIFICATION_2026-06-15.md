# AGENT HANDOFF — Runtime Evidence Reclassification

Date: 2026-06-15
Phase: Local-First Real Sample Runtime Evidence Reclassification

## Summary of Findings

Following the QA Override, the previous local-first runtime proof evidence has been rigorously re-examined based on strict criteria: `EXECUTED` only means an execution attempt occurred; a `PASS` requires a non-error chart/table UI output.

**Corrected Counts (Strict Evaluation):**
- **Strict PASS:** 0
- **Strict PARTIAL:** 17 (16 Single Files, 1 Multi-File Group)
- **Strict FAIL:** 4 (1 Single File, 3 Multi-File Groups)
- **Strict BLOCKED:** 1 (1 Multi-File Group)

Every case previously marked `PASS` (16 single files and Group 1) has been downgraded to `PARTIAL`.

## Downgraded Cases and Evidence

All 17 downgraded cases exhibit the exact same UI error in their `investigation_after.png` screenshots:
**UI Result:** `Execution Failed`
**Visible Error Text:** 
> "Execution Boundary Failed
> Validation boundary rejected the preview result due to insufficient quality or missing required data.
> - Summary shape requires at least one measure."

This applies to:
- All `.xlsx` single files (`Bao_cao_chi_tiet_...`, `DATA_XUAT`, `TỒN DỰ KIẾN HUBLAN`, `bcctnhapTTKT_...`)
- All `.csv` single files that successfully uploaded (`good_customer`, `broken_customer`, `good_finance`, `broken_finance`, `good_inventory`, `broken_inventory`, `good_operations`, `broken_operations`, `good_performance`, `good_revenue`, `broken_revenue`)
- Multi-File Group 1 (`multi__Group_1__investigation_after.png`)

## Proven Facts vs Root-Cause Hypotheses

**Proven Facts:**
- The frontend UI actively rejected the local runtime preview results for all `table_preview` ("Explore dataset structure") actions.
- The `result-validator-contract.ts` threw the "Summary shape requires at least one measure" warning, causing the frontend to render the red error banner.
- No cases produced a successful, non-error table or chart output.

**Root-Cause Hypotheses:**
1. **Validation Contract Bug (Hypothesis):** It is hypothesized that `validatePreviewAgainstIntent` maps `table` shape to `summary` shape for validation, which then triggers a failure when no measures are present (even though no measures are expected for a simple table preview).
2. **Legacy Opportunities Missing Fields (Hypothesis):** It is hypothesized that the `NO_RUN_BUTTON` (Group 2) and `DUCKDB_UNKNOWN_RUNTIME_ERROR: SQL preview is empty or blocked` / `Trend shape expects a date/time dimension` warnings may be caused by `analysis-opportunity-actions.ts` hardcoding `dimensions: []` and `measures: []` for all legacy opportunities regardless of the target `actionType`. This requires a code audit to prove.

## Smallest Next Code-Audit Phase

The next logical step is not to create new features, but to perform an **Execution Boundary & Legacy Mapping Audit** to verify the hypotheses above. The objective of the audit is to:
- Verify if `result-validator-contract.ts` improperly validates `table` shapes.
- Verify if `analysis-opportunity-actions.ts` improperly maps `dimensions` and `measures` for legacy `AnalysisOpportunity` objects.
