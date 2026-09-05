# AGENT HANDOFF — NEXT036 native Google flow reaches device activation; Signed Transport response-correlation gate remains open

**UTC checkpoint:** 2026-09-05T11:49:21Z
**Environment:** NEXT / Internal only
**Owner UAT:** OPEN / NOT ACCEPTED
**Production:** untouched
**Phase 2A freeze:** false / owner-gated
**Purpose:** exact continuation point for the next ChatGPT/agent session; do not archaeology from scratch.

## 1. Read-first authority and safety

Before any mutation, read `docs/project-book/LIBRARY_RULES.md`, then this handoff, then `.lightbi/CURRENT_CHECKPOINT.json` and the tail of `docs/project-book/LIGHTBI_PROJECT_BOOK.md`.

Project doctrine remains unchanged:
- evidence first: if evidence exists, state it; if evidence is missing, say it is missing; never fabricate;
- NEXT is successor/permanent pre-production, not Production and not a disposable test branch;
- machine PASS is not owner UAT PASS;
- recognition/inference never creates execution authority;
- Signed Transport failures must fail closed and must not downgrade protected routes to WebView transport;
- never weaken attestation replay, signature, certificate, query/body binding or response-correlation checks to make UAT green;
- any new Windows executable bytes require a new immutable package/release identity; never overwrite NEXT036;
- do not create/rotate Production signer/root authority, promote roles, or freeze Phase 2A without explicit owner approval;
- never print, copy or persist private Ed25519/signing/token material into docs or logs.
## 2. Executive state at handoff

Owner has installed and exercised **LightBI `0.9.2-beta.7-next.36`** on Windows. The native Google flow now progresses far beyond the earlier device-key/callback failures:

1. Browser account page shows the owner account and an **active device** `LightBI on Win32`, version `0.9.2-beta.7-next.36`.
2. `Continue with Google` opens the real Google account chooser for `thaiduy.digital`.
3. OAuth returns to `lightbi-next.thaiduy.digital/account?native=connected`.
4. Therefore browser OAuth/native-login completion and server-side device activation are materially working.
5. The desktop Account page still fails closed with exactly:
   `LightBI secure account connection is not ready. Native HTTP failed: Signed transport required: signed_transport_response_correlation_invalid`

Do **not** mark Google/native account UAT PASS yet. The currently open gate is the protected native account refresh after OAuth completion.

The investigation immediately before this handoff had already observed two `/api/account/session` GETs occurring nearly together and one server-side `attestation_sequence_replay`. Current source inspection now provides a concrete mechanism that can explain why the UI surfaces response-correlation failure instead of the replay cause. That mechanism is documented below as the primary root-cause candidate; confirm it with one sanitized live trace before patching.

## 3. Exact live repository heads at handoff

All four worktrees were re-read immediately before writing this handoff and were clean:
- Product: `/home/ubuntu/n8n2erpnext/LightBI-exp-focus-subject`
  - branch `codex/r1-roadmap-integration`
  - HEAD `9f728bd674cd8812b035098c1a3487dfa6f4936f`
  - `fix(trust): stabilize installation device key identity`
- Private Control Plane source: `/home/ubuntu/n8n2erpnext/lightbi-control-plane-r1p14-signed-transport`
  - branch `codex/r1p14-signed-transport`
  - HEAD `2e6ad2370f54f1f22dde06cb886cc410056df0d0`
  - `fix(auth): bridge native Google OAuth state`
- Windows acceptance/orchestration: `/home/ubuntu/n8n2erpnext/LightBI-r1p13-rc`
  - branch `codex/r1p13-rc-acceptance`
  - HEAD `72e3f15de18e4beb685f4d48f71c32c79c2a4af6`
  - `ci: build next036 stable device key recovery`
- Canonical docs: `/home/ubuntu/n8n2erpnext/LightBI-bada-docs-20260903`
  - branch `docs/ba-da-mode-future-20260903`
  - pre-handoff HEAD `5123dfd6b371073cbaaa40a0c606da2c20b57afd`
  - this handoff session will advance only the docs repo after writing Project Book/worklog/checkpoint truth.

Relevant product history after NEXT034:
- `410f318` — bind installation certificate to device key + Windows key-creation mutex.
- `148ceaa` — harden secure account transport recovery; changes account hook/API/native runtime and installation trust.
- `9f728bd` — stabilize installation device key identity; current NEXT036 product source.

Relevant CP history:
- `3afb85b` — Signed Transport V2 verification edge baseline.
- `263edd0` — hardened NSIS-installed-runtime REL publisher source.
- `2e6ad23` — native Google OAuth state bridge; current live CP source.

