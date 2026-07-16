# Phase 7R3.8 - Complete MVP Release Gate Retest

## Decision

The final working-tree candidate passes every measured semantic, action, metric, runtime-safety, explanation, TypeScript, canonical-reachability and governed-regression gate. It does not pass the MVP release gate because the exact candidate cannot be reconstructed from a clean checkout of HEAD.

This is an evaluation-only result. Phase 7R3.8 changed no production code, corpus truth, policy, test, threshold, UI, packaging or release artifact.

## Evidence Populations

Corpus 1.2.0 remains authoritative for semantic quality. Combined confirmed/probable precision is 100%, held-out core signal recall is 90.91%, ambiguity/unknown rate is 53.86%, grain accuracy is 86.49%, and domain activation precision is 100% with 80% in-scope coverage. Corpus 1.3.0 was not used to strengthen those claims.

Corpus 1.3.0 remains `repository_fixture_anchored_semi_synthetic_evidence`. It proves governed arithmetic and runtime boundaries only. Its deterministic regeneration is byte-identical to manifest SHA-256 `1dca495e0903a7d9e025d24e103bd6b64de20d13425e2284b6d73901ad6a7cec`.

## Release Measurements

- Corpus 1.2 actions: 30 advertised, 30 runtime-allowed, 30 executed; success 100%.
- Corpus 1.3 actions: 18 advertised and 18 executed; success 100%.
- Corpus 1.2 frozen metric comparisons: 20/20 exact.
- Revenue: May `22,973,896,244`, June `20,637,539,164`, exact.
- Delivery: May `1,500`, June `1,500`, exact by `ShipmentID`.
- Gross profit: May `3,075,721,244 VND`, June `2,934,640,164 VND`, exact.
- Inventory: `211,067 EA` at `2026-05-31` and `378,041 EA` at `2026-06-30`, exact.
- Inventory detail: all 1,266 May and 2,198 June item/warehouse keys match; zero missing, unexpected, duplicate or quantity-mismatch keys.
- Required metric-family coverage: 4/4.
- False executable actions and false decision-support cases: zero.
- Blocked explanations: 414/414 complete.
- Production legacy/deprecated execution reachability: zero.
- Import-to-first-valid-result timing: 11 observations; 1,112.23 ms minimum, 1,510.18 ms median, 3,527.73 ms maximum.

## Verification

- Phase 7R1-R3.7 evaluation: 8 files, 31 tests, all passed.
- Phase 5/6 regressions: 12 files, 39 tests, all passed.
- Final-state complete understanding-core: 73 files, 321 tests, all passed. The historical 320/321 result is not used.
- Repository TypeScript: zero diagnostics.
- Parsed JSON audits before Phase 7R3.8 outputs: 245, zero failures.
- Import/reachability and `git diff --check`: passed.
- Full desktop suite ran exactly once: 166 files and 1,135 tests; 8 failures all conform to the governed allowlist, with zero unexpected or Phase 7R3.8-owned failures. Complete log SHA-256: `2765bf6c53846f662c48e7ba3afefb6ebcb9e4098091a3b4ca1c94855737a1ae`.

## Blocking Gate

The detached clean worktree at HEAD `522c019623540581353d6668077ee0ab4395cec6` is clean but does not contain the Phase 6B.2 and Phase 7R1-R3.7 candidate. Missing repository-controlled inputs include `canonical-source-evidence.ts`, the Phase 7 evaluator and Phase 7R3.7 test, corpus 1.3, its deterministic generator, and Phase 6B.2 records.

No uncommitted patch, ignored data, commit, staging, copy or package operation was used to make this gate pass. Clean-checkout reproducibility is therefore a blocking failure and cannot be waived as documented debt.

not_ready_clean_machine_reproducibility
