# Phase 4B2A: Compositional Relationship Shadow Resolution

Date: 2026-07-13

## Objective And Scope

Phase 4B2A adds a deterministic shadow resolver in `understanding-core`. It consumes the unchanged Phase 4B1 relationship candidate artifact and resolves six independent axes: relationship meaning, endpoint/key basis, extract-observed cardinality, temporal alignment, schema relationship, and operation compatibility.

This phase does not execute or approve join, append, compare, or reconciliation. It does not change production behavior, domain activation, metrics, questions, BA output, UI, AI, DuckDB, or runtime wiring.

## Contracts And Policy

- Artifact: `lightbi.relationship-resolution-shadow.v1`
- Policy: `lightbi.relationship-resolution-policy.v1`
- Policy SHA-256: `d671ec8e87b37d12f24e6fa53f4997c3ff86c0b98d245b27c0e0a47190314982`
- Candidate input: `lightbi.relationship-candidate-artifact.v1`
- Frozen candidate policy SHA-256: `6a615bac8756de8e2a3213a041943845726e71f2c8963956bdfe56bd074d5359`

The contracts preserve source identities and hashes, all upstream versions and hashes, pair coverage, candidate traces, key alternatives, evidence references, risks, limitations, and debt. Canonical output persists no raw key values.

## Axis Taxonomy

The machine-readable taxonomy is in `phase-4b2a-relationship-axis-taxonomy-audit.json`. Identity meaning is not cardinality; schema continuation is not append permission; sequential time is not continuation proof; operation compatibility is not operation permission. Dominance across axes is forbidden.

Every axis uses only `confirmed`, `probable`, `ambiguous`, `unknown`, or `unsupported_input`. An overall readiness label never hides the individual axis states.

## Rule Lattice And Independence

The resolver uses explicit `RR-*` rules and no weighted score. Candidate count and conflict absence are not support. Repeated evidence signatures are marked correlated. Dependency records preserve shared semantic, uniqueness, overlap, schema, period, duplicate, and operation evidence so the same fact cannot bootstrap certainty twice.

No total ranking is introduced. Candidate traces explicitly set `dominanceApplied: false`; future dominance remains legal only as an axis-local partial order with a strict independent-support superset and no worse conflict, risk, or limitation.

## Cardinality Boundary

Cardinality is named and scoped as extract-observed cardinality. Each observation records its key pair, matched/unmatched values, nulls, duplicates, maximum frequencies, directional overlap, fanout, temporal scope, and semantic/structural limitations. Even `confirmed observed_one_to_one` sets `businessCardinalityEstablished: false` and `joinAuthorized: false`.

## Key, Temporal, And Schema Resolution

Key resolution preserves all single and bounded composite alternatives. A sole candidate is not selected merely because it is sole; `selectedKeyPairId` remains null. Competing or incomparable alternatives remain ambiguous, while unresolved physical pairs cap certainty.

Temporal resolution uses only canonical full-file ranges represented by Phase 4B1. Filename and source-name periods are forbidden. Any apparent alignment retains partition/continuation debt and cannot authorize an operation.

Schema resolution is separate from operation safety. It requires the Phase 4B1 broad schema candidate plus compatible grain and no material semantic, measure, or structural conflict. Controlled drift remains probable; matching names alone are insufficient.

## Operation Compatibility And Risks

Operation compatibility represents mechanical plausibility only. Every result contains:

- `safetyApproved: false`
- `executionAuthorized: false`
- unresolved safety requirements
- blocking risks
- required later validation

All Phase 4B1 risks remain visible and none can be canceled. Risk absence cannot raise certainty. Many-to-many fanout, mixed grain, overlapping/snapshot rows, aggregate/detail double count, null-key loss, and unresolved key semantics can materially block compatibility.

## Candidate Preservation

