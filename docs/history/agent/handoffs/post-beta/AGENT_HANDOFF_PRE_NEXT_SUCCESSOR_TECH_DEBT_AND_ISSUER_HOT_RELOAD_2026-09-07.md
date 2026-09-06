# AGENT HANDOFF — pre-successor technical debt + installation issuer hot-reload live proof

Status: handoff / operational continuity, **not canonical project truth**
Date: 2026-09-07 (owner local time, UTC+07)
Environment: NEXT / Internal only
Production: untouched
Owner whole-release UAT: OPEN / NOT ACCEPTED
Scope: continue the remaining pre-1.0 technical debt, cut the next immutable Windows successor, and use that real REL publication to prove installation-issuer hot reload without process restart.

This handoff exists because the previous chat session lost usable conversation context. It preserves the exact continuation point; do **not** archaeology the project from scratch and do not reinterpret historical NEXT package identities as current truth.

## 1. Mandatory read-first order

Read these sources in order before mutation:

1. [Library Rules](../../../../project-book/LIBRARY_RULES.md)
2. [LightBI Project Book](../../../../project-book/LIGHTBI_PROJECT_BOOK.md)
3. [Road to 1.0 Trust Release Contract](../../../../architecture/road-to-1-0-trust-release-contract.md)
4. [Future Team / Realtime infrastructure direction](../../../../architecture/future-team-realtime-infrastructure-direction.md), especially §17A `Private Authenticated Transport`
5. [Control Plane Map](../../../../project-book/LIGHTBI_CONTROL_PLANE_MAP.md)
6. [NEXT036 Signed Transport response-correlation handoff](./AGENT_HANDOFF_NEXT036_SIGNED_TRANSPORT_RESPONSE_CORRELATION_2026-09-05.md)
7. [Micro Semantic Brain vector inference](../../../../architecture/micro-semantic-brain-vector-inference.md)
8. [Micro Brain cross-domain semantic expansion](../../../../architecture/micro-brain-cross-domain-semantic-expansion.md)
9. [Decision Presentation / UI-UX refactor plan](../../plans/AGENT_IMPLEMENTATION_PLAN_DECISION_PRESENTATION_UI_UX_REFACTOR_2026-09-04.md)
10. [Worklog](../../../../project-book/LIGHTBI_WORKLOG.md)
11. [Current checkpoint](../../../../../.lightbi/CURRENT_CHECKPOINT.json)

**Checkpoint warning:** `.lightbi/CURRENT_CHECKPOINT.json` is currently behind the newest source/runtime work. It still reflects the older MB presentation-advisory / NEXT041 checkpoint. Use it for provenance and sequencing only until this debt package is machine-closed and the canonical docs are updated. Current Git/runtime evidence in this handoff supersedes stale operational fields for this continuation only.

## 2. Non-negotiable doctrine

- Evidence first: if evidence exists, state it; if evidence is absent, say it is absent. Never fabricate PASS.
- NEXT is permanent pre-production. Production remains untouched unless owner explicitly authorizes otherwise.
- Machine PASS is not owner UAT PASS.
- Any changed Windows executable bytes require a new immutable successor package identity; never overwrite/relabel an earlier NEXT artifact.
- Protected native routes fail closed. Never downgrade Signed Transport failure to WebView/unsigned transport.
- Never weaken replay, request signature, installation certificate, canonical query/body binding, or response-correlation validation to make a test pass.
- Never expose signer tokens, private Ed25519 material, API credentials, raw proofs/nonces, database credentials, or user business data in logs/docs.
- Do not reset, add, delete, or accidentally commit unrelated dirty/untracked work.
- Heavy native builds must check SSD before/after; delete only rebuildable cache when necessary.

## 3. Re-verified repository truth at handoff
### Product

Repository: `/home/ubuntu/n8n2erpnext/LightBI-exp-focus-subject`

- branch: `codex/r1-roadmap-integration`
- HEAD: `ba4a73474d18397b5cebc6804b007267ad8edbde`
- this head already contains the reconciled Micro Brain consent/splash/privacy/status work on top of the newer MB presentation-advisory source.
- do **not** roll back to `4be593a...`, `07bd86b...`, NEXT041 source, or any earlier package source.

The Product worktree has five unrelated untracked audit JSON files. They must remain untouched and must not enter the technical-debt commit:

- `docs/architecture/phase-5m2-import-isolation-audit.json`
- `docs/architecture/phase-5m2-migration-gate-audit.json`
- `docs/architecture/phase-5m2-question-action-corpus-audit.json`
- `docs/architecture/phase-5m2-question-action-policy-audit.json`
- `docs/architecture/phase-5m2-ranking-audit.json`