Relevant acceptance history:
- `a78d3b0` — immutable NEXT035 account transport recovery package.
- `72e3f15` — immutable NEXT036 stable device-key recovery package.

## 4. Deployed/runtime split — do not collapse these identities

The engine symlink still resolves to:
`/home/ubuntu/services/lightbi-next-engines/g-2026-09-05-next-034`

The live account/control-plane HTTP process on port 5274 is PID `228221` at handoff and its cwd is:
`/home/ubuntu/services/lightbi-control-plane-next034-2e6ad23/apps/distribution`
with `LIGHTBI_RUNTIME_CHANNEL=internal` and `PORT=5274`.

Therefore **server engine generation NEXT034**, **live CP source 2e6ad23**, and **owner Windows package NEXT036** are separate identities. Do not rewrite them into one fictional generation.
## 5. Canonical NEXT036 Windows/machine evidence

GitHub Actions canonical NEXT036 run:
- run ID `33956396827`
- workflow `R1-P13 NEXT036 Native Trust Acceptance`
- orchestration `72e3f15de18e4beb685f4d48f71c32c79c2a4af6`
- conclusion `success`
- owner acceptance remains false.

VPS evidence directory:
`/home/ubuntu/services/lightbi-next-runtime-rel-next036/`

Canonical `rc-acceptance.json` says:
- version `0.9.2-beta.7-next.36`
- generation `g-2026-09-05-next-036`
- source `9f728bd674cd8812b035098c1a3487dfa6f4936f`
- acceptance-record CP baseline `3afb85b38e7cd6f9bd65eafbda723f9f6e0e88d4`
- runtime release `release:0.9.2-beta.7-next.36:windows:x86_64:runtime`
- runtime identity source `nsis_silent_install`
- installer payload verified `true`
- production authority `false`
- stable publication authority `false`
- owner UAT accepted `false`.

Exact installed runtime authority:
- `LightBI.exe`
- size `76,492,288` bytes
- SHA-256 `3e492343d622179b41e9dc8f6a821c5d270ee0cba94dde745b144e163404fe11`

Exact NSIS installer:
- `LightBI-NEXT-0.9.2-beta.7-next.36-x64-setup.exe`
- size `31,801,482` bytes
- SHA-256 `3518617f1dd851d9987d31cac4a68c48bc8a12a4d5650f6e0f9834dcc531d640`
- publisher status `NotSigned` (Internal beta; no OS-publisher acceptance claim).
Published Internal TEST runtime latest currently points to NEXT036:
- authority `next-test-20260902-031220`
- Trust Contracts `10de4da8e551a46f93f7b62985a0a6e611581b8e`
- published at `2026-09-05T10:04:17Z`
- release file `releases/0.9.2-beta.7-next.36/windows-x86_64-runtime.rel.json`
- exact runtime SHA/size above
- `promotableToProduction=false`.

Fresh server-side installation issuance probe is stored at:
`/home/ubuntu/services/lightbi-next-runtime-rel-next036/installation-issue-probe.json`
and records challenge `201`, issue `201`, certificate/device-key match true, release match true, crypto verification true, no private probe key persisted, `productionAuthority=false`.

This proves exact NEXT036 installed-runtime REL publication + server installation-certificate issuance. It does **not** prove owner desktop Signed Transport UAT.

For historical comparison only, NEXT035 machine evidence is under:
`/home/ubuntu/services/lightbi-next-runtime-rel-next035/`
with run `33950839145`, source `148ceaa...`, runtime SHA `a143cc6f8afe68b3059bc05dbae7a72d9e367c67aacb053d69ffebf8142b6c9c`, installer SHA `eed783dd0c4ea0a17657962faa47f3ca4eca7a1954ee3946b0cd46ed7019dd98`. Do not substitute NEXT035 bytes for NEXT036.

## 6. Current user-visible acceptance evidence

The latest owner screenshots are the decisive boundary:
- browser account page is authenticated and shows the NEXT036 Win32 device active;
- real Google chooser opens successfully;
- callback lands on `/account?native=connected`;
- desktop Settings → Account still shows signed transport unavailable with `signed_transport_response_correlation_invalid`.

Interpretation allowed by evidence: OAuth/native-login completion is now functioning far enough to bind/activate the device, but the protected native account/session read after completion is not accepted end-to-end by the desktop.

Interpretation **not** allowed: “Google caused the previous Ed25519 key drift.” Account-session credential storage and installation-trust Ed25519 storage are separate slots; no evidence proves Google overwrote that key.
## 7. Open bug — strongest current root-cause candidate

