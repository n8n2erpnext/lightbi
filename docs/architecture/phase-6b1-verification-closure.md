# Phase 6B.1 Final Regression Verification Closure

## Scope

Phase 6B.1 performed verification only. No implementation, test, scanner,
policy, tsconfig, dependency, baseline allowlist, or production behavior was
changed. The checkpoint was pushed to `origin/main` as commit
`522c019623540581353d6668077ee0ab4395cec6` before verification.

The tracked worktree was clean before the run. The existing local ZIP, backend
PID, and release installer remained untracked and were not part of the commit
or verification inputs. Phase 6B implementation/test hashes and the Phase
5B6B baseline allowlist hash matched before and after the full suite.

The incomplete Phase 6B attempt remains preserved in the original Phase 6B
report and final-gate audit. Phase 6B.1 adds a separate complete raw log inside
the machine-readable conformance audit.

## Gate Results

- Phase 6A/6B targeted tests: 5 files, 17/17 passed.
- Phase 5M1-M4 regression command completed successfully.
- Complete understanding-core command completed successfully.
- Seven Phase 6B audits parsed successfully.
- Import and production-reachability scans passed.
- `git diff --check` passed.
- `npx tsc --noEmit -p tsconfig.app.json` failed with 23 errors across five
  Phase 6B consumer/test files. Phase 6B.1 did not modify those files.

## Full Suite

The Phase 6B.1 full desktop suite ran exactly once and retained stdout, stderr,
exit status, final Vitest aggregate, and the raw-log SHA-256.

- Test files: 158 total, 153 passed, 5 failed.
- Tests: 1,100 total, 1,082 passed, 18 failed.
- Process exit status: 1.
- Complete raw-log SHA-256:
  `f920e078f103adef0c4ea3068ee210f823a2f4da95d6d404f4f207e98406d6d6`.

Governed identity comparison found all six deterministic baseline failures
with their expected signatures. All three timing-sensitive BA cases timed out
with the permitted 5,000 ms signature; none passed in this run.

Nine additional failures occurred in `src/pages/Investigation.test.tsx`. They
are not present in the baseline allowlist and are owned by the Phase 6B
Investigation boundary change. The tests cannot find the former execution
failure/degraded-mode presentation states after the canonical-only cutover.
They are unexpected regardless of the total failure count.

## Decision

The final aggregate is now retained and the exact final worktree was exercised,
so the missing evidence has been closed. Phase 6B cannot be promoted to MVP
proof because the TypeScript gate fails, unexpected failures are nonzero, and
Phase 6B-owned failures are nonzero. No source correction is permitted in this
verification-only phase.

Phase 7 was not started.

not_ready_unexpected_regression
