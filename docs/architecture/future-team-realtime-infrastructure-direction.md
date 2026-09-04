# Future Team / Realtime BA Infrastructure Direction

Status: draft / future architecture direction  
Date: 2026-09-03  
Scope: Conceptual infrastructure required for Team Workspace, Realtime BA, shared analytical state, authority, continuity/failover, and local-first execution boundaries.  
Supersedes: none  
Superseded by: none  
Primary sources: product-owner infrastructure discussion 2026-09-02/03; [Team Workspace and Realtime BA](../product/team-workspace-realtime-ba-future-direction.md); [LightBI Project Book](../project-book/LIGHTBI_PROJECT_BOOK.md).

> This document is a **future architecture direction**, not a deployment record. It must not be read as proof that the described cloud/team services currently exist.

## 1. Purpose

Future Team Workspace and Realtime BA need infrastructure that supports collaboration and recurring analytical work without discarding LightBI's local-first, evidence-bound architecture.

The design problem is therefore not “move LightBI to the cloud.” It is:

> Which state must become shared/authoritative for a team, which computation may remain local, which computation may run remotely, and how do continuity, entitlement and failover work without creating split-brain or silently uploading raw data?

## 2. Conceptual plane separation

A future implementation should separate responsibilities instead of building one all-powerful server.

Conceptually:

```text
Local Analysis Plane
→ source access, profiling, semantic understanding, governed local execution

Collaboration State Plane
→ team workspace metadata, shared artifacts, revisions, permissions, comments/review state

Realtime BA Execution Plane
→ bounded refresh/re-evaluation of authorized analyses

Control / Identity / Entitlement Plane
→ account, organization, seats, signed entitlement, privileged administration

Artifact / Distribution Plane
→ immutable installers, manifests, public release artifacts

Continuity / Recovery Plane
→ synchronized recovery state and controlled failover capability
```

These are responsibility boundaries, not commitments to separate products, databases or hosts.

## 3. Raw data is not the default synchronization unit

The cloud/team layer should preferentially synchronize compact analytical state rather than complete raw datasets.

Potential synchronized state includes:

- Analysis Artifact metadata and revisions;
- report/chart/dashboard definitions;
- governed findings and evidence references;
- source fingerprints and lineage references;
- organization/team permissions;
- collaboration/review state;
- refresh policy and Realtime BA job state;
- entitlement/usage state appropriate to the server authority.

Complete raw data may be required for some future server-side connector or hosted-team workflows, but that must be an explicit organization policy and execution contract. Pressing Share must never silently imply “upload the source.”

## 4. Execution placement must be explicit

Realtime BA may need to evaluate an analysis against changing business data. The correct execution location depends on where the authorized source can be reached and what policy allows.

Possible future placements include:

```text
Local / edge execution
→ source remains inside user or company network
→ compact governed result/artifact syncs outward

Server-side execution
→ organization explicitly authorizes a cloud/server connector or hosted source
→ Realtime BA worker executes within that authority boundary

Hybrid execution
→ cloud schedules / coordinates
→ authorized local/edge agent executes
→ result/evidence envelope syncs back
```

This document does not freeze which model will be used first. The invariant is that execution location, source authority, completeness and lineage remain explicit.

## 5. Realtime BA is bounded work, not unlimited streaming

Infrastructure should treat Realtime BA as schedulable analytical capacity.

A future job may carry:

- organization identity;
- analysis identity/revision;
- source binding / connector authority;
- refresh policy;
- expected completeness and evidence contract;
- execution budget / allowance;
- last successful result identity;
- next eligible refresh time;
- failure/stale state.

The approximate product direction of one Realtime BA allowance per five seats gives infrastructure a natural quota boundary, but the exact unit and scheduling model remain open.

## 6. One write authority; no casual dual-primary

Shared team state requires an explicit authority model.

The future infrastructure should prefer **one active write authority** for any authoritative shared state domain. A secondary/continuity node may replicate enough state to recover service, but it must not independently accept conflicting authoritative writes unless the system has a deliberately designed multi-writer protocol.

Failover therefore requires:

```text
health loss / planned maintenance
→ fence old authority
→ promote selected successor
→ publish new routing authority
→ resume writes
```

