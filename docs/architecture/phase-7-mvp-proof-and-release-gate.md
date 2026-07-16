# Phase 7 MVP Proof And Release Gate

Date: 2026-07-15
Base commit: `522c019623540581353d6668077ee0ab4395cec6`
Corpus: `1.2.0`, 30 cases, 37 source occurrences

## Scope and integrity

Phase 7 evaluated the existing canonical path only. No production detector,
semantic alias, domain, metric, grain policy, question policy, runtime policy,
ground truth, UI, AI, or BA behavior was changed. Golden cases were not used
for tuning, and holdout, adversarial, and multi-file cases remained evaluation
only. Unsupported and correctly blocked outcomes were not counted as failures.

The evaluation-only runner is
`apps/desktop/src/lib/understanding-core/phase-7-mvp-proof.test.ts`. It loads the
frozen corpus, verifies source hashes, executes physical profiling, semantic
resolution, grain resolution, domain activation, metric preflight, question and
action generation, runtime preflight, query planning, local DuckDB execution,
and evidence/caveat production.

## Results

| Measurement | Result | Gate |
| --- | ---: | --- |
| Confirmed/high-confidence mapping precision | 99.02% | Pass, >=95% |
| Held-out core MVP signal recall | 59.09% | Fail, <90% |
| Ambiguity/unknown rate | 55.72% | Measured |
| Grain accuracy | 81.08% | Measured; no threshold invented |
| Domain activation precision | 100% | Pass, >=95% |
| Runnable-action precision | 100% | Pass |
| Advertised-action execution success | 66.67% | Fail, <90% |
| Verified metric correctness | 50% (6/12) | Fail |
| False executable actions | 0 | Pass |
| False decision-support cases | 0 | Pass |
| Blocked explanation completeness | 100% (356/356) | Pass |
| First valid result | 1.07s min, 1.77s median, 3.23s max | 6 observations |
| Production legacy/deprecated reachability | 0 | Pass |

Mapping precision is calculated only over adjudicated confirmed/probable
selections; 230 high-confidence selections without corpus adjudication are
reported but excluded from the precision denominator. One confirmed false
mapping remains: `Ngưỡng tồn` was selected as `stock_status` in
`inv.provincial_aging_20241228`.

Signal recall is the primary release blocker. The current canonical engine
finds only 59.09% of required held-out core MVP signals. Domain activation has
no false positives, but activates only 15 of 25 in-scope cases; this coverage
loss is kept separate from its 100% precision.

All 14 runtime-allowed actions executed in Node DuckDB, but seven additional
generated action candidates failed governed runtime planning. Because those
candidates are advertised by generation, the correct denominator is 21, not
14. No false executable action was observed.

Revenue grouped by product matched the verified May and June full-file totals.
Revenue-over-time returned bounded trend rows whose sum did not match full-file
truth in six comparisons. Inventory, delivery/operations, and conditional
finance did not obtain executable verified comparisons, so Phase 7 cannot claim
their correctness.

## Corpus groups

| Group | Cases | Mapping precision | Required recall | Grain accuracy | Advertised / executed |
| --- | ---: | ---: | ---: | ---: | ---: |
| Golden | 8 | 100% | 61.90% | 87.50% | 3 / 2 |
| Holdout | 12 | 97.67% | 70.00% | 66.67% | 6 / 4 |
| Adversarial | 5 | 100% | 45.45% | 60.00% | 0 / 0 |
| Multi-file | 5 | 100% | 86.67% | 100% | 12 / 8 |

The adversarial group correctly advertised no actions. Multi-file relationship
resolution remained shadow-only: no join safety or relationship operation was
authorized or executed.

## Verification

- Phase 7 evaluation: 1 file, 1 test passed.
- Phase 5/6 regressions plus Simple and Advanced golden paths: 26 files,
  64 tests passed.
- Complete `understanding-core` matrix: 132 files, 289 tests passed.
- Repository TypeScript: zero diagnostics.
- Existing architecture audits parsed: 146 JSON files, zero parse failures.
- Reachability/import governance and `git diff --check`: passed.
- Detached clean-worktree reconstruction: offline frozen install, Phase 7
  evaluation, and TypeScript passed; normalized observations were identical at
  SHA-256 `e8a628174fdadc267928e64f504a3030fae8abbae406c14058ec8d89e9fb2a03`.

The candidate is reproducible from a clean worktree plus the hashed candidate
patch, but it is not present in a clean checkout of HEAD alone because the
Phase 6B.2 and Phase 7 state remains uncommitted. That is a release blocker,
not silently waived debt.

The full desktop suite was run exactly once on the final implementation/test
state. It reported 159 files and 1103 tests: 155 files/1094 tests passed. The
nine failures were exactly the governed baseline identities: six deterministic
failures and three permitted BA timeout failures. Unexpected failures and
Phase 7-owned failures were zero. Process exit status was 1; complete log
SHA-256 is `7fd5ee777ccbc69ab6d1527001386344e123a6f8e22bc0cd1bef2760c2c7d95d`.

## Release decision

The release gate does not pass. The primary blocker is held-out core signal
recall. Additional blockers are advertised-action execution coverage, verified
metric correctness/coverage, and absence of the exact candidate from a clean
checkout of HEAD. Phase 7 records these defects without fixing or tuning them.

not_ready_signal_recall
