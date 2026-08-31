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
- **R1-P5** — next active gate: independently re-audit exact Phase 2A head `fb8225c951fc27692e6b0e7554c3112ada08e49f`. No Root/signer/private production-key work may start unless that exact audited candidate receives explicit freeze approval.

The active immutable Internal successor is `g-2026-08-31-next-017`, parent `g-2026-08-31-next-016`, Core `93296e46d250be7d2f885b2cbb06e25068f38761`, private CP `d615832768f89c861ae508c210713c92ed6b74e2`, schema `062_documentation_content`, and generation-manifest SHA-256 `b1c849eb7c88d46cd6801c340b970a8e9993cd556fdd12a0d0dfbe612510dd0a`. Gateway, CP diagnostics and worker all report NEXT-017; pending migrations are `[]`. Production `5172/5173/5174` remained running on their pre-existing processes.

## Source bookmarks

- [`../../../project-book/LIGHTBI_PROJECT_BOOK.md`](../../../project-book/LIGHTBI_PROJECT_BOOK.md) — canonical product/trust direction and NEXT checkpoints.
- [`../../../project-book/LIGHTBI_CONTROL_PLANE_MAP.md`](../../../project-book/LIGHTBI_CONTROL_PLANE_MAP.md) — private CP ownership and absent Trust-1 authority.
- [`../../../project-book/LIGHTBI_CI_CD_MAP.md`](../../../project-book/LIGHTBI_CI_CD_MAP.md) — release/publication truth.
- [`../../../project-book/LIBRARY_RULES.md`](../../../project-book/LIBRARY_RULES.md) — documentation governance.
