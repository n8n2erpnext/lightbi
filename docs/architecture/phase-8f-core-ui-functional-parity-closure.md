# Phase 8F Core/UI Functional Parity Closure

## Boundary

Phase 8F started from P0 import-hotfix checkpoint `4be16f8edab89eee49e3fe104b3d696a44620b10`, tree `73656d07769af077ab43e76720abcae2eba18939`, parent `b031c2a1d82eaa0042615b191e7c64342fa671ea`. It changed only the functional production projection between the frozen canonical core and the existing UI. No visual redesign, semantic alias, registry, domain, metric formula, confidence threshold, M1/M2/M3 rule, query operator, DuckDB calculation, corpus truth or governed allowlist changed.

The frozen presentation path is:

`source -> canonical artifact -> M1 -> M2 -> M3 -> canonical presentation -> UI -> governed result`.

Home and Investigation no longer keep competing trust, readiness, fusion, mapping or result truth. Explicit source roles and evidence remain empty until supplied. Remediation creates a source-bound overlay and rebuilds the artifact; it cannot directly mark an action ready. Only M3-approved actions enter runnable Investigation.

## Functional Corrections

- The browser relationship engine now uses deterministic browser-safe SHA-256.
- Multi-source analyses project the member artifact that owns the requested metric rather than a synthetic combined artifact.
- The governed Sales plus Accounting builder requires explicit roles, identity, period and currency evidence.
- Placeholder currency, UOM and `unknown_other` role values no longer appear as observed or confirmed evidence.
- Legacy Home quality, trust, understanding, fusion and mock-insight surfaces were disconnected.
- Unsupported capabilities use `Unsupported in current MVP` and `View limitation`, with no evidence-remediation promise.
- Execution failure is distinct from semantic, evidence and safety blocking.
- Exact row/source counts no longer use malformed compact `N` labels.
- BA narrative and governed totals are post-execution only.
- Investigation consumes the canonical full-scope result total instead of recomputing from the bounded display rows.

Quantity sold and transaction count remain discoverable but correctly explanation-only on the authentic Sales sample when the physical UOM or document/grain requirements do not pass. No runtime blocker was weakened.

## Browser And Oracle Evidence

The current served app was exercised at `http://127.0.0.1:5176/`. The initial state is retained at `/tmp/phase8f-browser-initial.png`.

- Revenue: `22,973,896,244`, exact, source-local full file.
- Delivery count: `1,500`, exact, source-local full file.
- Inventory on hand: `211,067`, exact after mapping/evidence remediation.
- Gross profit: `3,075,721,244 VND`, exact, governed Sales plus Accounting multi-source execution.

Each exact result retains source fingerprint, artifact, overlay where applicable, relationship where applicable, action, metric, query-plan identity and execution scope. The 30-journey matrix has 28 completed paths and two correctly governed explanation-only paths. All 30 negative probes fail closed. Screenshots are used only as render evidence; calculation proof comes from governed runtime identity and independent oracle comparison.

## Verification

- Phase 8 targeted parity: 8 files, 56 tests, all passed.
- Complete `understanding-core`: 79 files, 344 tests, all passed.
- Repository TypeScript: zero diagnostics.
- Production build: passed, 2,721 modules transformed.
- Architecture JSON parsing, canonical production reachability and `git diff --check`: passed.
- Legacy/mock/fusion execution reachability from production pages: zero.
- High-confidence precision: 100%; held-out recall: 90.91%; domain activation precision: 100%.
- False executable actions: zero; false decision-support cases: zero; blocker explanation completeness: 100%.

The full desktop suite was run exactly once after the final source state. It completed 178 files and 1,193 tests: 174 files and 1,184 tests passed. All nine failures match the frozen governed allowlist by exact test identity and signature: six deterministic baseline failures and three permitted timeout failures. Unexpected failures and Phase 8F-owned failures are zero.

Retained full-suite log: `/tmp/phase8f-final-full-desktop.log`, SHA-256 `1545e68f4ec2add56919c9f32c2e94027d0a652ddd4d728ac5660c96cdc52f1e`.

Frozen allowlist SHA-256: `baa86950582b7d758396abb0c69fdaffcd3c2cbbb22b71dd3bbdb3c0aed1c4f5`.

Four unrelated local artifact groups remain excluded: the two existing ZIP files, `logs/dev-backend.pid`, and `releases/`. No push occurred. Phase 9 visual implementation has not started.

core_ui_functional_parity_complete_ready_for_visual_replacement
