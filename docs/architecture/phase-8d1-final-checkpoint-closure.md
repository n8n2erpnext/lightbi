# Phase 8D.1 Final Checkpoint Closure

## Checkpoint

The complete Phase 8D and Phase 8D.1 implementation was already contained in one suitable local checkpoint, so no duplicate checkpoint was created. The Phase 8C starting commit and checkpoint parent are both `788b277bdf6de1e19b24ee6d0e5dcc8d5eb0a8d7`. The checkpoint is `eb93cefeaa779bb43ccf08e77d98dea414436d0a`, with tree `8625535d51f6c32790c2f3e94f3f8eab2f0edfb8` and 47 committed files. It descends from Phase 8B commit `000f0c809159f3da7f2a9ae324c45c58931b01e7`.

The committed Phase 8D.1 closure and regression report match their working copies byte-for-byte. Their SHA-256 values are respectively `0f8b996383862fa7273feb69b637406fa39f3ed8e3fe4d9b3e7da62f88febc97` and `d8a0094c6e4a840738abd34e9a71d8d34920bf5e046ba4936855583652f67ea8`.

## Retained Evidence

- Phase 8A through 8D.1 targeted verification passed: 8 files and 29 tests.
- Complete `understanding-core` passed: 78 files and 340 tests.
- Governed gross profit is exactly `3,075,721,244 VND`.
- All 30 required negative probes failed closed.
- Repository TypeScript passed with zero diagnostics.
- Architecture JSON parsing, canonical import/reachability, and `git diff --check` passed.
- The full desktop suite was already run exactly once and was not rerun during closure.
- Its nine failures matched the frozen allowlist by test identity and signature; unexpected failures were zero.
- Retained log: `/tmp/phase8d1-final-full-desktop.log`, SHA-256 `bd85dcd9b9727fc16fb7f7e0e701d612e9b4839750a8b040c30dab729b2aeaa3`.
- Frozen allowlist SHA-256: `baa86950582b7d758396abb0c69fdaffcd3c2cbbb22b71dd3bbdb3c0aed1c4f5`.

The lightweight post-checkpoint verification passed 10 files and 35 tests, including canonical Phase 6 isolation/reachability and Phase 8A through 8D.1. Architecture parsing covered 301 JSON files.

## Worktree Boundary

The checkpoint's tracked worktree and index are clean. Four pre-existing unrelated untracked artifact groups remain excluded: two ZIP archives, `logs/dev-backend.pid`, and `releases/`. They were not staged, deleted, stashed, or modified.

No legacy fusion constructor or review path is present in Home, and the canonical multi-source boundary and executor contain no legacy fusion fallback. No push occurred. Phase 8E has not started.

mvp_functional_ui_reachability_complete_ready_for_code_cleanup
