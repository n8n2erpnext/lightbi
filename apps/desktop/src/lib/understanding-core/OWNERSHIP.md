# Understanding Ownership Freeze

Status: Phase 0 architecture freeze. This document classifies the current modules; it does not change runtime behavior.

## Ownership rules

- `semantic-registry.ts` owns atomic signal definitions only.
- `understanding-core` is the only future canonical understanding engine.
- `domain-support-manifest.ts` owns product/domain support truth.
- Adapters may translate contracts but may not independently profile, detect, score, activate domains, or generate questions.
- UI, AI, execution, charting, and export consume canonical artifacts; they do not own raw-data understanding.

## understanding-core

| Module | Classification | Frozen responsibility |
|---|---|---|
| `contracts.ts` | canonical, legacy compatibility | Existing signal/question/action contracts. Phase 2 physical profiling uses independent versioned contracts. |
| `source-input.ts` | canonical | Source-neutral input construction. |
| `profiling-contracts.ts` | canonical | Versioned physical source, column profile, structural issue, representative evidence, provenance, limitation, and `DatasetUnderstandingArtifactV1` contracts. |
| `profiler.ts` | canonical | Full-matrix physical profiling, header/data-region selection, and Phase 2 physical artifact construction. No semantic inference. |
| `representative-sampler.ts` | canonical | Deterministic source-indexed evidence sampling with issue, null, rare-value, parse-failure, and mixed-type supplementation. |
| `semantic-candidate-contracts.ts` | canonical | Versioned Phase 3A candidate, evidence, conflict, observation, provenance, limitation, and candidate-artifact contracts. These contracts contain no final mapping state. |
| `semantic-candidate-engine.ts` | canonical | Deterministic Phase 3A candidate generation from the unchanged semantic registry and Phase 2 physical evidence. Retains collisions and conflicts; does not resolve or rank candidates. |
| `contextual-evidence-contracts.ts` | canonical | Versioned Phase 3B1 family-level evidence profiles, provenance, conflict, debt, limitation, and unresolved aggregation artifacts. |
| `contextual-evidence-policy.ts` | canonical | Deterministic evidence-family, independence, deduplication, bounded-magnitude, and policy-hash rules. |
| `contextual-evidence-aggregator.ts` | canonical | Fail-closed aggregation of existing Phase 3A evidence. Preserves candidate identity/order and never selects, ranks, rejects, or finalizes candidates. |
| `semantic-resolution-contracts.ts` | canonical shadow | Versioned Phase 3B2A resolution, trace, independence, dominance, debt, limitation, and isolation contracts. |
| `semantic-resolution-policy.ts` | canonical shadow, Phase 3B2B frozen | Deterministic rule lattice and SHA-256 policy identity; v2 excludes representative-only families from independent support and uses no weighted confidence score. |
| `semantic-resolver.ts` | canonical shadow | Conservative semantic resolution for tests and verification only. No production consumer is wired. |
| `grain-candidate-contracts.ts` | canonical shadow | Versioned Phase 4A1/4A1.1 contracts for universal row-unit candidates, resolved/ambiguous/unresolved identity alternatives, temporal and measure behavior, evidence, diagnostics, scoped limitations, risk, and debt. Contains no final grain state. |
| `grain-candidate-policy.ts` | canonical shadow, Phase 4A1.1 frozen | Domain-neutral, hash-governed candidate policy v2. Bounds composite search, protects physical identity hypotheses from uniqueness false positives, and forbids ranking, final grain, relationships, joins, and domain activation. |
| `grain-candidate-engine.ts` | canonical shadow | Produces source-local candidate/evidence artifacts from frozen Phase 2/3 inputs plus aligned rows. Physical fallback never manufactures semantic meaning, and no production consumer is wired. |
| `grain-resolution-contracts.ts` | canonical shadow | Versioned Phase 4A2A compositional signature, axis state, trace, evidence-independence, limitation, and debt contracts. |
| `grain-resolution-policy.ts` | canonical shadow | Deterministic Phase 4A2A rule lattice and canonical policy hash; weighted scoring and total grain ranking are forbidden. |
| `grain-resolver.ts` | canonical shadow | Resolves source-local grain axes in test/shadow mode while preserving all candidates and debt. Relationships and production wiring remain unexecuted. |
| `grain-resolution-validation.ts` | canonical shadow validation | Phase 4A2B audit/freeze gate for axis evidence, cross-axis dependencies, forbidden certainty, and monotonicity. It does not alter resolution or runtime behavior. |
| `relationship-candidate-contracts.ts` | canonical shadow | Phase 4B1 caller-bounded relationship, endpoint, overlap, cardinality, schema, temporal, grain, risk, and isolation contracts. |
| `relationship-candidate-policy.ts` | canonical shadow | Deterministic bounded relationship-candidate policy and canonical policy hash; selection and operation safety are forbidden. |
| `relationship-candidate-engine.ts` | canonical shadow | Generates privacy-safe source-pair alternatives and evidence inside a declared bundle. It never resolves relationships or authorizes operations. |
| `column-profile.ts` | legacy compatibility inside core | Existing preview-oriented `ColumnHealth` helper retained unchanged for current signal behavior. It is not the canonical full-file physical profiler. |
| `ontology.ts` | canonical, migration incomplete | Registry-backed universal rule projection. It must eventually carry recognition status and conflict policy. |
| `signal-engine.ts` | canonical, legacy compatibility | Existing runtime-facing signal behavior retained unchanged. It is not the Phase 3A candidate artifact and remains migration-incomplete. |
| `question-engine.ts` | canonical, migration incomplete | Current core orchestration and question/action generation; later consumes domain support gates. |
| `domain-support-manifest.ts` | canonical | Product support contract and, after proof, support declarations. Empty in Phase 0. |
| `next-adapter.ts` | adapter | Translates core output to the Understanding Next UI contract. No independent understanding authority. |
| `index.ts` | canonical boundary | Public exports for core consumers. |
| `README.md` | canonical documentation | Core principles and migration notes. |
| `*.test.ts` in this directory | verification asset | Tests only; no production ownership. |

