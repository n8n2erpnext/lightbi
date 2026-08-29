# Implementation Plan: ROADMAP-MVP-V1 Phase 1

## Goal
Strengthen `BusinessSignal` detection quality using cheap local evidence (sample values, types, cardinality, distinct-ratio) inside `business-signal-detector.ts` without changing the pipeline shape or downstream contracts.

## Proposed Changes

### `apps/desktop/src/lib/business-signal-detector.ts`
- **Extend `DetectorInput`**:
  Add optional fields to the `columns` array elements to accept cheap local evidence:
  ```typescript
  sampleValues?: any[];
  distinctRatio?: number;
  uniqueValuesCount?: number;
  ```
- **Update Heuristics in `detectBusinessSignals`**:
  Instead of hardcoding `profileSupport = 10` for any defined `type`, implement:
  - **Date-like parsing**: If `TAXONOMY[id].type === "time"`, and `col.type === "date"` or `sampleValues` parse as dates -> `profileSupport += 20`.
  - **Low-cardinality status**: If `id` is a status (e.g., `status`, `delivery_status`) and `uniqueValuesCount <= 15` or `distinctRatio < 0.1` -> `profileSupport += 20`.
  - **Numeric/categorical reinforcement**:
    - If `type === "measure"` and `col.type === "number"` or `sampleValues` are numeric -> `profileSupport += 20`. If categorical/string, `profileSupport -= 10` (to avoid over-promoting categorical fields).
    - If `type === "dimension"` and it's a string -> `profileSupport += 10`.
  - **Distinct-ratio hints**: If `id` is an identifier (e.g., `shipment`, `order`, `sku`) and `distinctRatio > 0.8` -> `profileSupport += 15`.

### `apps/desktop/src/lib/business-signal-detector.test.ts`
- Update existing tests to utilize the new optional fields in `DetectorInput` to prove the signal boosting behavior.
- Add new test blocks to specifically verify:
  - Date-like boosting
  - Status low-cardinality boosting
  - Numeric measure reinforcement
  - Distinct-ratio identifier hints

## Verification Plan
1. Run `pnpm exec vitest run src/lib/business-signal-detector.test.ts src/lib/business-signal-detector.coverage.test.ts src/lib/business-signal-detector.real-vietnamese.test.ts src/lib/guided-investigation-pipeline.test.ts src/lib/guided-investigation-pipeline.cross-domain.test.ts src/lib/dataset-understanding-contract.test.ts src/lib/dataset-understanding-domain-coverage.test.ts`
2. Run `pnpm test`
3. Ensure no downstream consumers break due to the changes.
