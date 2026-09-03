# Architecture Library

> Current architecture contracts, model documents, phase records, and machine evidence.

## Read this shelf correctly

- Start with the Project Book before using this directory as authority.
- Files that describe models/contracts are architecture source material; later code/Git audit can supersede docs-derived assumptions.
- `phase-*` Markdown files are chronological design/closure records. Read later phases before treating older decisions as current.
- `*.json` files are machine evidence/governance artifacts. Many are consumed by tests/scripts and their paths are intentionally frozen until CI/code consumers are fully mapped.
- ADRs are kept in [`../adr/`](../adr/); historical audits and handoffs are kept in [`../history/`](../history/).

## Shelf summary

- Model/contract/architecture Markdown: **46**
- Phase records: **63**
- Machine evidence JSON: **354**

## Model and contract documents

- [`artifact-model.md`](./artifact-model.md) — Export Artifact Model
- [`business-signal-registry-contract.md`](./business-signal-registry-contract.md) — Business Signal Registry Contract
- [`business-view-question-pipeline-contract.md`](./business-view-question-pipeline-contract.md) — Business View Question Pipeline Contract
- [`business-view-registry-v1.md`](./business-view-registry-v1.md) — Business View Registry V1 Design
- [`commerce-erpnext-revenue-mirror.md`](./commerce-erpnext-revenue-mirror.md) — Optional Commerce → ERPNext Revenue Mirror
- [`chart-model.md`](./chart-model.md) — Chart Architecture Model
- [`dashboard-model.md`](./dashboard-model.md) — Dashboard Architecture Model
- [`data-view-model.md`](./data-view-model.md) — Data View Architecture
- [`dataset-model.md`](./dataset-model.md) — Dataset Model Architecture
- [`dataset-recipe-model.md`](./dataset-recipe-model.md) — LightBI Dataset Recipe Model
- [`dataset-understanding-layer.md`](./dataset-understanding-layer.md) — Dataset Understanding Layer
- [`domain-knowledge-catalog-v1.md`](./domain-knowledge-catalog-v1.md) — Domain Knowledge Catalog V1
- [`domain-knowledge-coverage-matrix-v1.md`](./domain-knowledge-coverage-matrix-v1.md) — Domain Knowledge Coverage Matrix V1
- [`domain-model.md`](./domain-model.md) — LightBI Domain Model
- [`execution-backend-model.md`](./execution-backend-model.md) — Execution Backend Model
- [`execution-strategy.md`](./execution-strategy.md) — Execution Strategy Model
- [`export-model.md`](./export-model.md) — Export Architecture Model
- [`frontend-boundary.md`](./frontend-boundary.md) — Frontend Boundary Model
- [`future-team-realtime-infrastructure-direction.md`](./future-team-realtime-infrastructure-direction.md) — Future Team / Realtime BA Infrastructure Direction (draft)
- [`insight-model.md`](./insight-model.md) — Insight Architecture Model
- [`intent-model.md`](./intent-model.md) — Analytical Intent Model
- [`materialization-model.md`](./materialization-model.md) — Materialization Strategy Model
- [`narrative-model.md`](./narrative-model.md) — Analytical Narrative Model
- [`persistence-model.md`](./persistence-model.md) — Persistence Model Architecture
- [`perspective-model.md`](./perspective-model.md) — Perspective Model Architecture
- [`planner-model.md`](./planner-model.md) — Planner Model Architecture
- [`question-classification.md`](./question-classification.md) — Question Classification Model
- [`question-context.md`](./question-context.md) — Question Context Model
- [`question-first-model.md`](./question-first-model.md) — LightBI Question-First UX Model
- [`question-template-model.md`](./question-template-model.md) — Question Template Architecture
- [`recipe-model.md`](./recipe-model.md) — Recipe Model Architecture
- [`recipe-planner-model.md`](./recipe-planner-model.md) — Recipe Planner Model
- [`relationship-discovery-scoring.md`](./relationship-discovery-scoring.md) — Relationship Discovery Scoring
- [`road-to-1-0-trust-release-contract.md`](./road-to-1-0-trust-release-contract.md) — Road to 1.0 Trust, Release, and Official Identity Contract
- [`render-contract.md`](./render-contract.md) — Rendering Contract Architecture Model
- [`runtime-dataset-model.md`](./runtime-dataset-model.md) — Runtime Virtual Dataset Model
- [`runtime-model.md`](./runtime-model.md) — Runtime Model Architecture
- [`schema-model.md`](./schema-model.md) — Schema Model Architecture
- [`semantic-model.md`](./semantic-model.md) — Semantic Model Architecture
- [`source-capability-model.md`](./source-capability-model.md) — Source Capability Model Architecture
- [`source-registry.md`](./source-registry.md) — Source Registry Architecture
- [`storage-model.md`](./storage-model.md) — LightBI Storage Architecture Model
- [`virtual-dataset-planner.md`](./virtual-dataset-planner.md) — Virtual Dataset Planner Architecture
- [`visualization-contract.md`](./visualization-contract.md) — Visualization Contract Model
- [`visualization-engine.md`](./visualization-engine.md) — Visualization Engine Model
- [`workspace-model.md`](./workspace-model.md) — Analytical Workspace Model

