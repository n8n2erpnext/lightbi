# Phase 6B Advanced Canonical Cutover And Legacy Production Retirement

## Decision

Simple and Advanced production-created Investigation sessions now enter the
same Phase 6A canonical consumer envelope. Advanced preserves the selected
provider, SQL, result view, visible columns, filters, filter combinator, sort,
and table context as dataset-state identity inputs, but it cannot create a
semantic mapping, metric, operator, aggregation, question, or runtime policy.

The sole production session path is:

canonical dataset artifact -> governed action candidate -> runtime preflight
-> governed query plan -> governed execution and evidence.

Missing or blocked canonical handoffs stop with structured blockers. They do
not enter backend preview, JavaScript sandbox, mock preview, silent SUM, or
COUNT fallback paths.

## Advanced Cutover

`advanced-result-handoff.ts` is an adapter into the canonical boundary, not a
second understanding engine. It requires complete retained object rows and
binds an Advanced selection to an existing governed action. Partial results,
unsupported metrics, operator overrides, stale identity, or invalid artifacts
produce a blocked handoff.

`Advanced.tsx` passes that handoff into the existing Investigation session.
`Investigation.tsx` requires it and executes planned requests only through
`executeGovernedMetricRequest` and the governed local DuckDB boundary.
Restrictions, caveats, execution evidence, artifact identity, and
`decisionUseAuthorized:false` remain attached to the result.

## Production Reachability

Home and Advanced are the two production session creators. Both pass a
canonical handoff. Investigation no longer imports or calls the legacy backend
preview executor, DuckDB JavaScript sandbox executor, guarded SUM bridge, or
legacy SQL preview builder. Home no longer imports or calls the deprecated mock
DuckDB preview path.

Home and Investigation do not import the understanding-next action adapter on
the canonical session path. No production consumer imports isolated Phase 5
shadow or audit modules. AI briefing receives canonical mappings, caveats, and
presentation facts only; it has no metric, query, execution, or decision-use
authority.

## Legacy Disposition

- `backend-preview-executor`: `test_fixture_only`.
- DuckDB JavaScript sandbox execution: `test_fixture_only`.
- deprecated DuckDB mock preview execution: `test_fixture_only`.
- legacy SQL preview shape: `compatibility_type_only`; canonical plans are
  projected for display and no SQL is authored by it.
- sandbox result shape: `compatibility_type_only`; retained for current chart
  presentation without retaining the executor.
- understanding-next action adapter: `adapter_only`; removed from Home and
  Investigation but retained for older presentation consumers.
- guided investigation and business signal detector:
  `retained_with_documented_reason`; production session reachability is zero,
  while older components and historical tests still depend on them.
- understanding-next orchestrator and signal detector: `test_fixture_only`.
- legacy dataset-understanding builders: `blocked_by_external_consumer` because
  legacy presentation and comparison contracts still reference their types.

Deleting retained modules requires a separate retirement pass with proof that
their remaining fixtures, public contracts, and external consumers have moved.
They are not fallback branches from a canonical session.

## Required Proof

The Simple and Advanced golden flows both execute `sales_revenue` from
`Sales_ERP_May_2026.xlsx` through actual DuckDB and return exactly
`22,973,896,244`. Tests also prove unchanged state reuses one canonical
artifact, source or Advanced configuration changes invalidate identity,
restrictions survive into results, and decision use remains unauthorized.

Negative probes cover ungoverned SUM, COUNT fallback, operator mutation,
unsupported metric, attempted fallback after canonical blocking, stale
identity, missing full rows, legacy detector invocation, duplicate builds,
restriction loss, and attempted AI authority. Every probe blocks or preserves
the required invariant.

## Verification

- Phase 6A/6B targeted verification: 5 files, 17/17 tests passed.
- Phase 5M1-M4 regression command passed with exit code 0.
- Complete understanding-core run invoked 65 test files and passed with exit
  code 0.
- Simple and Advanced golden execution matched exactly.
- Repository TypeScript passed.
- All seven Phase 6B audit JSON files parsed successfully.
- Import, reachability, deprecated-path, and Phase 5 isolation scans passed.
- `git diff --check` passed.
- The full desktop suite was run once. Six captured deterministic failures in
  three legacy files all matched the Phase 5B6B baseline allowlist; no
  unexpected failure was observed. The test process completed, but the tool
  session closed before retaining Vitest's final aggregate line. The suite was
  not rerun because Phase 6B permits one full-suite run.

## Documented Debt

- Legacy modules remain for fixtures, presentation contracts, and external
  consumers even though they are unreachable from production-created sessions.
- Current chart presentation still uses compatibility result types; these
  types do not perform understanding or execution authorization.
- Advanced requires complete retained rows. Truncated, paged, or otherwise
  partial result sets fail closed.
- The only governed domain pack remains the existing conditional
  `commerce_distribution_mvp`; Phase 6B makes no new support claim.
- The full-suite final aggregate line was not retained, so regression closure
  is recorded with the captured allowlisted failures and this explicit
  verification limitation.

## Rollback

Restore the previous Advanced handoff and Investigation compatibility branch,
then remove the Advanced canonical handoff fields and Phase 6B tests/audits.
The Phase 6A Home cutover and Phase 3-5 policies do not need to be rolled back.

phase6_cutover_ready_with_documented_debt
