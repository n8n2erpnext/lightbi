# Milestone 8.5: Guided Investigation (Business View Pipeline)

## Status: Planned

## Context
Following the implementation of Milestone 8 (Business Confidence), an architectural audit revealed that the Question Engine was generating questions blindly based on dataset schema, rather than being guided by the Business View context. This milestone aims to correct the core question generation pipeline to strictly enforce `Data -> Signal -> Perspective -> Business View -> Question`.

## Phases

- **Phase BVQ-1: Pipeline Contract** (COMPLETED)
  - Formalize the pipeline shapes (`BusinessSignal`, `PerspectiveCandidate`, `BusinessViewCandidate`, `QuestionPlan`, `QuestionSuggestion`).
  - Ban the dataset fallback loop.
- **Phase BVQ-2A: Business Signal Registry Architecture Lock** (COMPLETED)
  - Created ADRs 085, 086, 087 to enforce canonical semantic signals.
  - Defined `BusinessSignalRegistry` contract.
  - Audited violations in the current downstream flow.
- **Phase BVQ-2B: Business Signal Detector Implementation** (COMPLETED)
  - Implement the engine that scans semantic columns and relationships to output valid `BusinessSignal` arrays.
  - Supports scoring, Vietnamese alias normalization, and duplicate candidate merging.
- **Phase BVQ-3: Perspective Candidate Generator** (COMPLETED)
  - Implement dynamic perspective generation based strictly on available signals.
  - Outputs `PerspectiveCandidate` array ranked by multi-signal evidence score.
- **Phase BVQ-4A: Business View Registry V1 Audit & Design** (COMPLETED)
  - Audited existing codebase to ensure zero capabilities are lost.
  - Defined V1 Business View Registry covering Operations, Revenue, Inventory, Customer, and Performance.
- **Phase DK-1: Existing Domain Knowledge Consolidation** (COMPLETED)
  - Exhausively cataloged all domains scattered across `home-guidance.ts`, capabilities, and templates.
  - Created Domain Knowledge Catalog and ADR-090 for preservation.
- **Phase DK-2: Domain Knowledge Catalog Layer** (COMPLETED)
  - Established `docs/domain-catalog/` structure to formally separate Knowledge from Execution.
  - Authored canonical catalogs for Operations, Revenue, Inventory, Customer, Performance, and Finance.
  - Defined ADR-091 and extension models for future domain packs.
- **Phase DK-3: Machine-Readable Domain Catalog Registry** (COMPLETED)
  - Created TS execution replica of Markdown catalog (`domain-knowledge-catalog.ts`).
  - Implemented 14 stringent validation tests to ensure logic parity and semantic validity.
- **Phase BVQ-4B: Business View Candidate Generator Implementation** (COMPLETED)
  - Implemented generator that dynamically reads from `DOMAIN_KNOWLEDGE_CATALOG_V1`.
  - Computes `requiredMatchRatio`, `optionalMatchRatio`, and `averageSignalConfidence` purely as an evaluator function.
  - Passes 10 critical validation tests, including automatic awareness of new Registry entries.
- **Phase BVQ-5: Question Planner Implementation**
- **Phase BVQ-5: Question Planner**
  - Generate questions purely from the `BusinessViewCandidate` constraints.
- **Phase BVQ-6: Home Wiring Cleanup**
  - Remove all hardcoded maps from the UI.
  - Wire `Home.tsx` to the new pipeline.
- **Phase BVQ-7: Cross-domain dataset validation**
  - Prove that the Phase TEST-1 matrix now securely passes without cross-domain leakages.
