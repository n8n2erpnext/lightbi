# Phase 7R3 - Verified Metric Correctness And Required Family Coverage

## Scope

Phase 7R3 repaired verified metric comparison scope and audited the four MVP
metric families. It did not change formulas, semantic resolution, grain
policy, domain activation, question ranking, action advertisement, UI,
packaging, corpus truth, or runtime safety policy.

## Revenue correction

The six failed revenue-over-time comparisons were not formula failures. The
grouped query applied `LIMIT 100`, then the executor summed those display rows
and compared that partial value with full-file truth. Product grouping happened
to contain fewer than 100 groups, which explains the other six exact results.

Grouped plans now calculate one internal full-scope aggregate with the same
metric expression, filters, source binding, and time scope. The 100-row display
limit remains in place, but it no longer changes the comparison total. The
executor verifies that the internal total is finite and consistent, uses it for
ground-truth comparison, and removes it from visible columns and rows.

The unchanged 30-case Phase 7 evaluator now reports 12 exact matches from 12
verified comparisons. May revenue is `22,973,896,244`; June revenue is
`20,637,539,164`. The governed operator remains `governed_sum` and decision-use
authorization remains false.

## Required families

Revenue is the only family with an executable frozen-truth comparison on the
current canonical corpus path. Inventory cannot treat movement quantity as an
inventory-on-hand snapshot and lacks compatible frozen truth and an as-of
basis. Delivery count has source truth but no governed canonical identity/time
basis for the applicable real samples. Conditional gross profit has authentic
revenue/cost truth but is blocked by repeated-measure protection readiness.

Those are retained safety blockers, not failed calculations. Phase 7R3 does
not invent truth, weaken identity/snapshot protection, or silently aggregate
repeated measures. Required-family coverage therefore remains 1 of 4 (25%).

## Verification

- Phase 7R3 targeted runtime and metric tests: 3 files, 12 tests passed.
- Phase 5/6 and Phase 7R1/R2 regressions: 14 files, 58 tests passed.
- Complete `understanding-core`: 68 files, 310 tests passed.
- Unchanged Phase 7 evaluator: 30 cases, 37 source occurrences; 12/12 verified
  comparisons exact.
- Repository TypeScript: zero diagnostics.
- JSON, import/reachability, diff, and full-suite evidence are recorded in the
  final verification section below.

## Final verification

All Phase 7R3 JSON audits and the existing architecture/corpus JSON parsed
successfully. Governed import/reachability checks passed with the canonical
production path unchanged, and `git diff --check` passed. The Phase 5B6B
allowlist SHA-256 remains
`baa86950582b7d758396abb0c69fdaffcd3c2cbbb22b71dd3bbdb3c0aed1c4f5`.

The full desktop suite was run exactly once. It reported 161 files and 1,124
tests: 157 files and 1,115 tests passed. The nine failures are the exact
governed baseline identities: six deterministic signatures and three permitted
BA timeouts. Unexpected failures and Phase 7R3-owned failures are zero. Process
exit status is 1. The complete retained log is
`logs/phase-7r3-full-desktop-suite.log` (7,489 bytes), SHA-256
`cec8dafe1f8c42d33e20a0be47ca917f98e507898c4c841712ad9a2eeb75f6ac`.

Phase 7R3 changed:

- `governed-metric-query-planner.ts` - full-scope internal aggregate while
  preserving bounded display rows;
- `governed-metric-executor.ts` - compare verified truth against that aggregate
  and keep the internal column out of consumer output;
- `governed-metric-executor.test.ts` - full-scope grouped revenue and governed
  identity-count regression coverage;
- the six Phase 7R3 audit and remediation artifacts.

Rollback is limited to the three `governed-metric-*` implementation/test files
and these six Phase 7R3 artifacts. Earlier dirty-worktree changes belong to
previous phases and must not be reverted as part of this rollback.

not_ready_metric_family_coverage