## Phase records

These records explain how the current architecture was reached. They are evidence/history, not a shortcut around current contracts.

- [`phase-0-semantic-support-audit.md`](./phase-0-semantic-support-audit.md) — Phase 0 Semantic and Support Audit
- [`phase-1-corpus-verification.md`](./phase-1-corpus-verification.md) — Phase 1 / 1B Acceptance Corpus Verification
- [`phase-2-profiler-sampling-verification.md`](./phase-2-profiler-sampling-verification.md) — Phase 2 Canonical Profiler and Sampling Verification
- [`phase-3a-semantic-candidate-evidence-verification.md`](./phase-3a-semantic-candidate-evidence-verification.md) — Phase 3A Semantic Candidate and Evidence Verification
- [`phase-3a1-candidate-coverage-reconciliation.md`](./phase-3a1-candidate-coverage-reconciliation.md) — Phase 3A.1 Candidate Coverage Reconciliation
- [`phase-3a2-acceptance-truth-governance.md`](./phase-3a2-acceptance-truth-governance.md) — Phase 3A.2 Acceptance Truth Governance
- [`phase-3b1-1-context-discriminativeness.md`](./phase-3b1-1-context-discriminativeness.md) — Phase 3B1.1 Context Discriminativeness And Policy Hash Hardening
- [`phase-3b1-contextual-evidence-aggregation.md`](./phase-3b1-contextual-evidence-aggregation.md) — Phase 3B1 Contextual Evidence Aggregation
- [`phase-3b2a-semantic-resolution-shadow.md`](./phase-3b2a-semantic-resolution-shadow.md) — Phase 3B2A Semantic Resolution Shadow Verification
- [`phase-3b2b-resolution-validation-policy-freeze.md`](./phase-3b2b-resolution-validation-policy-freeze.md) — Phase 3B2B Resolution Validation And Policy Freeze
- [`phase-4a1-1-grain-candidate-coverage.md`](./phase-4a1-1-grain-candidate-coverage.md) — Phase 4A1.1 Grain Candidate Coverage and Universal Primitive Completeness
- [`phase-4a1-grain-candidate-evidence.md`](./phase-4a1-grain-candidate-evidence.md) — Phase 4A1 Universal Grain Candidate and Evidence Foundation
- [`phase-4a2a-compositional-grain-shadow-resolution.md`](./phase-4a2a-compositional-grain-shadow-resolution.md) — Phase 4A2A Compositional Grain Shadow Resolution
- [`phase-4a2b-grain-resolution-validation-policy-freeze.md`](./phase-4a2b-grain-resolution-validation-policy-freeze.md) — Phase 4A2B Grain Resolution Validation And Policy Freeze
- [`phase-4b1-cross-source-relationship-candidates.md`](./phase-4b1-cross-source-relationship-candidates.md) — Phase 4B1 Cross-Source Relationship Candidates
- [`phase-4b2a-compositional-relationship-shadow-resolution.md`](./phase-4b2a-compositional-relationship-shadow-resolution.md) — Phase 4B2A: Compositional Relationship Shadow Resolution
- [`phase-4b2b-relationship-validation-policy-freeze.md`](./phase-4b2b-relationship-validation-policy-freeze.md) — Phase 4B2B Relationship Validation And Policy Freeze
- [`phase-4c1-canonical-readiness-trust-foundation.md`](./phase-4c1-canonical-readiness-trust-foundation.md) — Phase 4C1 Canonical Readiness And Trust Foundation
- [`phase-4c2-readiness-validation-policy-freeze.md`](./phase-4c2-readiness-validation-policy-freeze.md) — Phase 4C2 Readiness Validation And Policy Freeze
- [`phase-5a-canonical-runtime-adapter.md`](./phase-5a-canonical-runtime-adapter.md) — Phase 5A Canonical Runtime Adapter
- [`phase-5b-controlled-legacy-canonical-comparison.md`](./phase-5b-controlled-legacy-canonical-comparison.md) — Phase 5B Controlled Legacy And Canonical Comparison
- [`phase-5b1-paired-legacy-replay-and-gate-closure.md`](./phase-5b1-paired-legacy-replay-and-gate-closure.md) — Phase 5B1 Paired Legacy Replay And Gate Closure
- [`phase-5b2-aggregation-authority-divergence-disposition.md`](./phase-5b2-aggregation-authority-divergence-disposition.md) — Phase 5B2 Aggregation Authority And Divergence Disposition
- [`phase-5b3-aggregation-guard-shadow-design.md`](./phase-5b3-aggregation-guard-shadow-design.md) — Phase 5B3 Aggregation Guard Shadow Design
- [`phase-5b4-aggregation-intent-and-decision-use-policy.md`](./phase-5b4-aggregation-intent-and-decision-use-policy.md) — Phase 5B4 Aggregation Intent And Decision-Use Policy
- [`phase-5b5-aggregation-restriction-projection.md`](./phase-5b5-aggregation-restriction-projection.md) — Phase 5B5 Aggregation Restriction Projection
- [`phase-5b6-actual-contract-shadow-sidecar.md`](./phase-5b6-actual-contract-shadow-sidecar.md) — Phase 5B6 Actual Runtime Contract Shadow Sidecar
- [`phase-5b6a-build-and-capture-feasibility.md`](./phase-5b6a-build-and-capture-feasibility.md) — Phase 5B6A Build and Capture Feasibility
- [`phase-5b6b-build-integrity-restoration.md`](./phase-5b6b-build-integrity-restoration.md) — Phase 5B6B Build Integrity Restoration
- [`phase-5m1-commerce-domain-and-metric-foundation.md`](./phase-5m1-commerce-domain-and-metric-foundation.md) — Phase 5M1 Commerce Domain And Metric Foundation
- [`phase-5m2-commerce-question-action-generation.md`](./phase-5m2-commerce-question-action-generation.md) — Phase 5M2 Canonical Commerce Question And Action Generation
- [`phase-5m3-governed-runtime-execution.md`](./phase-5m3-governed-runtime-execution.md) — Phase 5M3 Governed Runtime Execution
- [`phase-5m4-phase5-acceptance-closure.md`](./phase-5m4-phase5-acceptance-closure.md) — Phase 5M4 Acceptance Closure
- [`phase-6a-canonical-consumer-cutover.md`](./phase-6a-canonical-consumer-cutover.md) — Phase 6A Canonical Artifact Consumer Cutover
- [`phase-6b-advanced-cutover-and-legacy-retirement.md`](./phase-6b-advanced-cutover-and-legacy-retirement.md) — Phase 6B Advanced Canonical Cutover And Legacy Production Retirement
- [`phase-6b1-verification-closure.md`](./phase-6b1-verification-closure.md) — Phase 6B.1 Final Regression Verification Closure
- [`phase-6b2-regression-repair.md`](./phase-6b2-regression-repair.md) — Phase 6B.2 Canonical Consumer Boundary Regression Repair
- [`phase-7-mvp-proof-and-release-gate.md`](./phase-7-mvp-proof-and-release-gate.md) — Phase 7 MVP Proof And Release Gate
- [`phase-7r1-core-signal-recall-remediation.md`](./phase-7r1-core-signal-recall-remediation.md) — Phase 7R1 Core Signal Recall Remediation
- [`phase-7r11-mvp-release-gate-retest.md`](./phase-7r11-mvp-release-gate-retest.md) — Phase 7R1.1 MVP Release Gate Retest
- [`phase-7r2-action-runtime-alignment.md`](./phase-7r2-action-runtime-alignment.md) — Phase 7R2 - Advertised Action And Runtime Preflight Alignment
- [`phase-7r3-metric-correctness-remediation.md`](./phase-7r3-metric-correctness-remediation.md) — Phase 7R3 - Verified Metric Correctness And Required Family Coverage
- [`phase-7r31-required-family-closure.md`](./phase-7r31-required-family-closure.md) — phase-7r31-required-family-closure
- [`phase-7r32-conditional-gross-profit-closure.md`](./phase-7r32-conditional-gross-profit-closure.md) — Phase 7R3.2 - Conditional Gross Profit Eligibility And Execution Closure
- [`phase-7r33-authentic-operational-evidence-discovery.md`](./phase-7r33-authentic-operational-evidence-discovery.md) — Phase 7R3.3 - Authentic Operational Evidence Discovery And Candidate Freeze
- [`phase-7r34-authentic-anchored-corpus-construction.md`](./phase-7r34-authentic-anchored-corpus-construction.md) — Phase 7R3.4 - Authentic-Anchored Semi-Synthetic ERP Corpus Construction
- [`phase-7r35-corpus-130-engine-validation.md`](./phase-7r35-corpus-130-engine-validation.md) — Phase 7R3.5 - Corpus 1.3.0 Governed Engine Validation
- [`phase-7r36-gross-profit-runtime-closure.md`](./phase-7r36-gross-profit-runtime-closure.md) — Phase 7R3.6 Gross-Profit Runtime Closure
- [`phase-7r37-inventory-runtime-closure.md`](./phase-7r37-inventory-runtime-closure.md) — Phase 7R3.7 - Governed Inventory Snapshot Eligibility And Execution Closure
- [`phase-7r38-mvp-release-gate-retest.md`](./phase-7r38-mvp-release-gate-retest.md) — Phase 7R3.8 - Complete MVP Release Gate Retest
- [`phase-7r4-mvp-candidate-packaging-and-release-closure.md`](./phase-7r4-mvp-candidate-packaging-and-release-closure.md) — Phase 7R4 - MVP Candidate Packaging And Release Closure
- [`phase-7r41-repository-safe-corpus-release-closure.md`](./phase-7r41-repository-safe-corpus-release-closure.md) — Phase 7R4.1 Repository-Safe Corpus Release Closure
- [`phase-8a-production-full-source-boundary-closure.md`](./phase-8a-production-full-source-boundary-closure.md) — Phase 8A Production Full-Source Boundary Closure
- [`phase-8b-production-evidence-interaction-closure.md`](./phase-8b-production-evidence-interaction-closure.md) — Phase 8B Production Evidence Interaction Closure
- [`phase-8c-functional-blocker-remediation-closure.md`](./phase-8c-functional-blocker-remediation-closure.md) — Phase 8C Functional Blocker And Remediation Closure
- [`phase-8d-functional-ui-feature-closure.md`](./phase-8d-functional-ui-feature-closure.md) — Phase 8D Production MVP Feature Reachability And Functional UI Closure
- [`phase-8d1-final-checkpoint-closure.md`](./phase-8d1-final-checkpoint-closure.md) — Phase 8D.1 Final Checkpoint Closure
- [`phase-8d1-production-multisource-closure.md`](./phase-8d1-production-multisource-closure.md) — Phase 8D.1 Production Multi-Source Canonical Dataset And Relationship Closure
- [`phase-8e-code-separation-and-cleanup-closure.md`](./phase-8e-code-separation-and-cleanup-closure.md) — Phase 8E Code Separation And Cleanup Closure
- [`phase-8e-final-checkpoint-closure.md`](./phase-8e-final-checkpoint-closure.md) — Phase 8E Final Checkpoint And Classification Closure
- [`phase-8f-core-ui-functional-parity-closure.md`](./phase-8f-core-ui-functional-parity-closure.md) — Phase 8F Core/UI Functional Parity Closure
- [`phase-8f1-ready-action-runtime-closure.md`](./phase-8f1-ready-action-runtime-closure.md) — Phase 8F.1 Ready-Action Runtime Source Continuity Closure
- [`phase-8f2-multifile-operational-parity-closure.md`](./phase-8f2-multifile-operational-parity-closure.md) — Phase 8F.2 Multi-File Operational Parity Closure

## Machine evidence policy

`docs/architecture/*.json` remains in place during this cleanup phase. A path move is allowed only after the Code Map + Git/CI audit proves there is no static or dynamic consumer dependency.

For exhaustive machine-evidence lookup, use [`../project-book/SOURCE_CATALOG.md`](../project-book/SOURCE_CATALOG.md).
