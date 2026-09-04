# Road to 1.0 Trust, Release, and Official Identity Contract

Status: canonical architecture direction
Date: 2026-08-31
Scope: official-build identity, cryptographic authority, anti-impersonation, entitlement, Pro delivery and release gates
Supersedes: none
Superseded by: none
Primary sources: ../project-book/LIGHTBI_PROJECT_BOOK.md, ../project-book/LIGHTBI_CONTROL_PLANE_MAP.md, ../project-book/LIGHTBI_CI_CD_MAP.md

## Purpose

Define the technical boundary between an AGPL-permitted fork/rebuild and an official LightBI installation. This contract preserves open-source Basic rights while making official Account/Pro authority depend on private cryptographic trust that cannot be obtained by changing public client code.

## Core authority model

A client assertion such as `official=true` is never authority. Official identity is derived from a LightBI-rooted trust chain and server verification.

```text
LightBI offline Root
├─ REL issuer → official releases and update manifests
├─ ATT issuer → official installation certificates
├─ ENT issuer → account/org entitlement envelopes
└─ PRO issuer → private Pro capability-package manifests
```

The frozen purpose identifiers are `release`, `attestation`, `entitlement`, and `pro_package`. Purpose substitution is forbidden.

## Root boundary

The LightBI Root uses the Ed25519 contract selected by Phase 2A. The **Production Root** private key must be generated only after exact Phase 2A receives explicit independent freeze approval.

Production Root private material must not reside on a VPS, CI runner, control plane, production database, web service, n8n, ERPNext, or a permanently online cloud runtime. The public Production Root key may be pinned in official clients and published documentation.

NEXT/Internal may use a cryptographically distinct **non-production test Root** plus non-production REL/ATT/ENT/PRO issuer keys inside an isolated signer service so the full trust chain can be exercised end to end. This authority must use separate key IDs/namespaces and must never be accepted as stable Production authority. NEXT test Root/issuer private material may live on the existing ARM host or a dedicated private-subnet VPS only under a hardened signer boundary; those keys are disposable test authority and are never promoted.

When an accepted NEXT engine becomes the public Production engine, trust material does not rotate with the engine. A fresh Production Root remains offline and user-controlled. Production purpose-specific issuer keys may later be provisioned to the R1-P7 online signer boundary, preferably on the separate 1x1 private-subnet VPS; co-location on the ARM host is permitted only with a dedicated OS identity/container, dedicated key volume, no Docker socket or host-filesystem access, private-only network exposure, minimal egress, read-only root filesystem where practical, `no-new-privileges`, syscall/MAC sandboxing, bounded signing API, durable audit and secret-redaction rules. The Production Root private key never enters that online signer service.
## Oracle Cloud disposition

OCI Vault/KMS may be evaluated for operational secret storage or a constrained online signer host only when its algorithm and threat model match the specific purpose. It is not the LightBI Root authority merely because an Always Free HSM/KMS tier exists.

Current LightBI Trust Contracts use Ed25519, while OCI KMS signing support is not the selected Ed25519 contract. The project must not reopen or weaken Phase 2A merely to fit a free cloud service. Production Root remains offline and user-controlled unless a later explicit ADR changes the trust model.

## Permanent pre-production and engine/chassis boundary

[`ADR-123`](../adr/ADR-123-engine-chassis-preproduction-and-disaster-recovery.md) freezes the operational promotion model. `lightbi-next.thaiduy.digital` is the permanent pre-production chassis and `lightbi.thaiduy.digital` is the permanent Production chassis; domain roles do not rotate.

Only immutable engine identity is promoted: exact Core/Control Plane code, artifacts, migration definitions and runtime contracts. Database rows, Redis state, users, test commerce, telemetry, source-vault data and secrets remain chassis-local and never promote from NEXT to Production.

Before public 1.0, the Beta Production database is archived and a fresh Production database is migrated from zero to establish a clean Day-0 analytics baseline. After 1.0, Production data is durable and normal promotion never resets it.

