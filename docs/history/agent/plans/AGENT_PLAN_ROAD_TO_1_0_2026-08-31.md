# LightBI Road to 1.0 Execution Plan — 2026-08-31

Status: operational plan
Date: 2026-08-31
Scope: bounded execution sequence from NEXT-016/Internal to LightBI 1.0
Supersedes: none
Superseded by: none
Primary sources: ../../../project-book/LIGHTBI_PROJECT_BOOK.md, ../../../project-book/LIGHTBI_CONTROL_PLANE_MAP.md, ../../../project-book/LIGHTBI_CI_CD_MAP.md

## Purpose

This plan converts the already-approved Road-to-1.0 architecture into an executable sequence. It is a coordination artifact, not a source of product truth. Current code, exact Git SHAs, runtime evidence, Project Book contracts, and explicit owner freeze decisions remain authoritative.

## Frozen starting baseline

- Core: `451c9b6afe0a95bce5bce473a4a84c8b918f42cd`.
- Private control plane: `f1879c65453cdf0bc9798257e462264f0424e907`.
- Project Truth docs: `8478f18c74df9a720bfda1c7425bae4d64625fe2` before this plan.
- Internal runtime: `g-2026-08-31-next-016`, immutable.
- Internal schema: `062_documentation_content`, pending migrations `[]`.
- Phase 2A Trust head: `fb8225c951fc27692e6b0e7554c3112ada08e49f`, Draft/Open/CI-green, NOT FROZEN.
- Production `5172/5173/5174` is no-touch unless an explicit promotion procedure authorizes it.

## Scope rule

Before 1.0, work is limited to product acceptance, security UX, test/release cleanup, official identity, Trust, entitlement/Pro separation, platform signing, optional revenue mirroring, and release engineering. New major BI/BA capabilities are out of scope unless they repair a release-blocking defect.
## Phase sequence

| Phase | Objective | Entry gate | Exit gate |
| --- | --- | --- | --- |
| R1-P0 | Roadmap/baseline freeze | NEXT-016 known-good baseline | plan, contracts, status/indexes recorded |
| R1-P1 | Product acceptance closure | P0 | owner UAT + packaged native acceptance on one successor |
| R1-P2 | Account Security UX | P0 | TOTP/recovery/passkey enrollment, login, management verified |
| R1-P3 | Test taxonomy/release gates | P0 | current 1.0 release suite has an unambiguous green meaning |
| R1-P4 | Official identity/trademark boundary | P0 | branding/trademark rules + truthful official-build UI contract |
| R1-P5 | Independent Phase 2A re-audit | P0 | exact Trust head receives explicit `FREEZE APPROVED` |
| R1-P6 | Offline Root ceremony | P5 | Ed25519 Root pin + root-signed REL/ATT/ENT/PRO issuer keyset |
| R1-P7 | Private Trust-1 signer | P6 | purpose-specific signer operations verified privately |
| R1-P8 | REL official release signing | P7 | published artifacts/manifests verify to LightBI Root |
| R1-P9 | Installation attestation | P7/P8 | official installation cert + request attestation enforcement |
| R1-P10 | Signed entitlement migration | P7/P9 | account/org + trusted install + signed ENT becomes Pro authority |
| R1-P11 | Physical Basic/Pro separation | P10 | private signed/encrypted device-bound Pro package delivery |
| R1-P12 | Anti-impersonation closure | P8-P11 | legal + REL + ATT + OS publisher trust close official identity |
| R1-P13 | RC → stable 1.0 | all prior release gates | signed/notarized supported platforms + soak + `v1.0.0` |

## Parallel optional track — Commerce revenue mirror

The ERPNext/n8n revenue mirror may progress after P0 because it is operational reporting, not entitlement authority. It must remain outside checkout critical path and outside Trust authority.

`payment complete → LightBI order + entitlement commit → transactional outbox → worker → optional n8n/ERPNext mirror`

ERPNext or n8n outage must never roll back payment completion or entitlement grant. Retry/delivery evidence is downstream only.

Owner decision 2026-08-31: Paddle is the intended payment provider for the 1.0 commerce path. Payment configuration is deferred; the downstream n8n→ERPNext mirror scaffold may be built inactive in advance. The selected mirror path is CP signed webhook → n8n → ERPNext, while Paddle/provider logic remains upstream of commerce authority.
## Non-negotiable gates