The corpus audit proves complete trace coverage for 11 Phase 4B1 candidates and 10 key-pair occurrences. Candidate order is stable within each pair. Cardinality and operation alternatives, evidence/conflicts, risks, limitations, and debt are copied into trace or preservation references. No candidate, endpoint, key pair, relationship, or domain role is manufactured.

## Corpus Diagnostics

The separate expectation layer is `sample-corpus/relationship-resolution-expectations.v1.json`. All five bundles are evaluation-only and tuning-forbidden.

| Diagnostic | Result |
| --- | ---: |
| Bundles | 5 |
| Source occurrences | 12 |
| Pair occurrences | 9 |
| Relationship candidates | 11 |
| Key-pair occurrences | 10 |
| Fully unresolved | 0 |
| Partially resolved | 9 |
| Resolved with limitations | 0 |

Meaning states: 4 unknown, 4 ambiguous, 1 probable. Key states: 5 unknown, 3 probable, 1 ambiguous. Extract-observed cardinality: 5 unknown, 3 confirmed, 1 ambiguous. Temporal: 9 ambiguous. Schema: 6 unknown, 3 probable. Operation: 8 unknown, 1 ambiguous. These are validation diagnostics, not real-world relationship accuracy metrics.

## Logistics-Period Debt

The adjacent-period logistics candidate remains represented. Temporal certainty is prevented by explicit `insufficient_temporal_evidence` debt. Operation approval remains false, and upstream duplication/mixed-period risks remain visible. The resolver contains no bundle, filename, sheet, source-system, or sample-specific rule; the generic invariant is covered by a synthetic unresolved/partition-debt fixture.

## Multi-Domain Extension Boundary

A future domain pack may enrich evidence for universal identity, references, parent/detail, mapping bridge, schema continuation, aggregate/detail, and domain operation prohibitions. It may not directly confirm a relationship, select a key, set cardinality, approve an operation, weaken risks, bypass privacy, execute a join, inject sample/filename rules, or alter another domain. No SDK behavior is implemented here.

## Production Isolation And Preservation

- Phase 2 profiler/sampler behavior unchanged.
- Frozen Phase 3 semantic policy unchanged.
- Frozen Phase 4A grain policies unchanged.
- Phase 4B1 candidate policy unchanged.
- `finalRelationshipResolution.executed: true` only in shadow artifact.
- `joinSafety.executed: false`.
- `operationExecution.executed: false`.
- `productionWiring.executed: false`.
- `DOMAIN_SUPPORT_MANIFEST` remains empty.
- No measure additivity or aggregation safety is changed.

## Tests

The synthetic suite governs 40 named probes and checks axis orthogonality, fanout blocking, temporal debt, preservation, privacy, determinism, policy hashing, pair-order stability, and fail-closed behavior. The corpus suite evaluates every governed pair and writes `phase-4b2a-relationship-resolution-audit.json`.

Verification outcomes:

- Phase 4B2A synthetic and corpus: 2 files, 8 tests passed.
- Phase 4B1 through Phase 1/1B plus legacy detector regression matrix: 31 files, 239 tests passed.
- `npx tsc --noEmit`: passed.
- `git diff --check`: passed.
- Full desktop suite, run exactly once at the end: 119 files; 943 tests passed and the same 9 documented baseline tests failed.

The baseline failures remain three BA comparison timeouts, one guided-investigation assertion, three numeric-health expectations, and two virtual-dataset-planner expectations. No Phase 4B2A test failed and no baseline failure was repaired in this phase.

## Rollback

Remove the three `relationship-resolution-*` implementation modules, their two tests, their exports, the separate expectation file, and the three Phase 4B2A architecture outputs. No production or upstream artifact migration is required.

## Stop Condition

Phase 4B2A stops with shadow compositional signatures and explicit non-execution. Phase 4B2B join-safety validation/freeze, operation approval/execution, domain activation, SDK work, metrics, questions, actions, BA output, and runtime/AI/UI/DuckDB wiring have not begun.
