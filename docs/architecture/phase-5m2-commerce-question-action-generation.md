# Phase 5M2 Canonical Commerce Question And Action Generation

## Executive decision

Phase 5M2 adds deterministic, canonical-shadow question generation and guarded action candidates for the single conditional `commerce_distribution_mvp` pack. Generation consumes one canonical source artifact, the governed domain activation artifact, the Phase 5M1 metric catalog, and the exact metric preflight artifact.

The implementation is suitable for a later runtime-guard integration phase with documented debt. It does not authorize an action, generate SQL, execute a metric, change runtime authority, or alter user-facing behavior.

## Implemented scope

Added versioned contracts for:

- `GovernedQuestionCandidateV1`;
- `GovernedActionCandidateV1`;
- `QuestionActionGenerationV1`;
- `QuestionActionPolicyV1`;
- `QuestionActionBlockerV1`;
- `QuestionActionEvidenceV1`;
- `QuestionActionLimitationV1`.

Added a governed question policy with ten semantically distinct lenses over the six existing Phase 5M1 metrics:

- sales revenue over time and by product;
- quantity sold over time and by product;
- governed transaction count;
- inventory on hand as-of and by product at the as-of basis;
- governed delivery count and delivery count by status;
- governed gross profit over compatible periods.

No domain or metric was added. Margin, forecast, retention, churn, lifetime value, and generic KPI questions remain outside the policy.

## Capability and action boundary

The output keeps four separate facts:

- a governed metric definition may exist;
- a question may represent a meaningful lens;
- an action candidate exists only after metric and question-specific preflight;
- an executable action remains false.

Missing metric preflight does not erase definition capability. It emits `metric_preflight_result_missing` and leaves the question explanation-only. Blocked, unknown, unsupported, and not-applicable questions never enter defaults and never receive action candidates.

Every question and action candidate includes stable identity, contract version, domain and metric IDs, business purpose, required and resolved dimensions, time basis, exact metric preflight state, blockers, limitations, remediation, evidence, prohibited uses, and explicit false runtime, authorization, execution, and production flags.

## Ranking policy

Default ranking is deterministic and capped at five:

1. `ready` before `conditionally_ready`;
2. source-local before relationship-dependent;
3. governed policy priority;
4. governed identity as the final stable tie-breaker.

Input metric order and semantic column array order do not alter output. Duplicate metric preflight entries use the weakest deterministic state, and duplicate governed question identities are suppressed. Filename, sample ID, expected answer, legacy playbook, and alias-only evidence are absent from generation policy.

## Safety behavior

- Question state can preserve or weaken the underlying metric state, never strengthen it.
- Missing time, product grouping, delivery status, or as-of basis is explicit.
- Governed identity remains mandatory for transaction and delivery counts through metric preflight.
- Inventory snapshots are represented only as point-in-time balances and prohibit movement or cross-time summation claims.
- Unit price cannot activate revenue.
- Gross profit remains explanation-only when compatible cost, grain, period, currency, or relationship evidence is not proved by metric preflight.
- Conditional action candidates preserve all upstream limitations.
- No SQL text, runtime plan, result value, or decision authorization is produced.

## Corpus verification

The Phase 5M2 runner evaluated all 30 Phase 1B cases and all 37 source instances through full canonical profiling, semantic resolution, grain resolution, readiness, Phase 5M1 metric preflight, domain activation, and question/action generation.

- Golden: 8 cases, tuning allowed.
- Holdout: 12 cases, evaluation only.
- Adversarial: 5 cases, evaluation only.
- Multi-file: 5 cases and their source-local artifacts, evaluation only.

The runner verifies state monotonicity, maximum default count, blocked-default suppression, identity deduplication, non-execution, result non-production, and privacy-safe source references. Verified metric answers were not changed or emitted. Evaluation-only groups did not tune policy.

Synthetic coverage includes all eight required positive behaviors and all fourteen required negative boundaries, including unsupported domain, legacy bypass, alias-only activation, order stability, duplicate questions, state strengthening, and production import isolation.

## Files changed

