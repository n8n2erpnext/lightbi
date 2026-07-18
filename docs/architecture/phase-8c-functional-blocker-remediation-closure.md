# Phase 8C Functional Blocker And Remediation Closure

## Scope

Phase 8C starts from Phase 8B checkpoint `000f0c809159f3da7f2a9ae324c45c58931b01e7`
(tree `d88a16bbe37a88dbf699e47092d6d16920664dc3`, parent Phase 8A
`a6a13e3d54de3f3fa38367f326dcd4957cdf620b`). The tracked worktree was clean,
the checkpoint descended from Phase 8A, and the Phase 8B production overlay
tests passed before this phase. No push is part of this work.

This phase changes functional presentation and routing only. It does not
change semantic aliases, domains, metrics, M1/M2/M3 policy, runtime operators,
DuckDB behavior, thresholds, corpus truth, or visual information architecture.

## Canonical Presentation

`lightbi.canonical-consumer-presentation.v1` derives UI state from the
canonical consumer artifact and the exact governed Investigation handoff. It
preserves artifact and overlay identities, M1/M2/M3 state, blockers,
limitations, remediation, source scope, physical columns, evidence provenance,
and decision-use restrictions. The adapter cannot authorize execution: an
analysis is ready only when M3 permits execution and the query plan is planned.

Metric-specific blockers no longer make an understood dataset globally
blocked. Ready, evidence-required, mapping-review, safety-blocked, unsupported,
stale, executing, failed, and completed states remain distinct. One
deterministic primary blocker is shown while all secondary blockers remain in
details.

## Production Flows

Home exposes exact ready and non-ready analyses. Only ready items can open
Investigation; resolvable items route to the existing Phase 8B source-bound
overlay controls, rebuild the artifact, rerun unchanged M1/M2/M3, and return
focus to the affected item. Unsupported and safety-blocked items have no fake
remediation or execution operation.

Investigation validates artifact, overlay and source identity before
auto-execution. Stale and preflight-blocked handoffs do not run DuckDB and
provide a return route. Runtime failure remains separate from semantic
blocking. Advanced reports bounded, paginated, truncated and unknown
completeness and disables the full-source BA Brief for those states.

All seven required positive flows pass. All 24 required negative probes fail
closed or render a non-authoritative state. The functional accessibility
baseline covers keyboard controls, semantic labels, disabled explanations,
busy/error state, focus return, non-hover operations and stable semantic test
selectors.

## Verification

- Phase 8A, Phase 8B, Phase 8C and production page targeted set: 7 files and
  47 tests passed.
- Complete `understanding-core`: 76 files and 332 tests passed in ten stable
  batches.
- Repository TypeScript: zero diagnostics.
- Architecture audit parsing: 275 JSON files passed.
- Canonical import/reachability governance and `git diff --check`: passed.
- Full desktop suite ran exactly once: 172 files and 1,158 tests. The nine
  failures on four files matched the unchanged governed allowlist by identity
  and signature: six deterministic baseline failures and three permitted BA
  timeouts. Unexpected and Phase 8C-owned failures were zero.
- Complete full-suite log: `/tmp/phase8c-final-full-desktop.log`, SHA-256
  `b9ec36775ee898ebeeafb619f32cdc6fe7264a71df888be1dab634f2985ce9b7`.

The local selective checkpoint commit identity is recorded after commit
creation in the final Phase 8C execution report. No push is performed. Phase
8D, Phase 8E, visual redesign and feature-reachability expansion are not
started.

## Classification

`functional_blocker_ux_ready_for_feature_reachability`
