# Phase 5M3 Governed Runtime Execution

## Scope

Phase 5M3 adds an isolated governed runtime path for `commerce_distribution_mvp`. It consumes only the six Phase 5M1 metric definitions and eligible Phase 5M2 action candidates. It does not export through the canonical barrel and has no Home, Investigation, UI, AI, BA, playbook, or production consumer.

The upstream policy identities remain unchanged:

- metric policy: `79b00e4aa7e97311da56db1f19a996c52c8034dc52da21b0dc6981dfd1282702`
- question policy: `9c8ce5e0904a95f70e80cb81bc79a4c52ba4729f4772a7e9a8d6e997da3d6cbb`
- domain manifest policy: `7b18e323865c6058a780d5ef31527878a60c004a116ba600c95ec6a705b8f37c`
- runtime policy: `9b5ef8acc2d6761b428b41713c4e0d87a9db3bb9c79d251e51026057d0ea00b4`

## Implementation

The new contracts distinguish preflight, runtime action, query plan, execution request, execution result, evidence, restriction, blocker, and DuckDB boundary records. Every record keeps decision use and production wiring false.

Runtime preflight verifies upstream artifact identities, exact source and selected canonical column bindings, metric state, grain, dimension, time, unit/currency, duplicate handling, snapshot basis, relationship requirements, and monotonic limitations. It returns `executable`, `conditionally_executable`, `blocked`, `unavailable`, or `invalid` with structured reasons.

The query planner selects an operator exclusively from the governed metric definition. It supports governed SUM, governed identity count, one-as-of snapshot SUM, and governed revenue-minus-cost. Filters are structured and parameterized. It has no SUM/COUNT fallback and does not inspect free-form question text to choose SQL.

The executor validates deterministic plan identity before invoking a DuckDB boundary. It preserves action, metric, source, plan, dimensions, time, evidence, restrictions, result shape, execution status, and ground-truth comparison. A successful query still cannot authorize BA or decision use.

## Files

Added canonical modules:

- `governed-runtime-contracts.ts`
- `governed-runtime-policy.ts`
- `governed-runtime-preflight.ts`
- `governed-metric-query-planner.ts`
- `governed-metric-executor.ts`
- `governed-local-duckdb-boundary.ts`

Added verification support:

- `governed-runtime-test-support.ts`
- `governed-runtime-preflight.test.ts`
- `governed-metric-executor.test.ts`
- `governed-runtime.corpus.test.ts`
- `phase-5m3-governance.test.ts`

The Phase 5M2 governance harness was corrected to classify the explicitly listed isolated Phase 5M3 modules as canonical downstream consumers rather than production importers. No Phase 5M2 question policy, contract, ranking, or generation behavior changed.

## Execution Evidence

DuckDB WASM executed controlled canonical inputs for all six governed metric forms:

| Metric | Operator | Expected | Actual | Comparison |
| --- | --- | ---: | ---: | --- |
| sales_revenue | governed_sum | 175 | 175 | exact_match |
| quantity_sold | governed_sum | 5 | 5 | exact_match |
| transaction_count | governed_identity_count | 2 | 2 | exact_match |
| inventory_on_hand | governed_point_in_time_snapshot_sum | 30 | 30 | exact_match |
| delivery_count | governed_identity_count | 2 | 2 | exact_match |
| gross_profit | governed_revenue_minus_cost | 100 | 100 | exact_match |

The adapter to the existing browser-local DuckDB executor was exercised with a spy. The production executor itself was not modified.

## Safety Evidence

All ten required positive probes and twenty required negative probes are represented. The negative probes cover automatic SUM, COUNT fallback, semantic substitution, snapshot misuse, repeated totals, missing governed identities, incompatible profit inputs, missing as-of basis, blocked-state promotion, restriction removal, question-text SQL authority, operator drift, unsupported grouping, source/hash mismatch, decision-authority escalation, and production/UI import wiring.

No negative probe became executable. Invalid plan identity prevents the DuckDB boundary call. A controlled DuckDB failure remains an execution failure and does not become a result.

## Corpus Debt

The real golden source `rev.sales_erp_may_2026` was loaded, hash-verified, and passed through the canonical profiler, semantic, grain, readiness, M1 metric, M2 question/action, and M3 runtime chain. Its existing verified revenue answer is `22,973,896,244`.

The current M1 preflight leaves `sales_revenue` blocked for that source, so M2 emits no eligible action and M3 returns `unavailable` without execution. Phase 5M3 deliberately does not promote the metric, bypass the action contract, run a legacy SUM, or claim a ground-truth match. Resolving that upstream eligibility debt requires a separately governed phase and is not a reason to weaken runtime safety.

## Verification

- Phase 5M3 targeted: 4 files, 12 tests passed.
- Phase 5M1/M2 regressions: functional and corpus tests passed; corrected M2 isolation harness passed.
- Complete understanding-core matrix: 58 files, 271 tests passed.
- `npx tsc --noEmit -p tsconfig.app.json`: passed.
- Seven Phase 5M3 machine audits: parsed successfully.
- `git diff --check`: passed.
- Import isolation: no barrel, production, Home, Investigation, UI, AI, or BA importer.
- Full desktop suite, run once on final source/test/policy state: 147 files passed, 4 failed; 1,070 tests passed, 9 failed.
- Full-suite disposition: all 9 failures match the Phase 5B6B governed baseline allowlist; failures outside the baseline: 0; Phase 5M3 failures: 0.

## Limitations

- Execution is validated on controlled retained rows; production full-file binding is not enabled.
- Real golden revenue cannot execute until the upstream governed metric/action eligibility is resolved.
- No result is eligible for BA narrative, recommendation, alert, decision use, UI projection, or production wiring.
- Phase 5M4 acceptance freeze and Phase 6 cutover have not started.

## Rollback

Remove the six isolated runtime modules, four Phase 5M3 test files plus test support, seven JSON audits, and this report. Revert only the isolated-downstream classification added to the Phase 5M2 governance harness. No production importer or runtime consumer requires migration because none was added.

governed_runtime_execution_ready_with_documented_debt
