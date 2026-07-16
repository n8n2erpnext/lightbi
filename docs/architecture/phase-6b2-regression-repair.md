# Phase 6B.2 Canonical Consumer Boundary Regression Repair

## Scope

Phase 6B.2 repaired the TypeScript and Investigation consumer-boundary debt
identified by the committed Phase 6B.1 verification at
`522c019623540581353d6668077ee0ab4395cec6`. It did not begin Phase 7, change
semantic or runtime policy, add a domain/metric/question, or restore a legacy
execution path.

## Corrections

All 23 TypeScript diagnostics were traced in
`phase-6b2-typescript-diagnostic-audit.json`. The corrections are confined to
explicit fixture typing, compatibility projection typing, removal of unused or
impossible legacy branches, restoration of direct contract types, and the
canonical Investigation presentation boundary. No `any`, `@ts-ignore`,
compiler relaxation, unsafe cast, or allowlist change was introduced.

The nine Phase 6B-owned Investigation failures were classified before their
tests were replaced. Two asserted intentionally retired fallback behavior, six
used stale legacy executor/fixture contracts or lacked canonical presentation,
and one exposed a real canonical result-validation presentation regression.
Their classifications and replacement assertions are recorded in
`phase-6b2-investigation-regression-audit.json`.

Investigation now presents canonical blockers, missing full rows, stale or
invalid handoffs, governed execution failures, thrown executor failures, empty
results, and validation failures without creating a success chart or invoking
a legacy fallback. Restrictions and evidence survive both success and failure,
and `decisionUseAuthorized` remains false.

## Production Path

Simple continues to create a canonical handoff in Home. Advanced continues to
adapt its selected result into the same canonical handoff. Investigation calls
only `executeGovernedMetricRequest` for execution. Production scans found no
backend preview, JavaScript sandbox, mock preview, fallback marker, or degraded
legacy execution call in Home, Advanced, Investigation, the Advanced handoff,
or Investigation session modules.

The existing Phase 6A/6B proofs continue to cover exact Simple and Advanced
golden revenue of `22,973,896,244`, blocked execution, restriction retention,
decision-use denial, and canonical artifact reuse for unchanged dataset state.

## Files Changed

- `apps/desktop/src/lib/advanced-result-handoff.test.ts`
- `apps/desktop/src/lib/canonical-consumer-presentation-adapter.ts`
- `apps/desktop/src/lib/understanding-core/canonical-consumer-boundary.ts`
- `apps/desktop/src/pages/Home.tsx`
- `apps/desktop/src/pages/Investigation.tsx`
- `apps/desktop/src/pages/Investigation.test.tsx`
- Six Phase 6B.2 audit/report files under `docs/architecture/`

Pre-existing untracked ZIP, Phase 6B.1 documents, PID file, and release
artifacts were preserved and were not modified as part of this repair.

## Verification

- Phase 6B.2 Investigation verification: 1 file, 12/12 tests passed.
- Phase 6A/6B targeted verification: 6 files, 29/29 tests passed.
- Phase 5M1-M4 regressions: 6 files, 18/18 tests passed.
- Complete understanding-core: 65 files, 288/288 tests passed.
- Repository TypeScript: exit 0 with zero diagnostics.
- Phase 6B.2 JSON audits parse successfully.
- Canonical-only production import and reachability scans passed.
- `git diff --check` passed.

The full desktop suite ran exactly once on the final implementation state:

- 158 test files: 154 passed, 4 failed.
- 1,102 tests: 1,093 passed, 9 failed.
- All six deterministic failures matched the Phase 5B6B governed identities
  and signatures.
- All three timing-sensitive BA cases failed only by the governed 5,000 ms
  timeout signature.
- Unexpected failures: 0.
- Phase 6B-owned failures: 0.
- Complete combined-log SHA-256:
  `8caf1fdbe84a20503ceb9776bb6fa7c77b93dfc21a18f89751543a706877fd33`.

The nonzero Vitest process status is therefore governed baseline conformance,
not a Phase 6B.2 regression.

## Rollback

Revert the six implementation/test files listed above and remove the six
Phase 6B.2 audit/report files. Do not change the Phase 5B6B baseline allowlist
or the Phase 6A/6B canonical cutover artifacts.

phase6_canonical_cutover_complete_ready_for_mvp_proof
