# Home Freeze Regression Verification Audit

## Objective
Verify that the massive UI deletions in Phase UX-6 (removing Explore/Investigate/Ask tabs, Perspective Selector, Advanced Guided Views, Ask Chat, and negative confidence scores) did not break the core Understanding-First workflow.

## Targets
- **Delivery Performance Reports**
- **Inventory Aging Report**

## Status
✅ **PASS**

---

## Verification Results

### 1. Delivery Performance Reports
- **File Upload:** Success
- **What LightBI Found (DU Card):** Rendered successfully without confidence scores or negative "Missing Signals" blocks.
- **Analysis Opportunities:** Rendered correctly.
- **Navigation:** Clicking "Investigate" routed successfully to `/investigation`.
- **Sandbox Execution & Chart:** Clicked "Run preview". The dataset rows were wired correctly, sandbox returned `result.rows.length: 1`, and the chart rendered successfully as `chartType: bar`.
- **Logs Output:**
  ```json
  [
    "TRACE [HOME] currentDataset.previewRows.length: 5",
    "TRACE [OPPORTUNITY] selectedAction.id: action_aa1",
    "TRACE [SESSION] rows.length: 5",
    "TRACE [SANDBOX] result.rows.length: 1",
    "TRACE [CHART] chartType: bar",
    "TRACE [CHART] chartType: bar"
  ]
  ```

### 2. Inventory Aging Report
- **File Upload:** Success
- **What LightBI Found (DU Card):** Rendered successfully without confidence scores.
- **Analysis Opportunities:** Rendered correctly.
- **Navigation:** Routed successfully to `/investigation`.
- **Sandbox Execution & Chart:** "Run preview" executed correctly. Sandbox returned 1 row, chart rendered as `bar`.
- **Logs Output:**
  ```json
  [
    "TRACE [HOME] currentDataset.previewRows.length: 5",
    "TRACE [OPPORTUNITY] selectedAction.id: action_gen_aa_1",
    "TRACE [SESSION] rows.length: 5",
    "TRACE [SANDBOX] result.rows.length: 1",
    "TRACE [CHART] chartType: bar",
    "TRACE [CHART] chartType: bar"
  ]
  ```

---

## Removed Sections Verification
The following sections were completely verified to be **REMOVED** from the `Home.tsx` rendering path:
- ❌ Explore / Investigate / Ask tabs
- ❌ Global Perspective Selector
- ❌ Business View Selector
- ❌ "Workspace Locked" and "Advanced guided views unavailable" states
- ❌ "Missing required signals" blocks
- ❌ Dataset Confidence %
- ❌ Ask anything chat box

## Conclusion
The Home page is successfully frozen as a strict, linear Understanding-First Entry Point.
The architecture is stable, TypeScript compilation passes without errors, and Playwright automated tests pass.

**Status:**
- Home is safe to freeze: **Yes**
- Investigation routing still works: **Yes**
- Charts still render: **Yes**
- DU-7 Runtime Execution is safe to start: **Yes**
