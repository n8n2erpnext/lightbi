# Phase 5B1 Paired Legacy Replay And Gate Closure

Date: 2026-07-13

## Executive Decision

Phase 5B1 produces authentic same-input legacy/canonical observations where the actual legacy contract is safely callable. It closes the generic executable-validation debt needed to evaluate authority migration, but it does not authorize migration. Authentic replay exposes unresolved critical aggregation divergences.

## Invocation Feasibility

Numeric health is callable after lossless column-local extraction from the same governed full data region. Dataset health and decision readiness lack their legacy input contracts in the canonical corpus. Business confidence can run under a controlled clock, but matching confidence-signal inputs are absent. Virtual planning requires business view, question, relationship graph and workspace state; DuckDB execution is side-effectful and excluded.

No production legacy function was modified.

## Input Equivalence

Only exact same governed input and proven lossless legacy-derived input count as direct safety evidence. Numeric-health replay records source hash, full data-region fingerprint, physical column extraction identity, excluded unrelated columns, scope compatibility and proof that canonical conclusions and expected answers were not used.

Caller-supplied Phase 5B observations remain synthetic-only and do not count as paired corpus evidence.

## Controlled Clock

The test harness runs actual business-confidence logic under a fixed epoch and restores `Date.now` in `finally`. The sequential leakage test verifies output identity and restoration. Production clock behavior is unchanged. Corpus confidence replay remains unavailable because its required legacy input contract is absent.

## Authentic Replay

- Governed subjects: 51
- Subjects with authentic paired observations: 19
- Subjects unavailable or not applicable: 32
- Actual numeric-health invocations: 291
- Synthetic-only corpus observations: 0

The 19 covered subjects are sources with physical numeric columns. Five bundles and nine pairs are unavailable for authentic planner replay because required planner inputs are not part of the governed raw-input corpus. Source health is not treated as pair operation evidence.

## Safety Divergence

Replay found 282 critical aggregation divergences where actual legacy numeric health permits SUM while canonical numeric aggregation remains blocked. These findings are observational and change neither implementation. Pair-operation, domain-metric, repeated-parent, snapshot and temporal safety remain synthetic-only or unavailable for paired corpus evidence.

## Executable Debt

All 14 authority-relevant generic invariants now have executable or exact-equivalent coverage, including invalid scope, stale readiness, blocker preservation, candidate cardinality isolation, projection isolation, unsupported domain, not-applicable scope, no-measure aggregation, zero denominator, high-ratio non-approval, operation safety, unrelated debt, duplicate inputs and missing-artifact fallback.

Closing generic executable debt does not resolve observed safety divergences or missing paired authority branches.

## Coverage And Gates

Coverage is reported separately:

- Legacy contracts: one authentic corpus-callable contract; four input-unavailable/partial/environment-sensitive contracts; one side-effectful execution path.
- Subjects: 19 authentic paired, zero synthetic-only corpus subjects, 32 unavailable/not applicable.
- Safety: aggregation has paired evidence; pair operations, domain metrics and several structural risks remain uncovered by paired corpus observations.
- Authority: information and planning contracts are documented; approval/execution remain excluded and unapproved.
- Executable invariants: all 14 authority-relevant generic properties are executable or exactly equivalent.

Migration gates remain:

- `projectionMigrationEligible`: true for lossless non-authoritative fields only
- `shadowComparisonCoverageComplete`: false
- `criticalSafetyDivergencesResolved`: false
- `legacyAuthorityContractDocumented`: true
- `authorityMigrationEvidenceSufficientForPhase5CPlanning`: false
- `canonicalAuthorityMigrationEligible`: false

## Production Isolation

No production consumer imports paired replay code. No Home, Investigation, UI, AI, BA, planner, execution, persistence, database, telemetry, feature flag or canonical/legacy policy changed. Operations and production wiring remain false; the domain manifest remains empty.

## Limitations

- Corpus does not retain complete legacy DatasetFamily, DatasetUnderstanding, ConfidenceSignalRegistry or planner contracts.
- Critical aggregation divergences require explicit disposition before Phase 5C planning.
- Pair and bundle authority lacks authentic planner replay.
- Full safety coverage is not accuracy and is not complete.

## Verification

Completed verification:

- Targeted paired replay, controlled clock, Phase 5A corpus and Phase 5B comparison: 11/11 passed.
- Post-full-suite import-isolation correction: Phase 5B scanner now explicitly recognizes the Phase 5B1 test/development module boundary; targeted isolation and controlled-clock tests passed 5/5.
- `npx tsc --noEmit`: passed.
- Seven Phase 5B1 audit JSON files parse successfully.
- Full desktop suite ran exactly once: 978 passed and ten failed across 130 files and 988 tests. Nine failures were the documented baseline; the tenth was the Phase 5B scanner misclassifying Phase 5B1 modules as production importers. That scanner defect was corrected and verified by the subsequent targeted run. The full suite was not rerun to preserve the exactly-once constraint.

## Rollback

Remove paired replay contracts/engine/test, Phase 5B1 corpus audit generation, seven Phase 5B1 audits, this report and the ownership paragraph. No runtime rollback is needed.

## Stop Condition

Phase 5B1 stops here. Runtime authority migration, production projection, join safety, metrics, domains, SDK, questions, actions, BA narratives, AI/UI/DuckDB integration and Phase 5C are not started.

not_ready_safety_divergence
