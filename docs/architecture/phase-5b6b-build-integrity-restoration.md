# Phase 5B6B Build Integrity Restoration

## Scope

Phase 5B6B restored TypeScript build integrity for the current canonical and
Phase 5 source stack. It did not begin runtime capture, production
instrumentation, restriction projection wiring, authority migration, metric
evaluation, domain activation, or UI/runtime integration.

The source of truth was the final working tree at clean-HEAD baseline commit
`70603dd6679a37a6f0a23e20fe6883faabd0e8a7`, the preserved 28-diagnostic
compiler output, incremental reproduction, frozen policy identities, and the
governed regression baseline.

## Diagnostic Ownership

- Raw TypeScript diagnostics: 28.
- Primary root causes: 10.
- Cascading diagnostics: 0.
- Diagnostic files affected: 18.
- Every diagnostic has an exact code, location, symbol, module boundary,
  first reproduction point, owning phase, risk, correction, and disposition.
- Every root cause has a permitted ownership disposition; no generic
  "earlier source" ownership remains.
- All 10 primary root causes are resolved.

The detailed records are in
`phase-5b6b-diagnostic-ownership-audit.json` and
`phase-5b6b-root-cause-audit.json`.

## Minimal Corrections

The corrections were limited to type ownership and fixture agreement:

- removed dead or already-narrowed branches and unused bindings;
- preserved discriminated-union exhaustiveness while correcting narrowing;
- made contextual fixture totals explicit where the contract requires them;
- repaired readonly collection and generic typing at owner boundaries;
- preserved explicit `null` for unavailable source identity hashes;
- domain-qualified colliding relationship type names at their existing owner
  boundary without adding a production barrel export;
- updated direct consumers to those qualified names;
- updated the governed semantic-candidate source hash after a type-only source
  edit, while preserving policy bytes, policy hashes, and artifact semantics;
- added Phase 5B6B audit and baseline-governance verification tests.

No contract was weakened. No blocker, restriction, provenance field,
authority flag, integrity state, or fail-closed state was removed.

## Files Changed

Phase 5B6B source and fixture corrections:

- `apps/desktop/src/lib/understanding-core/aggregation-guard-shadow.ts`
- `apps/desktop/src/lib/understanding-core/canonical-runtime-adapter.corpus.test.ts`
- `apps/desktop/src/lib/understanding-core/canonical-runtime-adapter.ts`
- `apps/desktop/src/lib/understanding-core/contextual-evidence-aggregator.ts`
- `apps/desktop/src/lib/understanding-core/contextual-evidence.corpus.test.ts`
- `apps/desktop/src/lib/understanding-core/grain-candidate-engine.ts`
- `apps/desktop/src/lib/understanding-core/grain-candidate.corpus.test.ts`
- `apps/desktop/src/lib/understanding-core/grain-resolution-validation.ts`
- `apps/desktop/src/lib/understanding-core/grain-resolver.ts`
- `apps/desktop/src/lib/understanding-core/index.ts`
- `apps/desktop/src/lib/understanding-core/legacy-canonical-comparison.corpus.test.ts`
- `apps/desktop/src/lib/understanding-core/legacy-canonical-comparison.ts`
- `apps/desktop/src/lib/understanding-core/paired-legacy-replay-contracts.ts`
- `apps/desktop/src/lib/understanding-core/readiness-engine.ts`
- `apps/desktop/src/lib/understanding-core/relationship-candidate-engine.ts`
- `apps/desktop/src/lib/understanding-core/relationship-resolution-contracts.ts`
- `apps/desktop/src/lib/understanding-core/relationship-resolver.ts`
- `apps/desktop/src/lib/understanding-core/semantic-candidate-engine.ts`
- `apps/desktop/src/lib/understanding-core/semantic-candidate.governance.test.ts`
- `apps/desktop/src/lib/understanding-core/semantic-resolution.corpus.test.ts`
- `apps/desktop/src/lib/understanding-core/semantic-resolver.ts`
- `apps/desktop/src/lib/understanding-core/phase-5b6b-build-integrity.test.ts`

Phase 5B6B evidence:

- `docs/architecture/phase-5b6b-diagnostic-ownership-audit.json`
- `docs/architecture/phase-5b6b-root-cause-audit.json`
- `docs/architecture/phase-5b6b-build-restoration-audit.json`
- `docs/architecture/phase-5b6b-semantic-preservation-audit.json`
- `docs/architecture/phase-5b6b-regression-baseline-allowlist.v1.json`
- `docs/architecture/phase-5b6b-final-suite-conformance.json`
- `docs/architecture/phase-5b6b-import-isolation-audit.json`
- `docs/architecture/phase-5b6b-migration-gate-audit.json`
- `docs/architecture/phase-5b6b-build-integrity-restoration.md`

Unrelated dirty working-tree content was not reverted or included as a Phase
5B6B correction.

## Build Gate

Exact command:

```text
cd apps/desktop && npx tsc --noEmit -p tsconfig.app.json
```

Pre-change current-tree result:

- exit status 2;
- 28 diagnostics;
- preserved output SHA-256
  `4598e25b55440240a01c8b1e8bed3c492c0eebc672b40a32e188d430f95de86c`.

