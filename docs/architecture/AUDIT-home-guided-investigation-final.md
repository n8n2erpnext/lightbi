# Final Home Purity Audit: Guided Investigation

**Date:** June 2026
**Target:** `apps/desktop/src/pages/Home.tsx`
**Status:** 🟢 **GREEN (Fully Compliant)**

## 1. Audit Matrix

| Component | Source | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Questions** | `guidedInvestigationResult.questionSuggestions` | ✅ GREEN | Heuristic/semantic matching fully eradicated. Card uses strict `evidenceSignals` and `confidenceScore`. |
| **Perspectives** | `guidedInvestigationResult.perspectives` | ✅ GREEN | Hardcoded Operations/Revenue tabs removed. |
| **Business Views** | `guidedInvestigationResult.businessViews` | ✅ GREEN | `PerspectiveBusinessViewMap` deleted. |
| **Selection State** | React `useState` w/ validation | ✅ GREEN | `useEffect` strictly nullifies invalid `selectedBusinessView` if the pipeline drops it on dataset switch. |
| **No Fallback Rule** | Explicit Empty UI States | ✅ GREEN | Code branch strictly renders "Select Perspective", "Awaiting View", or "No reliable questions". No semantic fallback exists. |
| **Traceability** | Domain Catalog via Pipeline | ✅ GREEN | `intentId` and `source` explicitly rendered on UI. |

## 2. Legacy Dependency Cleanup Status

| Legacy Import | Status | Classification | Notes |
| :--- | :--- | :--- | :--- |
| `dataset-capabilities.ts` | Removed | **Allowed (Clean)** | Zero references left in Home.tsx. |
| `semantic-fields.ts` | Removed | **Allowed (Clean)** | Semantic heuristics are dead in the Home tab. |
| `home-guidance.ts` | Active | **Allowed** | Only used for static Welcome/Hero UI strings. |
| `business-view-generator.ts` | Active | **Should Remove Later** | Still used for `generateBusinessViews(graph, datasetMap)` inside the `DataIntakeDrawer` upload flow. This does not violate the Explore Tab purity but should be migrated in Data Intake refactoring later. |

## 3. Test Suites Result
```
✓ src/lib/guided-investigation-pipeline.test.ts
✓ src/lib/question-suggestion-renderer.test.ts
✓ src/lib/question-plan-generator.test.ts
✓ src/lib/business-view-candidate-generator.test.ts
✓ src/lib/perspective-candidate-generator.test.ts
✓ src/lib/business-signal-detector.test.ts

Test Files  28 passed (28)
     Tests  242 passed (242)
```
`tsc --noEmit` verifies strict adherence to the new types.

## 4. Conclusion & Next Steps
`Home.tsx` is officially a pure, reactive consumer of the `Guided Investigation Pipeline`. The "Understand First, Question Later" philosophy is mechanically enforced by the code architecture.

**The Home wiring is safe to build upon.**

**Recommended Next Phase:**
Proceed to **Phase BVQ-8: Cross-Domain Validation Dataset Suite** to prove that the Phase TEST-1 matrix passes without cross-domain leakages.
