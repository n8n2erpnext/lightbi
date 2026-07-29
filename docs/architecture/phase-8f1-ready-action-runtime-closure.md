# Phase 8F.1 Ready-Action Runtime Source Continuity Closure

## Defect And Cause

The real browser evidence was correct: Home could advertise a Revenue action as ready while a restored workspace retained only representative rows. Investigation then correctly blocked with `canonical_full_file_runtime_source_required`.

The loss occurred at workspace restoration and presentation. Persisted file restoration re-inspected the file but discarded the rebuilt runtime reference; generic snapshot restoration marked the dataset ready with no browser `File`; Home did not include current runtime-source continuity in its ready projection. Dataset selection also contained an unbound runtime fallback.

## Correction

Runtime continuity is now an explicit fail-closed production boundary. A runnable action requires the exact source ID, fingerprint, inspection generation, profile generation and expected row count. Multi-source actions require every source used by that exact action. Home checks continuity immediately before navigation and carries only the bound live runtime source into the in-memory Investigation session.

The Investigation full-file guard remains unchanged. Representative, semantic, preview and persisted sample rows never become runtime input. If a saved session cannot recover a complete file, it becomes `stale`, shows `Understood — source reselection required`, offers `Reselect source`, and exposes no Investigate action. If the persisted complete file is available, LightBI re-downloads, re-inspects and rebuilds the canonical source boundary before restoring readiness.

## Browser Proof

The corrected served app was exercised at `http://127.0.0.1:5177/`.

- Fresh Sales journey: 1,500 source rows, 932 representative understanding rows, runtime label `full source available`, Revenue action ready, full-file governed result `22,973,896,244`, no full-source blocker.
- Dataset-group journey: the selected member retains its original browser `File` and canonical runtime binding; no unbound group fallback remains.
- Persisted complete source: reopen rebuilds the canonical boundary and restores full-source availability.
- Snapshot without a complete source: stale state, zero Investigate buttons, visible reselection operation.
- Multi-source Sales plus Accounting: both 1,500-row sources materialized; governed gross profit is `3,075,721,244 VND`.

Screenshots are retained at `/tmp/phase8f1-live-home.png`, `/tmp/phase8f1-live-revenue-result.png`, `/tmp/phase8f1-reload-session.png`, `/tmp/phase8f1-missing-file-session.png`, and `/tmp/phase8f-multisource-verified.png`.

## Verification

Phase 8F.1 probes, Phase 8A full-source tests, Phase 8F parity, Home/Investigation, session continuity, multi-source execution, complete understanding-core, TypeScript, production build, architecture parsing, canonical reachability and diff checks passed.

A pre-final diagnostic full run exposed only a page-size regression introduced by the continuity wiring. The wiring was compacted without behavior change; the 800-line gate then passed. The one full suite run after that final correction completed 180 files and 1,211 tests: 176 files and 1,202 tests passed. The nine failures are the exact frozen governed baseline: six deterministic and three timing-sensitive BA cases. Unexpected failures and Phase 8F.1-owned failures are zero.

Final log: `/tmp/phase8f1-final-full-desktop.log`, SHA-256 `bfe74968d2a2bcd1717643fffa88fe5fc31a3a6c9da744af323169cab7a4ad5d`.

Governed allowlist SHA-256: `baa86950582b7d758396abb0c69fdaffcd3c2cbbb22b71dd3bbdb3c0aed1c4f5`.

No guard, M1/M2/M3 policy, semantic mapping, metric formula, corpus truth, allowlist or visual design was changed. Phase 9 has not started.

core_ui_functional_parity_complete_ready_for_visual_replacement
