# Phase 6A Canonical Artifact Consumer Cutover

## Decision

The selected Simple-mode path now builds one canonical consumer envelope per
deterministic dataset state. The envelope composes the existing Phase 2-5
physical, semantic, grain, readiness, domain, metric, and question artifacts;
it is not another understanding engine and introduces no semantic policy.

Home projects its summary, mappings, domain state, questions, blockers, trust,
and caveats from that envelope. The existing `UnderstandingNextCard` contract
is retained only through a presentation adapter outside `understanding-core`;
the canonical core has no `understanding-next` dependency. Home no longer invokes the guided
legacy pipeline, legacy dataset-understanding builder, old core question
engine, understanding-next orchestrator, or legacy AI briefing generator.

## Dataset-state identity

The identity covers dataset/source identity, physical columns, full retained
rows, declared row count, and path/sheet metadata where available. An unchanged
state returns the same cached object and is built once. A changed source creates
a new identity. Missing rows, partial row coverage, duplicate object-row
columns, profile mismatch, or an upstream build error produces an invalid
artifact with no advertised action.

This fail-closed rule is deliberate: representative samples remain evidence,
not full-file truth.

## Home and Investigation

Selecting a canonical Home action creates a versioned Investigation handoff
containing the same artifact identity, selected governed action candidate,
runtime preflight, governed query plan or blockers, and the decision-use
prohibition. Investigation does not rebuild mappings. Eligible requests use
the Phase 5M3 governed executor and local DuckDB boundary; ineligible requests
stop before execution. Execution evidence and restrictions remain attached to
the session result and chart warnings.

The legacy Investigation branch remains for sessions created outside the
selected Home path, notably Advanced. That is compatibility debt for Phase 6B,
not an alternate fallback from a canonical action.

## AI boundary

AI receives only selected canonical mappings, grain/readiness presentation,
eligible question titles, blockers, and caveats. It receives no unrestricted
raw rows, aggregation formula, query authority, runtime authorization, or
decision authority.

## Verification

- Phase 6A targeted plus Investigation compatibility: 3 files, 16/16 tests
  passed. The cutover tests cover one-build reuse and all ten negative probes.
- The real golden workbook runs through the consumer boundary, Home projection,
  same-identity Investigation handoff, governed runtime preflight, query plan,
  and actual DuckDB execution.
- Golden revenue is exactly `22,973,896,244`.
- `decisionUseAuthorized` remains false and restrictions/evidence remain present.
- Phase 5M1-M4 regression: 6 files, 19/19 tests passed. Policy hashes and
  safety assertions remain unchanged; isolation harnesses recognize only the
  named Phase 6A consumers.
- Complete `understanding-core`: 63 files, 284/284 tests passed.
- Repository TypeScript, all 8 Phase 6A audit parses, import checks, and
  `git diff --check` passed.
- Full desktop suite was run once: 152 files and 1,083 tests passed; 9 tests in
  4 files failed. All 9 exactly match
  `phase-5b6b-regression-baseline-allowlist.v1.json` (six deterministic legacy
  assertions and three permitted BA-comparison timeouts), so unexpected
  failures are zero.
- No semantics, aliases, domains, metrics, questions, or runtime policy changed.

## Documented debt

- Advanced-created legacy sessions still reach the compatibility runtime path.
- The visual component contract still uses understanding-next-shaped data, but
  the adapter performs presentation projection only and invokes no detector.
- Sources without full retained rows are blocked until a full-file canonical
  input boundary is available.
- The only governed pack remains the existing conditional
  `commerce_distribution_mvp`; this phase makes no broader support claim.

## Rollback

Remove the canonical consumer boundary, canonical AI briefing, Phase 6A tests
and audits; restore the prior Home imports/memos and remove the canonical
handoff/execution branch from Investigation. No Phase 3-5 policy rollback is
required.

canonical_consumer_cutover_ready_with_documented_debt