- NEXT generations are immutable after deployment; fixes cut a successor generation.
- Production `5172/5173/5174`, production persistence and release namespaces are not touched during Internal development.
- No production Root/private issuer key, signer, attestation, signed ENT or PRO package work begins before Phase 2A freeze.
- Root private authority is offline and user-controlled; it is not stored on VPS, CI, control plane or a cloud runtime.
- Basic local-first capability remains usable when account, telemetry, ERPNext, n8n, signer or control-plane services are unavailable.
- A fork may use AGPL rights, but it must not become official authority merely by changing client UI; official identity is server/root verified.
- Current Beta license keys are transitional claim/entitlement plumbing, not the final reusable Pro authority.

## Execution discipline

Each phase must record `planned / implemented / verified / deployed / frozen` separately. A phase is not complete merely because code exists. Runtime proof, negative probes, exact Git identity, and release/native evidence must match the phase exit gate.

When implementation changes Core or CP source, use a clean successor branch/worktree and produce a new governed Internal generation. Documentation changes remain isolated in the documentation worktree and are committed separately.

## Immediate authorized order in this session

1. Complete R1-P0 documentation/baseline freeze.
2. Audit and close the optional commerce → ERPNext revenue mirror if safely possible.
3. Begin R1-P1/P2/P3/P4 work that does not violate the Trust freeze gate.
4. Prepare R1-P5 independent audit only after current product/security/release surfaces are reconciled.
5. Stop before Root ceremony if exact Phase 2A does not have explicit freeze approval.

## Current execution checkpoint — NEXT-017

As of the reconciled Internal promotion on 2026-08-31:

- **R1-P0** — complete and recorded.
- **R1-P1** — open: formal owner UAT and packaged Windows/native acceptance remain separate gates.
- **R1-P2** — implemented, machine-verified and deployed Internal: TOTP enrollment/login, one-time recovery codes, recovery rotation, Passkey enrollment/login, factor listing/revocation, strong-auth step-up and security-version invalidation. The private CP authoritative suite passes **134/134**. Real Passkey UX still requires an HTTPS secure context for owner/browser acceptance.
- **R1-P3** — implemented and verified: `pnpm test:release-1.0` is the single release-authoritative platform-independent suite; the historical full desktop universe remains diagnostic rather than release authority.
- **R1-P4** — architecture/identity state-machine contract is candidate-complete; standalone trademark policy and final official-build verification UI remain open.
- **R1-P5** — independent re-audit PASS at exact PR #4 head `10de4da8e551a46f93f7b62985a0a6e611581b8e`. The audit first rejected `fb8225c...`, remediated the discovered freeze blockers through `528b7c2...` and final product-identity binding `10de4da...`, then repeated the full audit from a clean detached worktree. Local CI-equivalent gates and GitHub CI run `33397723902` are green. **Freeze is still not approved**; Root/signer/private production-key work remains blocked until the owner explicitly records `FREEZE APPROVED`.

The active immutable Internal successor is `g-2026-08-31-next-017`, parent `g-2026-08-31-next-016`, Core `93296e46d250be7d2f885b2cbb06e25068f38761`, private CP `d615832768f89c861ae508c210713c92ed6b74e2`, schema `062_documentation_content`, and generation-manifest SHA-256 `b1c849eb7c88d46cd6801c340b970a8e9993cd556fdd12a0d0dfbe612510dd0a`. Gateway, CP diagnostics and worker all report NEXT-017; pending migrations are `[]`. Production `5172/5173/5174` remained running on their pre-existing processes.

## Source bookmarks

- [`../../../project-book/LIGHTBI_PROJECT_BOOK.md`](../../../project-book/LIGHTBI_PROJECT_BOOK.md) — canonical product/trust direction and NEXT checkpoints.
- [`../../../project-book/LIGHTBI_CONTROL_PLANE_MAP.md`](../../../project-book/LIGHTBI_CONTROL_PLANE_MAP.md) — private CP ownership and absent Trust-1 authority.
- [`../../../project-book/LIGHTBI_CI_CD_MAP.md`](../../../project-book/LIGHTBI_CI_CD_MAP.md) — release/publication truth.
- [`../../../project-book/LIBRARY_RULES.md`](../../../project-book/LIBRARY_RULES.md) — documentation governance.

