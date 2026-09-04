# LightBI Micro Semantic Brain V1 Implementation Plan — 2026-09-04

Status: approved implementation plan; not started
Date: 2026-09-04
Scope: staged construction, evaluation, and integration of the local Micro Semantic Brain
Supersedes: none
Superseded by: none
Primary sources: ../../../adr/ADR-124-micro-semantic-brain-vector-inference.md, ../../../architecture/micro-semantic-brain-vector-inference.md, ../../../architecture/phase-3a-semantic-candidate-evidence-verification.md, ../../../architecture/phase-3b2a-semantic-resolution-shadow.md, ../../../project-book/LIGHTBI_PROJECT_BOOK.md

## Purpose

Convert the approved Micro Brain architecture into a safe sequence that can be implemented without destabilizing the current canonical understanding engine, Focus, Deep BA, BA Step 2, or Road-to-1.0 release work.

The initial Brain corpus is an engineering synthesis task. The executor is expected to build and curate the knowledge corpus from reusable business knowledge and existing LightBI contracts/corpus evidence; the owner should not need to manually write thousands of knowledge cards.

## Starting Truth

- `semantic-registry.ts` is the canonical vocabulary authority.
- Phase 3A candidate generation is currently lexical/contextual and explicitly has no embeddings.
- Phase 3B evidence aggregation and semantic resolution preserve conflicts and prioritize abstention.
- Domain support and governed metric authorization are separate from recognition.
- Current Focus/BA experimental worktree is dirty and must not be used for Micro Brain implementation.
- Documentation work in this plan remains isolated from product code.

## Branch / Worktree Rule

Implementation begins from a clean product worktree created from the accepted product head at execution time. Do not layer Micro Brain work onto an unrelated dirty experiment or an immutable Internal generation.

## Phase Sequence

| Phase | Objective | Exit gate |
| --- | --- | --- |
| MB-0 | baseline + contracts | frozen benchmark, schema, provenance, no runtime change |
| MB-1 | knowledge corpus synthesis | validated source corpus with positive/negative/relation coverage |
| MB-2 | vector compiler + index | deterministic BM25 + TF-IDF/LSA compiled artifact |
| MB-3 | retrieval shadow | per-column Brain retrieval runs without changing semantic decisions |
| MB-4 | evidence bridge | Brain candidates/conflicts enter versioned candidate pipeline conservatively |
| MB-5 | inferred-domain state + UI | support/inference status and evidence visible to users |
| MB-6 | Focus / Deep BA / BA Step 2 | evidence-bound inferred-domain analysis propagates without status loss |
| MB-7 | acceptance + cutover | corpus, counterfactual, performance, and regression gates pass |

Each phase produces its own machine evidence and can stop without forcing the next phase.

## MB-0 — Baseline and Contract Freeze

Tasks:

1. snapshot current registry count, alias collisions, semantic corpus results, resolver state counts, and domain-support manifests;
2. add versioned Brain knowledge schema and compiled-index manifest schema;
3. freeze proposed candidate-origin/evidence provenance contracts without wiring production consumers;
4. define evaluation corpus additions for unseen terminology, negative knowledge, and unsupported domains;
5. record low-end reference-machine benchmark procedure.

Exit: contract tests pass, no current semantic output changes, and baseline artifacts are reproducible.

## MB-1 — Brain Corpus Synthesis

Create the corpus under a dedicated source tree such as `apps/desktop/src/lib/understanding-core/micro-brain/knowledge/` or a packaging-equivalent path selected during MB-0.

The executor synthesizes knowledge in batches:

1. core semantic primitives: identity, time, money, quantity, status, unit, location, event, snapshot, flow;
2. current LightBI strengths: commerce, retail, inventory, logistics/distribution, finance/accounting, operations, customer, performance;
3. high-risk confusion knowledge: COD/revenue, price/revenue, balance/flow, snapshot/flow, tax/revenue, repeated parent totals, currency/UOM;
4. long-tail business vocabulary sufficient to test generalization without claiming official support;
5. formula/evidence cards only where requirements and blockers are explicit.