### 7.1 Client response-correlation contract is currently strict and matches server format

Current product `crates/lightbi-tauri/src/signed_transport.rs` requires every accepted signed response to contain all three exact values:
- `x-lightbi-response-correlation = lightbi.next-response-correlation.v1`
- `x-lightbi-request-sequence = <the exact sequence used by this client request>`
- `x-lightbi-response-sha256 = SHA256(raw response body)`.

Any missing/wrong correlation marker, sequence or digest returns the single error `signed_transport_response_correlation_invalid`.

Current CP `apps/distribution/src/platform/http/signed-transport-v2.ts` emits the same contract through `signedResponseCorrelation(serializedBody, sequence)`. Therefore there is no current source-level schema disagreement between Rust and TypeScript.

### 7.2 Signed request sequence allocation is vulnerable to concurrency

Current `crates/lightbi-tauri/src/native_http.rs` does this independently for every protected request:
1. obtain a fresh installation-trust nonce;
2. read `last_accepted_sequence` from that nonce response;
3. compute `sequence = last_accepted_sequence + 1`;
4. build/sign/send the V2 proof;
5. require response correlation for that same sequence.

Two requests started before either one is accepted can therefore receive the same `last_accepted_sequence` and both sign the same next sequence. The attestation verifier must accept at most one; the other can fail `attestation_sequence_replay`.

### 7.3 The Account page currently has an obvious duplicate-refresh source

`apps/desktop/src/components/layout/AppLayout.tsx` calls `useLightBIAccount()`.
`apps/desktop/src/pages/Settings.tsx` also calls `useLightBIAccount()`.
Each independent hook instance runs `void refresh()` in its mount effect, and `refresh()` calls `loadLightBIAccount()` → protected GET `/api/account/session`.

When Settings is rendered inside AppLayout, two mount-time account reads can therefore run concurrently from one desktop window. This exactly matches the duplicate `/api/account/session` pattern observed during the current investigation.
### 7.4 Why replay can surface as response-correlation invalid

Current CP `apps/distribution/src/server.ts` sets `signedResponseContext` **only after** `attestation.verifyV2(...)` succeeds. `sendJson(...)` adds the three correlation headers only when that context exists.

Therefore a signed request rejected inside attestation verification (for example `attestation_sequence_replay`) reaches the error handler without a verified signed-response context. The error response is intentionally not decorated as an accepted correlated signed response.

The Rust native client, however, still calls `collect_native_response(..., expected_sequence=Some(sequence))` for the HTTP response and requires the three correlation headers before returning any signed HTTP status/body. An uncorrelated verifier rejection is therefore surfaced locally as `signed_transport_response_correlation_invalid` rather than trusting/parsing the unsigned error body.

This fail-closed behavior is correct in spirit: an unverified error body must not be trusted as a correlated signed response. The bug to fix is the request concurrency/sequence lifecycle, **not** to accept uncorrelated bodies.

### 7.5 Confidence boundary

Proven directly from current source:
- AppLayout and Settings each instantiate `useLightBIAccount()`;
- each hook auto-refreshes on mount;
- each refresh reaches `/api/account/session`;
- every signed request derives `last_accepted_sequence + 1` independently;
- server response correlation is added only after V2 verification succeeds;
- native client rejects missing/wrong correlation metadata;
- owner sees `signed_transport_response_correlation_invalid`.

Observed earlier in this live debugging session:
- two `/api/account/session` GETs nearly together;
- one `attestation_sequence_replay`.

Still requiring one final trace before code mutation:
- prove the two hook-triggered requests are the exact pair that produced the owner-visible failure and record sanitized request timing/sequence outcome without tokens, certificates or signatures.

This is now a **high-confidence concurrency root-cause candidate**, not yet a closed bug.
## 8. Exact continuation plan for the next session

### A. Reconcile first, no archaeology
1. Read Library Rules, this handoff, current checkpoint and Project Book §119.
2. Re-read the four repo HEADs and `git status --short`; if any head differs from this handoff, stop and reconcile before editing.
3. Re-check engine symlink, live CP cwd/port and NEXT036 `runtime-latest.json`; preserve the engine/CP/package identity split.

### B. Capture one sanitized failing pair
4. Trigger Settings → Account once from the owner NEXT036 build while tracing only route, status, request timing, verifier error class and numeric sequence metadata. Never log auth bearer, certificate body, proof/signature, nonce or private key.
5. Confirm whether two `/api/account/session` calls begin before the first completes and whether they attempt the same sequence.
6. Confirm the first request receives valid correlation headers and the rejected request lacks verified correlation because V2 verification did not complete.

