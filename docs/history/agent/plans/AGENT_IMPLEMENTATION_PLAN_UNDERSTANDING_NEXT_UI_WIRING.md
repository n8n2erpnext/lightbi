# AGENT_IMPLEMENTATION_PLAN_UNDERSTANDING_NEXT_UI_WIRING.md

## Scope of Work

This plan implements a **LIMITED** UI wiring of the `understanding-next` pipeline into the application frontend.

### 1. `UnderstandingNextCard.tsx`
**File to create:** `apps/desktop/src/components/analysis/UnderstandingNextCard.tsx`
- **Props:** `DatasetUnderstandingResult`
- **Responsibilities:**
  - Display document metrics clearly separated: `sourceRowCount`, `sampleRowCount`, `parsedRowCount`.
  - Display `documentType`, `grain`, and `detectedDomains`.
  - Explicitly show finance domain as "Not implemented".
  - Render `dirtySignals` with clear warnings.
  - List `perspectives` and `recommendedQuestions`.
  - Display `availableActions` and `unavailableActions` (with reasons).
  - Use exact copy guidelines: "Detected", "Recommended questions", "Needs review", "Sample preview", "Not implemented". Never use "fully understood".

### 2. `Home.tsx` Wiring
**File to modify:** `apps/desktop/src/pages/Home.tsx`
- Conditionally invoke `createDatasetUnderstandingResult(input)` **only** if the `currentDataset` is a local file (e.g., `sourceType !== "virtual_business_view"` and dataset `status === "ready"`).
- For virtual business views, retain the existing `DatasetUnderstandingCard` and `guided-investigation-pipeline`.
- Do not delete the old pipeline or semantic graph components.

### 3. Investigation & Runtime Handoff
**File to modify:** `apps/desktop/src/lib/investigation-session.ts` and potentially Investigation components.
- Handoff `availableActions` to the session.
- Intercept action execution: if `actionKind === "data_quality_review"`, **BLOCK** DuckDB execution with a user-facing review state.
- Ensure that the execution boundary correctly presents source/sample/result rows distinction.

## Verification Steps
1. Typescript compilation: `npx tsc --noEmit --pretty false`
2. Understanding unit tests: `npx vitest run src/lib/understanding-next --reporter=verbose --pool=forks`
3. End-to-End sample coverage: `npx playwright test e2e/sample_data_domain_coverage.spec.ts -g "BHX_PHIEUXUAT|motodetail|bcctnhapTTKT|PLU|QUAN_LY"`
