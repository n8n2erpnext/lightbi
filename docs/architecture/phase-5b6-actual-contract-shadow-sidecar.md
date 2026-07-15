# Phase 5B6 Actual Runtime Contract Shadow Sidecar

## Scope

Phase 5B6 adds a test/development-only sidecar and capture harness. It does not change a production contract, runtime plan, SQL preview, executor, chart, BA brief, UI, AI, DuckDB, persistence, telemetry, feature flag, metric, authority, or domain support declaration.

The harness calls the actual deterministic `enhancePlanWithGuardedSum` and `createSafeSqlPreview` functions. Executor and user-facing functions are represented only by their actual TypeScript contract shapes and are never invoked.

## Files Added

- `apps/desktop/src/lib/understanding-core/actual-contract-sidecar-contracts.ts`
- `apps/desktop/src/lib/understanding-core/actual-contract-sidecar-policy.ts`
- `apps/desktop/src/lib/understanding-core/actual-contract-capture-harness.ts`
- `apps/desktop/src/lib/understanding-core/actual-contract-sidecar.test.ts`
- `apps/desktop/src/lib/understanding-core/actual-contract-sidecar.corpus.test.ts`
- seven `docs/architecture/phase-5b6-*.json` machine audits
- this report

No Phase 5B6 module is exported from the understanding-core barrel. The Phase 5B5 scanner also passes because Phase 5B6 accepts the frozen projection through a minimal structural boundary rather than importing the frozen implementation.

## Build Integrity

The pre-change repository-wide command `npx tsc --noEmit -p tsconfig.app.json` exited 2 with 28 diagnostics. An isolated source copy excluding only Phase 5B5 projection files produced byte-identical compiler output and the same exit status. Therefore none of the 28 diagnostics is Phase-5B5-owned.

The Phase 5B4 report says typecheck passed, but the exact Phase 5B4 source snapshot and complete compiler log are not recoverable from git. The diagnostics are therefore recorded as concurrent dirty/untracked working-tree changes, not asserted as independently pre-existing. Their complete provenance and location are in `phase-5b6-typescript-build-integrity-audit.json`. Phase 5B6 does not repair unrelated modules merely to make the build green.

## Binding Result

Synthetic governed fixtures prove:

- absent aggregation is observed before the actual bridge injects SUM;
- explicit SUM, AVG, and COUNT remain explicit and unchanged;
- actual SQL text is captured exactly by the harness and represented in the sidecar only by a fingerprint and bounded structural summary;
- plan and SQL inputs remain structurally unchanged;
- compound identity separates same-source concurrent plans, same SQL with different origins, and same operator with different restrictions;
- retries are idempotent while ambiguous or stale bindings fail closed;
- full Phase 5A envelope and Phase 4C2 readiness capability, blocker, severity, remediation, debt, trust, and presentation records are cloned exactly;
- `summaryPercentage` remains `null` and every authority/approval/wiring flag remains false.

The result contract lacks canonical lineage and a stable binding identity. Request identity is safe in the isolated registry; result identity and BA enforcement still require explicit contract migration.

## Replay Truth

All 145 Phase 5B5 records were considered and remain represented with zero projection loss. None retains enough authentic legacy runtime-plan input to construct an actual incoming plan, enhanced plan, or SQL preview. All 145 are therefore explicitly unavailable with reason `AUTHENTIC_RUNTIME_PLAN_NOT_RETAINED_IN_PHASE5B4_OR_PHASE5B5_REPLAY`.

Synthetic fixtures are reported separately and never counted as actual replay. This keeps `actualPlanBindingCoverageComplete` and `actualSqlPreviewBindingCoverageComplete` false while allowing `sidecarReplayLossless` to describe preservation of the available projection records only.

## Consumer Debt

Chart association is technically possible outside the production object, but chart restrictions cannot be enforced by the current contract. KPI, BA, narrative, recommendation, alert, and persistence consumers require explicit identity, restriction, metric-reference, provenance, acknowledgement, or use-eligibility migration. No migration is implemented here.

## Gates

- `typescriptBuildIntegrityEstablished`: false
- `phase5B5DiagnosticProvenanceEstablished`: true
- `originalCanonicalCapabilityBindingComplete`: true
- `actualPlanBindingCoverageComplete`: false
- `actualSqlPreviewBindingCoverageComplete`: false
- `previewRequestIdentitySafe`: true
- `previewResultIdentitySafe`: false
- `chartSidecarCompatibilityEstablished`: true
- `BASidecarCompatibilityEstablished`: false
- `consumerContractDebtDispositioned`: true
- `sidecarReplayLossless`: true
- `sidecarReplayImportIsolated`: true
- `aggregationRestrictionProjectionEligible`: true
- `productionProjectionEligible`: false
- `criticalAggregationDivergencesResolved`: false
- `authorityMigrationEvidenceSufficientForPhase5CPlanning`: false
- `canonicalAuthorityMigrationEligible`: false
- `finalWorktreeFullSuiteVerified`: true (139 files; 1,023 passed; the same 9 documented baseline failures; zero Phase 5B6 failures)
- `productionWiring.executed`: false

## Rollback

Remove only the Phase 5B6 files listed above. No production module, frozen policy, barrel export, runtime contract, or behavior needs restoration.

not_ready_typescript_build_integrity