### Private Control Plane

Repository: `/home/ubuntu/n8n2erpnext/lightbi-control-plane-r1p14-signed-transport`

- branch: `codex/r1p14-signed-transport`
- HEAD: `e4deadf864c9d26e673c0e0c4b05492c32406030`
- commit subject: `feat(trust): hot reload installation release authority`
- worktree was clean at handoff verification.
### Canonical docs repository

Repository: `/home/ubuntu/n8n2erpnext/LightBI-bada-docs-20260903`

- branch: `docs/ba-da-mode-future-20260903`
- pre-handoff HEAD: `1dd1e39772eda30f1ac59cb3883e761dfadee075`
- worktree was clean before creating this handoff.
- do not update Project Book/Worklog/checkpoint merely because this handoff exists; canonical closure belongs after the remaining debt and successor evidence are complete.

### SSD

At handoff verification:

- filesystem `/dev/sda1`: 121G total, 79G used, 42G free, 66% used.
- earlier cleanup removed only the Product Rust `target/` build cache (about 22 GiB).
- no source, DB, runtime, trust state, release evidence, or user data was deleted.

## 4. Installation issuer hot-reload — SOURCE CLOSED

Do not reimplement this feature unless current CP HEAD differs from `e4deadf...` or tests prove a regression.

The completed source contract is: release/catalog publication may hot-reload into the running installation issuer while the issuer object and challenge state remain alive. Root/keyset authority rotation is **not** silently hot-reloadable; a changed key authority fails closed and requires its own ceremony.

Dedicated authority-reload regression suite closed at **14/14 PASS**. It proves the following behaviors.
1. Authority A allowed → publish authority snapshot B by atomic index rename → the **same authority object** recognizes B.
2. Create an installation challenge before reload, reload B, then issue the certificate after reload → challenge survives because the issuer object was not recreated.
3. Malformed or Production-authority catalog is rejected → health becomes `degraded`, previous accepted snapshot remains authoritative.
4. Restore a valid catalog atomically → health self-recovers to `healthy`, new valid candidate can become authoritative.
5. Change Root/keyset authority → hot reload fails closed and does not replace the accepted authority.
6. TOCTOU regression: once a release wrapper is verified into the snapshot, authorization does not re-read a mutable REL wrapper from filesystem.

Snapshot hardening is stronger than the initial proposal:

- change detection/fingerprint binds `filename + size + mtime + SHA256`;
- snapshot hash binds Root + keyset + index + raw bytes of every referenced REL wrapper;
- referenced releases are fully verified before publication into memory;
- verified release payloads are held in memory and switched atomically;
- failed candidate validation preserves the previous good snapshot;
- issuer challenge/replay lifecycle is not recreated merely to learn a new REL publication.

Source closure evidence at `e4deadf...`:

- installation-issuer regression: **14/14 PASS**;
- installation issuer typecheck/tests: PASS;
- full private CP authoritative suite: **235/235 PASS**;
- `diff --check`: clean.

## 5. Installation issuer hot-reload — live NEXT state
NEXT installation issuer is already deployed from the closed source:

- image: `lightbi-next-trust-installation-issuer:e4deadf864c9-trust-10de4da8`
- Docker launcher PID at handoff: **3817149**
- Node issuer host PID observed: `3817195`
- signer PID at handoff: **12020**
- signer image remains `lightbi-next-trust-signer:8568ed90c5a4-trust-10de4da8`
- signer was not restarted by issuer deployment.

Issuer Unix socket:

`/home/ubuntu/.local/run/lightbi-next-trust-installation-issuer/installation-issuer.sock`

Live health re-verified immediately before this handoff:

- `ok=true`
- `environment=next_internal_test_only`
- `protocol=lightbi.next-installation-trust.v1`
- `rootKid=next-test-root-2026-01`
- `keysetVersion=1`
- `signingAuthority=false`
- `productionAuthority=false`
- `trustHotReload=true`
- `trustSnapshotHealth=healthy`
- `trustSnapshotHash=47095631b912f1f5358dbc0ab9ee2d906ee586a2d92560a3ca894b24ffe8d597`
Additional live health fields at handoff:

- `trustPublicationCount=10`
- `trustLatestVersion=0.9.2-beta.7-next.41`
- `trustLastReloadError=null`
- `activeChallenges=0`