The system must avoid “both nodes think they are primary” behavior. Promotion and fencing are part of correctness, not merely operations convenience.

## 7. Warm Continuity Node direction

The current infrastructure discussion uses the HOMELAB machine as a future **LightBI Warm Continuity Node** concept, not as a generic backup server and not as an equal second-primary.

Conceptual roles:

```text
VPS public node
→ active public/control authority

HOMELAB continuity node
→ continuously synchronized recovery memory
→ limited fallback distribution/recovery capability
→ enough state/config to bootstrap replacement infrastructure
```

This is an early prototype direction. It does not mean production team workloads should permanently depend on one specific home machine.

The deeper architecture principle is generation/role rotation: one generation serves as active authority while a successor/recovery generation can mature and later be explicitly promoted.

## 8. Distribution and continuity responsibilities remain distinct

Immutable product artifacts should remain on the artifact/distribution plane rather than being coupled to whichever application node is active.

The current direction keeps Cloudflare R2 (or equivalent immutable object storage) as the durable release-artifact source, while public application/control authority may move between infrastructure generations when required.

A planned maintenance flow may eventually support a visible countdown/maintenance UX and controlled traffic shift. A hard failure requires an independent front door or health-routing mechanism so failover does not depend on the failed node itself.

The exact routing technology is not frozen here. Cloudflare/Worker/health-routing concepts are candidates, not implementation truth.

## 9. State classes need different replication guarantees

Not all state deserves the same continuity policy.

Examples:

```text
Immutable release artifacts
→ independently durable object storage / mirror

Public telemetry/event ingestion
→ may tolerate append-only spool + replay semantics

Team collaboration metadata
→ durable revisioned replication; conflict policy required

Account / organization / entitlement
→ strict authoritative replication and recovery semantics

Realtime BA job state
→ durable enough to avoid duplicate/conflicting execution and to expose stale/failure truth
```

Fallback telemetry may use an append-only event spool/replay model, but this remains a future concept rather than an approved current implementation.

## 10. Signing and trust boundaries must not collapse into continuity sync

Continuity does not authorize copying every secret.

The **Production Root remains offline** and must never synchronize to HOMELAB, a warm standby, a Realtime BA worker, or any general cloud node.

Runtime signing/release issuer recovery must remain purpose-separated and should not be implemented as casual filesystem/key rsync. A continuity node may hold public trust material, signed keysets, manifests, configuration and recovery metadata appropriate to its role, but not the offline root authority.

The same separation applies conceptually to future team infrastructure: organization/account services, analytical workers and artifact distribution do not automatically receive signing authority merely because they run in the same infrastructure generation.

## 11. Identity, entitlement and team authority

Future Team Workspace must build on the current account/organization model rather than invent a permanent shared license key.

Conceptually:

```text
User identity
→ organization membership
→ named-user seat
→ signed entitlement / capability
→ workspace permission
→ optional Realtime BA allowance
```

Installation identity remains separate from user/account authority. A one-time organization claim token may bootstrap membership, but it must not become the durable shared credential for every team member.

Sensitive administrative actions should preserve strong-authentication boundaries appropriate to the control plane.

## 12. Failure and stale-state semantics

Realtime/team infrastructure must fail truthfully.

If a source is unreachable, a local agent is offline, a cloud worker cannot execute, or the shared result is older than its refresh policy, the UI must expose **stale / failed / source unavailable** rather than quietly presenting the old result as current.

Likewise, a failover node that has not caught up to the required authoritative revision must not be promoted simply because it is reachable.

## 13. Security boundary

Future collaboration increases the attack surface and therefore needs explicit separation between data-plane work and control-plane authority.

The architecture should preserve:

- least-privilege service identities;
- organization-scoped authorization;
- source/connector credentials scoped to the execution location that actually needs them;
- auditability of source authorization, shared-artifact publication and privileged admin changes;
- no implicit trust merely because a node sits on the same VPN/overlay;
- no Docker/socket or host-admin authority granted to analytical workers by convenience;
- clear secret rotation/revocation boundaries.

NetBird/overlay membership, host SSH authority, application operator authentication, entitlement authority and signing authority remain separate gates.