Phase 2 creates the physical portion of `DatasetUnderstandingArtifactV1` in `profiling-contracts.ts` and the canonical `profiler.ts`. Phase 3A adds candidate/evidence artifacts, Phase 3B1 aggregates contextual evidence, and Phase 3B2A adds isolated shadow semantic resolution. Phase 4A1 adds grain-candidate evidence; Phase 4A1.1 audits and completes universal candidate primitives. Phase 4A2A adds compositional grain shadow resolution only. Later-phase modules still not created here include relationship inference, production resolution wiring, `trust-engine.ts`, `runtime-guard.ts`, and final semantic artifact assembly.

## understanding-next

| Module | Classification | Frozen responsibility |
|---|---|---|
| `contracts.ts` | adapter contract / delete-later | Compatibility contract during migration. |
| `action-adapter.ts` | adapter | Converts Next actions for existing Investigation consumers. |
| `dataset-profiler.ts` | legacy-frozen / delete-later | Duplicate profiler; proven behavior may be ported in Phase 2. |
| `signal-detector.ts` | legacy-frozen / delete-later | Independent detector; must not gain new authority. |
| `semantic-domain-affinity.ts` | legacy-frozen / delete-later | Current generic-domain inference; not product support truth. |
| `stakeholder-fit-engine.ts` | legacy-frozen / downstream candidate | Fit logic may later consume the canonical artifact. |
| `question-fit-engine.ts` | legacy-frozen / downstream candidate | Question logic may later move behind canonical mappings and support gates. |
| `runtime-action-guard.ts` | legacy-frozen / delete-later | Current structural/fit gate; canonical runtime guard replaces it after parity. |
| `orchestrator.ts` | legacy-frozen / delete-later | Parallel understanding entry point. |
| `index.ts` | adapter boundary | Compatibility exports. |
| `README.md` | legacy documentation | Describes the recovery track, not final ownership. |
| `*.test.ts` in this directory | verification asset | Tests only; `real-sample.test.ts` contains missing-sample silent passes tracked by the Phase 0 audit. |

## Legacy and downstream modules

| Module | Classification | Frozen responsibility |
|---|---|---|
| `business-signal-detector.ts` | legacy-frozen / delete-later | Legacy signal registry builder and context-dictionary merger. |
| `guided-investigation-pipeline.ts` | legacy-frozen / delete-later | Parallel perspective/view/question pipeline currently used by Home. |
| `dataset-understanding-contract.ts` | legacy-frozen / delete-later | Legacy understanding contract/builder. |
| `context-semantic-dictionary.ts` | legacy-frozen / port-source | Existing context scoring; proven behavior migrates into core, then this peer authority is removed. |
| `domain-ba-playbooks.ts` | downstream consumer | BA definitions consuming canonical mappings and active/conditional packs. |
| `domain-knowledge-catalog.ts` | downstream consumer / legacy-frozen | Business knowledge only; cannot declare support or map raw fields. |
| `ai-briefing-generator.ts` | downstream consumer | Must eventually consume only `DatasetUnderstandingArtifactV1`. |
| Investigation runtime planners, guards, DuckDB execution, charting, export | downstream consumers | Execute guarded actions and render evidence; no semantic ownership. |
| `Home.tsx`, `Investigation.tsx` | downstream UI consumers | Current wiring remains unchanged in Phase 0. |

## Migration invariant

