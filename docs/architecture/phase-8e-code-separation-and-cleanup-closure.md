# Phase 8E Code Separation And Cleanup Closure

## Boundary

Phase 8E starts from functional checkpoint `eb93cefeaa779bb43ccf08e77d98dea414436d0a` (tree `8625535d51f6c32790c2f3e94f3f8eab2f0edfb8`). Inspection began at documentation descendant `7bab14aa25426b315b79618de6b4da87a51b05bf`, whose parent is the Phase 8D.1 checkpoint. Safety branch `phase-8e-safety-eb93cef` preserves the required rollback point. No push occurred.

The two ZIP files, `logs/dev-backend.pid`, and `releases/` remain excluded and untouched.

## Separation

`Home.tsx` moved from 2,822 to 789 lines, `Investigation.tsx` from 1,550 to 799, and `Advanced.tsx` from 2,072 to 770. The page shells retain route composition, lifecycle orchestration and authoritative state selection. Existing presentation, persistence coordination, source intake, planning, diagnostics, export and Advanced action responsibilities now have named owners.

No extracted module exceeds 1,000 lines. `HomeWorkspaceView.tsx` is 925 lines and has one controlled presentation responsibility. Keeping the Phase 8 Home DOM in one owner preserves conditional order, wording, focus targets and modal behavior without creating a second canonical state owner.

## Contract And Behavior

Canonical source, overlay, multi-source, Investigation handoff, Advanced handoff and workspace persistence contracts remain byte-for-byte unchanged. The governed allowlist remains frozen at SHA-256 `baa86950582b7d758396abb0c69fdaffcd3c2cbbb22b71dd3bbdb3c0aed1c4f5`.

Dependency checks prevent pages from being imported below the feature boundary, keep React out of `understanding-core` and runtime, and reject restoration of legacy fusion execution. No production symbol was deleted; compatibility and stale-state protection remain present.

## Verification

Targeted Phase 5, Phase 6 and Phase 8 tests pass. Page, persistence, export and architecture tests pass. Relationship and grain governance pass. Repository TypeScript passes with zero diagnostics. The complete `understanding-core` matrix passed 78 of 78 test files, including the heavy Phase 7 evaluators and Phase 8D.1 multi-source execution. Its retained log is `/tmp/phase8e-understanding-core-matrix.log`, SHA-256 `1089bb35510b3a477556f9978bea2428b356e8be6180412aad364482ca44b697`.

The final full desktop suite ran exactly once on the frozen source state. It retained 176 test files and 1,178 tests: 172 files and 1,169 tests passed. All nine failures matched the frozen allowlist by governed identity and signature: six deterministic baselines and three permitted timeouts. Unexpected and Phase 8E-owned failures are zero. The log is `/tmp/phase8e-final-full-desktop.log`, SHA-256 `02e5a1a5084d4924fa2de06b032d067db235da7716e393fca8472fc2d9fd487d`.

The local checkpoint parent, commit and tree are recorded in the final repository state and completion report after selective staging.

Phase 8E changes architecture ownership only. Visual redesign, new semantics, metrics, domains, runtime behavior, AI and SDK work have not started.
