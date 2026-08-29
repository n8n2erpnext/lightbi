# AGENT HANDOFF — Execution Boundary & Legacy Mapping Audit

Date: 2026-06-15
Phase: Narrow Audit-Only Analysis Opportunity Validation

## Objective
Find the exact code path causing successful runtime attempts to render the red error UI "Execution Boundary Failed" and determine the root cause of the Group 2 `NO_RUN_BUTTON`.

## Audit Answers

**1. For table_preview / "Explore dataset structure and sample rows", what RuntimeIntent shape is created?**
`RuntimeIntent` is created with `expectedShape: "table"` (Ref: `analysis-runtime-contract.ts` line 56).

**2. What expectedOutput / chart type is created by runtime-planner-preview?**
It correctly passes through the shape as `"table"` with empty `dimensions` and `measures` arrays (Ref: `runtime-planner-preview.ts` line 72).

**3. What preview result shape is returned after execution?**
A `DuckDBPreviewResult` object is returned containing raw data rows and columns, but it does not carry an explicit shape string.

**4. Why does result-validator require "at least one measure" for a table preview?**
The `validatePreviewAgainstIntent` function enforces a fallback ternary: `intent.expectedShape === 'bar_chart' || intent.expectedShape === 'line_chart' ? 'trend' : 'summary'`. Because `"table"` does not match the first two, it is forced into the `"summary"` shape. The `validatePreviewRuntimeResult` function then strictly requires `measCols.length > 0` for any `"summary"`, failing the pure table preview (Ref: `result-validator-contract.ts` lines 66-68 and 127).

**5. Is table_preview incorrectly mapped to summary validation?**
**PROVEN FACT:** Yes. A raw table preview has no measures and is not a summary. `ExpectedResultContract` does not currently support a `"table"` shape natively, forcing the incorrect fallback.

**6. Is the failure in runtime intent, runtime plan, preview result, validator, or UI rendering?**
**PROVEN FACT:** The failure is exclusively in the **validator** (`result-validator-contract.ts`). The Sandbox execution succeeds and returns valid data, but the validator incorrectly fails it, causing the UI to render the boundary error.

**7. For Group 2 NO_RUN_BUTTON, what exact action object reaches Investigation?**
**PROVEN FACT:** No action object reaches Investigation. The screenshot `multi__Group_2__investigation_before.png` reveals a completely blank main content area (indicating a crashed React UI). The string `"Understand inventoryDiscover stock movement and inventory value."` logged in the E2E script is simply the concatenated text of a `noDataCard` placeholder from the Home screen (`home-guidance.ts` line 19).

**8. Does Group 2 lack actionType, dimensions, measures, rows, runtime plan, or safe SQL?**
It lacks all of them because an `InvestigationSession` was never successfully instantiated for Group 2. The application crashed during the multi-file batch processing phase on the Home screen.

**9. Is "Understand inventoryDiscover..." only a label rendering issue, or does the underlying action object violate runtime contract?**
**PROVEN FACT:** It is neither. The legacy mapping hypothesis for Group 2 is FALSE. Group 2 didn't fail because of an invalid opportunity mapping; it failed because the UI crashed before any opportunity was selected. 
*(Note: The legacy mapping hypothesis IS proven true for single files producing `DUCKDB_UNKNOWN_RUNTIME_ERROR: SQL preview is empty or blocked`. `analysis-opportunity-actions.ts` hardcodes `dimensions: []` and `measures: []` for legacy objects, which causes `analysis-runtime-contract.ts` to mark them as `blocked`, resulting in `executeLocalDuckDB` throwing an empty SQL error).*

**10. What is the smallest safe code fix?**
- **Validator Fix:** Update `ExpectedResultContract` and `validatePreviewAgainstIntent` to natively support `"table"` shape (or bypass the measure requirement if `intent.type === 'table_preview'`).
- **Legacy Action Fix:** In `analysis-opportunity-actions.ts`, do not map legacy `AnalysisOpportunity` objects to complex types (`trend`, `group_by`) unless they actually possess the required dimensions and measures. Map them to `table_preview` or exclude them if they lack metadata.

**11. What exact tests must be added before the fix?**
- `result-validator-contract.test.ts`: Add a test proving that a `RuntimeIntent` with `type: "table_preview"` and `expectedShape: "table"` validates successfully against a preview result with zero measures.
- `analysis-opportunity-actions.test.ts`: Add a test proving that legacy items without dimensions/measures do not generate `trend` or `group_by` actions that would be blocked by the runtime contract.

## Conclusions

We have cleanly separated hypotheses from proven facts by tracing the code. The execution boundary error is definitively a validator mapping bug. The Group 2 `NO_RUN_BUTTON` is definitively a UI crash, unrelated to analysis generation. The `DUCKDB_UNKNOWN_RUNTIME_ERROR` is definitively a legacy opportunity mapping bug. No product code was edited during this audit.