Until parity and held-out acceptance pass, legacy modules remain present and behavior remains unchanged. New understanding behavior must land only in the phase and file scope explicitly authorized by the canonical roadmap.
## Phase 4B2A Relationship Shadow Resolution

`relationship-resolver.ts` is the canonical future owner of compositional cross-source relationship resolution in shadow mode. It consumes Phase 4B1 artifacts only and owns no candidate generation, operation safety, execution, domain activation, metrics, questions, BA output, or production wiring. `relationship-resolution-policy.ts` is deterministic and sample-neutral; corpus bundles are validation-only and tuning-forbidden.

`relationship-resolution-validation.ts` owns the Phase 4B2B shadow freeze gate. It validates candidate-scoped extract cardinality, cross-axis isolation, risk/debt preservation, and operation non-approval. It does not select keys, approve safety, or wire production behavior. Relationship resolution policy v2 is frozen with pair-level cardinality explicitly unresolved while no key is selected.

## Phase 4C1 Capability Readiness

`readiness-engine.ts` owns canonical future capability-specific readiness judgment in shadow mode. `readiness-contracts.ts` keeps 34 atomic capabilities, 12 separate trust dimensions, blockers, debt, remediation, dependency edges, and a non-authoritative presentation projection. It does not own profiling, semantic/grain/relationship inference, safety approval, aggregation, domains, BA generation, or production wiring. Legacy trust/readiness scores remain unchanged until a later migration phase.

## Phase 4C2 Readiness Validation

`readiness-validation.ts` owns the canonical shadow conformance gate for artifact scope, governed state transitions, prerequisite acyclicity, critical blocker preservation, trust-ratio integrity, and presentation isolation. Readiness policy v2 is frozen with no-measure aggregation scoped as not applicable and zero-denominator ratios represented as null. The validator does not approve operations, aggregation, domains, runtime behavior, or production wiring.

## Phase 5A Runtime-Neutral Adapter

`canonical-runtime-contracts.ts`, `canonical-runtime-adapter-policy.ts`, and `canonical-runtime-adapter.ts` own a test/development-only, non-authoritative projection boundary. The adapter preserves canonical judgments and restrictions, has no production importer, is intentionally absent from the barrel export, and cannot approve, execute, persist, narrate, or replace legacy runtime authority.

## Phase 5B Controlled Comparison

`legacy-canonical-comparison-contracts.ts`, `legacy-canonical-comparison-policy.ts`, `legacy-observation-harness.ts`, and `legacy-canonical-comparison.ts` own observational test-only comparison. They preserve raw legacy and canonical observations, classify governed divergence and migration debt, and cannot modify either authority, runtime behavior, persistence, operations, or user-facing output.

## Phase 5B1 Paired Replay

`paired-legacy-replay-contracts.ts` and `paired-legacy-replay.ts` own test-only same-input proof and authentic legacy invocation binding. They distinguish exact/lossless/partial/synthetic/unavailable evidence and cannot infer legacy inputs from canonical conclusions, authorize migration, persist output or enter production flows.

## Phase 5B2 Aggregation Authority Audit

`aggregation-authority.test.ts` and Phase 5B2 audits own verification of legacy numeric SUM call paths, comparison mapping semantics, divergence identity and migration disposition. Comparison policy v2 treats physical summability and business-safe aggregation as partially comparable while retaining critical automatic-default conflicts. No runtime owner or canonical policy changes.

## Phase 5B3 Aggregation Guard Shadow

`aggregation-guard-shadow-contracts.ts`, `aggregation-guard-shadow-policy.ts`, and `aggregation-guard-shadow.ts` own a deterministic test/development-only simulation of a future aggregation boundary. The simulation preserves incoming plans and SQL, grants no approval or execution authority, is not barrel-exported, and has no production importer. Its replay and migration strategy artifacts are design evidence only.

## Phase 5B4 Aggregation Intent And Decision-Use Policy

`aggregation-intent-contracts.ts`, `aggregation-intent-policy.ts`, and `aggregation-intent-boundary.ts` own a deterministic test/development-only future migration policy. They separate physical support, intent, exploratory consent, metric correctness, display, BA/narrative use, and execution authority. They do not collect acknowledgement, define or execute metrics, approve operations, alter plans/SQL, activate domains, or enter production imports.

## Phase 5B5 Aggregation Restriction Projection Shadow

`aggregation-restriction-projection-contracts.ts`, `aggregation-restriction-projection-policy.ts`, and `aggregation-restriction-projection.ts` own a versioned test/development-only simulation of lossless aggregation lineage and restriction propagation across future plan, SQL-preview, result, chart, and BA boundaries. These modules are deliberately absent from the barrel export and have no production importer. They fingerprint but do not retain SQL, execute no query, mutate no plan, approve no operation or metric, collect no acknowledgement, emit no output, and grant no runtime or decision authority.
