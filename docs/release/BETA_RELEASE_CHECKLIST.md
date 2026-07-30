# LightBI Beta release checklist

This checklist is ordered by product dependency. Native packaging is a final
release gate, not an intermediate development milestone.

## 1. Product behavior

- [ ] Easy Mode: raw single-file and multi-file intake reaches a complete,
  evidence-backed result without exposing technical mapping by default.
- [ ] Understanding: supported roles, periods, relationships, metrics, and
  business perspectives are derived from domain packs and remain extensible by
  declaration.
- [x] Perspective analysis: the user can choose any available baseline and
  comparison period.
- [x] BA deep dive: follow-up analysis stays bound to the governed source,
  metric, period, and lineage. It must never fall back to generic/mock insight
  text or an unsupported confidence claim.
- [x] Advanced Mode: governed sources remain available for technical analysis,
  clean-data handoff, and export.

## 2. Web QA and regression

- [x] Run the six-file ERP E2E with the real corpus files under
  `sample-corpus/anchors/1.3.0`.
- [ ] Do not upload the small files under `sample data` as QA fixtures; they are
  repository path references to the real corpus.
- [x] Run supported-domain sample-corpus regression and automated tests.
- [x] Complete UI copy, responsive layout, error, empty, loading, and recovery
  states before native packaging.

## 3. Local-first runtime

- [ ] Verify local data directory, restart recovery, diagnostics, and backend
  lifecycle.
- [ ] Verify the application requires no hosted LightBI service for analysis.
- [ ] Verify Beta access remains unrestricted until the later licensing phase.

## 4. Final Windows release gate

- [ ] Bundle the complete MinGW runtime dependency chain beside the application:
  `libstdc++-6.dll`, `libgcc_s_seh-1.dll`, and `libwinpthread-1.dll` (plus any
  additional non-system dependency reported by the final binary).
- [ ] Produce one Windows installer containing the UI and the local LightBI core.
- [ ] Install on a clean Windows environment and launch LightBI without Rust,
  Node.js, MinGW, or manual server setup.
- [ ] Verify the bundled local core returns `/api/health` and completes the
  six-file Easy Mode E2E.
- [ ] Record installer size, SHA-256, signing state, and Beta limitations.

## 5. Post-build cleanup

- [ ] Preserve the verified installer and checksum.
- [ ] Remove only regenerated build caches from the VPS.
- [ ] Keep source fixtures, web QA runtime files, and release evidence intact.

## Verification record — 2026-07-30

- Desktop regression: 188 test files, 1,272 tests passed.
- Rust/native workspace: all unit and documentation tests passed after adding
  the missing DuckDB test-only `tokio` and `tempfile` dependencies.
- Production web QA build: TypeScript and Vite build passed.
- Single-file Easy Mode E2E: 3/3 passed.
  - Superstore: Revenue perspective, one guided confirmation, five governed
    analyses ready, full-file product revenue chart executed.
  - Bank campaign: customer/performance/operations evidence recognized; no
    chart is fabricated because its governed metric pack is not available.
  - World Cup: person/coach/role evidence recognized; unsupported governed
    analyses remain visibly unavailable.
- Remaining product gap before Beta release: declarative governed packs and
  runtime contracts are still required for the already-detected campaign and
  participant/event perspectives. Detection alone is not treated as analysis
  support.
- Windows packaging remains intentionally deferred to the final gate. The
  previous `libstdc++-6.dll` launch failure is recorded above with the complete
  MinGW dependency-chain requirement.
