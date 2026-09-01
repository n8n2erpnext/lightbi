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

The LightBI Root uses the Ed25519 contract selected by Phase 2A. The Root private key must be generated only after exact Phase 2A receives explicit independent freeze approval.

Root private material must not reside on a VPS, CI runner, control plane, production database, web service, n8n, ERPNext, or a permanently online cloud runtime. The public Root key may be pinned in official clients and published documentation.
## Oracle Cloud disposition

OCI Vault/KMS may be evaluated for operational secret storage or a constrained online signer host only when its algorithm and threat model match the specific purpose. It is not the LightBI Root authority merely because an Always Free HSM/KMS tier exists.

Current LightBI Trust Contracts use Ed25519, while OCI KMS signing support is not the selected Ed25519 contract. The project must not reopen or weaken Phase 2A merely to fit a free cloud service. Root remains offline and user-controlled unless a later explicit ADR changes the trust model.

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

Phase 2A public verification/contracts have passed the R1-P5 independent re-audit at exact PR #4 head `10de4da8e551a46f93f7b62985a0a6e611581b8e`. The audit rejected the earlier `fb8225c...` candidate despite green tests, then closed provider-neutral entitlement source, canonical SemVer, entitlement rollback/equivocation state, half-open lifecycle, key-material separation, strict persisted-state, stable-channel and exact LightBI product-identity blockers. Local CI-equivalent proof and GitHub CI run `33397723902` pass. **This is an audit-pass candidate, not a freeze decision**: production Root/issuer keys, private signer, installation/request attestation, signed ENT authority, PRO signing/delivery and official-service enforcement remain gated until the owner explicitly records `FREEZE APPROVED`.

Current Beta account/license plumbing, public/private repository separation, updater/release manifests and private CP foundations must not be described as equivalent to the final 1.0 trust chain.

## Exit sequence

`Phase 2A re-audit → explicit freeze → offline Root ceremony → purpose-separated private signer → REL → ATT → signed ENT → private PRO delivery → platform signing/anti-impersonation closure → RC/1.0`.

## Source bookmarks

- [`../project-book/LIGHTBI_PROJECT_BOOK.md`](../project-book/LIGHTBI_PROJECT_BOOK.md) — Road-to-1.0 trust decisions and exact freeze gate.
- [`../project-book/LIGHTBI_CONTROL_PLANE_MAP.md`](../project-book/LIGHTBI_CONTROL_PLANE_MAP.md) — current private CP authority and explicit absent Trust-1 pieces.
- [`../project-book/LIGHTBI_CI_CD_MAP.md`](../project-book/LIGHTBI_CI_CD_MAP.md) — current release, R2, GitHub and macOS publication truth.
