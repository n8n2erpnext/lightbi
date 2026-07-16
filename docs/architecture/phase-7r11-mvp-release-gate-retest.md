# Phase 7R1.1 MVP Release Gate Retest

Date: 2026-07-15
HEAD: `522c019623540581353d6668077ee0ab4395cec6`
Corpus: `1.2.0`, 30 cases, 37 source occurrences

## Scope

This phase re-ran the unchanged Phase 7 evaluator on the final Phase 7R1
working tree. No production logic, corpus truth, policy, semantic threshold,
metric, question, action, runtime behavior, or UI behavior was changed.
Holdout, adversarial, and multi-file cases remained evaluation-only. Correctly
blocked and unsupported outcomes were not counted as failures.

## Release measurements

| Measurement | Result | Gate |
| --- | ---: | --- |
| Combined confirmed/probable mapping precision | 100% (110/110) | Pass, >=95% |
| Held-out core MVP signal recall | 90.91% (20/22) | Pass, >=90% |
| Ambiguity/unknown rate | 53.86% | Measured |
| Grain accuracy | 81.08% | Measured; no threshold invented |
| Domain activation precision | 100% (20/20) | Pass, >=95% |
| Domain activation coverage | 80% (20/25) | Measured separately |
| Runnable-action precision | 100% | Pass |
| Advertised-action execution | 50% (14/28) | Fail, <90% |
| Verified metric correctness | 50% (6/12) | Fail |
| Required metric-family coverage | 25% (1/4) | Fail |
| False executable actions | 0 | Pass |
| False decision-support cases | 0 | Pass |
| Blocked explanation completeness | 100% (356/356) | Pass |
| Production legacy/deprecated reachability | 0 | Pass |

The action result uses the new post-7R1 denominator. Phase 7 advertised 21
actions; Phase 7R1 advertises 28. Fourteen pass runtime preflight and all 14
execute, while the other 14 are blocked only after they were advertised.

Metric coverage remains limited to `sales_revenue`. Six grouped comparisons
match frozen truth and six bounded revenue-over-time comparisons do not match
the full-file totals. Inventory, delivery/operations, and supported conditional
finance still have no executable verified comparison.

## Domain and grain

Domain activation remains precise but incomplete: 5/8 golden, 10/12 holdout,
0/0 adversarial, and 5/5 multi-file in-scope cases activate. Grain accuracy is
87.5% golden, 66.67% holdout, 60% adversarial, and 100% multi-file.

## Clean checkout

The exact Phase 6B.2 plus Phase 7R1 candidate is not in committed HEAD. The
tracked candidate diff is non-empty, and both the Phase 7 evaluator and Phase
7R1 test are untracked. In addition, `sample data/` is ignored and a clean HEAD
contains none of the required source files. The clean evaluator therefore
stopped explicitly at `PHASE_7_REQUIRED_SOURCE_MISSING`.

A detached worktree with the exact hashed patch, copied evaluation files, and
externally supplied ignored corpus produced the same normalized observations
as the primary worktree at SHA-256
`01a532c9f5aaa59e969bbcdcdbb90c504634bd6401c144fa79b9075754671ade`.
This proves patch-level reproducibility, not clean-checkout reproducibility.

## Verification

- Unchanged Phase 7 evaluator: 1 file, 1 test passed.
- Phase 7R1: 1 file, 16 tests passed.
- Phase 5/6 regressions: 11 files, 36 tests passed.
- Complete `understanding-core`: 67 files, 305 tests passed.
- Repository TypeScript: zero diagnostics.
- Architecture and corpus JSON before these outputs: 175 parsed, zero failures.
- Import, reachability, specificity, and diff checks: passed; production remains canonical-only.
- Full desktop suite: 160 files and 1,119 tests; 156 files/1,110 tests passed.
- Full-suite failures: six governed deterministic baselines and three governed BA timeouts; unexpected failures 0 and Phase 7R1.1-owned failures 0.
- Full-suite exit status: 1; complete log SHA-256 `f334f39ea587ad4109bf82c090f2533c589f5e178cf4defccfcc4fd0651594af`.

## Release decision

Recall remediation is confirmed and did not introduce an unexpected
regression. Release is still blocked by advertised-action execution, verified
metric correctness and coverage, and clean-checkout packaging. Their owning
layers are respectively action generation/runtime preflight, governed metric
execution/preflight/comparison, and release/corpus packaging. This phase only
records those defects and does not fix them.

not_ready_multiple_release_blockers
