# LightBI Beta release checklist

This checklist is ordered by product dependency. Native packaging is a final
release gate, not an intermediate development milestone.

## 1. Product behavior

- [x] Easy Mode: raw single-file and multi-file intake reaches a complete,
  evidence-backed result without exposing technical mapping by default.
- [x] Understanding: supported roles, periods, relationships, metrics, and
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
- [x] Do not upload the small files under `sample data` as QA fixtures; they are
  repository path references to the real corpus.
- [x] Run supported-domain sample-corpus regression and automated tests.
- [x] Complete UI copy, responsive layout, error, empty, loading, and recovery
  states before native packaging.

## 3. Local-first runtime

- [x] Verify local data directory, restart recovery, diagnostics, and backend
  lifecycle.
- [x] Verify the application requires no hosted LightBI service for analysis.
- [x] Verify Beta access remains unrestricted until the later licensing phase.

## 4. Final Windows release gate

- [ ] Bundle the complete MinGW runtime dependency chain beside the application:
  `libstdc++-6.dll`, `libgcc_s_seh-1.dll`, and `libwinpthread-1.dll` (plus any
  additional non-system dependency reported by the final binary).
- [ ] Produce one Windows installer containing the UI and the embedded LightBI core.
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
  - Bank campaign: 41,188 rows profiled; two governed customer analyses ready;
    the source-record comparison by previous campaign outcome executed.
  - World Cup: 37,784 rows profiled; two governed performance analyses ready;
    source-record comparisons by person and coach executed.
- Descriptive source-record analysis is governed explicitly: a physical row is
  never presented as a person, customer, event, campaign, or distinct business
  entity, and LightBI does not infer deduplication, causality, or performance.
- Governance catalog: 9 metrics, 31 question families, and 6 runtime operators;
  manifest, metric, question, and runtime freeze audits passed.
- The previous Windows installer was built as one x64 NSIS package containing
  the desktop UI, a separate local-core executable, and the staged MinGW runtime chain.
  - Size: 44,678,834 bytes.
  - SHA-256:
    `c8db8c6a2040be6043f4aa23359790c04609057c995572654d8140acebd5219f`.
  - Static import inspection passed. That superseded test installation contains
    `lightbi-tauri.exe`, `lightbi-server.exe`, `WebView2Loader.dll`, and all
    three staged MinGW DLLs.
  - This artifact is not a Beta release candidate because it still installs a
    separate `lightbi-server.exe`. The final embedded-core build must contain no
    server sidecar and will receive a new checksum.
  - Signing: unsigned Beta installer; code signing remains a distribution gate.
  - Native launch, `/api/health`, and installed-app E2E remain pending.
