# Phase 5B2 Aggregation Authority And Divergence Disposition

Date: 2026-07-13

## Executive Decision

Legacy `isSafeForSum` is a physical parse signal, not proof of business additivity. However, its production call path is authority-relevant: Investigation calls `enhancePlanWithGuardedSum`, which automatically selects SUM when no aggregation is explicit, and `createSafeSqlPreview` generates SUM SQL. Canonical aggregation remains blocked and unchanged.

## Legacy Semantics And Call Path

`evaluateNumericHealth` declares SUM mechanically supported when at least 80% of non-null sample values parse numerically. It does not inspect measure role, grain, repeated totals, snapshots, percentages, rates, prices, balances or metric semantics.

The direct consumer `guarded-sum-bridge.ts` preserves explicit SUM/AVG/COUNT, but otherwise automatically chooses SUM when `isSafeForSum` is true and COUNT when false. Investigation passes this enhanced plan to safe SQL generation, which emits SUM SQL. No user confirmation is required. Numeric health itself does not authorize backend execution, but it controls the automatic aggregation default on an active preview path.

Primary authority classification: `automatic_default_selection`.

## Canonical Semantics

Canonical `numeric_aggregation_ready: blocked` means business-safe aggregation is unproven because measure role and grain semantics are unresolved; it is not a claim that the numeric operator cannot execute mechanically. Adjacent capabilities separately represent physical profiling, descriptive counting, dimensional grouping, measure-role assessment, repeated-measure protection and snapshot-time risk.

Canonical currently lacks a dedicated physical-operator-support capability. That concept gap is retained rather than forcing physical parse support to equal semantic additivity.

## Mapping Correction

The old direct mapping was a generic comparison defect. Comparison policy advances to `lightbi.legacy-canonical-comparison-policy.v2`, SHA-256 `deb9a908b698792388b2d7b1fab853978a03087bcda37dc64682ab4d3e60f2c8`.

`MAP-NUMERIC-SUM-SAFETY` is now `partially_comparable`: legacy answers physical computability but also drives an automatic default, while canonical answers business-safe aggregation. Raw observations and both systems' outputs are preserved.

## Deduplication And Disposition

- Raw authentic comparison occurrences: 291
- Unique source-column divergences: 145
- Duplicate derivations removed: 146
- Unique automatic-SUM authority conflicts: 136
- Informational non-SUM records: 9

Divergence identity includes source hash, physical column index, legacy field, authority class, canonical capability, SUM semantics, mapping ID and risk class. Multiple consumers sharing one automatic-default decision do not become independent divergences.

The 136 automatic SUM paths remain `true_critical_automatic_aggregation_risk`: actual code defaults SUM and generates SQL without governed metric semantics or user confirmation. The nine records where numeric health does not permit SUM are informational.

## Risk Review

Measure observations retain additive, semi-additive, non-additive, repeated, dimension/code and unresolved behaviors where available. Physical parse success does not cancel repeated-parent, snapshot, rate, price, balance, mixed-type or unknown-grain risk. Granular behavior metadata is included per disposition record; absent granular classification remains an explicit physical-parse-only mechanism.

## User Choice And Authority

Explicit COUNT/SUM/AVG in an incoming plan is preserved. The risky branch is specifically the absence of an explicit aggregation: legacy automatically chooses SUM. Offering a future user choice would not certify correctness; metric semantics or explicit confirmation would still be required.

## Migration Disposition

- Keep legacy behavior unchanged for now.
- Project canonical restrictions in a future controlled phase.
- Require metric semantics before authority migration.
- Review automatic default behavior before Phase 5C.
- Consider a future canonical physical-operator capability without weakening aggregation blockers.

Pair and bundle evidence remains unavailable. Source numeric replay does not establish join, append, planner or execution safety.

## Gates

- `authenticSourceAggregationCoverageComplete`: true
- `pairOperationCoverageComplete`: false
- `bundlePlanningCoverageComplete`: false
- `criticalAggregationDivergencesResolved`: false
- `aggregationMappingGoverned`: true
- `authorityMigrationEvidenceSufficientForPhase5CPlanning`: false
- `canonicalAuthorityMigrationEligible`: false

`finalWorktreeFullSuiteVerified` is recorded only after the final suite.

## Production Isolation

No legacy, canonical readiness, UI, planner, SQL, execution, persistence or telemetry behavior changed. No measure became safe to aggregate, no operation was approved, the domain manifest remains empty and production wiring remains false.

## Verification

Phase 5B2 authority/mapping plus Phase 5B1, Phase 5B and Phase 5A selected tests passed 16/16. TypeScript passed. Final JSON, import, whitespace and full-suite results are recorded after completion.

Seven Phase 5B2 audit JSON files parse successfully, import isolation has no production consumer, and `git diff --check` passes. The final full-suite command was started exactly once after source changes were complete, but its terminal session ended during an external interruption and the final output could not be recovered. It was not rerun. Therefore `finalWorktreeFullSuiteVerified` remains false and no baseline result is claimed.

## Rollback

Restore comparison policy v1 and its mapping/hash, remove the Phase 5B2 test/audits/report and Phase 5B2 corpus disposition generation. No runtime rollback is required.

## Stop Condition

Phase 5B2 stops here. Authority migration, production projections, metric execution, join safety, domain activation, SDK, BA generation and AI/UI/DuckDB integration are not started.

not_ready_true_critical_aggregation_divergence
