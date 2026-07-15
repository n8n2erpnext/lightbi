# Phase 4A2B Grain Resolution Validation And Policy Freeze

## Executive decision

Phase 4A2A grain-resolution policy v1 is suitable for a shadow release-candidate freeze. Validation found no forbidden certainty and did not justify changing resolver semantics. The freeze remains shadow-only and carries documented semantic-coverage and candidate-absence debt.

## Probable-axis audit

All 51 non-unknown axis decisions across 37 source occurrences were audited: 50 probable decisions were classified `valid_probable`, and the single ambiguous structural decision was classified `should_be_ambiguous`. There are no confirmed states and no requirement to manufacture one.

Every probable decision has direct mechanical full-file provenance appropriate to its axis. Unresolved physical identity remains capped at probable. Validation-only holdout, adversarial, and multi-file records were evaluated separately and did not tune policy.

## Axis independence and dependency graph

The machine audit records 68 cross-axis edges: 24 prerequisite edges and 44 shared-physical-fact edges. Shared facts may appear on multiple axes but every edge has `countsAsIndependentSupport: false`. Identity and parent are prerequisites for line structure, identity is a prerequisite for entity structure, and parent context is a prerequisite for repeated-parent aggregation; none becomes a second independent evidence family by composition.

No total ranking or cross-axis dominance exists. The corpus contains zero executed dominance decisions. Synthetic negatives keep line/event, entity/snapshot, and aggregate/reporting-period characteristics on different axes; incomparable keys and temporal alternatives remain ambiguous or unresolved.

## Governed conformance

The audit reports state distributions independently for golden, holdout, adversarial, and multi-file occurrences. Golden has 13 non-unknown decisions, holdout 13, adversarial 4, and multi-file 20. There are zero forbidden-state violations, zero overconfident-state violations, and zero generic policy defects. These are governed shadow-conformance results, not real-world grain accuracy.

## Counterfactual and monotonicity suite

All 30 required deterministic mutations passed. The suite removes identity, parent, child variation, uniqueness, event, reporting, and repeated-measure evidence; degrades semantic identity; injects nulls, mixed types, technical markers, competitors, debt, structural corruption, duplicate evidence/candidates, and order changes; and tests compatible or removed orthogonal axes.

The only validation order is `confirmed > probable > {ambiguous, unknown}`. Ambiguous and unknown remain incomparable. No mutation increased certainty after support removal/degradation or conflict/debt addition. Duplicate evidence, candidate duplication, and ordering changes do not raise certainty. Measure safety remains false in every replay.

## Forbidden-certainty checks

The validator rejects confirmed unresolved-physical identity, probable/confirmed axes without direct mechanical full-file evidence, correlated-evidence-only certainty, semantic ambiguity elevated to confirmation, material debt affecting confirmation, and any measure made safe by grain. Resolver rules continue to prohibit identity from uniqueness alone, entity/document/line/mapping/aggregate/temporal states from insufficient single facts, sample-specific policy, domain labels, relationships, joins, and production wiring.

## Identity audit

Each viable identity audit records key kind, candidate IDs and competitors, exact full-file evidence references, non-null/uniqueness provenance, semantic states, unresolved-physical use, technical and structural limitations, debt, and final state. Composite search remains bounded by candidate policy v2; the validator neither creates keys nor selects a simpler candidate by total rank.

## Parent and line audit

Probable parent and line decisions retain repeated-parent, granular-child, and child-variation evidence. Parent/line shared evidence is represented in the dependency graph and cannot count twice. Co-occurring identifiers alone do not establish parenthood. Repeated parent measures remain aggregation risks and never become metric-safe.

## Temporal audit

Probable temporal decisions retain full-file temporal evidence. Event, snapshot, interval, reporting period, effective time, and no-temporal-basis are axis-local. A physical date with unresolved semantics cannot become probable event/snapshot, and temporal compatibility cannot raise structural certainty.

## Aggregation audit

All probable aggregation forms retain mechanical evidence for atomic-looking, repeated-parent, pre-aggregated, snapshot, mixed, or unresolved behavior. Structural aggregation is not metric additivity. All measure observations remain `safeToAggregate: false`.

## Abstention audit

All 21 fully unresolved signatures were audited without imposing a minimum resolution rate. Seventeen are classified `semantic_coverage_dependency`; four are `candidate_absence`. No validation-only case changed production rules. These abstentions are retained as documented debt rather than converted into unsupported certainty.

## Policy freeze

- Grain resolution policy: `lightbi.grain-resolution-policy.v1`
- SHA-256: `219e8b7e78261bcbc9ff4714cf93ec62f709c54670ad7e8bf8a3edbfef01d3ef`
- Grain candidate policy v2 SHA-256: `6ea68eb979878f6fcbd83b180e9eb92789174c23651a476edf50c4efb2f7d531`
- Semantic resolution policy v2 SHA-256: `064e6861cc208e7d35074d9b872e0d4a11dfacdbc850e6d017c24f32462d6ad3`

No policy semantics changed in Phase 4A2B, so no version advance or expectation rewrite was required.

## Remaining debt and extension implications

Semantic coverage and candidate absence still account for 21 fully unresolved signatures. A future domain pack may specialize a universal signature but may not set confirmation, weaken evidence, override uncertainty, inject sample rules, or replace the core signature. Relationships, join safety, domain activation, metric additivity, SDK behavior, and BA interpretation remain later work.

## Production isolation and preservation

All 37 source signatures, 104 grain candidate traces, 752 semantic resolutions, 1,223 semantic traces, and 14 unique candidate-debt records remain covered. Candidate order is preserved. No candidate, key, parent, temporal role, relationship, or join is manufactured by validation. `productionWiring.executed` and `crossSourceRelationships.executed` remain false. `DOMAIN_SUPPORT_MANIFEST` remains empty.

## Tests

- Phase 4A2B validation and counterfactual: 2 files, 2 tests passed. The counterfactual test contains 30 governed mutation replays; the corpus test covers 37 sources and all 51 non-unknown decisions.
- Phase 4A2A and Phase 4A1/4A1.1: 6 files, 45 tests passed.
- Phase 3 and Phase 2 selected regressions: 11 files, 58 tests passed.
- Phase 1/1B and legacy detector selection: 8 files, 117 tests passed.
- `npx tsc --noEmit`: passed.
- `git diff --check`: passed before the final suite.
- Full desktop suite, run exactly once at the end: 111 files passed, 4 baseline files failed; 926 tests passed and the same 9 documented baseline tests failed.
- Baseline failures: 3 BA comparison timeouts, 1 guided-investigation assertion, 3 numeric-health assertions, and 2 virtual-dataset-planner assertions.
- Phase 4A2B-owned failures: 0.

## Rollback

Remove `grain-resolution-validation.ts`, its export and ownership row, the Phase 4A2B counterfactual/corpus tests, the three Phase 4A2B machine audits, and this report. Resolver policy and production behavior require no rollback because they were unchanged and remain unwired.

## Stop condition

Phase 4A2B stops at shadow validation and policy freeze. Cross-source relationships, join safety, domains, SDK behavior, metrics, questions, actions, BA output, runtime wiring, AI/UI/DuckDB behavior, and Phase 4B have not begun.

freeze_ready_with_documented_debt
