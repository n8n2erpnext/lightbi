# Phase 7R4.1 Repository-Safe Corpus Release Closure

## Scope

Phase 7R4.1 removed release and clean-checkout dependence on 13 ignored corpus
1.2 workbooks. It did not change production detection, profiling, semantic
resolution, domain activation, metric formulas, runtime behavior, aliases, UI,
or the governed regression allowlist.

Corpus 1.2 remains byte-frozen historical local evidence. Corpus 1.3 remains
the tracked arithmetic anchor and deterministic oracle. Corpus 1.4.0 is the
tracked release acceptance corpus.

## Repository-Safe Inputs

- Inventoried 13 ignored workbooks: 8 required deterministic sanitization, 4
  were unsafe or unlicensed for repository redistribution, and 1 could not be
  licensed or classified safely.
- Committed none of the 13 original workbooks.
- Added 13 deterministic sanitized or independent synthetic XLSX fixtures.
- Added 19 tracked release source bindings covering the same 30 acceptance
  scenarios across golden, holdout, adversarial, and multi-file groups.
- Resolver rejects absolute paths, `sample data` fallback, ignored release
  inputs, path escape, and missing required inputs.
- Sanitizer replay and complete corpus rebuild produced byte-identical hashes
  in two consecutive runs.
- Privacy scan found no personal-data pattern, comment, hidden sheet, external
  link, formula, or unsafe workbook metadata in release fixtures.

## Acceptance Measurements

The unchanged Phase 7 evaluator ran all 30 corpus 1.4 cases:

- Confirmed mapping precision: 100% (24/24 adjudicated).
- Combined high-confidence mapping precision: 100% (112/112 adjudicated).
- Held-out core MVP signal recall: 90.91%.
- Grain accuracy: 89.19%.
- Domain activation precision: 100% (16/16).
- Advertised action execution: 100% (30/30).
- False executable actions: 0.
- False decision-support cases: 0.
- Verified metric correctness: 100% (20/20 comparisons).
- Blocked explanation completeness: 100% (414/414).

No corpus 1.2 measurement was reclaimed and no evaluation-only case was used
for tuning.

## Clean Checkout

Candidate `11803066709d55a629de6c2576b9da9cd94da695` was reconstructed in a
detached worktree. `pnpm install --offline --frozen-lockfile` added 367 cached
packages with zero downloads. None of the 13 ignored historical workbooks was
present.

- Targeted release and corpus tests: 69/69 passed.
- Complete understanding-core matrix: 325/325 passed across 74 files.
- Repository TypeScript: zero diagnostics.
- Architecture JSON parsing: 242 files parsed.
- Corpus 1.3 generator and oracle: two byte-identical reconstructions.
- Import and production-reachability governance: canonical-only and passing.
- Worktree status before and after verification: clean.

## Full Suite

The final candidate full desktop suite ran exactly once. Complete stdout and
stderr are retained at `/tmp/phase7r41-final-full-desktop.log`, SHA-256
`c10cc764d2e99b9ee73b42143f4f82bab16fda2e499aec6ac0fb501be28a8c25`.

Aggregate: 167 test files, 163 passed and 4 failed; 1,139 tests, 1,130 passed
and 9 failed. All nine failures match the unchanged governed allowlist by test
identity and signature: six deterministic baselines and three permitted BA
timeouts. Unexpected failures and Phase 7R4.1-owned failures are both zero.
The process exit status is 1 because Vitest reports governed baseline failures;
total failure count is not the conformance gate.

## Rollback

Revert candidate `11803066709d55a629de6c2576b9da9cd94da695` and its evidence commit.
This restores corpus 1.2-only verification behavior; it also restores the
known clean-checkout dependency and is not release-safe.

## Release Decision

All Phase 7R4.1 repository-input, acceptance, safety, clean-checkout,
TypeScript, reachability, and governed full-suite gates pass. No push was
performed.

mvp_release_gate_passed_repository_inputs_closed