NEXT uses a separate R2 internal release namespace so real updater download/verification/install flows can be exercised without touching Production. Off-host encrypted chassis backups and a fresh-VPS restore contract are mandatory because the current deployment runs on replaceable Oracle Free Tier compute.

## Official release identity

An official release must bind version/channel, artifact digest, release metadata and allowed updater state into a strict REL-signed manifest. The application verifies the Root pin, issuer keyset, REL purpose, signature, manifest semantics, expiry/rollback rules and artifact digest before treating a release as official.

OS publisher signing is a separate trust plane. REL signing does not replace Windows Authenticode or macOS Developer ID/notarization; the stable release gate should use both LightBI cryptographic identity and platform publisher identity where supported.

## Installation trust

On first eligible official launch, the installation generates a device keypair and retains the private key in the strongest available OS-protected storage. The public key may be sent with proof of an allowed REL-signed release.

After verification, the ATT authority may issue an Installation Certificate binding at minimum installation identity, device public key, release/channel identity, validity interval and certificate identity.

Sensitive official-service requests use a canonical signed envelope containing method, path, timestamp, monotonic/replay sequence, server nonce, body hash and certificate identity. The server verifies certificate validity/revocation, allowed release state, device signature, nonce, sequence and request-body integrity.
## Entitlement and Pro authority

Final Pro authority is the conjunction of:

```text
authenticated account or organization
+ trusted official installation
+ valid signed entitlement
```

A reusable plaintext key or a localStorage tier flag is not final Pro authority. Existing Beta keys may remain as purchase/claim/bootstrap tokens that exchange once for account/org entitlement state.

Business licensing uses named-user seats and organization membership. Shared reusable Business keys are not entitlement authority. Complimentary grants and paid orders converge on the same signed entitlement model; partner-discount codes remain checkout offers and never grant Pro by themselves.

Offline Pro may use a short-lived signed lease/grace envelope once its duration and clock/revocation policy are explicitly frozen. Expiry or revocation degrades to Basic without destroying local Basic data or workflows.

## Physical Basic/Pro separation

The public installer contains Basic/public implementation. Private Pro capability implementation is delivered only after official installation, authentication and entitlement checks.

The delivery path uses a short-lived private-object grant, PRO-signed package manifest, artifact integrity verification and device-bound wrapping/encryption. Copying a private Pro package to another installation must not create transferable Pro authority.

## Fork and impersonation behavior

AGPL-compliant forks may rebuild and run local Basic functionality. A modified build may display arbitrary client text, so client-side badges can never prove official origin.

A rebuilt or modified artifact that lacks an allowed REL-signed release cannot receive a valid official ATT installation certificate and therefore cannot satisfy official Account/Pro trust. A third party may create its own root/server ecosystem, but that root is cryptographically distinct from the LightBI Root.
## User-visible official verification

Official clients should expose truthful verification state rather than a decorative badge. At minimum the Settings/account surface should be able to show release identity, artifact digest, REL verification, installation certificate identity/status and OS publisher status when available.

An external verification surface may validate public release/certificate identity against the LightBI Root. This closes the gap where a fork can draw a fake `Official` badge inside its own modified UI.

## Trademark and branding boundary

Open-source rights and trademark rights are separate. Source-code rights do not grant official-product identity. The 1.0 branding contract uses these rules:

- unmodified official distributions may use the LightBI product name/logo as shipped;
- forks and modified distributions may truthfully say `fork of LightBI`, `based on LightBI`, or equivalent attribution, but must identify their own distributor/project;
- a modified or independently signed build must not present itself as `Official LightBI`, use an official-verification mark, or imply that its updates/accounts/Pro service are operated by LightBI;
- retaining copyright/license notices is separate from permission to impersonate the official product;
- third parties may describe compatibility with LightBI, but compatibility wording must not be visually or textually confusing with official distribution;
- an official-looking logo, domain, installer name or client-side string is never cryptographic authority.

