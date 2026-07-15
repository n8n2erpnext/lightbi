# Phase 4A1 Universal Grain Candidate and Evidence Foundation

Date: 2026-07-12
Status: Complete as an isolated canonical shadow layer
Production wiring: Unchanged (`executed: false`)

Phase 4A1 is the v1 checkpoint. Its candidate completeness and diagnostics are superseded by the Phase 4A1.1 v2 corrective pass; upstream Phase 2/3 preservation statements remain applicable.

## Objective and scope

Phase 4A1 adds deterministic, versioned, domain-neutral evidence describing what a physical row might represent. It consumes the unchanged Phase 2 physical artifact, the frozen Phase 3 semantic-resolution artifact, and aligned full-file rows for bounded key and repetition analysis.

It produces alternatives only. It does not select, rank, confirm, or score a final grain. It does not infer cross-source relationships, join keys, domains, questions, actions, metrics, BA output, or runtime behavior.

## Universal grain model

`GrainCandidateArtifactV1` keeps row-unit class separate from candidate identity, optional parent identity, temporal basis, dimensions, measures, aggregation risks, structural limitations, and semantic dependencies. Universal row-unit alternatives are entity, event, document, line, snapshot, interval, aggregate, mapping, mixed, and unknown records. Industry row types are forbidden.

Every artifact retains the `unknown` alternative. `finalGrainResolution`, `crossSourceRelationships`, and `productionWiring` are explicit non-executed boundaries.

## Contracts and policy

- Artifact: `lightbi.grain-candidate-artifact.v1`
- Policy: `lightbi.grain-candidate-policy.v1`
- Composite width: at most three columns
- Eligible key columns: at most eight
- Composite evaluations: at most 92
- Evidence directions: supports, conflicts, mixed, neutral, unavailable
- Evidence families: identity, uniqueness/repetition, parent/child, temporal, dimension/measure, semantic compatibility, structural integrity, aggregation risk

The policy hash is canonical-JSON based. Object formatting and key order do not change it; semantic policy mutation does.

## Identity and parent evidence

Identity candidates require stable physical facts plus resolved identifier evidence or a preserved ambiguous identifier alternative. Uniqueness alone is insufficient. Technical columns, mixed/unknown physical types, sparse keys, measures, and unresolved numeric columns do not become business keys merely because they are unique.

Ambiguous identifier traces remain explicitly limited candidates. They carry resolver rule IDs and cannot establish final grain. Composite search is deterministic, source-column ordered, pruned, exact against aligned full-file rows, and bounded to width three.

Parent candidates require a repeated parent identifier, a more granular identity candidate, and observed variation below the parent. Coexisting identifiers alone are insufficient. Repeated parent attributes and measures are retained as duplication or aggregation risks.

## Temporal and measure behavior

Temporal evidence distinguishes event time, effective/start, end, snapshot, reporting period, absent basis, and unresolved basis. A date alone never proves event grain. Snapshot and interval classes remain alternatives only.

Numeric type alone never grants additivity. Rates, ratios, percentages, averages, ratings, codes, unit prices, balances, and unresolved numerics are conservative candidates. Repeated values within a mechanical parent group create `repeated_parent_measure` risk. Every measure reports `safeToAggregate: false`; metric safety belongs to a later governed phase.

## Semantic uncertainty and debt

The frozen Phase 3 resolver is evidence, not infallible truth. Confirmed mappings contribute stronger evidence, probable mappings carry limitations, ambiguous identifier traces may create limited alternatives, and unknown mappings provide no positive semantic role. Exact resolver rule IDs are propagated into grain evidence and dependencies. All 14 governed candidate-absence debt records remain represented as grain debt without changing unrelated columns.

## Corpus governance and diagnostics

`sample-corpus/grain-candidate-expectations.v1.json` is separate from corpus 1.2.0 recognition truth. Existing row entity, parent, key, and measure expectations are copied as audited, non-infallible references. Tests assert candidate/evidence preservation, abstention, bounds, and source-local processing, never a final winner.

The machine audit covers 30 cases, 37 physical sources, 199,694 rows, 752 semantic resolutions, and 1,223 upstream candidate traces. It reports 9 single-key, 8 composite-key, 8 parent-key, and 8 temporal-basis candidates. Validation groups remain tuning-forbidden and multi-file cases are evaluated source by source.

These diagnostics measure coverage, not grain accuracy. Zero structural blockers in the audit means no artifact-level material blocker was emitted; it does not mean every source has a proven grain.

## Extension boundary

Future domain SDK packs may declare domain roles, permitted specializations, relation templates, constraints, measure semantics, and domain corpus. They may not override core decisions, directly confirm grain, inject filename/sample rules, weaken abstention, alter global thresholds, or modify another domain's evidence. No SDK or domain activation is implemented here.

## Preservation

- Phase 2 artifact contracts and profiler behavior are unchanged.
- Phase 3 candidate, contextual, and resolution policies are unchanged.
- Semantic-resolution policy remains `lightbi.semantic-resolution-policy.v2`, SHA-256 `064e6861cc208e7d35074d9b872e0d4a11dfacdbc850e6d017c24f32462d6ad3`.
- All 752 resolutions and 1,223 candidate traces remain covered.
- The upstream collision and broad-candidate regression suites remain authoritative for 84 collisions and 18 broad occurrences.
- All 14 governed candidate-absence records are carried.
- `DOMAIN_SUPPORT_MANIFEST` remains empty.
- No production consumer is wired.

## Limitations

- Candidate identity is not proven business identity.
- Composite search deliberately excludes wider combinations.
- Ambiguous semantic alternatives can support investigation but cannot establish grain.
- Full-file rows are required for exact composite and repetition checks; no representative sample is treated as full-file truth.
- Final grain selection, cross-source relationships, join safety, domain activation, and metric aggregation safety remain later work.

## Tests and rollback

Synthetic probes cover entity, document, line, event, snapshot, interval, aggregate, mapping, mixed and unknown alternatives; bounded composites; technical/sparse/mixed keys; ambiguous identifiers; candidate debt; non-additive measures; repeated parent totals; deterministic hashes; artifact mismatch; and raw-row mismatch. Corpus tests cover all governed sources independently.

Verification completed on 2026-07-12:

- Phase 4A1 plus Phase 3B2A/B2B: 6 files, 30 tests passed.
- Phase 3B1/3A plus Phase 2 profiler: 7 files, 40 tests passed.
- Phase 1/source/hash/collision-facing and legacy detector regression selection: 8 files, 101 tests passed.
- `npx tsc --noEmit`: passed.
- `git diff --check`: passed.
- Full desktop suite, run exactly once at the end: 105 files passed, 4 failed; 891 tests passed, 9 failed.

The nine full-suite failures exactly match the recorded pre-Phase-4A1 baseline: three BA comparison timeouts, one guided-investigation question assertion, three numeric-health decimal assertions, and two virtual-dataset planner status assertions. No Phase 4A1 test failed.

Rollback consists of removing the three `grain-candidate-*` implementation modules, their two tests, their exports, the separate grain expectation file, this report and machine audit, and the three ownership rows. No runtime rollback is needed because production wiring was never changed.

## Stop condition

Phase 4A1 stops at candidate and evidence generation. Phase 4A2 final grain resolution and Phase 4B relationship inference have not begun.
