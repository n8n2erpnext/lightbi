# ADR 098: Dataset Understanding Contract

## 1. Context
The BVQ (Business View & Questions) pipeline is technically complete and successful, but evaluating product success solely by whether it generates "Questions" is a UX failure. If a dataset has signals but fails to meet the strict criteria for a business view, it results in 0 questions, looking like a total failure to the user. 
However, 0 Questions ≠ 0 Understanding. The pipeline correctly identified signals; it just couldn't form a strict view. We need an explicit layer that captures this understanding.

## 2. Decision
We are introducing the **Dataset Understanding Contract (DU-1)** as a first-class output layer *after* Business Signals but *before* Perspectives/Views/Questions.

1. **Understanding is the Product**: The core output of LightBI is now the `DatasetUnderstanding`. 
2. **Questions are Optional Derived Artifacts**: A dataset with 0 Business Views and 0 Questions can still be successfully understood (Status: `partial`).
3. **No Legacy Heuristics**: Questions must NOT be generated directly from raw signals using greedy regex or heuristics. They must flow cleanly through the architecture: `Understanding -> Available Analysis -> Optional Questions`.
4. **Standalone Derived State**: The contract stands alone as a derived state in the Guided Investigation pipeline (`apps/desktop/src/lib`). It is not yet merged into the core Dataset model or `@lightbi/core-types`.

## 3. Consequences
- `createDatasetUnderstanding` will evaluate the signals and report status: `insufficient`, `partial`, or `understood`.
- Users will see exactly what the system knows (detected concepts, entities, available analysis) and what it is missing (unavailable analysis), avoiding the "empty state" problem.
- The UI will be updated in the next phase (DU-2) to render this understanding card.