### C. Fix the authority-preserving root cause
7. Remove duplicate account-session network ownership. Prefer one shared account state/single-flight refresh path rather than two independent `useLightBIAccount()` network clients in AppLayout + Settings.
8. Do not stop at UI deduplication. Signed Transport must tolerate legitimate concurrent protected requests. Add a sequence-critical-section design that prevents two requests using the same next sequence.
9. Evaluate at least process-local serialization plus the multi-process Windows case. If using a named OS mutex, scope only the nonce→sequence→sign→send critical section and preserve timeout/fail-closed semantics. If changing server sequence allocation/reservation, treat that as a protocol change and gate it separately.
10. Keep current response-correlation verification strict. Do not “fix” this by accepting missing headers or blindly retrying verifier-rejected protected calls through WebView.

### D. Regression tests before packaging
11. Frontend: render AppLayout + Settings ownership and prove one logical account refresh/single-flight behavior.
12. Rust/native: race two protected requests and prove sequence uniqueness/serialization; preserve query/body/certificate/signature/replay rejection.
13. CP/verifier: preserve replay rejection and exact response correlation on successfully verified requests.
14. No-downgrade tests must remain green for signed GET and mutations.
15. Run relevant targeted suites, then the complete release-authoritative product gate and private CP authoritative gate if CP changes.
### E. Immutable successor and owner UAT
16. Any product executable change means **NEXT037** (or the next explicitly chosen immutable version); never overwrite/re-publish NEXT036 bytes.
17. Pin exact product + current required CP source in acceptance CI. If live OAuth bridge `2e6ad23` is required by the package contract, do not leave acceptance metadata silently pinned to old CP `3afb85b` without an explicit reason.
18. Build NSIS, silent-install it in CI, hash the installed `LightBI.exe`, publish only a new TEST runtime REL, reload the snapshot-based installation issuer, and run fresh server challenge→issue proof.
19. Owner then installs only that verified immutable package and reruns Google login, Account refresh, restart persistence and near-simultaneous activity.

Owner UAT can pass this gate only when all are true on the real Windows package:
- Google chooser/callback completes;
- desktop Account becomes authenticated rather than merely browser-connected;
- protected `/api/account/session` completes with valid response correlation;
- restart preserves installation device-key/certificate continuity;
- no `device_signature_invalid`;
- no `attestation_sequence_replay` from legitimate concurrent client behavior;
- no `signed_transport_response_correlation_*` failure;
- no protected-route WebView downgrade;
- server/device evidence and app-visible account state agree.

Only after owner explicitly reports PASS may docs mark owner UAT accepted. Production/role rotation still requires separate explicit owner approval.

## 9. Useful exact paths

- Product signed transport: `crates/lightbi-tauri/src/signed_transport.rs`
- Product native HTTP: `crates/lightbi-tauri/src/native_http.rs`
- Product account hook: `apps/desktop/src/hooks/useLightBIAccount.ts`
- Product account API: `apps/desktop/src/lib/account-api.ts`
- App-wide hook caller: `apps/desktop/src/components/layout/AppLayout.tsx`
- Settings hook caller: `apps/desktop/src/pages/Settings.tsx`
- CP signed transport contract: `apps/distribution/src/platform/http/signed-transport-v2.ts`
- CP HTTP/server correlation context: `apps/distribution/src/server.ts`
- NEXT036 evidence: `/home/ubuntu/services/lightbi-next-runtime-rel-next036/`
- Live Internal trust catalog: `/home/ubuntu/services/lightbi-next-trust-public/`
- Current engine symlink: `/home/ubuntu/services/lightbi-next-engines/current`
## 10. Do not confuse these status statements

- **PASS:** NEXT036 CI build/machine acceptance, NSIS-installed runtime identity, TEST runtime REL publication, server installation challenge/issue probe.
- **PASS:** owner browser Google flow reaches `native=connected` and active NEXT036 device appears server-side.
- **OPEN:** real desktop protected account/session Signed Transport after native OAuth completion.
- **OPEN:** owner UAT overall.
- **NOT AUTHORIZED:** Production promotion, role rotation, Production trust ceremony, Phase 2A freeze.

The next session should continue from the concurrency/sequence-correlation investigation above, not return to the old NEXT033/NEXT034 key-drift archaeology unless new evidence points back there.

---

Handoff written under Library Rules as immutable historical agent evidence. Canonical active truth is also advanced in Project Book §119, the current worklog and `.lightbi/CURRENT_CHECKPOINT.json` by the same docs-only handoff commit.