Final result:

- exit status 0;
- zero diagnostics;
- compiler options and tsconfig unchanged;
- no suppression, dependency substitution, generated-file deletion, or
  compiler relaxation.

## Semantic Preservation

- Frozen Phase 3 through Phase 5B5 policy source hashes are unchanged.
- Frozen policy JSON remains byte-identical.
- Phase 4C readiness artifacts remain semantically identical.
- Phase 5A envelope projections remain semantically identical.
- Phase 5B raw observations remain unchanged.
- All 145 aggregation records retain identity.
- Phase 5B4 restrictions remain unchanged.
- Phase 5B5 lineage and projection identities remain unchanged.
- Phase 5B6 sidecar authority flags remain false.
- No capability, blocker, debt, remediation, or restriction disappeared.
- No measure became `safeToAggregate`; no metric or operation was approved.

The semantic-candidate implementation source hash changed only because of an
explicit-null/dead-binding type correction. Its governance expectation was
updated to the actual source hash
`3d61192a4d1464cb90011c5687e2fee7112921a7000d36194e5b8e765e6a6bc4`.
Policy bytes, policy hashes, deterministic outputs, and frozen artifacts did
not change.

## Regression Baseline

The baseline is governed by `file|fullTestName`, not failure count.

- Deterministic baseline identities: 6.
- Timing-sensitive BA identities: 3.
- Timing-sensitive tests may pass or fail only by the governed 5000 ms
  timeout; a different assertion is unexpected.
- Any failure outside the allowlist is unexpected.
- Any Phase 5B6B-owned failure is unexpected.

Final desktop suite:

- test files: 141 total, 137 passed, 4 failed;
- tests: 1042 total, 1033 passed, 9 failed;
- deterministic baseline failures observed: 6;
- timing-sensitive timeout failures observed: 3;
- timing-sensitive cases passed: 0;
- unexpected failures: 0;
- Phase 5B6B-owned failures: 0.

The complete output is preserved at
`/tmp/lightbi-phase5b6b-full-suite.log` with SHA-256
`1d3b1337630f7d74d30b0c78cdb9831fcce243c6b5a019cce24de3526441aea4`.

## Verification

- Direct changed tests: 16 files, 83 tests passed.
- Phase 5B6B audit/governance: 5 tests passed.
- Phase 5B6A audit: 5 tests passed.
- Phase 5B6 sidecar: 2 files, 10 tests passed.
- Phase 5A through Phase 5B5 regressions: 12 files, 52 tests passed.
- Phase 4C readiness: 4 files, 11 tests passed.
- Complete understanding-core matrix: 48 files, 234 tests passed.
- Controlled-clock leakage: 1 file, 4 tests passed.
- Repository-wide TypeScript gate: exit 0, zero diagnostics.
- Ten import-isolation audits parsed; direct non-core shadow import scan found
  no matches.
- All Phase 5B6B JSON audits parse successfully.
- `git diff --check`: passed before the final suite.
- Full desktop suite was run once on the final source/test/scanner state.

## Isolation And Migration

- New production importers: none.
- New production barrel exports: none.
- Runtime, Investigation, executor, chart, BA, persistence, telemetry, and
  feature flags: unchanged.
- Domain activation and operation approval: none.
- `productionWiring.executed`: false.
- `authenticRuntimePlanReplayAvailable`: false.
- `actualPlanBindingCoverageComplete`: false.
- `actualSqlPreviewBindingCoverageComplete`: false.
- `previewResultIdentitySafe`: false.
- `productionProjectionEligible`: false.
- `authorityMigrationEvidenceSufficientForPhase5CPlanning`: false.
- `canonicalAuthorityMigrationEligible`: false.

Future authentic evidence must be collected prospectively from new governed
sessions under a separately approved capture contract. Synthetic fixtures do
not raise these gates.

## Gates

| Gate | Result |
| --- | --- |
| diagnosticOwnershipComplete | true |
| primaryRootCausesResolved | true |
| typescriptBuildIntegrityEstablished | true |
| frozenPolicyIdentityPreserved | true |
| canonicalArtifactSemanticsPreserved | true |
| shadowImportIsolationPreserved | true |
| regressionBaselineAllowlistGoverned | true |
| deterministicBaselineConformance | true |
| timingSensitiveBaselineConformance | true |
| unexpectedRegressionFailureCount | 0 |
| authenticRuntimePlanReplayAvailable | false |
| previewResultIdentitySafe | false |
| productionProjectionEligible | false |
| authorityMigrationEvidenceSufficientForPhase5CPlanning | false |
| canonicalAuthorityMigrationEligible | false |
| finalWorktreeFullSuiteVerified | true |

## Rollback

Rollback must be surgical: revert only the Phase 5B6B type corrections and
the semantic-candidate governance source-hash update listed above, remove the
Phase 5B6B test and evidence files, and leave all pre-existing dirty worktree
content untouched. Re-run the exact TypeScript command to confirm the
preserved 28-diagnostic baseline if rollback verification is required.

build_integrity_restored_with_governed_baseline_debt
