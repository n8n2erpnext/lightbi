# ROADMAP-MVP-V1 Phase 2: Grain hint in Dataset Understanding

I have successfully completed Phase 2: Adding a semantic `grainHint` to `DatasetUnderstanding`.

## Changes Made
- **Extended `DatasetUnderstanding` Contract**: Added `grainHint` with a union type of `"event" | "entity" | "snapshot" | "summary" | "unknown"` to `apps/desktop/src/lib/dataset-understanding-contract.ts`.
- **Implemented Deterministic Heuristics**: Added logic in `createDatasetUnderstanding` to infer the grain hint directly from the array of detected business signals:
  - `"event"`: Identified by operations/delivery signals (`shipment`, `order`, `route`, `driver`, etc.).
  - `"snapshot"`: Identified by inventory/state signals (`stock_age`, `stock_status`, `inventory`, etc.).
  - `"entity"`: Conservatively identified by entity identifier signals (`customer`, `sku`) without temporal context.
  - `"summary"`: Conservatively identified by time + measures but no identifiers.
  - `"unknown"`: Used gracefully as a fallback.
- **Added Evidence Tests**: Wrote dedicated unit tests in `dataset-understanding-contract.test.ts` and `dataset-understanding-domain-coverage.test.ts` to assert that correct datasets receive the expected hint.
- **Updated Mocks**: Updated mock `DatasetUnderstanding` instances in downstream tests (like `analysis-opportunity-actions.test.ts`) to ensure strict typescript checking remains green.

## Validation Results
- **Targeted Vitest**: Successfully ran the isolated test suite on the VPS: `19 passed`.
- **Full Vitest**: Successfully ran the entire desktop module test suite: `330 passed`.
- No downstream execution or AI routing behavior was affected. The core semantic structure is simply richer now, satisfying the acceptance criteria.
