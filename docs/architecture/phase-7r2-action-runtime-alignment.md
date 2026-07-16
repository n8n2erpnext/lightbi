# Phase 7R2 - Advertised Action And Runtime Preflight Alignment

## Scope

Phase 7R2 aligns M2 advertisement with the existing M3 runtime preflight. It
does not weaken runtime blockers or change metric formulas, semantic
resolution, domain activation, DuckDB execution, corpus truth, packaging, or
UI design.

## Root cause and correction

The Phase 7R1.1 denominator contained 28 advertised actions. Fourteen
`transaction_count` actions were only M2 candidates: M1 marked the metric
`conditionally_ready`, but M3 correctly blocked execution with
`governed_identity_semantics_not_bound_to_grain`. The defect was an M2/M3
contract mismatch, not an M3 safety defect.

The generator now applies the exact governed M3 preflight before retaining an
action in the advertised list. A blocked candidate remains a visible
explanation-only question with the exact runtime blocker, remediation, caveat,
and evidence. Default ranking is recomputed from the retained runnable set and
remains capped at five. No blocked action was converted to executable.

## Evaluation

The unchanged Phase 7 evaluator retained its SHA-256
`f7559d9c3bb84425513fec9af748507e955aefbc11b59875fa3997e02429eb63`.
Across 30 cases and 37 source evaluations it reported:

| Measurement | Result |
| --- | ---: |
| Questions shown as runnable defaults | 14 |
| Explanation-only questions | 356 |
| Advertised runnable actions | 14 |
| Runtime-preflight passes | 14 |
| Executed actions | 14 |
| Advertised-action execution success | 100% |
| False executable actions | 0 |
| Blocked explanation completeness | 100% |
| Combined high-confidence mapping precision | 100% |
| Held-out core MVP signal recall | 90.91% |
| Domain activation precision | 100% |

All 14 previously runnable revenue actions remain runnable. All 14 previously
advertised-but-blocked transaction-count actions are now explanation-only.
The machine-readable classification audit records the state change for every
one of the previous 28 records.

## Verification

- Phase 7R2 targeted alignment, generator, runtime-preflight and M2 governance:
  4 files, 16 tests passed.
- Unchanged Phase 7 evaluator: 1 file, 1 test passed.
- Phase 5/6 and Phase 7R1 regression run: 18 files; after recognizing the
  Phase 7R2 M2-to-M3 governed importer, all regressions passed.
- Complete `understanding-core`: 68 files, 308 tests passed.
- Investigation projection: 1 file, 12 tests passed.
- Repository TypeScript: zero diagnostics.
- Architecture/corpus JSON parsing, import/reachability scans and
  `git diff --check`: passed.
- Full desktop suite, run exactly once: 161 files and 1,122 tests; 157 files
  and 1,113 tests passed. The nine failures are exactly the governed baseline:
  six deterministic signatures and three permitted BA timeouts. Unexpected
  failures and Phase 7R2-owned failures are both zero. Exit status is 1 and the
  complete log SHA-256 is
  `3e8bed256506f25dbcba72770d25b48cbb2ed626e55ab038c4afa66f5a312077`.

Metric correctness remains 50%, and clean-checkout reproducibility remains
blocked. Both are documented Phase 7R1.1 debts explicitly outside Phase 7R2.

action_execution_ready_for_release_gate_retest
