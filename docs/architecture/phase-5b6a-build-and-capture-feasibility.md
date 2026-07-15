# Phase 5B6A Build and Capture Feasibility

## Scope

Phase 5B6A audits build provenance, authentic runtime-plan capture feasibility, and request/result identity. It adds one audit-only test and nine machine-readable audit artifacts. It changes no production runtime, plan, SQL, executor, chart, BA, persistence, telemetry, feature flag, domain, metric, authority, frozen policy, or public contract.

## Immutable Inventory

The pre-source-change inventory is preserved in `phase-5b6a-working-tree-manifest.json` at HEAD `70603dd6679a37a6f0a23e20fe6883faabd0e8a7` on `main`.

- The primary worktree was dirty: 6 tracked modified files and 224 pre-existing untracked files were captured before the Phase 5B6A manifest itself was created.
- Every captured tracked/untracked path has SHA-256 and byte-size evidence.
- Complete porcelain-v2 status, diff stat, diff name-status, relevant ignored generated paths, toolchain versions, tsconfig content/hash, and non-secret TypeScript resolution environment were retained.
- Current-tree typecheck output and exit status remain preserved under `/tmp/lightbi-phase5b6a-current-tsc.*`.

The inventory does not call the current tree clean.

## Build Provenance

The exact command is:

```text
cd apps/desktop && npx tsc --noEmit -p tsconfig.app.json
```

Clean detached HEAD `/tmp/lightbi-phase5b6a-clean-head` passed with exit 0 and no diagnostics while reusing the same desktop dependency installation. The current tree exits 2 with 28 diagnostics.

Incremental replay established the earliest final diagnostic set:

| Patch group | Diagnostics | Output relation |
| --- | ---: | --- |
| clean HEAD | 0 | green baseline |
| unrelated tracked changes only | 1 | transient missing untracked canonical module; not in final 28 |
| earlier canonical/Phase 5 source | 28 | earliest complete final set |
| plus Phase 5B5 | 28 | byte-identical |
| plus Phase 5B6 | 28 | byte-identical |

All 28 diagnostics are enumerated in `phase-5b6a-typescript-provenance-audit.json`. None is owned by Phase 5B5 or Phase 5B6. Because the diagnostics do not reproduce in clean HEAD, they are concurrent working-tree regressions and are not accepted as governed clean-HEAD debt.

Build decision: `build_regression_owned_by_concurrent_changes`.

`typescriptDiagnosticOriginEstablished` is true. `typescriptBuildIntegrityEstablished` remains false.

## Runtime Plan Origin

The incoming plan is created before `enhancePlanWithGuardedSum`:

1. Simple uses `DatasetUnderstanding` to produce selectable `AnalysisAction` values.
2. Advanced uses an actual `AdvancedQueryResult` to build an `AnalysisAction`.
3. `createRuntimeIntentFromAnalysisAction` deterministically creates `RuntimeIntent`.
4. `createRuntimePlanPreview` deterministically creates `RuntimePlanPreview`.
5. Investigation creates `enhancedPlan`, then `safeSqlPreview`.

The plan and intent producers are pure and safely testable when their actual inputs exist. Session timestamps/random IDs occur after plan production. Advanced briefing time does not affect the plan. No AI, network, or persistence is required by the plan producer.

The active Investigation singleton retains action, intent and plan only in memory. Workspace session snapshots retain dataset/sample state but omit action, intent, incoming plan, enhanced plan, SQL preview and request/result identity.

## Authentic Capture

All 145 governed records remain represented. Every record is classified `source_record_not_plan_applicable`.

These are physical-column aggregation divergence observations, not retained historical preview requests. They preserve source identity/hash, column, operator origin, policy outcome and restrictions, but not the selected action or Advanced result, intent, row buffer bound to a plan, incoming plan, enhanced plan, or SQL preview.

Planner, Advanced handoff and Investigation tests are synthetic contract fixtures. Acceptance corpus and workspace snapshots are partial retained evidence. Phase 5B1 through Phase 5B6 audit outputs are post-conclusion evaluation artifacts. None contains all source-hash-compatible legacy inputs for any governed record.

No canonical outcome, expected answer, filename, synthetic question, business view, relationship graph or workspace state was used to manufacture a plan.

Capture decision: `authentic_capture_not_feasible_for_current_corpus`.

## Identity Audit

