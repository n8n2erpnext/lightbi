# LightBI Team Workspace and Realtime BA — Future Product Direction

Status: draft / future product direction  
Date: 2026-09-03  
Scope: Team collaboration, shared analytical workspace, Share flow, Realtime BA product behavior, seat/allowance direction, and relationship to local-first LightBI.  
Supersedes: none  
Superseded by: none  
Primary sources: product-owner discussion 2026-09-02/03; [LightBI Project Book](../project-book/LIGHTBI_PROJECT_BOOK.md); [BA/DA Future Analyst Workbench](./ba-da-mode-future-analyst-workbench.md).

> This is an approved future product direction, **not evidence of implemented collaboration/runtime capability and not a current pricing contract**.

## 1. Purpose

LightBI should evolve from a strong single-user local-first analytical workspace into a team-capable system without turning raw user data into mandatory cloud property.

The future Team Workspace is the organizational layer above Easy, Deep BA, BA/DA, Advanced, saved Analysis Artifacts, dashboards and reports.

The core product idea is simple:

> A user should be able to finish useful analysis alone, then share that governed work into a team context without rebuilding the analysis from scratch.

## 2. Share is the bridge from individual work to organizational adoption

The Share flow is strategically important because it connects the current single-user experience to future team use.

Representative progression:

```text
Easy / Deep BA / BA/DA / Advanced
→ save governed analytical artifact
→ Share
→ Team Workspace
→ manager/team consumes finding, evidence, chart, report or dashboard
→ analyst can reopen exact source analysis when needed
```

A manager should not need to open Python or SQL to consume a shared BA/DA finding. The shared surface should prioritize the business question, finding, evidence, limitations, chart/report and recommendation. Technical users may drill back into the exact saved analysis and code context.

Share should preserve analytical identity, revision, source lineage/evidence references and permissions rather than becoming a screenshot-only export.

## 3. Team Workspace responsibility

A Team Workspace is a durable organizational context for shared analytical work, not merely a shared folder.

Conceptual capabilities may include:

- organization/team membership;
- named-user seats and role/permission policy;
- shared Analysis Artifacts;
- shared Deep BA/report outputs;
- dashboards and chart collections;
- report revisions and comments/review state;
- saved reusable analytical templates;
- source/lineage references and evidence metadata;
- activity/audit history appropriate to team operations;
- future Realtime BA execution/refresh surfaces.

The exact schema is intentionally not frozen here. The invariant is that shared work remains traceable back to the analytical evidence that produced it.

## 4. Local-first remains the default

Team features must not silently rewrite the product into cloud-first BI.

The default principle remains:

```text
Raw/source data
→ analyzed where explicitly authorized
→ LightBI analytical state/artifacts may be shared
→ cloud collaboration is optional and scoped
```

Future Team sync may replicate analytical state such as report revisions, chart definitions, saved findings, evidence metadata, permissions, source fingerprints/lineage references and collaboration state without automatically uploading complete raw datasets.

Some future organization workflows may explicitly opt into cloud-hosted data or server-side connectors, but that must be an intentional policy choice with a clear data boundary rather than an invisible consequence of pressing Share.

## 5. Realtime BA product concept

Realtime BA is a future team capability that keeps selected governed analyses alive as their authorized source data changes.

“Realtime” is a product-facing term, not a promise that every source continuously streams every row with zero latency. The implementation may use bounded refresh windows, scheduled or event-driven checks, call limits and source-specific refresh semantics.

The value proposition is:

> A team does not only receive a static report; it can retain a governed analytical question and have LightBI refresh/re-evaluate it as current source evidence becomes available.

Representative team scenario:

```text
100-store business
├─ owner / director
├─ sales manager
├─ operations manager
├─ inventory manager
├─ finance manager
└─ analyst

Shared questions
→ revenue / margin / inventory / cash / performance
→ governed source connectors
→ Realtime BA refresh
→ team findings / evidence / alerts / next questions
```

The team should be able to share a durable analysis such as “Why is Store A outperforming peers?” and keep that investigation relevant as the underlying authorized business system changes.

## 6. Seat and Realtime BA allowance direction

The product direction discussed for future team packaging is approximately:

```text
5 seats  → 1 Realtime BA allowance
10 seats → 2 Realtime BA allowances
20 seats → 4 Realtime BA allowances
```

