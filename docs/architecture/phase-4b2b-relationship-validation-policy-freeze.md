# Phase 4B2B Relationship Validation And Policy Freeze

Date: 2026-07-13

## Executive Decision

Classification: **freeze_ready_with_documented_debt**.

The Phase 4B2A resolver is validated for continued canonical shadow use after one generic corrective change: extract-observed cardinality is now explicitly split into candidate-scoped observations and a pair-level summary. No join key is selected and no operation is approved or executed.

## Corrective Contract And Frozen Policy

- Resolution policy: `lightbi.relationship-resolution-policy.v2`
- SHA-256: `68b96f0b410315937256992d28378ae4932910a8bdc8719f0b475addd9855a10`
- New governing rule: `RR-CARDINALITY-CANDIDATE-SCOPE`

Policy v1 blurred exact per-key observations with the pair-level state. Version 2 retains `candidateScopedObservedCardinality` with exact `keyPairId`, counts, duplicates, nulls, overlap, frequencies, and fanout. `pairLevelCardinalitySummary` remains ambiguous or unknown while `selectedKeyPairId` is null. Business cardinality and join authorization remain false.

The former three pair-level confirmed results decompose into four confirmed candidate-scoped observations across six total candidate observations. This is a scope correction, not increased pair certainty.

## Non-Unknown Axis Audit

All 26 non-unknown pair-axis decisions are recorded in `phase-4b2b-axis-resolution-audit.json` with bundle/pair metadata, validation-only provenance, traces, key IDs, rule IDs, independent/correlated evidence, dependency edges, full-file overlap provenance, risks, conflicts, limitations, debt, allowed states, false-certainty risk, and disposition.

After v2 replay: meaning is 1 probable, 4 ambiguous, 4 unknown; key basis is 3 probable, 1 ambiguous, 5 unknown; pair-level cardinality is 4 ambiguous and 5 unknown; temporal alignment is 9 ambiguous; schema is 3 probable and 6 unknown; operation is 1 ambiguous and 8 unknown.

## Candidate-Scoped Cardinality

The validation gate fails closed when an observation is orphaned, attached to a wrong key, duplicated, missing, or has counts inconsistent with its exact Phase 4B1 key candidate. It verifies that no observation selects a key, establishes business cardinality, raises relationship meaning, raises operation compatibility, or authorizes a join.

The complete machine audit is `phase-4b2b-cardinality-scoping-audit.json`.

## Cross-Axis Independence

Dependency edges distinguish prerequisite and correlated/shared facts. Shared semantic, uniqueness, overlap, schema, temporal, duplicate, grain, and operation facts remain visible without being counted twice. Cardinality cannot prove semantic identity; operation cannot feed relationship meaning; schema cannot resolve temporal alignment; temporal alignment cannot authorize append; an observed one-to-one extract cannot establish permanent identity.

No numeric certainty score or total ranking is introduced.

## Counterfactual And Monotonicity

The targeted suite governs 42 deterministic mutations, including removal of semantic/key/overlap/grain/schema/time evidence; unmatched/null/duplicate/fanout risks; competing keys; unresolved and prohibited identity primitives; schema/time conflicts; debt and evidence duplication; ordering changes; orphan/wrong-key cardinality; and cross-axis independence cases.

The validation certainty order is `confirmed > probable > {ambiguous, unknown}`, with ambiguous and unknown incomparable. Removing support or adding relevant conflict, risk, debt, or a viable competitor cannot increase certainty. Evidence, witness, candidate, and risk duplication cannot increase certainty. Wrong-key and orphan-cardinality mutations fail closed.

Machine results are in `phase-4b2b-counterfactual-audit.json`.

## Forbidden Certainty And Risk Preservation

The validation gate prohibits pair-global confirmed cardinality without a selected key, business cardinality from extract counts, operation approval, and any loss or cancellation of Phase 4B1 risks. Resolver output continues to persist no unbounded raw key values. Absence of risk and candidate count are not support.

## Temporal Ambiguity And Logistics Debt

All nine governed pairs remain temporally ambiguous: seven involve overlapping ranges and two are sequential but have unproven partition semantics. No minimum temporal resolution rate is imposed.

The logistics adjacent-period pair retains its candidate and key alternatives, explicit temporal debt, upstream risks, `safetyApproved: false`, and `executionAuthorized: false`. No source-specific production rule was added. The generic partition-debt synthetic case proves the same refusal without logistics terminology.

See `phase-4b2b-temporal-debt-audit.json`.

## Governed Conformance And Readiness

All five corpus bundles and nine pairs remain evaluation-only and tuning-forbidden. These are governed shadow-conformance diagnostics, not real-world accuracy and not evidence for `mvp_proven`.

Partial resolution requires at least one evidence-bearing non-temporal axis. Temporal ambiguity alone is excluded from meaningful resolution. There is no minimum resolved-pair target.

## Remaining Debt

- Temporal partition semantics remain unresolved across all governed pairs.
- No final join-key selection exists.
- Business cardinality remains unproven.
- Join/append/compare/reconcile safety validation and approval remain future work.
- Corpus evidence remains validation-only and non-infallible.

## Multi-Domain Boundary

Future domain packs may enrich governed evidence but cannot select relationships or keys, set cardinality, weaken risk, approve operations, inject filename/sample rules, bypass privacy, or execute cross-source operations.

## Production Isolation

- Phase 2 physical behavior unchanged.
- Frozen Phase 3 semantic policy v2 unchanged.
- Frozen Phase 4A policies unchanged.
- Phase 4B1 policy unchanged.
- `DOMAIN_SUPPORT_MANIFEST` remains empty.
- `joinSafety.executed`, `operationExecution.executed`, and `productionWiring.executed` remain false.
- No runtime, UI, AI, DuckDB, metric, question, action, BA, SDK, or domain activation change.

## Tests

Targeted Phase 4B2B tests cover candidate scoping, fail-closed mutations, cross-axis independence, monotonicity, preservation, ordering, and the five governed bundles. Freeze expectations are recorded separately in `sample-corpus/relationship-resolution-validation-expectations.v1.json`.

Verification results:

- Phase 4B2B plus Phase 4B2A targeted tests: 4 files, 15 tests passed.
- Phase 4B2B through Phase 1/1B and legacy detector regression matrix: 33 files, 246 tests passed.
- `npx tsc --noEmit`: passed.
- `git diff --check`: passed.
- Full desktop suite, run exactly once at the end: 121 files; 950 tests passed and the same 9 documented baseline tests failed.

The baseline remains three BA-comparison timeouts, one guided-investigation assertion, three numeric-health expectations, and two virtual-dataset-planner expectations. No Phase 4B2B-owned test failed.

## Rollback

Remove the validation module/tests and four Phase 4B2B audits/report, revert the resolution contract and policy from v2 to v1, and restore the prior cardinality projection. No runtime migration is required because the resolver remains shadow-only.

## Stop Condition

Phase 4B2B stops at a frozen shadow resolution policy with validation evidence. Final join-safety approval, key selection, operation authorization/execution, production integration, domains, SDK, metrics, questions, actions, BA output, and AI/UI/DuckDB/runtime work have not begun.