## 14. Capacity and scaling direction

The first useful team infrastructure does not need hyperscale architecture, but it should make capacity explicit.

Potential scaling units include:

- organizations/workspaces;
- named-user seats;
- active Realtime BA allowances;
- source connector sessions;
- queued/running analytical jobs;
- retained shared artifacts/revisions;
- outbound notification/report deliveries.

Realtime BA workers should be horizontally replaceable where practical, while durable organization/entitlement/job authority must remain strongly owned and recoverable.

No specific queue, database, orchestrator or cloud provider is selected by this document.

## 15. Relationship to local-first product behavior

If collaboration infrastructure is down, LightBI should not unnecessarily disable local source understanding, local Easy/Deep BA, local BA/DA or local Advanced operations that do not require server authority.

Cloud-dependent capabilities may degrade independently:

```text
Local analysis                → remains usable where licensing/runtime allows
Team synchronization          → unavailable/stale
Shared permissions/membership → cannot be assumed current
Realtime BA                   → paused/stale/failed explicitly
Public entitlement/admin      → follows control-plane availability policy
```

This keeps infrastructure failure from turning a local-first product into an unnecessary single point of failure.

## 16. Non-goals

This direction does not authorize:

- making HOMELAB an equal live production primary;
- synchronizing the Production Root or copying issuer private keys casually;
- dual-primary writes without a deliberately designed multi-writer protocol;
- mandatory upload of raw user data;
- a specific Cloudflare/Worker/database/queue/orchestrator implementation;
- unlimited Realtime BA refresh;
- treating VPN membership as application authorization;
- hiding stale/failover uncertainty from users;
- replacing current release/trust contracts with a future collaboration design.

## 17. Current status

As of 2026-09-03 this is future architecture direction only. The current public/control-plane infrastructure, R2 distribution, NEXT/MAIN generation rotation, trust/signing model and HOMELAB continuity experiments provide relevant foundations, but they are not proof that Team Workspace or Realtime BA infrastructure is implemented.

Before implementation, future work must perform a fresh current-state audit of the active generation, control plane, account/organization schema, source connector placement, current continuity topology and measured workload/cost profile.

## 17A. Private Authenticated Transport is a capability, not a WireGuard dependency

Future Team/Workspace infrastructure may benefit from a private authenticated data path between authorized local/edge agents and shared services. The durable product capability is named **Private Authenticated Transport** rather than `WireGuard mode` so infrastructure technology does not become product authority.

Candidate implementations may include WireGuard, a QUIC-based overlay, MASQUE, an mTLS private gateway, or a later equivalent. Selection must be based on measured NAT traversal, enterprise deployability, mobile/desktop support, revocation, observability, operating cost and failure behavior at implementation time.

This transport is additive defense/data-plane isolation only. Overlay membership must never replace LightBI account/organization authorization, named-seat entitlement, trusted installation identity, signed request proof, connector/source authorization or privileged admin policy. A compromised or misconfigured private network member must still fail application-level authorization.

Private Authenticated Transport is **future Team/Workspace scope and not a LightBI 1.0 blocker**. The current 1.0 roadmap may reuse generic Signed Transport primitives without committing to any future overlay technology.

## 18. Repository bookmarks

- [Team Workspace and Realtime BA](../product/team-workspace-realtime-ba-future-direction.md) — product behavior this infrastructure is intended to support.
- [BA/DA Future Analyst Workbench](../product/ba-da-mode-future-analyst-workbench.md) — future saved-analysis and technical-workbench model.
- [LightBI Project Book](../project-book/LIGHTBI_PROJECT_BOOK.md) — current project truth and source precedence.
- [Road to 1.0 Trust Release Contract](./road-to-1-0-trust-release-contract.md) — trust/signing/account boundaries that future infra must preserve.
- [Storage Model](./storage-model.md) — historical architecture direction separating metadata from heavy analytical data and noting future sync potential.

The durable infrastructure principle captured here is:

> Share only the state that must become shared, run analysis where source authority permits, keep one authoritative writer for shared truth, fence before promotion, preserve local-first degradation, and never collapse recovery convenience into trust/signing authority.