Current TEST runtime publication is still **NEXT041**. The canonical publication file is:

`/home/ubuntu/services/lightbi-next-trust-public/runtime-latest.json`

It remains non-Production and non-promotable. The exact NEXT041 installed-runtime identity is recorded in the existing Project Book/runtime evidence; do not substitute those bytes for the upcoming successor.

### Critical live-proof rule
**Do not restart the running installation issuer before or during the next real successor REL publication.**

The desired proof is deliberately tied to a real successor, not a synthetic catalog:

1. Record issuer PID `3817149` immediately before publication.
2. Record signer PID `12020` immediately before publication.
3. Publish the exact NSIS-installed successor `LightBI.exe` as a TEST runtime REL using the existing hardened publisher flow.
4. Do not restart issuer or signer.
5. Poll issuer health until its accepted/latest runtime version advances from NEXT041 to the successor.
6. Confirm `trustSnapshotHealth=healthy`, `trustLastReloadError=null`, and successful-reload timestamp advances.
7. Re-read PIDs: issuer launcher must still be `3817149`; signer must still be `12020` unless an unrelated owner-authorized operation changed them before the test.
8. Run a fresh sanitized installation challenge → certificate issue probe against the successor release.
9. Prove certificate/device-key match, release match, cryptographic certificate verification, and `productionAuthority=false`.

If PID changes because somebody restarted the process, the source feature may still be correct, but this specific no-restart live acceptance proof is lost and must be repeated with a later immutable release.

## 6. Transport architecture — re-read before changing Connection UI

Do **not** treat HTTPS, Signed Transport, and future Private Authenticated Transport as mutually exclusive current modes.

Current canonical architecture has three layers:

1. **HTTPS** — current remote network transport.
2. **Signed Transport V2** — LightBI application-level request integrity/authentication layered on HTTPS for protected native routes.
3. **Private Authenticated Transport** — future Team/Workspace data-plane capability; not a 1.0 blocker and not a current selectable alternative.
Signed Transport V2 binds the installation/device proof to method, canonical path+query, exact raw request-body digest, server nonce, monotonic sequence, installation certificate identity and nonce-issued timestamp. Protected-route failures cannot silently retry through WebView.

Accepted responses use HTTPS-bound response correlation (`lightbi.next-response-correlation.v1`, request sequence, response SHA-256). This is not an independently server-signed response envelope.

Canonical current protected native route classes include `/api/account/*` and `/api/license/activate`; installation bootstrap/pair/challenge/issue/nonce and unrelated public reads are separate route classes. Re-read current source before changing this set.

Future Private Authenticated Transport may later use WireGuard, QUIC overlay, MASQUE, mTLS private gateway, or a later equivalent. It is additive defense/data-plane isolation only and never replaces account/organization authorization, entitlement, trusted installation identity or signed request proof.

### Owner-approved Connection Settings interpretation

Do **not** implement an HTTPS-only downgrade toggle.

The current UI should instead communicate:

- **LightBI Secure Connection — Recommended / Default**: HTTPS plus device-bound Signed Transport for protected native traffic, with replay protection and response correlation.
- **Enterprise network compatibility**: LightBI native networking follows system proxy and native certificate roots; enterprise CA / TLS inspection infrastructure can inspect HTTPS traffic. Signed Transport remains required for protected routes, and modification of signed query/body bytes must be rejected.
- **Private Authenticated Transport**: future Team/Workspace note only, not a current selector.

Code audit before this handoff found Tauri `reqwest` compiled with `rustls-tls-native-roots + system-proxy`. Keep UI claims bounded to what current code/tests prove; do not claim DPAPI, private overlay, independent response signing, or arbitrary enterprise interception behavior without evidence.

## 7. Product technical debt still OPEN — no mutations yet
### A. Sources cleanup

Current file:

`apps/desktop/src/pages/DataSources.tsx`

Current source still renders the subtitle:

`Manage imported datasets and source profiles. Connection diagnostics are available in Settings.`

Owner decision: now that diagnostics live in Settings → Connection, remove the second sentence entirely. Keep Sources focused on source/dataset management. If the translation key `Connection diagnostics are available in Settings.` becomes unused, remove only that exact i18n entry surgically; do not churn the translation catalog.

### B. Rewrite Settings → Connection presentation

Current component:

`apps/desktop/src/components/settings/ConnectionSettingsPanel.tsx`

The existing local-app card is conceptually correct: `http://lightbi.localhost` is an on-device Tauri endpoint, not remote plain HTTP traffic.