The intended rule is roughly **one Realtime BA allowance per five seats**. This is a packaging/infra-capacity direction, not a frozen commercial price or entitlement contract.

An allowance may ultimately represent a bounded number of continuously maintained analyses, active refresh slots, calls, refresh windows, or another capacity unit. The exact unit must be defined only after infrastructure cost and user behavior are measured.

The product should avoid fake “unlimited realtime” promises that create unpredictable infrastructure cost.

## 7. Relationship to BA/DA Mode

BA/DA Mode creates the richest reusable analytical artifacts in the future product model. Team Workspace gives those artifacts an organizational life beyond the analyst's machine.

A representative flow:

```text
BA/DA investigation
→ save Analysis Artifact
→ publish/share to Team
→ manager sees finding + evidence + recommendation
→ analyst sees code + execution context + revisions
→ Realtime BA optionally keeps the analysis refreshed
```

This makes BA/DA, Team Workspace and Realtime BA complementary rather than separate products.

## 8. Permissions and organizational authority

Team collaboration requires explicit organizational authority.

The direction is named-user seats plus organization membership. A reusable shared Business key must not become ongoing entitlement authority. Any future organization claim/bootstrap token should be short-lived/one-time and resolve into durable account/organization membership and signed entitlement state.

Permissions must eventually distinguish at least:

- who may view a shared analysis/report;
- who may edit or rerun it;
- who may connect/authorize a source;
- who may publish team-visible findings;
- who may manage members/roles;
- who may consume scarce Realtime BA capacity;
- who may perform sensitive administrative actions.

## 9. Collaboration state is not analytical truth by itself

Comments, review status, team labels, notifications and collaborative metadata are useful organizational state, but they must not silently alter metric truth or source evidence.

A team member saying “this looks correct” is not the same as a governed source/evidence declaration unless the product explicitly models that action as an authorized evidence decision.

Likewise, a shared report revision must retain which governed analytical result it represents rather than recomputing business numbers independently in the collaboration layer.

## 10. Offline and degraded behavior

The future team layer should degrade cleanly when cloud connectivity is unavailable.

Local analysis that does not require cloud/team authority should continue to work. Team sync, shared permissions, organization state and Realtime BA may become temporarily unavailable or stale, but the product should not pretend those collaborative states are current.

Future queued sync/replay may be appropriate for non-conflicting append-only collaboration events, but conflict/authority semantics must be explicit before implementation.

## 11. Workflow gravity without lock-in

Team Workspace should increase retention because organizational analytical work accumulates and becomes reusable, not because LightBI prevents export.

Shared findings, reports, charts, SQL, Python analyses and evidence should continue to support governed export/handoff where appropriate.

The product moat is the coherent workflow and institutional analytical memory:

```text
individual understanding
→ reusable analysis
→ shared team artifact
→ recurring/realtime refresh
→ organizational analytical history
```

## 12. Non-goals

This direction does not currently define:

- a mandatory cloud data warehouse;
- mandatory raw-file upload;
- Google-Docs-style concurrent editing semantics;
- exact cloud provider/database/queue technology;
- unlimited realtime execution;
- final Team pricing;
- final seat entitlement schema;
- a replacement for current local-first Easy/Advanced workflows.

## 13. Current status

As of 2026-09-03 this is future product direction only. Current repository evidence for local-first analysis, Deep BA, Advanced Mode, export, account/entitlement and release trust should be treated as foundations, not proof that Team Workspace or Realtime BA already exists.

Before implementation, future work must reconcile this direction with the then-current account/org entitlement model, BA/DA artifact model, provider execution model and real infrastructure cost measurements.

## 14. Repository bookmarks

- [LightBI Project Book](../project-book/LIGHTBI_PROJECT_BOOK.md) — current project model and source precedence.
- [BA/DA Future Analyst Workbench](./ba-da-mode-future-analyst-workbench.md) — future reusable analyst artifact/workbench direction.
- [Product Direction and Pricing Strategy](./product-direction-and-pricing-v1.md) — earlier draft Team/product packaging history; not current pricing authority.
- [Road to 1.0 Trust Release Contract](../architecture/road-to-1-0-trust-release-contract.md) — current trust/account/entitlement boundaries relevant to future team authority.
- [Future Team/Realtime Infrastructure Direction](../architecture/future-team-realtime-infrastructure-direction.md) — conceptual infrastructure required to support this product direction.