## NEXT-018 commerce/security source checkpoint — awaiting infrastructure approval

R1-P6 remains explicitly HOLD by owner decision. A parallel successor candidate closes the commerce/marketing/admin-control work without authorizing Trust Root work. Public Core `57304194e7c21d3e036c6dcb1793914f97c74118` adds the persisted in-app announcement inbox. Private CP `1868e3db5039b3b08df63afe7bee9f7bd6f12125` adds provider-neutral catalog/discount authority, Paddle sandbox and dormant Stripe support, maintenance controls, managed SMTP/newsletter delivery, Redis marketing coordination, and separate Admin TOTP/Passkey authority.

Machine proof is green: Core `test:release-1.0` passes 11 governed files / 39 tests; final CP authoritative suite passes 157/157; focused commerce/mail/Redis adversarial tests pass 20/20; focused Admin Security passes 4/4; production dependency audit reports no known vulnerabilities. Exact findings and proposed deployment mutations are recorded in [`../../audits/AUDIT-next018-commerce-security-infra-2026-08-31.md`](../../audits/AUDIT-next018-commerce-security-infra-2026-08-31.md).

Candidate migrations `063`–`066`, new encryption keys, service restarts, reverse-proxy changes, Paddle sandbox notification setup, n8n activation and sandbox E2E remain **NOT DEPLOYED / NOT AUTHORIZED** until the owner approves the infrastructure-impact report. Active Internal remains immutable NEXT-017.

## Current execution checkpoint — NEXT-022 / 2026-09-01

- **R1-P0** complete.
- **R1-P1** remains open for formal packaged Windows/native owner acceptance on an accepted successor.
- **R1-P2** is deployed and owner-tested through NEXT-021: Admin/User TOTP, recovery, Passkey-first MFA policy, strong-auth mutation retry, reset 2-of-2 and one-time magic login are verified; owner accepted the Admin TOTP/recovery and announcement surfaces.
- **R1-P3** remains verified; Core `test:release-1.0` is green on the current successor.
- **R1-P4** is implemented, machine-verified and deployed in NEXT-022. `TRADEMARK_POLICY.md` defines the open-source-versus-official-origin boundary and Settings exposes fail-closed build identity. Owner visual acceptance of the Settings panel remains open.
- **R1-P5** independent audit remains PASS at Trust head `10de4da8e551a46f93f7b62985a0a6e611581b8e`; explicit freeze is still not approved.
- **R1-P6** remains explicitly HOLD by owner decision. P7–P12 therefore remain blocked by dependency.
- Commerce/marketing infrastructure is deployed but intentionally unconfigured: managed SMTP disabled, no payment provider active, catalog/prices/discounts/newsletter empty. Configuration is an owner-input gate through the strong-auth Admin UI; n8n revenue mirror remains present and inactive until Paddle sandbox E2E is configured.

Current immutable Internal is `g-2026-09-01-next-022`, Core `ed044e0a6ceb98eb8d052ddbac17249893005bb6`, private CP `1ef53f947af030deca54208cb5c6f71ced785e67`, schema 065/pending 0, manifest SHA-256 `e0b6a250a5d2711da1edc0f1e61ee8d1318c484b58ef1d0e40c289e9672d30fd`. Production remains no-touch.

## 2026-09-04 successor execution overlay — one Road to 1.0

This overlay updates execution priority without rewriting the historical R1-P0…R1-P13 phase table above. The canonical P13 meaning remains RC → stable 1.0. References in working conversation to an “accepted R1-P13 foundation” must be interpreted as accepted successor installation-trust groundwork, not as a claim that stable 1.0 already passed.

### Primary critical path

`complete NEXT034 Windows compile/NSIS identity -> publish immutable next.34 runtime REL -> owner packaged-native V2 retry -> integrated release acceptance`

Micro Brain V1 acceptance remains anchored at `a1f6ee8`; the product successor has since advanced to `codex/r1-roadmap-integration` / `410f318` for packaged device-key continuity hardening. MB no longer owns the critical path. The successor continues on the Road-to-1.0 integration lane without renumbering R1-P0…R1-P13 or claiming stable 1.0.

