# Phase 5M4 Acceptance Closure

## Scope

Phase 5M4 closes the canonical Phase 5 core only. It does not wire Home,
Investigation, UI, AI, BA narrative, or production DuckDB consumers, and it
does not begin Phase 6.

## Root cause

The root cause is classified exactly as `generic_semantic_binding_defect`.
Header-level alias collisions remained permanently ambiguous after independent
value, type, grain, and sibling-column evidence left one viable binding. This
blocked document/event grain projection and caused metric preflight to inherit
unrelated measure-safety blockers.

The correction remains generic. It does not inspect filename, sample ID, source
hash, row count, expected result, or known golden values. It does not lower a
confidence threshold and does not set source-level `safeToAggregate` to true.

## Real golden result

`rev.sales_erp_may_2026` now follows the governed path from canonical profiling
through domain activation, M1 metric preflight, M2 question/action generation,
M3 runtime preflight, governed query planning, and actual DuckDB execution.
The `sales_revenue` result is `22,973,896,244`, an exact post-execution match to
the corpus ground truth. The operator is `governed_sum`; no legacy fallback is
used.

Execution retains its restrictions: `decisionUseAuthorized` is false,
production wiring is not executed, and source-level `safeToAggregate` remains
false. Eligibility is metric-binding-specific.

## Regression and governance

All 30 corpus cases are replayed without holdout, adversarial, or multi-file
tuning. The persisted historical baseline did not include per-case metric
states, so unknown transitions are not invented. The only claimed state change
is the previously persisted real-golden revenue blocker becoming conditionally
executable. No false executable case is accepted.

Historical Phase 3 and Phase 4 audits remain unchanged. M4 records versioned
before/after hashes and evidence-count deltas for the generic correction.

## Verification

- Phase 5M4 targeted tests: pass.
- Phase 5M1-M3 regression tests: 37 passed.
- Complete understanding-core: 61 files and 278 tests passed.
- Repository TypeScript: pass.
- Machine-audit parsing, import isolation, debug scan, and diff check: pass.
- Full desktop suite, run once: 1,077 passed and 9 failed. All 9 failures
  match the governed Phase 5B6B allowlist by test identity and signature;
  unexpected failures are zero.

## Final classification

`phase5_core_ready_for_phase6_cutover`

This classification means the Phase 5 canonical core is eligible to be
consumed by a future Phase 6 cutover. Phase 6 cutover is not started and no
production authority or consumer wiring has been changed.
