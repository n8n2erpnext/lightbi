# Implementation Plan: ROADMAP-MVP-V1 Phase 3 (Wiring Step)

## Goal
Expose `DecisionReadiness` as a direct structured derivative of the Dataset Understanding flow, seamlessly integrating the Phase 3 engine without touching runtime logic or creating UI sprawl.

## Proposed Changes

### 1. Update `dataset-understanding-contract.ts`
- **Type Addition**: Add `readiness: DecisionReadiness` to the `DatasetUnderstanding` interface.
- **Input Addition**: Add `health?: DatasetHealthResult` to `CreateUnderstandingInput`.
- **Logic Integration**: Inside `createDatasetUnderstanding`, after constructing the `DatasetUnderstanding` object (but before returning it), invoke the `evaluateDecisionReadiness` engine using the constructed object and the provided health input. Attach the returned readiness object to the final returned `DatasetUnderstanding`.

### 2. Update `apps/desktop/src/pages/Home.tsx` (Minimal Integration)
- **Dependency Update**: Import `DatasetHealthResult` type if not already present.
- **Call Update**: Update the `createDatasetUnderstanding` invocation (around line 389) to pass `health: datasetHealthResult || undefined`.
- **Memo Update**: Add `datasetHealthResult` to the `useMemo` dependency array for `datasetUnderstanding` (around line 397).
- *Crucially*: No UI components in `Home.tsx` will be touched. The readiness data simply becomes available on the core state object for future UI or AI consumers.

### 3. Update Tests
- **`dataset-understanding-contract.test.ts`**: The existing tests will inherently generate and validate the `readiness` field as part of `createDatasetUnderstanding`. I will add a quick assertion to ensure `readiness.tier` is correctly populated in the tests.
- **`analysis-opportunity-actions.test.ts`**: Add mock `readiness` objects where required to satisfy strict TypeScript checking.

## Scope Limits
- No new UI components will be built in `Home.tsx` to display the score yet.
- No backend/runtime/DU-8 modifications.
- No new evidence sources beyond the existing `DatasetHealthResult` and `DatasetUnderstanding`.

## User Review Required
Does this minimal "structured derivative" wiring approach align with your expectations for keeping the scope tight and local? Please approve before I begin code execution.
