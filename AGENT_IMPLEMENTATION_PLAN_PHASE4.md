# Implementation Plan: ROADMAP-MVP-V1 Phase 4 (Revised)

## Goal
Explicitly separate "what the dataset can support structurally" (Capabilities) from "what is meaningful to investigate" (Opportunities) within the Dataset Understanding layer using a conservative, incremental migration path that avoids a breaking sweep.

## Contract Changes (`dataset-understanding-contract.ts`)

1. **Introduce New Core Types**:
```typescript
export type DatasetCapability = {
  id: string;
  actionType: "group_by" | "trend" | "distribution" | "relationship";
  dimensions: string[];
  measures: string[];
};

export type AnalysisOpportunity = {
  id: string;
  label: string;
  basedOnSignals: string[];
  source: "business_view" | "question_suggestion" | "heuristic";
  actionType: "group_by" | "trend" | "distribution" | "relationship";
  dimensions: string[];
  measures: string[];
};
```

2. **Extend `DatasetUnderstanding` Non-destructively**:
Add `capabilities` and `opportunities` while preserving legacy fields for a safe transition.
```typescript
  capabilities: DatasetCapability[];
  opportunities: AnalysisOpportunity[];
  // Legacy compatibility fields (temporary bridge)
  availableAnalysis: AvailableAnalysisItem[];
  unavailableAnalysis: UnavailableAnalysisItem[];
```

## Logic Migration inside `createDatasetUnderstanding`

1. **Step 1: Build Opportunities & Capabilities Safely**
   - **Delivery Heuristic**: Continue generating the exact same explicit actions ("Shipment activity by route", etc.). Push these to BOTH `opportunities` and legacy `availableAnalysis` (or have `availableAnalysis` map directly from `opportunities`).
   - **Generic Generator**: Loop over measures/dimensions/time to generate structural permutations (e.g. `Measure X` by `Dim Y`). Push these ONLY to `capabilities`. 

2. **Step 2: Compatibility Bridge**
   - To preserve behavior and tests that depend on `availableAnalysis` during this incremental step, `availableAnalysis` will be populated exclusively from `opportunities`. 
   - `unavailableAnalysis` logic will remain unchanged.

## Consumer Updates

1. **`analysis-opportunity-actions.ts`**:
   - Update `generateAnalysisActions(understanding)` to consume `understanding.opportunities` primarily, falling back to `understanding.availableAnalysis` if `opportunities` is undefined (for older persisted states, though `createDatasetUnderstanding` will guarantee it).

2. **`decision-readiness-engine.ts`**:
   - Adjust readiness logic to evaluate `opportunities.length > 0` for its semantic coverage bonus, safely falling back to legacy `availableAnalysis` if `opportunities` is unavailable.

3. **`Home.tsx`**:
   - **No Changes Required!** Because we retain `unavailableAnalysis` and `availableAnalysis` (the latter mapped from opportunities), `Home.tsx` will naturally read the tighter opportunity list without any UI rework or naming updates.

## Verification / Tests
We will add/update targeted tests in `dataset-understanding-contract.test.ts` and `dataset-understanding-domain-coverage.test.ts`:
1. **Delivery Dataset**: Assert that it retains meaningful `opportunities` and passes them through the compatibility bridge to `availableAnalysis`.
2. **Generic Dataset**: Assert that it produces distinct `capabilities` (structural possibilities), while `opportunities` remains accurately restricted based on evidence.
3. **Compatibility Path**: Assert that existing action generation correctly consumes the mapped `opportunities` during migration.

## User Review Required
Does this conservative, incremental strategy meet your expectations for a non-breaking transition? Please approve so I can begin coding.
