# ADR-122: Canonical Understanding Pipeline

- Status: Accepted for staged migration
- Date: 2026-07-10
- Scope: Phase 0 architecture and domain-support truth freeze

## Context

LightBI currently has three overlapping ways to interpret the same dataset. Home uses the legacy guided-investigation path for perspectives, business views, and suggestions while also building an `understanding-core` result and adapting it into the Understanding Next contract. `understanding-next` retains an independent profiler, detector, affinity engine, question engine, action guard, and orchestrator. AI and runtime then consume outputs from these parallel contracts.

The semantic registry contains broad recognition research, but its generic `domain` and `coverageStatus` fields are not a proven product support boundary. Recognition must not imply a supported BA conclusion or executable action.

## Current runtime paths

```text
source/currentDataset
  +-> Home -> guided-investigation-pipeline
  |            -> business-signal-detector
  |            -> context-semantic-dictionary + semantic-registry
  |            -> perspectives -> business views -> question plans/suggestions
  |            -> legacy dataset-understanding -> legacy AI briefing fallback
  |
  +-> Home -> source-input -> understanding-core
  |            -> column-profile -> ontology/signal-engine -> question-engine
  |            -> next-adapter -> Understanding Next UI + primary AI briefing
  |
  +-> understanding-next/orchestrator (independent callable peer)
               -> dataset-profiler -> signal-detector
               -> domain affinity/stakeholder/question fit
               -> runtime-action-guard

selected action
  -> Home action adapter -> runtime intent -> runtime plan
  -> Investigation session + AI briefing
  -> backend preview executor
  -> guarded JS sandbox fallback for narrow cases
  -> validation -> chart / BA decision brief / deep analysis
```

This diagram records current truth; it is not an endorsement of multiple authorities.

## Decision

`understanding-core` is the only future canonical understanding engine. The target path is:

```text
Raw Source
  -> Source Adapter
  -> Canonical Full-File Profile + Representative Evidence Sample
  -> Canonical Context Semantic Detector
  -> Mapping Decision + Ambiguity Resolution
  -> Grain / Relationship / Quality Inference
  -> DatasetUnderstandingArtifactV1
  -> Domain Pack Activation Gate
  -> Question / Metric / Action Fit
  -> Runtime Guard
  -> DuckDB Execution
  -> Evidence + Trust
  -> UI / AI Briefing / Export
```

The ownership decisions are:

1. `semantic-registry.ts` owns atomic semantic signals only.
2. `understanding-core/domain-support-manifest.ts` owns product/domain support truth.
3. `understanding-core/signal-engine.ts` becomes the sole mapping authority after migration.
4. Partial/research recognition cannot activate MVP decision support.
5. `DOMAIN_SAMPLE_MATRIX.md` is descriptive until replaced by machine-readable acceptance evidence.
6. Legacy and Next engines remain frozen adapters/port sources until parity and held-out proof allow deletion.
7. AI is a consumer of the canonical artifact and cannot independently reinterpret raw schema.

## Phase 0 support truth

No domain entry is activated in the new manifest during Phase 0. The registry's 62 implicit/current `supported` signals are provisionally classified as `experimental`, and its 259 `partial` signals as `research_only`, until Phase 1 corpus evidence can justify `mvp_proven`. This classification is audit metadata only and does not change runtime behavior.

The product boundary to prove remains SME commerce, retail, and distribution across revenue/sales, inventory, delivery/operations, and conditional finance/customer/performance capabilities. Broad ontology recognition is not a support claim.

## Consequences

- Existing behavior remains unchanged during Phase 0.
- No detector, alias, UI, runtime, domain pack, or legacy module changes in this phase.
- Current parallel-path inconsistencies remain known debt until their scheduled phases.
- Later support claims require machine-readable corpus evidence, mapping precision, action success, and metric correctness.
- Unknown or ambiguous recognition is preferred over an unsupported support claim.

## Rollback

Phase 0 adds only documentation and an unreferenced empty manifest. Roll back by deleting this ADR, the ownership map, the Phase 0 audit/inventory, and `domain-support-manifest.ts`. No runtime rollback or data migration is required.