Target maturity is approximately 10 MB of source knowledge, but corpus quality and coverage gates outrank byte count.

Every batch must run schema validation, duplicate/conflict detection, canonical bridge checks, and held-out terminology probes before promotion from `draft` to `validated`.

Exit: source corpus has stable version/hash, no fixture-specific truth leakage, and documented positive/negative/relation coverage.

## MB-2 — Deterministic Vector Compiler

Implement an offline compiler that emits runtime-ready immutable artifacts. A practical split is a pinned build-time Python/Numpy/Scipy tool for TF-IDF/SVD generation plus a TypeScript runtime reader/query path; exact build technology is frozen only after MB-0 dependency audit.

Compiler tasks:

1. deterministic semantic-unit extraction from validated cards;
2. normalized word/bigram/character n-gram feature construction;
3. TF-IDF vocabulary + IDF table;
4. BM25 document statistics/index;
5. truncated SVD/LSA projection with an initial 256-dimension target;
6. normalized dense document vectors;
7. concept/relation/negative-knowledge metadata tables;
8. manifest with source/compiler/tokenizer/vector versions and hashes;
9. byte-stable or logically stable reproducibility test on identical input.

Runtime artifacts should support sparse query multiplication against the projection without loading a model-training stack into the desktop application.

Exit: same source/config produces the same logical index identity; retrieval unit tests and size checks pass.

## MB-3 — Retrieval Shadow Mode

Add a query-signature builder from the canonical physical artifact and bounded representative evidence. Run Brain retrieval beside existing Phase 3A without changing candidate or resolution outputs.

Capture for every tested column:

- normalized query signature;
- top sparse and dense matches;
- fused parent concepts;
- positive/negative relation hits;
- retrieval similarity/ranks;
- whether an explicit canonical bridge exists.

Exit: measurable candidate-recall gain on new terminology, no production consumer, deterministic shadow output, and acceptable resource profile.

## MB-4 — Brain Evidence Bridge

Introduce a new versioned candidate/evidence contract rather than silently redefining Phase 3A V1. Brain retrieval may add `micro_brain_registry_bridge`, `micro_brain_open_concept`, and relation-only evidence.

Rules:

1. vector retrieval alone cannot create probable/confirmed semantics;
2. Brain evidence cannot count as full-file physical corroboration;
3. negative Brain knowledge is preserved as conflict/blocker evidence;
4. open concepts remain open and cannot impersonate the nearest registry signal;
5. canonical bridges require explicit validated knowledge metadata;
6. existing exact lexical candidates remain independent evidence and are never downgraded merely because Brain retrieval differs.

Run in shadow resolution first and compare with the pre-Brain resolver on every governed corpus case.

Exit: recall improves on approved probes, existing canonical precision/abstention is not materially degraded, all collisions and counterfactuals stay within allowed states.

## MB-5 — Inferred Domain State and Understanding UI

Add a domain-inference artifact that consumes evidence-bearing concepts and emits inferred domain hypotheses separately from official domain-pack support.

UI requirements:

- show `Domain source: Semantic inference` when applicable;
- show official support state independently;
- show resolved/inferred/unresolved concept counts;
- expose evidence and conflict provenance;
- use the approved unsupported-domain disclosure;
- avoid branding the mechanism as generative AI.

Exit: supported and inferred domains are visually distinguishable, evidence is inspectable, and no UI surface turns inference state into official support.

## MB-6 — Focus, Deep BA, and BA Step 2 Propagation

Extend the shared analysis context so downstream BA modes receive:

```text
semantic provenance
semantic resolution state
domain inference state
domain support state
analysis mode
metric/formula authorization
limitations and evidence references
```

For unsupported domains, permit `evidence_bound_inferred_domain` analysis only after generic grain and aggregation safety pass. Descriptive grouping/ranking can execute where current generic contracts make it safe. Formula-derived observations require complete declared inputs, compatible units/time basis, and explicit inferred status.