The current remote card already describes HTTPS + Signed Transport, but the lower `Connection mode` section incorrectly presents `Private Team / Workspace transport` as if it were a current alternative. Rewrite it to the owner-approved contract in §6 of this handoff.

No remote plain-HTTP mode. No switch that disables Signed Transport for protected routes. No client header/localStorage bypass accepted by the server.
### C. Advanced database saved connection / recent-history debt

Relevant Product files include:

- `apps/desktop/src/pages/Advanced.tsx`
- `apps/desktop/src/components/advanced/AdvancedConnectionGate.tsx`
- `apps/desktop/src/components/advanced/AdvancedWorkspaceView.tsx`
- `apps/desktop/src/lib/advanced-api.ts`
- corresponding Core/server profile-vault handlers discovered from current source.

Current audit truth:

- the local connection vault already encrypts stored connection secret material with AES-256-GCM;
- profile-list API does not return URL/password/ciphertext/nonce to the frontend;
- reconnect uses `profileId`; Core resolves/decrypts the secret server-side;
- credentials are not refilled into URL/password fields in the frontend;
- a new profile is saved only after a successful connection/schema flow, so a failed new connection does not create a saved profile;
- the vault key is a local `.vault-key`, but current code audit did **not** prove Windows DPAPI/OS-keystore binding. UI may say `encrypted local vault`; do not claim `OS-protected credential vault`.

Open behavior debt: successful reconnect of an existing saved profile does not currently refresh its `updated_at`. Therefore any `Recent encrypted connections` ordering is not true last-used history.

Implement a server-side/profile-store `touch last used` only **after successful reconnect**. Reuse the existing profile record and `updated_at`; do not create a second history table containing DSN, username or password. Sort recent profiles by this real last-used timestamp.
Required database-profile regressions:

1. successful saved-profile reconnect updates only last-used/`updated_at` metadata;
2. failed reconnect does not touch `updated_at`;
3. failed new connection does not create a profile;
4. profile list remains secret-free: no URL/password/cipher/nonce/plaintext credential material;
5. reconnect from the frontend identifies the profile by `profileId` and does not require credential refill;
6. deleting a profile removes its encrypted stored secret through the existing contract without leaking it to UI/logs.

### D. Basic / Pro plans route regression

Runtime routing was already corrected to the canonical landing-page plans anchor:

`/#plans`

The old path `/distribution/#plans` is wrong: live probe previously proved `/distribution/` does not own `id="plans"`, while the Distribution landing root does.

A stale regression test still expected `/distribution/#plans`. Find it before changing code and update the test to lock `/#plans`; do not let a future maintainer change correct runtime code merely to satisfy a stale test.

## 8. Already-completed Product/CP work that must not be redone

The Product head `ba4a734...` already contains the Micro Brain privacy/consent/status package reconciled with the newer MB presentation-advisory source. Preserve it while doing the debt above.

The completed MB local health contract verifies semantic lobe, presentation-advisory lobe, lobe isolation, advisory-only authority, constitutional/prohibition/abstention guard coverage, semantic retrieval smoke, presentation retrieval smoke, and the bundled footprint ceiling. `local learning` consent is optional and is **not** a prerequisite for curated MB health.
MB privacy/status behavior already implemented before this handoff includes:

- first-use / first-learning consent splash with `Allow local learning` and `Not now`;
- declining local learning does not block normal BI or curated MB retrieval;
- Settings → Privacy and local data allows later enable/disable and local-memory clearing;
- local activity/memory counters are privacy-safe and do not upload raw query/file/business values;
- public Distribution `/micro-brain/status` is global pack/chassis status, not per-user telemetry;
- `/admin` Micro Brain inspection is about curated/global pack metadata, not customer local memory;
- MB health indicator is deterministic rather than cosmetic and must degrade on invariant failure;
- presentation-advisory MB cannot override deterministic chart/metric/evidence planners.

Recent MB current truth from the architecture/source closure:

- semantic lobe: 401 cards / 1,424 retrieval units / 2,048 sparse features / 128 latent dimensions;
- presentation-advisory lobe: 88 cards / 352 retrieval units;
- presentation corpus includes 32 domain profiles, 31 chart patterns, 12 perspectives and 7 constitutional/self-charter cards;
- combined raw indexes: 9,966,179 bytes, below the 20 MiB ceiling;
- presentation lobe remains advisor-only; deterministic planners keep final authority.