**Multi-file UX parity + Focus Subject is complete** at product successor `codex/r1-roadmap-integration` / `8abc669`. Focus is an Analysis Context sidecar over governed multi-source evidence: summary metrics and relationship/grain/period/currency/cardinality policy remain unchanged; only exact canonical-concept/value matches scope source evidence and Deep BA. Unmatched sources fail closed rather than inheriting another source identity. The narrative label `BA FOCUS` is renamed `Key attention`. Six-file ERP browser acceptance passes before/after governed-summary parity and exact Focus drill-through.

The active immutable NEXT generation is now `g-2026-09-05-next-034`, parent `g-2026-09-05-next-033`, product source `410f318`, reused server-binary provenance Core `ed4b9233`, private CP runtime `3afb85b`, schema `067_catalog_quarterly_pricing`, generation-manifest SHA-256 `b2c9f8f933269f13e369f3597f49d88941e430dbf1578e7da1396e5d8230c89c`. Core/Gateway/CP/worker all report NEXT034, the worker is healthy, and Trust remains `blocked_pending_phase2a_freeze`. Owner role rotation has not been performed.

**Intelligence Pack Updater V1 source implementation is now closed** at product `262bd768` and private CP `72eacf75`. The implemented NEXT-only contract is signed/versioned/compatibility-gated/data-only, uses content-addressed `staged/active/previous` state plus an accepted-version floor, fails closed to previous/bundled intelligence, and keeps pack signing distinct from release/runtime-request authority. Exact-head gates pass: pack Rust `6/6`, frontend `2/2`, candidate `1.0.0-next.1` verifies to the accepted MB payload SHA, CP authoritative `222/222`, release-authoritative product gate PASS, and native Tauri `cargo check` PASS. Stable/public INT Root anchoring remains deliberately unfrozen; only the non-promotable NEXT/Internal TEST authority is used.

**Intelligence Pack V1 runtime acceptance is complete on NEXT032.** The exact signed candidate passes live catalog/artifact identity, real-candidate stage→activate and fresh-process reconcile, accepted-version-floor and corrupt-state fail-closed probes, frontend active-identity handoff, plus NEXT-only systemd restart persistence. Rollback/verified-previous recovery is fixture-proven because only one durable signed Internal pack version currently exists; no two-version live rollback is claimed.

**Signed Transport V2 source closure is complete** at product `6c1f117` and private CP `3afb85b`. The exact native contract now binds method + canonical path/query + raw-body SHA + server nonce/sequence/certificate/device signature; `/api/account/*` and `/api/license/activate` are the bounded protected set, trust bootstrap stays separate, and Signed Transport failure cannot downgrade into WebView fallback. Response SHA/sequence correlation is HTTPS-bound integrity/correlation rather than a server-signature claim. Source gates pass attestation 16/16, CP 223/223, frontend 11/11 + TypeScript, real Tauri 6/6, source-size 516 modules and the complete release-authoritative suite with governed 41/41.

**Signed Transport V2 NEXT server/edge runtime acceptance is complete on NEXT033, and the corrected NSIS-derived Windows runtime REL/server issuance sub-gate is machine-closed.** The first `next.33` owner attempt correctly exposed a CI identity bug: the REL had authorized the post-build pre-bundle executable rather than the bytes NSIS actually installed. Corrected Actions run `33939698146` packages revision `0.9.2-beta.7-next.33.1`, silent-installs that NSIS artifact in CI, and promotes the installed `LightBI.exe` as runtime authority: SHA-256 `8c6678d3...7b811`, 76,444,672 bytes; installer SHA-256 `fe4357a6...dec8f5`. Hardened publisher `263edd0c...` requires `nsis_silent_install` evidence and preserves old versions immutably. The new TEST REL is externally published/cryptographically verified and the reloaded issuer successfully issues a certificate for the exact `next.33.1` runtime. The remaining gate is owner installation of this verified `33.1` installer followed by real packaged Account/V2 correlation and no-WebView-downgrade evidence. Historical R1-P1/R1-P4 owner-acceptance items remain open; Production R1-P5/P6 authority remains separately owner-gated.

### Future semantic expansion lane

Cross-Domain Semantic Expansion is recorded as a durable post-MB-V1 direction, not as a new blocker on the 1.0 critical path. It strengthens universal ontology and semantic breadth across hospitality, healthcare/pharma, agriculture/livestock/aquaculture, manufacturing, banking specialization and scientific primitives, then retunes MB in validated corpus batches. See [`../../architecture/micro-brain-cross-domain-semantic-expansion.md`](../../../architecture/micro-brain-cross-domain-semantic-expansion.md). The lane preserves registry/domain-support/runtime authority separation and forbids direct self-training from raw user datasets.

