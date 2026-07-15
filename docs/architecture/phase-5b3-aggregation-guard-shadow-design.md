# Phase 5B3 Aggregation Guard Shadow Design

## Scope

Phase 5B3 adds a deterministic test/development-only simulation of a future governed aggregation boundary. It does not import into production, mutate a runtime plan, change SQL, approve an aggregation, authorize execution, persist output, emit telemetry, or change legacy behavior.

The frozen comparison policy remains `lightbi.legacy-canonical-comparison-policy.v2` with SHA-256 `deb9a908b698792388b2d7b1fab853978a03087bcda37dc64682ab4d3e60f2c8`.

## Actual authority trace

`Investigation` passes `runtimePlanPreview` through `enhancePlanWithGuardedSum`. When numeric health accepts a physical column and no explicit aggregation exists, the bridge inserts `SUM`; `createSafeSqlPreview` converts that choice to executable DuckDB SQL. A user action starts preview. `executeBackendPreview` can submit the SQL unchanged to `local-duckdb-executor`, which calls `conn.query`. Returned rows enter chart construction and the BA decision brief. The fallback sandbox consumes the plan rather than executing this SQL text.

Therefore SQL existence alone is not execution, but the local preview path is execution-capable and reaches user-visible conclusions. The complete consumer classification is in `phase-5b3-preview-execution-authority-audit.json`.

## Shadow contract

The artifact preserves source and physical-column identity, source hash, raw numeric-health observation, incoming aggregation intent and origin, canonical capability states, measure/grain limitations, repeated-parent and snapshot risks, disposition, structured reasons, missing evidence, and preview authority classification.

Every artifact fixes these invariants:

- `shadowOnly: true`
- `planMutated: false`
- `sqlChanged: false`
- `approvalGranted: false`
- `executionAuthorized: false`
- `canonicalAuthorityMigrationEligible: false`
- `productionWiring.executed: false`

Explicit SUM, AVG, and COUNT remain uncertified choices. No missing aggregation is replaced. A governed metric origin can be represented but is never treated as proof that a metric contract exists.

## Authentic replay

The replay accounts for 291 authentic Phase 5B2 observations and deduplicates by the governed divergence identity to 145 source-column records. This consists of 136 automatic-SUM authority conflicts and nine informational non-SUM records. All 136 automatic defaults would require blocking at a future governed boundary. Root-cause dispositions remain more specific where grain, measure semantics, repeated totals, snapshots, or non-additive formulas are unresolved.

This is migration simulation evidence, not an accuracy or production-impact claim. No observed blocker is removed. Unknown grain and measure roles remain explicit.

## Migration strategies

Six strategies are evaluated without selection or implementation: warning only, explicit confirmation, automatic-default prohibition, governed metric semantics, canonical restriction projection, and retained legacy behavior. The machine audit records safety, residual risks, UX, authority effects, required evidence, silent-SUM behavior, unsafe explicit behavior, and later projection suitability.

`canonical_restriction_projection` and governed metric semantics are planning candidates only. This phase does not authorize either.

## Files changed

- `aggregation-guard-shadow-contracts.ts`
- `aggregation-guard-shadow-policy.ts`
- `aggregation-guard-shadow.ts`
- `aggregation-guard-shadow.test.ts`
- `aggregation-guard-shadow.corpus.test.ts`
- `understanding-core/OWNERSHIP.md`
- five Phase 5B3 machine audits
- this report

## Verification

- Phase 5B3 targeted plus Phase 5B2 authority: 3 files, 11 tests passed.
- Phase 4C/5A/5B/5B1 focused regression: 4 files, 20 tests passed.
- Phase 5A canonical corpus: 1 file, 1 test passed in 52.80s.
- Phase 4C readiness corpus: 1 file, 1 test passed in 62.14s.
- Remaining comparison/readiness validation corpus tests: 2 files, 2 tests passed.
- `npx tsc --noEmit`: passed.
- Five new JSON audits: parsed successfully.
- Controlled-clock coverage remains in paired replay and passed in the focused regression.
- Import scan: no production importer and no barrel export.
- `git diff --check`: run before final suite.
- Full desktop suite: 133 files and 999 tests; 129 files/990 tests passed, while four files/nine tests failed with the exact documented baseline set. Exit status was `1`; Phase 5B3 introduced no suite failure. Complete output is preserved in `/tmp/lightbi-phase5b3-full-suite.log`, with status in `/tmp/lightbi-phase5b3-full-suite.exit`.

## Known debt and rollback

All 136 automatic SUM conflicts remain unresolved in production by design. Canonical measure role, grain, repeated-total, snapshot, and non-additive metric evidence is incomplete for authentic records. Phase 5C authority evidence is insufficient, and migration eligibility remains false.

Rollback consists only of removing the three shadow implementation files, two shadow tests, five Phase 5B3 audits, this report, and the Phase 5B3 ownership paragraph. No production rollback is needed because no production code imports the guard.

aggregation_guard_ready_with_documented_debt