Canonical shadow modules:

- `apps/desktop/src/lib/understanding-core/governed-question-action-contracts.ts`
- `apps/desktop/src/lib/understanding-core/commerce-distribution-question-policy.ts`
- `apps/desktop/src/lib/understanding-core/governed-question-action-generator.ts`

Tests:

- `apps/desktop/src/lib/understanding-core/governed-question-action-generator.test.ts`
- `apps/desktop/src/lib/understanding-core/governed-question-action-generator.corpus.test.ts`
- `apps/desktop/src/lib/understanding-core/phase-5m2-governance.test.ts`

Machine audits:

- `docs/architecture/phase-5m2-question-action-policy-audit.json`
- `docs/architecture/phase-5m2-question-action-corpus-audit.json`
- `docs/architecture/phase-5m2-ranking-audit.json`
- `docs/architecture/phase-5m2-import-isolation-audit.json`
- `docs/architecture/phase-5m2-migration-gate-audit.json`

This verification report is the only additional file.

## Preservation and isolation

No production importer or barrel export was added. `understanding-core/index.ts`, Home, Investigation, UI, AI, DuckDB, runtime execution, legacy playbooks, semantic policy, grain policy, relationship policy, readiness policy, metric policy, and the governed manifest remain unchanged by Phase 5M2.

The Phase 5M2 modules do not import `question-engine`, `understanding-next`, legacy domain catalogs, legacy playbooks, SQL tooling, DuckDB, Home, or Investigation. `productionWiring.executed` remains false throughout.

Policy identities retained:

- Governed manifest: `7b18e323865c6058a780d5ef31527878a60c004a116ba600c95ec6a705b8f37c`.
- Phase 5M1 metric policy: `79b00e4aa7e97311da56db1f19a996c52c8034dc52da21b0dc6981dfd1282702`.
- Phase 5M2 question policy: `9c8ce5e0904a95f70e80cb81bc79a4c52ba4729f4772a7e9a8d6e997da3d6cbb`.

## Verification results

- Phase 5M2 targeted: 3 files passed, 10 tests passed.
- Phase 5M1 regression: 3 files passed, 15 tests passed.
- Complete `understanding-core`: 54 files passed, 259 tests passed.
- Repository TypeScript: `npx tsc --noEmit -p tsconfig.app.json` passed with zero diagnostics.
- Five Phase 5M2 JSON audits parsed successfully.
- Import-isolation scan returned no production importer and no barrel export.
- `git diff --check` and untracked-file trailing-whitespace scan passed.
- Full desktop suite was run exactly once on the final source, test, and policy state: 143 files passed; 4 files contained the governed baseline failures; 1058 tests passed and 9 failed.
- The 9 failures exactly match the Phase 5B6B allowlist: 3 `ba-comparison-engine` timeouts, 3 `numeric-health-gate` assertions, 2 `virtual-dataset-planner` assertions, and 1 `guided-investigation-pipeline` assertion.
- Unexpected failures outside the governed baseline allowlist: 0.

## Documented debt

- The domain pack remains conditional and production-inactive.
- Questions and action candidates are canonical shadow artifacts only.
- Runtime guard binding, runtime plan identity, operation safety, SQL compilation, DuckDB execution, and decision-use authorization remain unproved.
- Cross-source gross-profit compatibility remains governed by Phase 5M1 and cannot be promoted by this source-local generator.
- Canonical semantic ambiguity and readiness debt are preserved rather than repaired here.
- Home, Investigation, AI briefing, and legacy consumer migration remain later-phase work.

## Rollback

Remove only the three Phase 5M2 canonical-shadow modules, three Phase 5M2 tests, five Phase 5M2 JSON audits, and this report. No manifest, metric, semantic, grain, relationship, readiness, runtime, UI, or legacy rollback is required.

## Stop condition

Phase 5M2 stops here. Runtime guard wiring, SQL generation, DuckDB execution, Home or Investigation integration, additional domains, prospective capture, Phase 6 cutover, and production authority migration are not started.

question_action_generation_ready_with_documented_debt