### Signed Transport V2 runtime acceptance and packaged-native gate

Product successor is now `codex/r1-roadmap-integration` / `410f318`; private CP remains `codex/r1p14-signed-transport` / `3afb85b`. The earlier V1 rehearsal remains intact while V2 adds deterministic query-target binding, exact raw-body digest, native route classes, device-certificate signing and replay-safe nonce/sequence handling. Distribution remains only a thin Internal verifier client over UDS and has no signing authority.

NEXT033 accepts the V2 server/edge runtime on product `6c1f117` / runtime CP `3afb85b`: external HTTPS positive traffic receives response digest/sequence correlation, replay/query/body tamper fail closed, and restart persistence is green. The original `next.33` runtime REL is retained as failed historical evidence because CI signed the wrong pre-bundle byte identity. Corrected packaging revision `0.9.2-beta.7-next.33.1` from run `33939698146` proves the NSIS-installed executable in CI and authorizes SHA-256 `8c6678d3...7b811` / 76,444,672 bytes; the installer is `fe4357a6...dec8f5`. Publisher `263edd0c...` enforces this evidence source and immutable version/SHA binding. The new TEST REL is live, externally verified and accepted by the reloaded installation issuer in a full challenge/device-signature/certificate probe. Packaged-native owner acceptance remains distinct: the owner must install this exact `33.1` installer, restart it, open Account, and issuer/attestation/Distribution evidence must prove the real OS-protected device key, certificate and Tauri `native_http_request` no-downgrade path. The current Build Identity panel is not used as REL/ATT proof. OS publisher remains unverified/NotSigned and is not upgraded by TEST REL evidence.


NEXT033.1 owner packaged evidence subsequently closed the runtime-byte and certificate-issuance sub-gates but exposed a separate device-key continuity failure: the real Account request received an attestation nonce for its issued certificate and then failed `attestation_device_signature_invalid`. Google/account-session storage is a separate credential slot, and a Rust-generated V2 proof verifies against the exact deployed JS Trust Contracts implementation. Product `410f318...` therefore hardens local key continuity with a Windows cross-process mutex plus certificate→current-key binding checks without changing the V2 wire contract. Immutable NEXT034 is active with that source and unchanged CP/Core binary; Windows run `33943332283` must compile/package it and produce NSIS-derived runtime identity before a new REL and owner retry.

### Future Team/Workspace transport

Record a future capability named **Private Authenticated Transport**. WireGuard, QUIC overlay, MASQUE and mTLS private gateway are candidate implementations. Do not freeze the product to one technology and do not place this capability on the 1.0 critical path.

### Authority invariants

`phase2aFrozen=false` remains authoritative. The successor overlay does not authorize Production Root ceremony, Production issuer keys, Production signer, stable REL/ATT/ENT/PRO authority or official-service enforcement. NEXT/Internal test authority remains cryptographically separate and non-promotable. Production remains no-touch until its explicit gates are satisfied.

### Owner-approved Decision Presentation + UI/UX refactor lane — 2026-09-04

The owner review of chart selection, Dashboard composition, Question/Perspective UX, Deep BA, BA Step 2, evidence placement, export pagination and the card-everywhere surface model is now consolidated in [`AGENT_IMPLEMENTATION_PLAN_DECISION_PRESENTATION_UI_UX_REFACTOR_2026-09-04.md`](./AGENT_IMPLEMENTATION_PLAN_DECISION_PRESENTATION_UI_UX_REFACTOR_2026-09-04.md).

This is a product-quality refactor lane, not a new R1 phase number and not an authority change. It preserves governed metric/evidence truth while adding Question/Perspective Intelligence, Analysis Narrative Intelligence, Visualization Intelligence, Dashboard Composition Intelligence, a shared Evidence Inspector, canvas-first/card-by-exception presentation and true report pagination.

Micro Brain/domain inference may influence question relevance, domain visual conventions and explanation provenance, but it cannot authorize metrics, formulas, joins, runtime execution or official domain support.

The documentation step does not alter the current Signed Transport critical path, active NEXT generation or Production state. Exact execution scheduling relative to the remaining Road-to-1.0 gates is owner-gated at DPR-0 kickoff.