Do not let narrative code recalculate raw metrics independently or hide an inferred-domain warning.

Exit: Focus, Deep BA, and BA Step 2 produce the same factual values from the same governed execution result, preserve provenance, and never promote inferred semantics into supported facts.

## MB-7 — Acceptance and Production Cutover

Final gates:

1. registry/corpus regression is green;
2. held-out terminology recall improves against the MB-0 baseline;
3. no material increase in false supported mappings;
4. COD/revenue, price/revenue, balance/flow, snapshot/flow and repeated-total negative probes pass;
5. unsupported-domain fixtures show inference disclosure and safe abstention;
6. index determinism/rebuild identity passes;
7. package size, cold-load memory, and query latency are measured on the reference machine;
8. no network dependency exists for Brain retrieval;
9. full release-authoritative test suites remain green.

Production cutover requires an explicit review of the new authority boundary. Shadow artifacts may ship internally before they are allowed to affect semantic decisions.

## Proposed Product-Code Ownership

Expected new ownership boundary:

```text
apps/desktop/src/lib/understanding-core/micro-brain/
  contracts.ts
  knowledge-schema.ts
  query-signature.ts
  sparse-retrieval.ts
  vector-retrieval.ts
  retrieval-fusion.ts
  evidence-bridge.ts
  domain-inference.ts
  index-loader.ts
  *.test.ts
```

Compiler/tooling location is selected in MB-0 after dependency audit. Generated index artifacts must never be hand-edited.

Existing files likely touched only at explicit integration phases include `semantic-candidate-contracts.ts`, `semantic-candidate-engine.ts`, contextual evidence contracts/policy, semantic resolver policy, domain support/domain pack projection, and shared Understanding UI/analysis contracts.

## Test Corpus Additions

At minimum add fixtures for unknown abbreviations, translated headers, generic headers with discriminative values, same-header/different-domain counterfactuals, long-tail unsupported domains, vector-near-but-wrong concepts, negative relation pairs, and cross-file context that must not become circular proof.

The test oracle must specify allowed states and forbidden mappings, not only one expected winner.

## Rollback Strategy

- MB-0/MB-1/MB-2 are additive and have no runtime effect.
- MB-3 shadow retrieval can be disabled by removing its observer wiring.
- MB-4 remains behind a versioned candidate bridge until acceptance; rollback selects the pre-Brain candidate contract.
- MB-5/MB-6 UI/analysis consumers must tolerate Brain artifacts being absent.
- No persisted user data migration is required for V1 unless a later phase explicitly approves one.

## Stop Conditions

Stop and investigate instead of tuning around the failure if:

- Brain retrieval improves recall only by broadly increasing ambiguous/incorrect candidates;
- similarity begins to function as hidden confidence;
- a negative knowledge probe is bypassed by positive similarity;
- unsupported domain inference activates an official metric/action without its manifest gate;
- runtime needs online inference to meet acceptable quality;
- compiled footprint or low-end performance materially harms the local-first experience.

## Source Bookmarks

- [`../../../adr/ADR-124-micro-semantic-brain-vector-inference.md`](../../../adr/ADR-124-micro-semantic-brain-vector-inference.md) — accepted authority decision.
- [`../../../architecture/micro-semantic-brain-vector-inference.md`](../../../architecture/micro-semantic-brain-vector-inference.md) — algorithm and knowledge contract.
- [`../../../architecture/phase-3a-semantic-candidate-evidence-verification.md`](../../../architecture/phase-3a-semantic-candidate-evidence-verification.md) — current lexical candidate boundary.
- [`../../../architecture/phase-3b2a-semantic-resolution-shadow.md`](../../../architecture/phase-3b2a-semantic-resolution-shadow.md) — current conservative resolver rules.
- [`../../../project-book/LIBRARY_RULES.md`](../../../project-book/LIBRARY_RULES.md) — documentation and execution-record governance.
