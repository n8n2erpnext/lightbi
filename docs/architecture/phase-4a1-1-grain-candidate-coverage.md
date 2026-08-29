# Phase 4A1.1 Grain Candidate Coverage and Universal Primitive Completeness

Date: 2026-07-12
Scope: candidate completeness audit and generic corrections only
Production wiring: unchanged

## Executive decision

Phase 4A1 was materially conservative for identity because it required selected or viable semantic identifier evidence. That prevented false certainty but discarded a useful universal primitive: a stable structured physical code whose business meaning is unknown.

Phase 4A1.1 adds a limited unresolved_physical identity hypothesis only when the semantic resolver produced no candidate trace, full-file values are stable structured strings, non-null coverage is at least 95%, cardinality is exact, and values are sufficiently distinct. It never manufactures semantic mappings, entity/domain roles, final grain, or confidence scores.

The initial correction exposed an over-generation path where semantically recognized dimensions could be uplifted into physical identities. That path was removed. Final governed-corpus counts remain 9 single, 8 composite, and 8 parent candidates. Most sparse coverage is therefore semantic coverage debt or insufficient physical evidence, not composite-policy pruning.

## Policy and contracts

- Grain artifact: lightbi.grain-candidate-artifact.v2.
- Grain policy: lightbi.grain-candidate-policy.v2.
- Grain policy SHA-256: 6ea68eb979878f6fcbd83b180e9eb92789174c23651a476edf50c4efb2f7d531.
- Frozen semantic policy remains lightbi.semantic-resolution-policy.v2.
- Frozen semantic policy SHA-256 remains 064e6861cc208e7d35074d9b872e0d4a11dfacdbc850e6d017c24f32462d6ad3.

New diagnostics expose identity evidence level, per-column eligibility and exclusion, physical format stability, width-two/three evaluations, bound skips, rejected combinations, source issue scope, generation reasons, and exclusion reasons.

## Source-by-source completeness

The machine audit contains all 37 source occurrences with rows, columns, row-unit alternatives, keys, parents, temporal bases, measures, risks, limitations, semantic dependencies, debt, generation reasons, exclusions, and classifications.

Aggregate facts:

- 30 governed cases, 37 source occurrences, and 199,694 full-file rows;
- 752/752 semantic resolutions and 1,223/1,223 candidate traces;
- 14/14 candidate-absence debt records;
- 9 single, 8 composite, and 8 parent candidates;
- 78 temporal observations, including unresolved physical date bases;
- 305 aggregation risks.

No source emitted only unknown. Twenty-three sources emitted one non-unknown alternative and fourteen emitted multiple non-unknown alternatives. This is candidate distribution, not grain accuracy. Full records are in [the machine audit](phase-4a1-1-grain-candidate-coverage-audit.json).

## Identity and false-positive audit

The core distinguishes resolved_semantic, ambiguous_semantic, unresolved_physical, and none. Unresolved physical evidence is weaker than semantic evidence, has businessIdentityProven false, carries semantic coverage limitations, and cannot establish final grain.

Negative probes prove uniqueness alone cannot promote row numbers, generated indices, UUID traces, monetary amounts, unit prices, quantities, percentages, ratings, ISO timestamps, phone numbers, free text, formulas, sparse mixed codes, or floating measurements. The ISO timestamp probe found and corrected a generic T/Z false positive.

## Composite pruning

Bounds remain eight eligible columns, width three, and 92 evaluations per source.

- Width-two evaluations: 8.
- Width-three evaluations: 0.
- Combinations skipped by bound: 0.
- Columns pruned by bound: 0.

Low key coverage is not caused by these limits. Every eligible column, exclusion reason, deterministic order, accepted combination, null rejection, non-unique rejection, and bound skip is now recorded.

## Parent and line completeness

Eight parent and eight line alternatives remain. A parent requires repeated candidate identity, a more granular child identity, and observed variation. Ambiguous or unresolved parents remain limited alternatives. Coexisting identifiers and repetition alone do not prove parent-child structure. Repeated parent measures still produce aggregation risk.

## Temporal completeness

All physically parseable temporal columns now produce observations. Unresolved time meaning remains unresolved_temporal_basis and cannot create event, snapshot, or interval grain.

