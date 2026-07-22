# Phase 8D Production MVP Feature Reachability And Functional UI Closure

## Scope

Phase 8D started from commit `788b277bdf6de1e19b24ee6d0e5dcc8d5eb0a8d7` and preserved the Phase 8A-8C canonical ownership boundaries. It changed only functional presentation, discovery, continuity, and dead-control truthfulness. It did not change aliases, semantic rules, domains, metrics, M1/M2/M3 policies, runtime operators, DuckDB behavior, thresholds, or corpus truth.

## Completed Closure

The canonical presentation now exposes full-source profile scope, exact source rows, representative evidence scope, quality issues, mapping states and provenance, unknown and ignored fields, grain, source-local relationship status, domain support, observed/user evidence, and restrictions. The UI presents top-ranked defaults separately from additional governed actions, resolvable analyses, safety blockers, unsupported concepts, and stale analyses. Candidate actions outside the top five remain reachable through the same canonical handoff.

Investigation retains the governed result identity and lineage: artifact, overlay, action, metric, query plan, execution scope, source fingerprint, row counts, evidence, limitations, and decision-use restrictions. Run controls obey M3; deep analysis requires a successful execution. Returning saves the workspace and restores the same session without re-import. Previously inert shell controls are either connected or explicitly disabled as unsupported.

## Verification

- Phase 8A-8D and production targeted tests: 8 files, 51 tests passed.
- Phase 8D focused reachability and Investigation tests: 2 files, 16 tests passed.
- Complete understanding-core: 76 files, 332 tests passed.
- Repository TypeScript: zero diagnostics.
- Export, persistence, and Advanced boundary tests: 5 files, 31 tests passed.
- Architecture JSON: 289 files parsed; canonical import/reachability and `git diff --check` passed.
- Full desktop suite ran exactly once: 173 files and 1,162 tests. Nine failures matched the unchanged governed allowlist by test identity and signature: six deterministic baseline failures and three permitted BA timeouts. Unexpected failures and Phase 8D-owned failures were zero.
- Complete full-suite log: `/tmp/phase8d-final-full-desktop.log`, SHA-256 `c8792a0097b693b56c1d00b4417ebd246125d74dcaeedf5bf4e6e7ba71062c11`.

## Blocking Finding

The production Home consumer still builds a canonical artifact for one source boundary. Relationship inference exists in `understanding-core` validation, but no production UI path builds one canonical multi-source dataset state with source roles and a governed relationship artifact. Consequently, the required related Sales + Accounting gross-profit journey cannot be claimed production reachable. Source-local conditional gross profit and inventory snapshot remain reachable and exact, but they do not satisfy the Phase 8D multi-file gate. Legacy business fusion is not promoted as a substitute.

Because not all gates pass, no Phase 8D checkpoint commit is created and Phase 8E is not started.

not_ready_multifile_ui_flow