`ExecutionRunCoordinator` creates a caller-local run ID/generation and rejects stale results in the active component. That token is not carried by `BackendPreviewInput` and is not echoed by `DuckDBPreviewResult`. The result ID is derived from plan ID, so concurrent identical plan IDs can collide. Source hash, incoming/enhanced plan fingerprints, SQL fingerprint, canonical envelope identity, restriction-set identity, retry identity, cancellation generation and stable result identity are absent.

Current binding classification: `identity_safe_for_request_only`.

The minimum future design is an explicit caller-created opaque token for each attempt, a shared retry-root token, and deterministic governed fingerprints for source, incoming plan, enhanced plan, SQL, canonical envelope and restrictions. Executor results must echo the exact correlation envelope; chart and BA inputs must require its result identity and use-eligibility fields. This design is documented only and is not implemented.

## Corrected Gates

- `phase5B5NonOwnershipEstablished`: true
- `typescriptDiagnosticOriginEstablished`: true
- `typescriptBuildIntegrityEstablished`: false
- `abstractSidecarProjectionLossless`: true
- `authenticRuntimePlanReplayAvailable`: false
- `actualPlanBindingCoverageComplete`: false
- `actualSqlPreviewBindingCoverageComplete`: false
- `previewRequestIdentitySafe`: true
- `previewResultIdentitySafe`: false
- `chartAssociationPossible`: true
- `chartRestrictionEnforcementPossible`: false
- `BASidecarAssociationPossible`: false
- `BARestrictionEnforcementPossible`: false
- `actualContractProjectionPlanningEligible`: false
- `productionProjectionEligible`: false
- `canonicalAuthorityMigrationEligible`: false
- `summaryPercentage`: null
- `productionWiring.executed`: false

Abstract losslessness does not establish actual binding. Caller-side request control does not establish result identity. Technical chart association does not establish restriction enforcement.

## Preservation

- No frozen policy or canonical authority changed.
- No production runtime contract, plan, SQL, executor, chart or BA function changed.
- No DuckDB query, user-facing chart, BA generation, AI, network capture or runtime instrumentation was invoked by Phase 5B6A.
- No production importer, barrel export, persistence, telemetry or feature flag was added.
- No measure became `safeToAggregate`; no metric or operation was approved.
- `DOMAIN_SUPPORT_MANIFEST` remains empty.
- All 145 records remain represented, `summaryPercentage` remains null, `productionWiring.executed` remains false, and `canonicalAuthorityMigrationEligible` remains false.

## Verification

The final Phase 5B6A source state produced these results:

- Phase 5B6A targeted audit: 1 file, 5 tests passed.
- Phase 5B6 plus Phase 5B6A sidecars: 3 files, 15 tests passed.
- Phase 5B5 projection: 2 files, 14 tests passed.
- Phase 5B through Phase 5B1 comparison/replay: 3 files, 11 tests passed.
- Phase 5A runtime adapter unit suite: 1 file, 6 tests passed.
- Phase 5A runtime adapter corpus: 1 file, 1 test passed in 52.59s.
- Phase 4C readiness unit/validation: 2 files, 9 tests passed.
- Phase 4C readiness corpus: 1 file, 1 test passed in 61.81s.
- Phase 4C validation corpus: 1 file, 1 test passed.
- Complete `understanding-core` matrix: 47 files, 229 tests passed in 511.10s.
- Current-tree typecheck: exit 2, the same 28 diagnostics and byte-identical SHA-256 `4598e25b...`; zero new Phase 5B6A diagnostic.
- Fresh detached clean-HEAD typecheck: exit 0, empty output.
- All 9 Phase 5B6A JSON artifacts parsed successfully.
- Import isolation: zero production references/importers.
- `git diff --check`: passed.
- Full desktop suite: run exactly once on final source state; 136/140 files and 1,029/1,037 tests passed in 604.69s.

The eight full-suite failures are outside Phase 5B6A: two BA comparison sample timeouts, one guided-investigation baseline assertion, three numeric-health baseline expectations, and two virtual-dataset planner baseline expectations. The prior report recorded nine failures in these same groups; with one worker, one of the three BA sample cases completed instead of timing out. No Phase 5B6A or Phase 5B6 test failed. Complete output is preserved at `/tmp/lightbi-phase5b6a-full-suite.log` with SHA-256 `f7d8f8bd...`.

## Rollback

Remove the nine `phase-5b6a-*.json` artifacts, `phase-5b6a-build-and-capture-feasibility.md`, and `apps/desktop/src/lib/understanding-core/phase-5b6a-audit.test.ts`. No production file requires restoration.

baseline_established_but_authentic_capture_unavailable