The Control Plane history before `e4deadf...` also contains authenticated Invite mail work and Micro Brain public/admin status work. Preserve those commits. Invite sender uses Distribution mailer; inviter identity comes from the authenticated server session rather than client input; invite locale follows the inviter's LightBI app language (`en`/`vi`), and self-invite/rate-limit protections remain in force.

## 9. Historical package warning
Owner recently ran a NEXT043 Windows package and observed:

`installation_issuer_release_not_allowed`

That failure was expected from the publication split: TEST `runtime-latest` still ends at NEXT041. Restarting the issuer would not make an unpublished NEXT043 runtime authoritative.

Do not mark NEXT043 accepted. Later Product/CP/MB/transport/UI changes also mean the next owner candidate must be a **new immutable successor** built from the final exact source. Determine the next monotonic NEXT identity from the acceptance/orchestration repository and Git history before editing the workflow; do not guess or reuse an earlier identity.

The installation issuer hot-reload live proof must happen on the next real published successor runtime, not by restarting to make an old unpublished build work.

## 10. Exact continuation sequence

### Phase A — reconcile before mutation

1. Re-read the mandatory docs in §1 and this handoff.
2. Verify Product branch/head/status. Expected tracked HEAD: `ba4a73474d18397b5cebc6804b007267ad8edbde`; preserve the five untracked audit JSON files.
3. Verify CP branch/head/status. Expected HEAD: `e4deadf864c9d26e673c0e0c4b05492c32406030` and clean.
4. Verify docs head/status and note that the checkpoint is operationally stale until closure.
5. Verify disk usage; preserve a stop guard before any heavy Rust/Tauri build.
6. Verify live issuer/signer PIDs and issuer health. If PID differs from this handoff before testing, record the new baseline honestly rather than fabricating continuity.

### Phase B — Product technical debt
7. Remove the obsolete Connection-diagnostics sentence from Sources and surgically remove its i18n key only if unused.
8. Rewrite Settings → Connection to the approved secure/default + enterprise-compatibility presentation. Preserve Signed Transport enforcement on protected routes.
9. Implement saved-profile `updated_at`/last-used touch only after successful reconnect; keep secrets inside the encrypted local vault and profileId reconnect path.
10. Add/update focused regressions for profile last-used, failed reconnect, failed new connection, secret-free profile listing, and no credential refill.
11. Fix the stale `View Basic and Pro plans` routing test to expect `/#plans`.
12. Do not absorb the five unrelated untracked audit artifacts into this change.

### Phase C — Product verification

13. Run the most focused frontend/source/routing/database-profile tests first.
14. Run targeted Core/Rust/server tests for the connection vault/profile path.
15. Run Product TypeScript checks.
16. Run Product production build.
17. Run complete release-authoritative `pnpm test:release-1.0`.
18. Review exact diff for privacy/security/i18n scope and run `git diff --check`.
19. Fix any failure at source. Do not weaken tests or authority boundaries for green status.
20. Commit/push the Product debt separately with a narrow commit message. CP hot-reload is already its own pushed commit and should not be folded into Product history.

### Phase D — immutable successor

21. Inspect `/home/ubuntu/n8n2erpnext/LightBI-r1p13-rc` branch/history/workflow and determine the next unused immutable NEXT identity.
22. Pin exact final Product source and the required CP source in the acceptance workflow. Do not silently pin an older CP if current Invite/MB/issuer-related HTTP contracts require the newer source.
23. Build Windows successor in CI.
24. CI must silent-install the NSIS package and derive canonical runtime identity from the installed `LightBI.exe`, not from a prebundle executable.
25. Record exact installer/runtime SHA-256, byte sizes, source/generation metadata and canonical acceptance JSON.
26. Machine PASS still does not equal owner UAT PASS.

### Phase E — TEST REL + issuer no-restart live proof

27. Record issuer and signer PIDs before publication.
28. Publish only the exact installed successor runtime as TEST REL with the hardened publisher. `promotableToProduction=false` must remain true for the negative Production capability claim (i.e. actual field remains false).
29. **Do not restart installation issuer or signer.**
30. Observe running issuer hot-reload the updated catalog and verify healthy snapshot/latest version on the same PID.
31. Save sanitized live evidence of the before/after PID, snapshot health/hash/version and reload timestamps. Do not save token/key/proof material.
32. Run a fresh successor installation challenge → issue probe and verify release/device-key/certificate binding.
33. If attestation verifier needs any separate publication snapshot behavior, inspect first; do not reset replay/sequence state merely for convenience.

### Phase F — owner UAT