The user-visible verification state is a state machine, not one decorative badge:

| State | Required evidence | UI meaning |
| --- | --- | --- |
| `official_verified` | allowed REL chain + artifact digest + valid ATT installation state + supported OS publisher state where applicable | **Official LightBI — verified** |
| `official_release_installation_unverified` | valid REL/artifact, but ATT is absent/pending/unavailable | **Official release; installation not verified** |
| `modified_or_unrecognized` | REL missing/invalid, digest mismatch, unsupported signer/root, or verified local modification | **Modified or unrecognized build**; no official-service authority |
| `verification_unavailable` | evidence cannot be fetched/evaluated without proving invalidity | **Verification unavailable**; never silently promoted to official |

A fork can draw the words `Official LightBI`, but it cannot produce the LightBI Root/REL/ATT evidence required for `official_verified`. External verification should accept release/certificate evidence and independently derive the same state.

This legal/branding layer complements but does not replace cryptographic verification. Before stable 1.0, the public repository/site should publish these branding rules in user-facing form; the architecture contract here is the engineering authority for product behavior.

## Current implementation status

Phase 2A public verification/contracts have passed the R1-P5 independent re-audit at exact PR #4 head `10de4da8e551a46f93f7b62985a0a6e611581b8e`. The audit rejected the earlier `fb8225c...` candidate despite green tests, then closed provider-neutral entitlement source, canonical SemVer, entitlement rollback/equivocation state, half-open lifecycle, key-material separation, strict persisted-state, stable-channel and exact LightBI product-identity blockers. Local CI-equivalent proof and GitHub CI run `33397723902` pass. **This is an audit-pass candidate, not a freeze decision**: Production Root/issuer keys, the Production signer, production installation/request attestation, signed Production ENT authority, Production PRO signing/delivery and official-service enforcement remain gated until the owner explicitly records `FREEZE APPROVED`. A cryptographically separate NEXT/Internal rehearsal signer may be exercised earlier under the non-production custody policy and cannot establish Production authority.

The R1-P5 freeze exit gate was revalidated on 2026-09-02 against the same immutable Phase 2A authority before entry to R1-P6. GitHub PR #4 remains Draft/Open/unmerged at exact head `10de4da8e551a46f93f7b62985a0a6e611581b8e`; fresh local execution of the exact CI recipe again passes release contract **3/3**, public/private boundary, Trust TypeScript **22/22**, Rust parity **5/5**, desktop production build, and the governed regression set **7 files / 26 tests**. Negative freeze probes confirm the production Root pin remains `unconfigured` with `public_key=null`, tracked private-key literals and private-key artifact files are absent, and no production signer implementation has appeared. **R1-P5 is freeze-ready but its exit decision is not yet recorded**: `phase2aFrozen=false`; R1-P6 remains the Offline Root ceremony and is unauthorized until the owner explicitly records `FREEZE APPROVED` for PR #4 / exact head above.

The approved NEXT-only exception has now been exercised: private signer rehearsal source `8568ed90c5a44c52b048dfdca6bd94410027aaee` runs a cryptographically separate `next_internal_test_only` authority pinned to public Trust Contracts `10de4da8e551a46f93f7b62985a0a6e611581b8e`. Its TEST Root is custody-separated from the online runtime signer, which holds only TEST REL/ATT/ENT/PRO issuer private material. The ARM rehearsal runs with no container network, a mode-0600 Unix socket, read-only rootfs and signer mount, dropped capabilities and no Docker socket. Live REL/ATT/ENT/PRO signing verifies against the exact public contracts and negative probes reject stable/generic signing. This is non-production rehearsal evidence only: active NEXT application Trust remains blocked pending Phase2A freeze, Production keys are absent, and neither `phase2aFrozen` nor Production Root-ceremony authorization changes.

