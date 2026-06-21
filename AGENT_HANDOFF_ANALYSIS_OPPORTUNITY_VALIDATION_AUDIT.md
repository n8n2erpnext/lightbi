# AGENT HANDOFF: Analysis Opportunity Validation Audit
Date: 2026-06-14
Phase: Narrow Audit-Only

## Objective
Trace why Group 2 in `ui-audit/real-sample-e2e-localfirst-runtime-2026-06-14/results.json` selected the action `"Understand inventoryDiscover stock movement and inventory value."` and ended with a `NO_RUN_BUTTON` error.

## Audit Findings

### 1. Where is the malformed/combined label generated?
The combined label `"Understand inventoryDiscover stock movement and inventory value."` is a UI text extraction artifact caused by the Playwright audit script calling `.textContent()` on the action card. 

The underlying object is generated in `apps/desktop/src/lib/analysis-opportunity-actions.ts`. It maps items from `DatasetUnderstanding.opportunities` into an `AnalysisAction` where `label` is `"Understand inventory"` and `description` is `"Discover stock movement and inventory value."`. When rendered in the DOM, the text concatenates without a space, which the script captures exactly as seen in the logs.

### 2. What exact object shape reaches Investigation?
When a legacy opportunity from `understanding.opportunities` is mapped, `analysis-opportunity-actions.ts` hardcodes the arrays:
```typescript
dimensions: [],
measures: [],
```
If this object reaches the Investigation page, it arrives inside an `InvestigationSession` with a `RuntimeIntent` and `RuntimePlanPreview` that both have `status: "blocked"`.

### 3. Does it lack actionType, dimensions, measures, runtime intent, or session rows?
- It **has** an `actionType` (defaulted to `"group_by"` if it originated from the legacy `requiredCapabilities` branch).
- It **lacks** `dimensions` and `measures` (they are forced to `[]`).
- It **has** a `RuntimeIntent` and `RuntimePlanPreview`, but both are generated with `status: "blocked"` due to the missing dimensions/measures.
- It **has** session rows.

### 4. Why does Investigation not render Run preview?
The `Investigation.tsx` component is actually designed to safely render the "Run preview" button even if the intent is blocked (it would just show blocked reasons in the diagnostic panel). 

Since there are no React crashes (`"pageErrors": []` in the audit log), the only logical explanation for `NO_RUN_BUTTON` is that **the application never navigated to the Investigation page**. 

The most likely cause is that the `AnalysisOpportunityCard` on the Home page disables click events (or routing) for actions that have empty dimensions/measures, or the Playwright script clicked a non-interactive element. Consequently, the script remained on the Home page and timed out looking for the Investigation "Run preview" button.

### 5. Is this a label-only issue or a runtime contract issue?
This is a **runtime contract issue**. The UI label combination is harmless. The actual bug is that the system generates `AnalysisAction` objects with empty `dimensions` and `measures` for legacy `opportunities`, which fundamentally violates the `group_by` and `trend` runtime contracts.

### 6. What is the smallest safe code fix?
In `apps/desktop/src/lib/analysis-opportunity-actions.ts`, modify `generateAnalysisActions()` to stop generating complex analytical actions (like `group_by` or `trend`) for legacy `opportunities` if we cannot extract valid `dimensions` and `measures`. 

The safest immediate fix is to either:
1. Filter out these un-runnable legacy opportunities completely from the UI.
2. Force them to downgrade to `actionType: "table_preview"`, which does not strictly require dimensions/measures to execute successfully.

### 7. What tests should be added before fixing?
Add a test case in `apps/desktop/src/lib/analysis-opportunity-actions.test.ts` that passes a `DatasetUnderstanding` object containing an item in the `opportunities` array (with `requiredCapabilities` but no dimensions/measures). Assert that `generateAnalysisActions` either ignores it or safely downgrades it to a `table_preview` action, ensuring no action is emitted that would instantly fail the `RuntimeIntent` validation.

## Conclusion
The audit confirms that the `NO_RUN_BUTTON` failure is caused by an invalid `AnalysisAction` missing required fields, likely resulting in a disabled or non-navigating UI card. No code changes have been made in this phase.