The corpus has 78 temporal observations but only 8 event alternatives. It has no snapshot or interval candidate because required period/snapshot or start/end evidence is absent. Synthetic fixtures prove unresolved temporal observation, snapshot mechanics, and interval mechanics. Entity-by-time repetition is evaluated from aligned full-file rows when identity evidence exists.

## Measure completeness

Every numeric or measure-like column remains represented and safeToAggregate is always false.

The governed distribution is 206 unresolved roles, 42 additive candidates, 7 semi-additive candidates, 31 non-additive candidates, and 5 dimension/code candidates. Rates, ratios, averages, percentages, ratings, unit prices, balances, identifiers, and unresolved numerics remain conservative. Semi-additive measures with period/snapshot evidence add snapshot-across-time risk.

## Structural integrity

The earlier zero-blocker count only inspected artifact-level material limitations. Phase 4A1.1 distinguishes source blockers, candidate limitations, evidence limitations, and harmless issues.

The audit finds no source blocker, 8 candidate limitations, 3 evidence limitations, and 86 harmless issues. This does not mean perfect data; it means no source-level issue prevented candidate analysis.

## Row-unit distribution

- entity_record: 9
- event_record: 8
- document_record: 9
- line_record: 8
- snapshot_record: 0
- interval_record: 0
- aggregate_record: 28
- mapping_record: 0
- mixed_structure: 5
- unknown: 37

Unknown is always retained. Missing snapshot, interval, and mapping classes are documented candidate-stage gaps, not final negative conclusions.

## Multi-domain extension proof

Opaque domain-neutral fixtures demonstrate unresolved entity and item codes, unresolved physical timestamps, repeated parent plus unique child structure, identity plus reporting-period snapshot structure, and two identity hypotheses forming a mapping alternative.

The core does not know whether a future pack interprets those primitives as patients, students, customers, products, medications, assets, or another role.

## Corrected generic defects

1. Strong unresolved physical codes were omitted when semantic identifiers were absent.
2. ISO timestamp strings could pass the initial physical identifier shape check.
3. Structural issues lacked source/candidate/evidence scope.
4. Composite diagnostics lacked per-column and per-combination exclusion reasons.
5. Physical fallback initially uplifted recognized dimensions; the audit caught and removed this before freeze.

No source-specific rule, alias, filename, sample ID, corpus group, expected grain, or domain name was added to production logic.

## Debt and preservation

Thirty-seven sparse-family assessments remain semantic coverage dependencies, six remain insufficient physical evidence, and eighteen are justified abstention. Corpus grainTruth is non-infallible audit evidence and never drives production rules.

Phase 2 artifacts are unchanged. Phase 3 mappings and policy are unchanged. No semantic candidate or resolution is manufactured. No final grain, total grain score, cross-source relation, or join key is emitted. productionWiring.executed remains false and DOMAIN_SUPPORT_MANIFEST remains empty.

## Tests and rollback

Coverage tests include unresolved physical identity, fourteen false-positive probes, domain-neutral extension fixtures, deterministic composite diagnostics, scoped structural limitations, and all 37 source occurrences.

Verification completed:

- Phase 4A1 and 4A1.1: 4 files, 30 tests passed.
- Phase 3B2A/B2B: 4 files, 18 tests passed.
- Phase 3B1/3A and Phase 2 profiler: 7 files, 40 tests passed.
- Phase 1/source/hash/collision-facing and legacy detector selection: 8 files, 101 tests passed.
- TypeScript no-emit check: passed.
- Diff whitespace check: passed.
- Full desktop suite, run exactly once at the end: 107 files passed, 4 failed; 909 tests passed, 9 failed.

The nine failures exactly match the documented baseline: three BA comparison timeouts, one guided-investigation question assertion, three numeric-health decimal assertions, and two virtual-dataset planner status assertions. Phase 4A1.1 owns no new failure.

Rollback removes the two Phase 4A1.1 coverage tests and its report/audit, then restores the three grain candidate modules to v1. Runtime and persisted data need no rollback because production wiring is unchanged.

## Stop condition

Phase 4A1.1 ends after candidate completeness, generic corrections, diagnostics, corpus audit, and verification. Final grain resolution, relationships, domains, SDK behavior, metrics, questions, actions, BA, runtime, AI, UI, and DuckDB remain untouched.

ready_for_phase_4a2_with_documented_debt