The NEXT rehearsal has since crossed three downstream boundaries without changing Production phase authority. R1-P7 rehearsal uses a bounded CP-side client to exercise real Internal authority data through the TEST purpose-separated signer while rolling synthetic state back. R1-P8 rehearsal publishes only public TEST Root/keyset/REL material under `/internal-trust/`; HTTPS verification of the Root→REL chain and the real Windows installer digest passed. R1-P9 rehearsal is a separate verification-only service with no signer credentials or network authority. It validates a NEXT-only request-proof protocol binding method, path, timestamp, monotonic sequence, nonce, body digest and certificate identity to an ephemeral device signature, with durable single-node sequence/revocation state and fail-closed replay/tamper tests. None of these rehearsal passes satisfy Production R1-P7/P8/P9, and the NEXT request-proof wire format must still be frozen separately before Production use.


R1-P10 has also been rehearsed on NEXT: a real AccountAuth session, trusted ATT/device request proof, Root-verified signed ENT and requested capability are conjunctive requirements rather than interchangeable claims. Per-subject ENT progression is persisted so rollback/equivocation remains fail-closed across verifier restart; account Pro and organization Business/5-seat paths both pass live rehearsal, while entitlement rollback and subject mismatch fail. The rehearsal leaves no synthetic account/organization/entitlement authority rows. This remains non-production evidence and does not replace the Production P10 migration/enforcement gate.


Current Beta account/license plumbing, public/private repository separation, updater/release manifests and private CP foundations must not be described as equivalent to the final 1.0 trust chain.

## Signed Transport successor foundation — 2026-09-04

A bounded NEXT/Internal successor foundation now exists without changing Production trust authority. Product commit `a8d55ee` adds a Rust canonicalizer/body digest/request-proof builder compatible with the existing `lightbi.next-attestation-request.v1` rehearsal payload and Ed25519 device key. It is a private Rust module, not a generic frontend signing API, and is not yet wired into every native HTTP request. Golden-vector parity and signature verification pass 3/3 in an isolated harness.

Private control-plane commit `c5875eb` extends the verification-only attestation appliance with a generic private `/v1/verify-request` UDS operation and exposes a thin Internal Distribution client for nonce/verification. Nonce responses include the persisted `lastAcceptedSequence`, allowing a client to choose a strictly greater monotonic sequence after restart instead of resetting or guessing. Distribution receives no signer token/private key and does not implement the verifier or canonical signer. Attestation verification passes 15/15; the full Distribution suite passes 220/220.

The Distribution foundation boundary was deliberately reconciled: the old guard rejected any `attestation` reference, including a client to a separate verifier. The current guard permits only the thin UDS verification client while explicitly continuing to forbid attestation verifier implementation, private key/seed material, signer imports and signing authority inside Distribution.

This is **not signed-by-default transport yet**. Query-bearing GET semantics are not frozen into the request-proof path, response integrity is not yet bound to an authenticated response envelope, and general `native_http_request` wiring remains pending. Therefore announcements/releases/config and mutations must not be advertised as signed-transport protected until those dependencies and route-specific negative probes pass.

None of this changes the Production freeze state: `phase2aFrozen=false`, Production Root ceremony remains owner-gated, and NEXT/Internal TEST authority cannot satisfy stable/public Production verification.

## Exit sequence

`Phase 2A re-audit → explicit freeze → offline Root ceremony → purpose-separated private signer → REL → ATT → signed ENT → private PRO delivery → platform signing/anti-impersonation closure → RC/1.0`.

## Source bookmarks

- [`../project-book/LIGHTBI_PROJECT_BOOK.md`](../project-book/LIGHTBI_PROJECT_BOOK.md) — Road-to-1.0 trust decisions and exact freeze gate.
- [`../project-book/LIGHTBI_CONTROL_PLANE_MAP.md`](../project-book/LIGHTBI_CONTROL_PLANE_MAP.md) — current private CP authority and explicit absent Trust-1 pieces.
- [`../project-book/LIGHTBI_CI_CD_MAP.md`](../project-book/LIGHTBI_CI_CD_MAP.md) — current release, R2, GitHub and macOS publication truth.