34. Give owner only the verified successor installer plus exact SHA.
35. Owner tests installation trust/account state, Connection Settings wording, Sources cleanup, DB saved-profile reconnect/history, plans link, MB splash/privacy/status/health indicator and Invite behavior as applicable.
36. Reconnect history must prove credentials are not repopulated or exposed.
37. Protected account routes must remain Signed Transport protected; no legitimate replay/correlation regression.
38. Do not mark owner UAT PASS until owner explicitly reports real packaged behavior as PASS.

### Phase G — canonical closure
39. Only after machine closure and owner evidence, re-read Library Rules before canonical docs mutation.
40. Update Project Book with exact source/runtime/REL/hot-reload/UAT evidence and precise authority boundaries.
41. Update Worklog chronology and `.lightbi/CURRENT_CHECKPOINT.json` to current truth.
42. Keep docs commit separate from Product/CP implementation commits.
43. Do not declare return to the main roadmap until the owner says the remaining technical debt is closed.

## 11. Owner-UAT / security acceptance checklist

The next successor is not acceptable merely because it launches. Preserve these gates:

- exact NSIS-installed runtime is published as the TEST REL;
- installation issuer adopts the successor without process restart;
- signer remains independent and is not restarted for an ordinary release publication;
- installation challenge/issue accepts only the published successor runtime;
- protected Account/License routes remain Signed Transport fail-closed;
- no `attestation_sequence_replay` from legitimate client concurrency;
- no `signed_transport_response_correlation_*` failure in normal use;
- no WebView downgrade for protected routes;
- enterprise proxy/native-root compatibility does not disable request signing;
- DB recent profile history never exposes stored credentials;
- failed DB connections do not create or falsely refresh saved profiles;
- Micro Brain local-learning consent remains optional and local-first;
- public/admin MB status never exposes raw user queries or business data;
- Production authority remains false/untouched.

## 12. Useful safe verification commands
Reconcile source before work:

```bash
cd /home/ubuntu/n8n2erpnext/LightBI-exp-focus-subject
git branch --show-current && git rev-parse HEAD && git status --short

cd /home/ubuntu/n8n2erpnext/lightbi-control-plane-r1p14-signed-transport
git branch --show-current && git rev-parse HEAD && git status --short

df -h /
```

Read issuer health without any secret:

```bash
SOCK=/home/ubuntu/.local/run/lightbi-next-trust-installation-issuer/installation-issuer.sock
curl --silent --show-error --unix-socket "$SOCK" http://localhost/health | python3 -m json.tool
```

Record issuer/signer process continuity:

```bash
ps -eo pid,etimes,args | grep -E 'installation-issuer|trust-signer' | grep -v grep
```

Read TEST runtime publication without accessing signer credentials:

```bash
python3 -m json.tool /home/ubuntu/services/lightbi-next-trust-public/runtime-latest.json
```
## 13. Exact implementation bookmarks

Installation issuer hot reload:

- CP test: `/home/ubuntu/n8n2erpnext/lightbi-control-plane-r1p14-signed-transport/apps/trust-installation-issuer/src/authority-reload.test.ts`
- issuer application/source: inspect `apps/trust-installation-issuer/src/` at exact CP HEAD before mutation.
- Distribution issuer client: `apps/distribution/src/platform/runtime/next-installation-issuer-client.ts`

Product connection/vault:

- Connection Settings: `apps/desktop/src/components/settings/ConnectionSettingsPanel.tsx`
- Sources page: `apps/desktop/src/pages/DataSources.tsx`
- Advanced connection UI: `apps/desktop/src/components/advanced/AdvancedConnectionGate.tsx`
- Advanced page/state: `apps/desktop/src/pages/Advanced.tsx`
- frontend profile API: `apps/desktop/src/lib/advanced-api.ts`
- encrypted profile store / vault: `apps/server/src/advanced_workspace.rs`
- saved-profile connection resolution: `apps/server/src/advanced/connection.rs`
- routing implementation/tests: `apps/desktop/src/lib/lightbi-routing.ts`, `apps/desktop/src/lib/lightbi-routing.test.ts`
- native networking features proving current proxy/root behavior: `crates/lightbi-tauri/Cargo.toml`

## 14. Final stop point for the next session

Start with **Phase A** in §10. The first code mutation should belong to Product debts A–D, not issuer source. The issuer source is already closed; its outstanding work is the no-restart live proof tied to the next real successor REL.

Do not return to the main Road-to-1.0 roadmap after finishing only one debt. Owner explicitly requires these technical debts to close first, then owner will decide when roadmap work resumes.
