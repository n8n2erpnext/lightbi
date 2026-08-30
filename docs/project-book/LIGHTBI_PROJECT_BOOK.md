# LightBI Project Book

**Edition:** Project Truth 1.0
**Initial snapshot:** 2026-08-29
**Project Truth audit closed:** 2026-08-30
**Scope:** Product intent, architecture evolution, canonical runtime rules, verified evidence, Git/release state, CI/CD, private control-plane ownership, and provenance bookmarks.
**Status:** **Repository-wide archaeology complete. Docs + code + Git + GitHub Actions/release state + private control plane are reconciled. Remaining gaps are explicit implementation/release gates, not missing archaeology.**
**Documentation governance:** Before adding or reorganizing project documentation, follow [`LIBRARY_RULES.md`](./LIBRARY_RULES.md).
**Code-derived companion:** [`LIGHTBI_CODE_MAP.md`](./LIGHTBI_CODE_MAP.md) records the completed 0.3 codebase baseline and explicitly separates archive-baseline HEAD from dirty working-tree evidence.

**Git-derived companion:** [`LIGHTBI_GIT_HISTORY_MAP.md`](./LIGHTBI_GIT_HISTORY_MAP.md) records Edition 0.4: archive/public lineage split, snapshot proof, closure-to-commit mapping, releases, PRs, supersession, and branch-relative dirty-state corrections.

**CI/CD companion:** [`LIGHTBI_CI_CD_MAP.md`](./LIGHTBI_CI_CD_MAP.md) records Edition 0.5: workflows, tag-time release behavior, GitHub Actions evidence, R2/GitHub publication, and macOS publication state.

**Control-plane companion:** [`LIGHTBI_CONTROL_PLANE_MAP.md`](./LIGHTBI_CONTROL_PLANE_MAP.md) records Edition 0.6: private-repository provenance, current online ownership, runtime deployment alignment, Beta entitlement behavior, and 1.0 boundary.





<!-- AUTO_TOC_START -->
## Table of Contents

  - [How an AI agent must use this book](#how-an-ai-agent-must-use-this-book)
- **[Part I — Identity, Truth, and Reading Rules](#part-i-identity-truth-and-reading-rules)**
  - [1. What LightBI is](#1-what-lightbi-is)
  - [2. Source precedence and conflict resolution](#2-source-precedence-and-conflict-resolution)
  - [3. Vocabulary that must not be collapsed](#3-vocabulary-that-must-not-be-collapsed)
- **[Part II — Product and Architecture Evolution](#part-ii-product-and-architecture-evolution)**
  - [4. The project evolved by rejecting its own earlier assumptions](#4-the-project-evolved-by-rejecting-its-own-earlier-assumptions)
- **[Part III — Current Canonical Understanding and Execution Model](#part-iii-current-canonical-understanding-and-execution-model)**
  - [5. Canonical ownership: one truth path, not competing engines](#5-canonical-ownership-one-truth-path-not-competing-engines)
  - [6. Source boundary: sample evidence is not runtime authority](#6-source-boundary-sample-evidence-is-not-runtime-authority)
  - [7. Canonical evidence overlay: user review changes interpretation, not raw data](#7-canonical-evidence-overlay-user-review-changes-interpretation-not-raw-data)
  - [8. M1 / M2 / M3 are governed stages, not decorative labels](#8-m1-m2-m3-are-governed-stages-not-decorative-labels)
  - [9. Grain is a safety boundary](#9-grain-is-a-safety-boundary)
  - [10. Relationships are evidence-governed and operation-specific](#10-relationships-are-evidence-governed-and-operation-specific)
  - [11. Multi-source means a logical governed dataset, not a blind six-file join](#11-multi-source-means-a-logical-governed-dataset-not-a-blind-six-file-join)
- **[Part IV — Product Modes and User Experience](#part-iv-product-modes-and-user-experience)**
  - [12. Easy / Simple / Standard Mode: the differentiation layer](#12-easy-simple-standard-mode-the-differentiation-layer)
  - [13. Advanced Mode: technical workspace, not a bypass around governance](#13-advanced-mode-technical-workspace-not-a-bypass-around-governance)
  - [14. Investigation is the governed execution workspace](#14-investigation-is-the-governed-execution-workspace)
  - [15. Deep BA / Business Brain: evidence-bound analytical narrative](#15-deep-ba-business-brain-evidence-bound-analytical-narrative)
  - [16. AI is an optional consumer, not the analytical authority](#16-ai-is-an-optional-consumer-not-the-analytical-authority)
- **[Part V — Semantic Knowledge, Domains, and Business Coverage](#part-v-semantic-knowledge-domains-and-business-coverage)**
  - [17. Semantic Registry is the supported runtime vocabulary source](#17-semantic-registry-is-the-supported-runtime-vocabulary-source)
  - [18. Domain Knowledge Catalog separates business knowledge from execution code](#18-domain-knowledge-catalog-separates-business-knowledge-from-execution-code)
- **[Part VI — Planning, Runtime, Storage, and Connectors](#part-vi-planning-runtime-storage-and-connectors)**
  - [19. Recipe / Planner / Runtime separation is a long-lived architectural principle](#19-recipe-planner-runtime-separation-is-a-long-lived-architectural-principle)
  - [20. Local-first is a product rule, not only a deployment choice](#20-local-first-is-a-product-rule-not-only-a-deployment-choice)
  - [21. Provider/plugin expansion must not bloat core or fake support](#21-providerplugin-expansion-must-not-bloat-core-or-fake-support)
- **[Part VII — Visualization, Dashboard, Export, and Handoff](#part-vii-visualization-dashboard-export-and-handoff)**
  - [22. Visualization consumes governed data contracts; it does not invent analytical truth](#22-visualization-consumes-governed-data-contracts-it-does-not-invent-analytical-truth)
  - [23. Dashboards are downstream analytical workspaces](#23-dashboards-are-downstream-analytical-workspaces)
  - [24. Export is a governed artifact boundary](#24-export-is-a-governed-artifact-boundary)
  - [25. Historical visual baseline](#25-historical-visual-baseline)
- **[Part VIII — Verification Evidence and Current Docs-Derived Baseline](#part-viii-verification-evidence-and-current-docs-derived-baseline)**
  - [26. Release-quality evaluation evolved from synthetic proof to governed corpus proof](#26-release-quality-evaluation-evolved-from-synthetic-proof-to-governed-corpus-proof)
  - [27. Latest documented Phase 8F.2 production-flow evidence](#27-latest-documented-phase-8f-2-production-flow-evidence)
  - [28. Governed failures are tracked by identity, not hidden by aggregate greenwashing](#28-governed-failures-are-tracked-by-identity-not-hidden-by-aggregate-greenwashing)
  - [29. Beta release checklist is a dated release snapshot, not a live universal status page](#29-beta-release-checklist-is-a-dated-release-snapshot-not-a-live-universal-status-page)
  - [30. Pricing and commercial packaging are not yet a single current canonical contract in this repo](#30-pricing-and-commercial-packaging-are-not-yet-a-single-current-canonical-contract-in-this-repo)
  - [31. Distribution, account, licensing, payment and telemetry need a separate source-of-truth audit](#31-distribution-account-licensing-payment-and-telemetry-need-a-separate-source-of-truth-audit)
- **[Part IX — Safety, Privacy, and Governance](#part-ix-safety-privacy-and-governance)**
  - [32. Fail closed is the default response to missing business evidence](#32-fail-closed-is-the-default-response-to-missing-business-evidence)
  - [33. Original source immutability is a repeated safety rule](#33-original-source-immutability-is-a-repeated-safety-rule)
- **[Part X — Superseded Models and Historical Traps](#part-x-superseded-models-and-historical-traps)**
  - [34. Historical documents that are useful but must not be read as current architecture](#34-historical-documents-that-are-useful-but-must-not-be-read-as-current-architecture)
  - [35. Proposed document taxonomy for the later cleanup phase](#35-proposed-document-taxonomy-for-the-later-cleanup-phase)
- **[Part XI — Known Open Questions Before Coding](#part-xi-known-open-questions-before-coding)**
  - [36. Documentation alone is not enough to claim full project understanding](#36-documentation-alone-is-not-enough-to-claim-full-project-understanding)
- **[Part XII — Bookmark Route Guide](#part-xii-bookmark-route-guide)**
  - [37. If you need to verify a claim, start here](#37-if-you-need-to-verify-a-claim-start-here)
  - [38. Phase history map](#38-phase-history-map)
- **[Part XIII — AI Handoff Contract](#part-xiii-ai-handoff-contract)**
  - [39. Before an AI proposes code changes](#39-before-an-ai-proposes-code-changes)
  - [40. Snapshot provenance](#40-snapshot-provenance)
  - [41. Planned edition upgrades](#41-planned-edition-upgrades)
- **[Part XIV — Road to 1.0: Distribution, Licensing, Trust, and Release Direction](#part-xiv-road-to-1-0-distribution-licensing-trust-and-release-direction)**
  - [42. Source authority for this part](#42-source-authority-for-this-part)
  - [43. Strategic priority to 1.0](#43-strategic-priority-to-1-0)
  - [44. Public/private repository boundary and workflow discipline](#44-publicprivate-repository-boundary-and-workflow-discipline)
  - [45. Licensing authority model](#45-licensing-authority-model)
  - [46. Account, organization, and Business entitlement model](#46-account-organization-and-business-entitlement-model)
  - [47. Public Basic / private Pro capability delivery](#47-public-basic-private-pro-capability-delivery)
  - [48. Pro package protection and offline behavior](#48-pro-package-protection-and-offline-behavior)
  - [49. Installation trust and attestation](#49-installation-trust-and-attestation)
  - [50. Request classes and signing-service boundary](#50-request-classes-and-signing-service-boundary)
  - [51. Cryptographic trust hierarchy](#51-cryptographic-trust-hierarchy)
  - [52. Phase 2A public trust-contract invariants](#52-phase-2a-public-trust-contract-invariants)
  - [53. Phase 2A current handoff state and audit blockers](#53-phase-2a-current-handoff-state-and-audit-blockers)
  - [54. Update and install lifecycle invariants](#54-update-and-install-lifecycle-invariants)
  - [55. Open-core legal/technical boundary](#55-open-core-legaltechnical-boundary)
  - [56. Frozen versus provisional road-to-1.0 decisions](#56-frozen-versus-provisional-road-to-1-0-decisions)
  - [57. Documentation-library cleanup state](#57-documentation-library-cleanup-state)
- **[Part XV — Project Truth Baseline 1.0](#part-xv-project-truth-baseline-1-0)**
  - [58. What “Project Truth 1.0” means](#58-what-project-truth-1-0-means)
  - [59. Repository topology is now verified](#59-repository-topology-is-now-verified)
  - [60. Current public Basic repository truth](#60-current-public-basic-repository-truth)
  - [61. Current release truth](#61-current-release-truth)
  - [62. Current CI truth](#62-current-ci-truth)
  - [63. Current control-plane ownership truth](#63-current-control-plane-ownership-truth)
  - [64. Current Beta entitlement versus 1.0 trust authority](#64-current-beta-entitlement-versus-1-0-trust-authority)
  - [65. Phase 2A status is now fully reconciled](#65-phase-2a-status-is-now-fully-reconciled)
  - [66. Basic independence is a cross-repository invariant](#66-basic-independence-is-a-cross-repository-invariant)
  - [67. Final documentation-library disposition](#67-final-documentation-library-disposition)
  - [68. Project Truth checkpoint](#68-project-truth-checkpoint)
  - [69. Explicit open gates after archaeology](#69-explicit-open-gates-after-archaeology)
  - [70. Coding gate after Project Truth 1.0](#70-coding-gate-after-project-truth-1-0)
<!-- AUTO_TOC_END -->

---

## How an AI agent must use this book

This file exists so a new AI agent does not need to rediscover LightBI from hundreds of scattered Markdown and JSON files before it can reason safely about the project.

The required reading contract is:

1. Read this book completely before proposing architecture changes.
2. Treat linked source documents as provenance, not as equally current truth.
3. When two documents conflict, use the source-precedence rules in Chapter 2.
4. Never infer that an older milestone describes the current production path.
5. Never equate semantic recognition with execution permission.
6. Never equate a successful query with a trustworthy business metric.
7. Preserve local-first, source identity, evidence, lineage, and fail-closed behavior.
8. Update this book after any architecture-changing phase.
9. Update `LIGHTBI_WORKLOG.md` after any completed work phase.
10. Update the source catalog whenever documentation is moved or renamed.
---

# Part I — Identity, Truth, and Reading Rules

## 1. What LightBI is

LightBI is best understood as a **Business Understanding Engine** rather than a classic dashboard builder, AI dashboard, ETL product, or chat-with-database interface.

The product promise is not “draw charts from files.” The intended value chain is:

```text
Raw Data
→ Inspect and understand
→ Resolve semantics and evidence
→ Evaluate trust/readiness
→ Expose governed analysis opportunities
→ Execute deterministically
→ Preserve lineage and restrictions
→ Present chart / investigation / BA evidence
→ Export or hand off to downstream tools
```

The shorter product framing used repeatedly in the repository is:

```text
Raw Data → Trusted Information → Better Decisions
```

The central differentiator is that LightBI tries to make messy operational data understandable **before** asking the user to model a BI system manually.

### Primary source bookmarks

- [`../architecture/ADR-117-business-understanding-engine-product-boundary.md`](../adr/ADR-117-business-understanding-engine-product-boundary.md)
- [`../product/product-direction-and-pricing-v1.md`](../product/product-direction-and-pricing-v1.md)
- [`../MVP_sol.md`](../MVP_sol.md)
- [`../history/project-memory/memory.md`](../history/project-memory/memory.md) — historical project memory; use with precedence rules below.
## 2. Source precedence and conflict resolution

The repository is a historical record, not a flat specification. Many old documents describe architectures that were later superseded.

Docs, code, Git history, CI/CD, release publication, and private control-plane ownership are now reconciled. Use this order of authority:

1. **Current code at the relevant exact SHA/branch + reproducible runtime evidence**, interpreted with [`LIGHTBI_CODE_MAP.md`](./LIGHTBI_CODE_MAP.md) and [`LIGHTBI_GIT_HISTORY_MAP.md`](./LIGHTBI_GIT_HISTORY_MAP.md).
2. **Latest closure documents and machine-readable audits** for the relevant subsystem.
3. **Current canonical contracts and architecture ownership documents.**
4. **Current product-boundary documents and active release checklists.**
5. **ADRs**, interpreted in chronological context.
6. **Milestone/progress documents** as historical implementation evidence.
7. **Changelogs, handoffs, reports, and project memory** as historical context.

A newer document does not automatically override an older one if it explicitly says behavior was preserved. The deciding question is: **which document owns the current contract?**

Examples:

- Early “Question First” documents are historically important but do not define the current Easy/Home canonical flow.
- Early relationship discovery was frontend-only and non-executing; later Phase 8D.1 introduced a governed production multi-source boundary.
- `memory.md` contains valid historical checkpoints but also statements later superseded by Phase 7/8 runtime proof.
- The 2026-06-28 pricing document is a draft product proposal, not automatically the current commercial contract.

Whenever this book says **current**, it means “latest documentation-supported current state as of this snapshot,” pending source-code verification.
## 3. Vocabulary that must not be collapsed

LightBI deliberately separates several concepts that ordinary BI products often blur together.

| Concept | Meaning | What it does **not** prove |
|---|---|---|
| Recognition | A physical field has evidence for a canonical business signal. | That the field is safe to aggregate or use for a decision. |
| Semantic resolution | Candidate meanings have been resolved or explicitly left uncertain. | That dataset grain is known. |
| Grain | What one physical row represents and how measures repeat. | That two files may be joined. |
| Relationship | Evidence about business identity/cardinality between sources. | That arbitrary cross-source measures may be joined. |
| Readiness | A governed capability is ready, conditional, blocked, unsupported, or stale. | That a metric formula is correct. |
| Metric preflight | Required metric evidence and policy are satisfied. | That runtime execution succeeded. |
| Runtime execution | A governed plan executed against the required source scope. | That decision use is authorized. |
| Evidence | Traceable observations supporting a mapping/result/conclusion. | Automatic permission to mutate source data. |
| Decision-use restriction | Policy describing what a result may be used for. | A UI-only warning that can be ignored. |
| Trust/readiness score | A structured assessment of data/analysis fitness. | A universal probability that the business conclusion is true. |

This separation is one of the most important architectural safeguards in the project.

A future implementation that shortcuts these boundaries for convenience is not a harmless refactor; it changes the product’s trust model.
---

# Part II — Product and Architecture Evolution

## 4. The project evolved by rejecting its own earlier assumptions

LightBI’s documentation is easiest to understand as a sequence of architectural corrections rather than a straight-line implementation plan.

### 4.1 Architecture-first foundation

The June 2026 foundation established a dataset-centric, project-scoped architecture with strong separation of concerns:

```text
Project
→ Source / Datasource
→ Dataset
→ Schema + Semantic Model
→ Perspective / Question Context
→ Recipe
→ Planner
→ Runtime
→ Runtime Dataset
→ Data View
→ Chart / Insight / Dashboard / Export
```

Core decisions introduced local-first operation, SQLite metadata, DuckDB analytical execution, source capability contracts, project-scoped registries, declarative recipes, planner/runtime separation, rendering contracts, and deterministic insight artifacts.

Primary historical bookmarks:

- [`../changelog/2026-06-01-phase2-domain-model.md`](../history/changelog/2026-06-01-phase2-domain-model.md)
- [`../changelog/2026-06-01-phase4-storage-architecture.md`](../history/changelog/2026-06-01-phase4-storage-architecture.md)
- [`../progress/phase-13-source-registry.md`](../history/progress/phase-13-source-registry.md)
- [`../progress/phase-20-runtime-foundation.md`](../history/progress/phase-20-runtime-foundation.md)
- [`../progress/phase-27-render-contract.md`](../history/progress/phase-27-render-contract.md)
### 4.2 Question First reduced BI complexity, but later proved too restrictive

The early UX direction intentionally inverted classic BI:

```text
Question → Template → Recipe → Dataset → Chart → Insight
```

The goal was to let a normal user start from “what do I want to know?” instead of building models, SQL, DAX, dashboards, or joins first. Question Templates were also designed as an anti-hallucination boundary: natural language should resolve into predefined deterministic structures instead of allowing an LLM to invent SQL.

This architecture remains important as a semantic/intent layer, but it is no longer the primary product-success criterion.

Historical bookmarks:

- [`../architecture/question-first-model.md`](../architecture/question-first-model.md)
- [`../architecture/question-template-model.md`](../architecture/question-template-model.md)
- [`../progress/milestone-2-question-first.md`](../history/progress/milestone-2-question-first.md)
- [`../changelog/2026-06-01-phase6-question-first.md`](../history/changelog/2026-06-01-phase6-question-first.md)

### 4.3 Relationship discovery and Business Views expanded multi-file understanding

Milestone 5 introduced deterministic key discovery, relationship scoring, `RelationshipGraph`, connected components, `BusinessViewCandidate`, user review, and `VirtualDatasetPlan` artifacts.

The critical historical boundary was that this layer initially **did not execute physical joins**. It discovered and planned; runtime materialization was deferred.

Bookmarks:

- [`../architecture/relationship-discovery-scoring.md`](../architecture/relationship-discovery-scoring.md)
- [`../progress/milestone-5-relationship-discovery.md`](../history/progress/milestone-5-relationship-discovery.md)
- [`../progress/milestone-5-summary.md`](../history/progress/milestone-5-summary.md)
### 4.4 BVQ became too strict; Dataset Understanding became first-class

The project later observed a practical failure mode: if complete Business Views and Questions were required before showing value, sparse SME data could produce:

```text
0 Business Views
0 Questions
→ blank or failure-feeling UX
```

The project explicitly rejected the assumption that “0 Questions = 0 Understanding.”

The product reset became:

```text
Signals
→ Dataset Understanding
→ Analysis Opportunities
→ Investigation
```

Questions and Business Views remain useful, but they are not allowed to gate the entire product experience.

The Home experience was repositioned around **what LightBI found**, **what can be analyzed now**, and **one-click investigation**, with technical diagnostics hidden from normal users.

Key bookmarks:

- [`../progress/milestone-8-5-guided-investigation.md`](../history/progress/milestone-8-5-guided-investigation.md)
- [`../history/project-memory/memory.md`](../history/project-memory/memory.md) sections “BVQ Reset”, “Dataset Understanding”, and “Home Freeze”
- Search the source catalog for `ADR-097-dataset-understanding-before-questions.md`, `dataset-understanding-layer.md`, and `BVQ-RESET-DECISION.md`.
### 4.5 Business Brain shifted Simple Mode toward a BA workflow

Phase 28 formalized a deterministic BA orchestration layer rather than adding a free-form AI analyst.

Canonical direction:

```text
Raw / imported data
→ Semantic Coverage Engine
→ Business Signal Registry
→ KPI Engine
→ Playbook Matcher
→ Variance Engine
→ Root Cause Engine
→ Risk Engine
→ Recommendation Engine
→ Executive Narrative
```

The governing artifact is `BusinessBrainBrief`. A selected analytical angle should carry readiness, KPI evidence, variance, root cause, risks, recommendations, missing evidence, narrative, next questions, and an evidence audit trail.

The critical rule is **selected-angle-first**: a broad cross-domain overview may provide supporting context, but it must not replace the answer to the exact chart/angle the user selected.

Business recommendations are typed so the system can distinguish an evidence-backed immediate action from an investigation request or a request for more data.

Primary bookmark:

- [`../progress/phase-28-business-brain-orchestrator.md`](../history/progress/phase-28-business-brain-orchestrator.md)
- [`../history/project-memory/memory.md`](../history/project-memory/memory.md) — Business Brain checkpoints and UI visibility fixes.
### 4.6 Semantic Dictionary and Registry attacked “semantic blindness” upstream

Business Brain exposed a deeper problem: downstream BA logic can only be good if the intake layer notices the business evidence in the first place.

Phase 29 therefore expanded semantic inference beyond header aliases. Evidence may come from:

- header/name evidence;
- value evidence;
- physical/data-shape evidence;
- neighboring columns;
- cross-file context.

These evidence types do not have equal authority. Shape alone cannot create a business signal. Cross-file context can strengthen a candidate but must not create a mapping from nothing. Contradictory header/value evidence must remain partial or conflicting rather than silently selecting one meaning.

Phase 30 then centralized supported runtime semantics into `semantic-registry.ts`, turning older detector ontologies into registry-backed adapters and adding drift-guard tests.

The product guarantee is deliberately weaker and safer than “understand arbitrary data perfectly”:

> Populated business-like fields should not silently disappear. Unknown or conflicting business evidence must remain visible.

Primary bookmarks:

- [`../progress/phase-29-context-aware-semantic-dictionary.md`](../history/progress/phase-29-context-aware-semantic-dictionary.md)
- [`../progress/phase-30-semantic-registry-unification.md`](../history/progress/phase-30-semantic-registry-unification.md)
- [`../history/project-memory/memory.md`](../history/project-memory/memory.md) — Phase 29/30 checkpoints.
---

# Part III — Current Canonical Understanding and Execution Model

## 5. Canonical ownership: one truth path, not competing engines

The later Phase 5–8 work is fundamentally about migrating from multiple partially overlapping detectors/executors toward one governed canonical path.

The intended ownership model is:

```text
Physical source evidence
→ canonical understanding artifact
→ governed readiness / metric / action policy
→ canonical presentation
→ Home / Advanced handoff
→ Investigation
→ governed execution
→ governed result + lineage + restrictions
```

Important consequences:

- Home must not maintain an independent trust/readiness truth.
- Investigation must not reinterpret the metric/operator independently.
- Advanced must not bypass the canonical handoff when transferring results into decision-support flows.
- Legacy fusion/mock/preview executors may remain as test/history/compatibility code but must not be reachable from the production canonical session path.
- Rebuilding unchanged canonical state should preserve deterministic identity; source/evidence changes must invalidate stale artifacts.

Key closure bookmarks:

- [`../architecture/phase-6b2-canonical-error-state-audit.json`](../architecture/phase-6b2-canonical-error-state-audit.json)
- [`../architecture/phase-6b2-production-path-preservation-audit.json`](../architecture/phase-6b2-production-path-preservation-audit.json)
- [`../architecture/phase-8f-core-to-ui-parity-matrix.json`](../architecture/phase-8f-core-to-ui-parity-matrix.json)
## 6. Source boundary: sample evidence is not runtime authority

One of the most important corrections in Phase 8A was separating the different scopes at which a source is observed.

A file may have:

- a physical/full-file source identity;
- a full-file profile;
- representative/sample rows used for semantic interpretation;
- a runtime binding capable of re-reading/materializing the complete source;
- a current fingerprint and inspection/profile generation.

The representative sample is evidence for understanding; it is **not interchangeable** with the complete runtime source.

A runnable action must retain enough source continuity to prove that the exact source being executed is the source that produced the governed artifact. Later Phase 8F.1 tightened this after a real-browser false-ready defect where a restored session retained representative rows but had lost the complete runtime source.

Fail-closed rule:

```text
If full-source continuity cannot be proven
→ action is stale / source reselection required
→ no Investigate action may be exposed
```

This means persisted sample rows, screenshots, semantic previews, or expected row counts can never substitute for actual source availability.

Primary bookmarks:

- [`../architecture/phase-8a-production-full-source-boundary-closure.md`](../architecture/phase-8a-production-full-source-boundary-closure.md)
- [`../architecture/phase-8a-canonical-source-scope-contract-audit.json`](../architecture/phase-8a-canonical-source-scope-contract-audit.json)
- [`../architecture/phase-8f1-ready-action-runtime-closure.md`](../architecture/phase-8f1-ready-action-runtime-closure.md)
- [`../architecture/phase-8f1-runtime-source-continuity-audit.json`](../architecture/phase-8f1-runtime-source-continuity-audit.json)
## 7. Canonical evidence overlay: user review changes interpretation, not raw data

Phase 8B introduced a source-bound, versioned user overlay for semantic/evidence decisions.

The overlay can record review decisions such as mappings and declarations for currency, UOM, reporting period, as-of date, roles, document identity, and similar evidence required by governed metrics.

The overlay is deliberately constrained:

- it cannot invent a new canonical signal;
- it cannot target an incompatible or derived metric as if it were a physical field;
- it cannot mutate original rows;
- it cannot silently activate a domain;
- it cannot authorize an analysis by itself;
- it cannot weaken M1/M2/M3 safety policy;
- it cannot erase candidate lineage;
- stale or invalid overlay records remain non-authoritative.

Every overlay revision changes canonical identity, clears stale selected results, rebuilds the artifact from the original source boundary, and reruns the governed pipeline.

The UI must show inferred candidates separately from explicit user-confirmed evidence. A suggestion is not evidence simply because it is displayed prominently.

Primary bookmarks:

- [`../architecture/phase-8b-production-evidence-interaction-closure.md`](../architecture/phase-8b-production-evidence-interaction-closure.md)
- [`../architecture/phase-8b-mapping-overlay-contract-audit.json`](../architecture/phase-8b-mapping-overlay-contract-audit.json)
- [`../architecture/phase-8b-source-evidence-contract-audit.json`](../architecture/phase-8b-source-evidence-contract-audit.json)
- [`../architecture/phase-8b-source-binding-invalidation-audit.json`](../architecture/phase-8b-source-binding-invalidation-audit.json)
## 8. M1 / M2 / M3 are governed stages, not decorative labels

The repository uses M1/M2/M3 repeatedly as the governed chain between semantic understanding and execution. The exact internal contracts are owned by the Phase 5M modules and later canonical adapters; UI code must not redefine them.

A safe high-level interpretation is:

- **M1:** governed domain/metric eligibility and evidence requirements.
- **M2:** governed question/action generation and classification from the eligible metric/domain state.
- **M3:** governed runtime permission, query-plan validation, execution restrictions, and source-bound runtime safety.

The important architectural rule is not the shorthand itself but the authority boundary:

```text
UI suggestion
≠ M1 metric eligibility
≠ M2 runnable action classification
≠ M3 execution permission
```

Phase 7R2 explicitly found a defect where M2 advertised actions that M3 correctly blocked. The fix was to align the contract, **not weaken M3**.

Similarly, Phase 8C states that a presentation adapter cannot authorize execution. An analysis is ready only when the exact governed preflight allows execution and the query plan is planned.

Primary bookmarks:

- Search `phase-5m1-*` for governed domain/metric policy and preflight.
- Search `phase-5m2-*` for question/action policy.
- Search `phase-5m3-*` for runtime preflight, query plan, execution and safety.
- [`../architecture/phase-7r2-action-runtime-alignment.md`](../architecture/phase-7r2-action-runtime-alignment.md)
- [`../architecture/phase-8c-functional-blocker-remediation-closure.md`](../architecture/phase-8c-functional-blocker-remediation-closure.md)
## 9. Grain is a safety boundary

LightBI cannot safely aggregate a numeric column merely because it parses as a number.

The canonical understanding system distinguishes row identity, measure behavior, repeated measures, snapshot/time semantics, and aggregation safety. A measure can exist physically while remaining unsafe to aggregate at the current grain.

Examples of dangerous shortcuts the architecture is designed to prevent:

- summing a repeated invoice total present on every line item;
- summing snapshot inventory across dates as if it were movement;
- treating a physical record count as a distinct customer/order/person count;
- interpreting an aggregate workbook row as an atomic transaction;
- counting duplicated identities without a governed deduplication contract.

Phase 4 established the grain candidate/resolution framework. Phase 5 then used those restrictions to prevent legacy “automatic SUM” behavior from becoming business truth. Later inventory and revenue work added metric-specific eligibility without globally weakening source-level aggregation safety.

Primary bookmarks:

- [`../architecture/phase-4a2a-grain-resolution-audit.json`](../architecture/phase-4a2a-grain-resolution-audit.json)
- [`../architecture/phase-4a2b-axis-resolution-audit.json`](../architecture/phase-4a2b-axis-resolution-audit.json)
- [`../architecture/phase-5b4-aggregation-authority-taxonomy.json`](../architecture/phase-5b4-aggregation-authority-taxonomy.json)
- [`../architecture/phase-7r37-snapshot-grain-readiness-audit.json`](../architecture/phase-7r37-snapshot-grain-readiness-audit.json)

A future feature must never turn “numeric + recognized” into “safe to aggregate” without the governed grain/metric path.
## 10. Relationships are evidence-governed and operation-specific

Relationship inference began as a candidate-scoring system using semantic match, name similarity, type compatibility, profile/cardinality evidence, value patterns, and sample overlap.

The later canonical model became stricter:

- sources are understood independently first;
- relationship identity is explicit and versioned;
- source roles are explicit evidence, not filename truth;
- cardinality and key quality matter;
- period/currency/grain compatibility can block a relationship-backed analysis;
- stale relationship artifacts are invalidated when source membership or evidence changes;
- a confirmed identity relationship does not automatically authorize arbitrary measure joins.

The verified Sales + Accounting case is especially important. The relationship proves exact document-identity reconciliation across two 1,500-row May sources. Because structural grains differ, the artifact explicitly limits the relationship’s use and prohibits generic cross-source measure joins.

That relationship can support the currently governed Gross Profit journey because the metric contract is separately governed; it is not a license to treat the two files as one denormalized table.

Primary bookmarks:

- [`../architecture/relationship-discovery-scoring.md`](../architecture/relationship-discovery-scoring.md)
- [`../architecture/phase-8d1-governed-relationship-artifact-audit.json`](../architecture/phase-8d1-governed-relationship-artifact-audit.json)
- [`../architecture/phase-8d1-relationship-invalidation-audit.json`](../architecture/phase-8d1-relationship-invalidation-audit.json)
- [`../architecture/phase-8d1-source-membership-role-audit.json`](../architecture/phase-8d1-source-membership-role-audit.json)
## 11. Multi-source means a logical governed dataset, not a blind six-file join

Phase 8D originally discovered that the production Home consumer still had only a one-source canonical boundary even though relationship inference existed elsewhere. Phase 8D.1 closed that gap.

The current documented production model can build a versioned **logical multi-source dataset** whose identity is derived from immutable source-local canonical artifacts plus source-bound evidence overlays.

Key properties:

- each selected source is profiled independently;
- source membership and roles are explicit;
- composite identity is deterministic and order-invariant;
- relationship candidates/resolution are reused rather than reimplemented in UI;
- full-file relationship evidence is required for governed execution;
- persistence stores logical membership/evidence, not raw local file bytes;
- reloading requires current sources and relationship rebuild rather than trusting a serialized executable handoff;
- unrelated sources may remain outside the active governed bundle.

The product therefore may present multiple business-perspective bundles from six imported files without constructing one generic six-source join.

Primary bookmarks:

- [`../architecture/phase-8d-functional-ui-feature-closure.md`](../architecture/phase-8d-functional-ui-feature-closure.md) — documents the missing boundary discovered in Phase 8D.
- [`../architecture/phase-8d1-production-multisource-closure.md`](../architecture/phase-8d1-production-multisource-closure.md)
- [`../architecture/phase-8d1-multisource-dataset-contract-audit.json`](../architecture/phase-8d1-multisource-dataset-contract-audit.json)
- [`../architecture/phase-8d1-multisource-runtime-execution-audit.json`](../architecture/phase-8d1-multisource-runtime-execution-audit.json)
---

# Part IV — Product Modes and User Experience

## 12. Easy / Simple / Standard Mode: the differentiation layer

The repository uses several labels across time — Simple Mode, Standard Mode, Easy Mode — for the non-technical business-understanding experience. The exact UI naming may evolve, but the product responsibility is stable.

Its job is to help a user who does **not** know SQL, DAX, data modeling, joins, or BI tooling move from raw data to an understandable and evidence-bound answer.

The expected experience is positive-first:

```text
Connected Data
↓
Data Quality / Trust & Mapping Review
↓
What LightBI Found
↓
Analysis Opportunities / Business Perspectives
↓
Investigation
↓
Governed result
↓
Deep BA / next question / dashboard or export
```

Normal users should not be forced to understand canonical IDs, query plans, raw SQL, signal taxonomies, relationship graphs, or developer diagnostics.

At the same time the UI must not hide uncertainty. It should communicate when evidence is missing, when a source must be reselected, when an analysis is unsupported, and when a result is exploratory rather than decision-ready.
### 12.1 UI truthfulness rules

Phase 8C–8F tightened the relationship between canonical state and what the user sees.

The production presentation distinguishes at least these classes of state:

- ready;
- evidence required;
- mapping review required;
- safety blocked;
- unsupported;
- stale / source reselection required;
- executing;
- runtime failed;
- completed.

A metric-specific blocker must not make the whole dataset appear globally unusable. Conversely, a dataset that is generally understandable must not cause a blocked metric to look runnable.

Only a truly ready action may open Investigation as executable. Resolvable states should route the user to the exact evidence/remediation operation. Unsupported states must not offer fake remediation. Runtime failure must remain distinct from semantic blocking.

Primary bookmarks:

- [`../architecture/phase-8c-functional-blocker-remediation-closure.md`](../architecture/phase-8c-functional-blocker-remediation-closure.md)
- [`../architecture/phase-8c-state-classification-audit.json`](../architecture/phase-8c-state-classification-audit.json)
- [`../architecture/phase-8f-functional-presentation-contract.json`](../architecture/phase-8f-functional-presentation-contract.json)
- [`../architecture/phase-8f-error-lifecycle-parity-audit.json`](../architecture/phase-8f-error-lifecycle-parity-audit.json)
## 13. Advanced Mode: technical workspace, not a bypass around governance

Advanced Mode targets BA/DA/power users and technical operators. The long-term product direction is a TablePro-like data workspace combined with LightBI’s understanding layer.

Capabilities described across the docs include:

- local files and database sources;
- SQL/document workspace;
- schema and structure inspection;
- grid interactions and filtering;
- import/export;
- calculated fields and custom KPI work;
- connection/provider diagnostics;
- reviewed writeback/DDL in provider-capable future flows;
- handoff of technical results back into Simple Mode for trust/understanding/BA analysis.

The key architectural rule is that Advanced results do not become business truth simply because a technical user produced them. The canonical handoff preserves source completeness, result scope, lineage, restrictions, and source continuity.

Partial/truncated/unknown-completeness results may be useful technically but must not be advertised as full-source decision support.

Primary bookmarks:

- [`../product/product-direction-and-pricing-v1.md`](../product/product-direction-and-pricing-v1.md)
- [`../architecture/phase-6b-advanced-cutover-and-legacy-retirement.md`](../architecture/phase-6b-advanced-cutover-and-legacy-retirement.md)
- [`../architecture/phase-8c-advanced-partial-flow-audit.json`](../architecture/phase-8c-advanced-partial-flow-audit.json)
- [`../architecture/phase-8d-advanced-boundary-audit.json`](../architecture/phase-8d-advanced-boundary-audit.json)
## 14. Investigation is the governed execution workspace

Investigation is where an analysis opportunity becomes a concrete runtime request.

The handoff into Investigation must retain the exact identities required to detect stale or substituted state. Depending on the flow this includes source identity/fingerprint/generation, canonical artifact identity, overlay identity, relationship identity, action identity, metric identity, query-plan identity, source membership, row counts, and execution scope.

Investigation must validate that the handoff still matches the current source state before execution. It must not rebuild an alternate semantic truth from labels or raw user-facing text.

Important runtime behavior:

- auto-execution is allowed only for a current governed ready action;
- stale/preflight-blocked handoffs must not run DuckDB;
- runtime failure is displayed as runtime failure rather than rewritten as semantic uncertainty;
- a successful result keeps evidence, limitations, restrictions, and lineage;
- Deep BA requires a successful governed result, not merely a visible chart placeholder.

Primary bookmarks:

- [`../architecture/phase-6a-canonical-consumer-cutover.md`](../architecture/phase-6a-canonical-consumer-cutover.md)
- [`../architecture/phase-8c-investigation-functional-flow-audit.json`](../architecture/phase-8c-investigation-functional-flow-audit.json)
- [`../architecture/phase-8d-result-continuity-audit.json`](../architecture/phase-8d-result-continuity-audit.json)
- [`../architecture/phase-8f1-handoff-and-session-audit.json`](../architecture/phase-8f1-handoff-and-session-audit.json)
## 15. Deep BA / Business Brain: evidence-bound analytical narrative

Deep BA is not supposed to be an LLM free-association layer. The documented V1 Business Brain builds structured business reasoning from governed artifacts.

For a selected angle it may contain:

1. the business question / selected angle;
2. the main answer;
3. KPI values and formulas;
4. variance and delta evidence;
5. adaptive root-cause drill-down;
6. business risks;
7. typed recommendations;
8. next questions;
9. missing evidence;
10. explicit evidence audit trail.

The root-cause order is contextual. Logistics may prioritize carrier/status/fee drivers; payment analysis may prioritize payment/store/product; product analysis may prioritize product/category; profitability may drill product/category/store/payment/logistics.

Risk rules documented in V1 include low margin, high AR, deferred-payment exposure, delivery-fee pressure, outsourced-carrier dependency, low fulfilled rate, concentration, reconciliation/revenue gaps, key/relationship risk, and cost/fee spikes.

A recommendation must not overclaim. `do_now` is appropriate only when the evidence and risk state support it; otherwise the system should use `investigate` or `need_more_data`.

Primary bookmark: [`../progress/phase-28-business-brain-orchestrator.md`](../history/progress/phase-28-business-brain-orchestrator.md).
## 16. AI is an optional consumer, not the analytical authority

The project repeatedly draws a hard line around AI responsibility.

AI may consume LightBI-generated structured artifacts such as:

- semantic understanding;
- quality/trust/readiness state;
- approved KPI/result summaries;
- evidence and caveats;
- chart/dashboard state;
- Business Brain structured findings;
- local semantic briefing metadata.

AI must not become the source of truth for:

- raw-data profiling;
- semantic authority;
- KPI formulas or values;
- query execution;
- trust scoring;
- source mutation or cleaning;
- source capabilities;
- unsupported domain claims.

The long-term AI-assisted flow is therefore:

```text
Raw Data → LightBI local understanding → AI reads governed context → AI explains/assists
```

rather than `Raw Data → LLM guesses everything`.
---

# Part V — Semantic Knowledge, Domains, and Business Coverage

## 17. Semantic Registry is the supported runtime vocabulary source

The project previously had semantic knowledge scattered through detectors, contextual dictionaries, older ontologies, playbooks, domain catalogs, and Home guidance.

Phase 30 created a central runtime registry so supported signals do not drift silently between engines.

The registry owns or bridges:

- canonical signal IDs;
- labels and primary domains;
- semantic roles/families;
- support status;
- header aliases;
- value aliases/patterns;
- compatible physical types;
- contextual dictionary projections;
- detector taxonomy projections.

`business-signal-detector.ts`, `context-semantic-dictionary.ts`, `understanding-core/ontology.ts`, and `understanding-next/signal-detector.ts` were progressively converted into registry-backed consumers/adapters.

A new signal may be recognized as partial/research-level without immediately receiving a BA playbook, governed metric, or executable action.

Primary bookmark: [`../progress/phase-30-semantic-registry-unification.md`](../history/progress/phase-30-semantic-registry-unification.md).
## 18. Domain Knowledge Catalog separates business knowledge from execution code

The domain catalog is intentionally documentation-first knowledge. The documented knowledge flow is:

```text
Domain
→ Concepts
→ Signals
→ Intent Families
→ Question Templates
→ Business Views
```

The six established runtime BA domains in the documented V1 line are:

- operations;
- revenue;
- inventory;
- customer;
- performance;
- finance.

Catalog documents record concepts, questions, and business views without making the UI component itself the owner of business knowledge.

Primary bookmarks:

- [`../domain-catalog/README.md`](../domain-catalog/README.md)
- [`../domain-catalog/operations.md`](../domain-catalog/operations.md)
- [`../domain-catalog/revenue.md`](../domain-catalog/revenue.md)
- [`../domain-catalog/inventory.md`](../domain-catalog/inventory.md)
- [`../domain-catalog/customer.md`](../domain-catalog/customer.md)
- [`../domain-catalog/performance.md`](../domain-catalog/performance.md)
- [`../domain-catalog/finance.md`](../domain-catalog/finance.md)
- [`../domain-catalog/future-domain-pack-template.md`](../domain-catalog/future-domain-pack-template.md)
### 18.1 Recognition coverage must never be marketed as full domain support

By July the semantic registry had expanded beyond clean ERP examples into many external/manual data families: CRM, SAP/Dynamics/NetSuite-like exports, POS, bank reconciliation, ads/web analytics, procurement, HR, maintenance/IoT, access logs, SaaS/subscriptions, contracts, property, construction, agriculture, utility, compliance, nonprofit, QC, survey/education/healthcare-like operational exports, and others.

This expansion improves **recognition** and domain affinity. It does **not** automatically mean that LightBI has complete governed business metrics and executable BA workflows for every recognized industry.

An AI or marketing surface must therefore distinguish:

```text
signal recognized
≠ domain affinity detected
≠ business playbook available
≠ governed metric available
≠ executable analysis available
≠ decision-use authorized
```

This is a critical future website/distribution rule. Product claims should be backed by the capability layer actually exposed to the user, not by raw semantic-registry breadth.

Source bookmark:

- [`../history/project-memory/memory.md`](../history/project-memory/memory.md), section “2026-07-10 Semantic Dictionary Expansion + Domain Affinity Safepoint”.
- [`../progress/phase-30-semantic-registry-unification.md`](../history/progress/phase-30-semantic-registry-unification.md).
---

# Part VI — Planning, Runtime, Storage, and Connectors

## 19. Recipe / Planner / Runtime separation is a long-lived architectural principle

The early architecture defines Recipes as backend-agnostic descriptions of **what** analysis is requested. Recipes must not contain arbitrary executable SQL.

The Planner translates declarative intent into a deterministic execution plan and chooses a strategy based on source capabilities. The Planner does not manipulate data itself.

The Runtime is the mechanical execution boundary. It consumes validated plans and delegates to an execution backend such as DuckDB or a capable remote source.

The intended abstraction allows strategies such as:

- local DuckDB execution;
- pushdown aggregation/filtering to SQL sources;
- cached/materialized execution;
- incremental execution;
- bounded sampling/preview.

A source capability contract, not a hardcoded provider name in UI, should determine what strategies are legal.

Primary bookmarks:

- [`../architecture/recipe-model.md`](../architecture/recipe-model.md)
- [`../architecture/recipe-planner-model.md`](../architecture/recipe-planner-model.md)
- [`../architecture/planner-model.md`](../architecture/planner-model.md)
- [`../architecture/runtime-model.md`](../architecture/runtime-model.md)
- [`../architecture/source-capability-model.md`](../architecture/source-capability-model.md)
## 20. Local-first is a product rule, not only a deployment choice

The architecture adopted a dual-storage model:

- **SQLite** for durable project metadata, settings, definitions, history-like metadata and local workspace state;
- **DuckDB** for analytical execution, temporary datasets, local OLAP work and caches.

The project file/workspace concept is intended to remain portable and user-owned. Hosted LightBI infrastructure must not become a mandatory dependency for basic local analysis.

Cloud capabilities may exist for backup, sync, account/licensing, team workflows, release discovery, telemetry, or future collaboration, but basic understanding is designed to remain local-first.

The product rule also shapes privacy:

- original local data should remain under user control;
- cleaning/mapping should be non-destructive overlays;
- telemetry must not silently become a data-upload channel;
- AI should not require raw-data upload merely to understand basic structure when local understanding is available.

Primary bookmarks:

- [`../architecture/storage-model.md`](../architecture/storage-model.md)
- [`../changelog/2026-06-01-phase11-persistence.md`](../history/changelog/2026-06-01-phase11-persistence.md)
- [`../changelog/2026-06-01-phase12-project-runtime.md`](../history/changelog/2026-06-01-phase12-project-runtime.md)
- [`../product/product-direction-and-pricing-v1.md`](../product/product-direction-and-pricing-v1.md)
## 21. Provider/plugin expansion must not bloat core or fake support

`@lightbi/plugin-sdk` defines the provider contract for source-specific behavior. In the documented state it is a trusted first-party/built-in contract layer, **not yet an arbitrary third-party marketplace loader**.

A provider must not appear as supported merely because a logo or manifest exists. The documented exposure gate requires, at minimum:

1. connection capability;
2. a stable connection handle;
3. schema discovery;
4. bounded read-only query execution;
5. typed columns and row buffers;
6. normalized diagnostics;
7. credential secrecy.

Provider plugins own connection fields, dialect, provider-specific metadata, bounded execution, optional import/export, writeback/DDL preview and diagnostics. LightBI core owns understanding, trust, BA logic, charts, dashboards and common safety policy.

SQL Server is documented as the first intended real provider-plugin track; the historical starter manifest is not itself proof of a working user-facing connector.

Primary bookmarks:

- [`../../packages/plugin-sdk/README.md`](../../packages/plugin-sdk/README.md)
- [`../plugin-sdk/provider-plugin-manual.md`](../plugin-sdk/provider-plugin-manual.md)
- Search source catalog for `ADR-116-plugin-first-system-expansion.md`.
---

# Part VII — Visualization, Dashboard, Export, and Handoff

## 22. Visualization consumes governed data contracts; it does not invent analytical truth

The architecture separates raw execution results from visualization objects.

Historical conceptual chain:

```text
ResultSet
→ RuntimeDataset
→ DataView
→ ChartDefinition
→ UI-safe ChartPayload
→ renderer
```

A `DataView` assigns roles and shape; visualization contracts restrict compatible chart types. Chart definitions are declarative and do not execute queries themselves. Rendering contracts isolate frontend components from internal backend domain objects.

The later Phase 8 production path preserves the same principle even where implementation details evolved: charts consume governed result identity/scope and must not recompute or reinterpret totals independently.

Primary bookmarks:

- [`../architecture/runtime-dataset-model.md`](../architecture/runtime-dataset-model.md)
- [`../architecture/visualization-contract.md`](../architecture/visualization-contract.md)
- [`../architecture/visualization-engine.md`](../architecture/visualization-engine.md)
- [`../architecture/render-contract.md`](../architecture/render-contract.md)
- [`../progress/phase-25-chart-runtime.md`](../history/progress/phase-25-chart-runtime.md)
## 23. Dashboards are downstream analytical workspaces

Dashboards were originally modeled as perspective-aware containers of existing analytical assets rather than query engines. They should compose charts, insights, exports, and actions while preserving the governance of the underlying assets.

The current product direction treats dashboards as useful output/workspace capability, but not the first mandatory step in the user journey.

A normal LightBI flow may reach a useful answer without ever constructing a dashboard. This is intentional and differentiates the product from dashboard-first BI systems.

Primary bookmarks:

- [`../architecture/workspace-model.md`](../architecture/workspace-model.md)
- [`../progress/phase-26-dashboard-workspace.md`](../history/progress/phase-26-dashboard-workspace.md)

## 24. Export is a governed artifact boundary

The early export architecture defines an `ExportService` and `ExportArtifact` lineage model so file generation remains traceable rather than being ad-hoc browser downloads.

Documented export forms include CSV, Excel, PDF, PNG and project bundles at different stages of the project. Advanced flows also expose bounded result-scope export where complete-source decision support is not available.

The important invariant is that export must preserve the truth about its scope and source lineage. A truncated/preview result must not be exported or labeled as though it represented the complete governed source.

Primary bookmarks:

- [`../progress/phase-24-export-foundation.md`](../history/progress/phase-24-export-foundation.md)
- [`../architecture/phase-8d-export-handoff-audit.json`](../architecture/phase-8d-export-handoff-audit.json)
## 25. Historical visual baseline

The repository contains a locked UI baseline inspired by Frappe Insights: calm, dense, analytical, neutral gray/zinc chrome, compact typography, subtle borders, limited shadows, and no marketing-style gradients or excessive color in application chrome.

Historical rules include:

- accent colors primarily belong to data visualization/status rather than navigation chrome;
- tables are first-class analytical surfaces;
- dashboards prioritize information density;
- primary actions use neutral dark styling;
- developer errors must be caught by neutral route boundaries;
- Question-First copy in the historical baseline is superseded where later Home architecture changed, while visual-density principles may remain useful.

This document is a **visual baseline**, not a current functional architecture owner. Later visual redesign work must preserve current functional/canonical truth even if the appearance changes substantially.

Primary bookmark:

- [`../design/ui-baseline.md`](../design/ui-baseline.md)
- [`../architecture/phase-8e-final-checkpoint-closure.md`](../architecture/phase-8e-final-checkpoint-closure.md) — marks the codebase ready for later visual UI design without changing canonical behavior.
---

# Part VIII — Verification Evidence and Current Docs-Derived Baseline

## 26. Release-quality evaluation evolved from synthetic proof to governed corpus proof

The Phase 5–7 sequence progressively replaced assumptions with measured gates:

- high-confidence mapping precision;
- held-out core-signal recall;
- domain-activation precision;
- runnable-action precision;
- advertised-action execution success;
- verified metric-family coverage;
- false executable actions;
- false decision-support cases;
- explanation completeness;
- production legacy-executor reachability;
- clean-checkout reproducibility;
- TypeScript/build integrity.

A recurring governance pattern is that evaluation-only/holdout/adversarial data must not be used to tune production behavior silently. Corpus provenance and independent oracle results are recorded separately from engine output.

By Phase 7R4.1 the repository-safe release corpus was moved to tracked, sanitization-governed inputs so a clean checkout could reproduce release evaluation without depending on ignored operational files.

Primary bookmarks:

- [`../architecture/phase-7-mvp-proof-and-release-gate.md`](../architecture/phase-7-mvp-proof-and-release-gate.md)
- [`../architecture/phase-7r41-repository-safe-corpus-release-closure.md`](../architecture/phase-7r41-repository-safe-corpus-release-closure.md)
- [`../architecture/phase-7r41-corpus-140-acceptance-measurements.json`](../architecture/phase-7r41-corpus-140-acceptance-measurements.json)
- [`../architecture/phase-7r41-clean-checkout-reproduction-audit.json`](../architecture/phase-7r41-clean-checkout-reproduction-audit.json)
## 27. Latest documented Phase 8F.2 production-flow evidence

The latest closure line in the documentation corpus is Phase 8F.2. Its final authentic six-file operational audit records a real production-origin journey using the six ERP files from the governed corpus.

Verified source projection:

- two Sales sources;
- two Accounting sources;
- two Logistics sources;
- zero sources selected by default;
- business perspectives/bundles proposed from current evidence rather than filename-only authority.

Verified May Profitability journey:

1. select Sales + Accounting;
2. explicitly confirm source roles;
3. explicitly confirm shared `OrderID` document identity;
4. explicitly confirm May reporting period;
5. explicitly confirm VND;
6. materialize both complete 1,500-row sources;
7. confirm the governed relationship;
8. execute Gross Profit at `full_file_multisource` scope;
9. render the chart;
10. open Deep BA with governed scope, lineage, limitations and decision-use restrictions.

Exact governed Gross Profit result: **3,075,721,244 VND**.

Primary bookmark: [`../architecture/phase-8f2-six-file-operational-journey-audit.json`](../architecture/phase-8f2-six-file-operational-journey-audit.json).
### 27.1 Important exact-result regression anchors

The later Phase 8 documents repeatedly preserve a small set of exact governed results as regression anchors:

| Family / path | Exact result | Notes |
|---|---:|---|
| Revenue | `22,973,896,244` | Full-source source-local governed result. |
| Delivery count | `1,500` | Full-source source-local governed result. |
| Inventory on hand | `211,067` | Requires snapshot role, item/warehouse identity, UOM and as-of evidence. |
| Gross Profit | `3,075,721,244 VND` | Governed Sales + Accounting multi-source journey. |

These numbers are not generic constants to hardcode into production. They are frozen regression/oracle outcomes for the governed fixtures/scenario.

A future AI must not copy these values into user results merely because the input resembles the corpus. Production execution must derive values from the current source.

Relevant bookmarks:

- [`../architecture/phase-8f-core-ui-functional-parity-closure.md`](../architecture/phase-8f-core-ui-functional-parity-closure.md)
- [`../architecture/phase-8f1-ready-action-runtime-closure.md`](../architecture/phase-8f1-ready-action-runtime-closure.md)
- [`../architecture/phase-8f2-multifile-operational-parity-closure.md`](../architecture/phase-8f2-multifile-operational-parity-closure.md)
- [`../architecture/phase-8b-inventory-production-interaction-audit.json`](../architecture/phase-8b-inventory-production-interaction-audit.json)
- [`../architecture/phase-8d1-gross-profit-production-journey-audit.json`](../architecture/phase-8d1-gross-profit-production-journey-audit.json)
## 28. Governed failures are tracked by identity, not hidden by aggregate greenwashing

A recurring full-suite pattern in the later architecture audits is a frozen baseline allowlist of known failures. The repository explicitly rejects using total failure count alone as the release gate.

Instead, the audits distinguish:

- known deterministic baseline failures;
- permitted timing-sensitive baseline failures;
- unexpected failures;
- failures owned by the current phase.

The frozen allowlist SHA-256 repeatedly referenced in Phase 8 is:

`baa86950582b7d758396abb0c69fdaffcd3c2cbbb22b71dd3bbdb3c0aed1c4f5`

Later Phase 8 suites commonly report six deterministic baseline failures plus three timing-sensitive baseline cases, while requiring **zero unexpected** and **zero phase-owned** failures.

This does not mean “nine failures are always okay.” It means only the exact governed identities/signatures are accepted until the debt is deliberately resolved.

Primary bookmarks:

- [`../architecture/phase-5b6b-regression-baseline-allowlist.v1.json`](../architecture/phase-5b6b-regression-baseline-allowlist.v1.json)
- [`../architecture/phase-8e-regression-conformance.json`](../architecture/phase-8e-regression-conformance.json)
- [`../architecture/phase-8f1-regression-conformance.json`](../architecture/phase-8f1-regression-conformance.json)
## 29. Beta release checklist is a dated release snapshot, not a live universal status page

`BETA_RELEASE_CHECKLIST.md` records a 2026-07-30 release gate snapshot.

At that checkpoint the docs report:

- 188 desktop test files / 1,272 tests passed;
- Rust/native workspace unit and documentation tests passed after dependency fixes;
- production web QA build passed;
- representative single-file Easy Mode E2E flows passed;
- governance catalog at that time contained 9 metrics, 31 question families and 6 runtime operators;
- a Windows x64 NSIS installer had been produced and statically inspected;
- that installer was **not** a final Beta candidate because it still installed a separate `lightbi-server.exe` sidecar;
- final embedded-core native launch and installed-app E2E were still listed as pending in that document;
- signing was still a distribution gate.

Because the current worktree contains substantial development after this checklist, these statements must be treated as a **dated evidence record** until the later code/Git/CI audit reconstructs current packaging truth.

Primary bookmark:

- [`../release/BETA_RELEASE_CHECKLIST.md`](../release/BETA_RELEASE_CHECKLIST.md)

Do not use this checklist alone to claim the current installer architecture or release status.
## 30. Pricing and commercial packaging are not yet a single current canonical contract in this repo

The main pricing document in this repository is dated **2026-06-28** and marked Draft v1.0.

It proposes, historically:

- Basic/Open Source;
- Pro/Lifetime at roughly `49–59 USD lifetime`;
- Ultra/Team at roughly `149 USD/year/5 users`;
- specific feature splits such as database connectors and Advanced Mode living in Pro.

Those boundaries must **not** be assumed current simply because they are the only detailed pricing Markdown in this repo. Later product decisions may exist outside this historical draft, especially in the separate control-plane/distribution work.

Therefore:

- treat the document as product-history evidence;
- do not hardcode current website pricing from it without a fresh commercial decision/source;
- do not infer current Basic/Pro capability gates solely from this document;
- later distribution/control-plane audit must reconcile commercial entitlement with actual app capability.

Primary bookmark:

- [`../product/product-direction-and-pricing-v1.md`](../product/product-direction-and-pricing-v1.md)

This issue is intentionally marked **OPEN — requires cross-repo reconciliation**.
## 31. Distribution, account, licensing, payment and telemetry need a separate source-of-truth audit

The LightBI working tree currently contains an untracked `apps/distribution/` tree and recent account/update/telemetry-related application files, but the main historical documentation corpus does not contain a clean, canonical `docs/distribution/` section describing their current production contract.

Separately, the project has a dedicated control-plane repository for distribution/accounts/licensing/payment/analytics work. That repository must be audited directly before this book can claim the current commercial/control-plane architecture.

Until that audit is completed, this book treats these areas as **known active work, documentation incomplete in this repository**:

- account/auth flows;
- license/entitlement flows;
- distribution pairing;
- release discovery/update;
- privacy-safe app-use telemetry;
- payment fulfillment;
- transactional mail;
- admin/control-plane operations.

This boundary matters because application-local product truth and remote commercial entitlement are different concerns. A control-plane outage must not silently turn local Basic analysis unusable.

Planned later source audit:

- `n8n2erpnext/lightbi-control-plane` current source and docs;
- LightBI current `apps/distribution/` working tree;
- current release/update contracts in app code;
- Git history and CI/CD for release publication.
---

# Part IX — Safety, Privacy, and Governance

## 32. Fail closed is the default response to missing business evidence

Across semantic resolution, grain, relationships, metrics, source continuity and runtime preflight, LightBI repeatedly chooses a blocked/conditional/explanation-only result over a plausible but unsupported number.

Examples of required fail-closed behavior include:

- ambiguous semantic mapping;
- missing required document identity;
- unresolved grain;
- missing currency for a currency-sensitive metric;
- missing UOM/as-of evidence for inventory snapshot interpretation;
- stale source/overlay/relationship identity;
- incomplete runtime source;
- unsupported source combinations;
- partial/truncated Advanced results being used as full-source truth;
- many-to-many or relationship-risk cases without governed permission;
- runtime result identity that cannot be correlated safely.

The product value is not that every upload produces a chart. The value is that unsupported certainty is not silently manufactured.

The negative-probe suites are therefore first-class product evidence, not test noise.
## 33. Original source immutability is a repeated safety rule

Trust & Mapping Review, semantic overlays, source evidence declarations, and governed analysis are designed to sit **above** the original source.

The system may:

- normalize presentation;
- infer canonical concepts;
- create reversible mappings;
- build runtime views;
- create clean/export artifacts;
- store review choices in project/session metadata.

The system must not silently rewrite the user’s original CSV, workbook, or database just to make the analysis convenient.

This rule is particularly important for future Advanced writeback. Provider writeback/DDL is documented as an explicit preview-then-commit flow with safe-mode policy, not an extension of semantic cleaning.

Primary bookmarks:

- [`../plugin-sdk/provider-plugin-manual.md`](../plugin-sdk/provider-plugin-manual.md)
- [`../architecture/phase-8b-source-binding-invalidation-audit.json`](../architecture/phase-8b-source-binding-invalidation-audit.json)
- [`../history/project-memory/memory.md`](../history/project-memory/memory.md), Trust & Mapping Review and product-boundary sections.
---

# Part X — Superseded Models and Historical Traps

## 34. Historical documents that are useful but must not be read as current architecture

### 34.1 “Rust owns all business logic” as an absolute statement

Early architecture documents frame Rust as the exclusive owner of business logic. Later implementation placed substantial canonical understanding and policy logic in the desktop TypeScript `understanding-core` stack while Rust/backend/runtime boundaries continued evolving.

Therefore the old statement is architectural intent/history, not sufficient evidence of current code ownership. The codebase audit must reconstruct the actual ownership graph.

### 34.2 Question First as the mandatory entry point

Question First remains useful history and may still inform intent features, but the project explicitly moved to Dataset Understanding and analysis opportunities as the primary path.

### 34.3 Business View as a prerequisite for value

The BVQ pipeline was demoted after sparse data caused dead ends. Business Views/perspectives are now optional/derived layers rather than proof that the dataset has value.

### 34.4 Frontend-only relationship discovery as the current multi-source limit

Milestone 5 documents correctly describe that phase, but Phase 8D.1 later added governed production multi-source execution for bounded supported cases.

### 34.5 `memory.md` “backend not proven” statements

Those statements were true at their checkpoint but later Phase 7/8 audits contain stronger runtime evidence. Use `memory.md` for chronology, not current release truth.
## 35. Proposed document taxonomy for the later cleanup phase

No files have been moved yet. This taxonomy is the target model to review before reorganization.

| Type | Purpose | Example |
|---|---|---|
| `canonical/` | Current normative contracts and architecture ownership. | current understanding/runtime/presentation contracts |
| `decisions/` | ADRs and explicit architecture/product decisions. | ADR-117, ADR-119, ADR-120 |
| `closures/` | Final phase closure summaries. | Phase 8A–8F.2 closure docs |
| `audits/` | Human-readable audit narratives. | readiness/reachability/defect audits |
| `evidence/` | Generated machine-readable JSON, oracle results, manifests. | corpus audits, negative probes, regression conformance |
| `product/` | Product identity, editions, pricing decisions. | product direction/pricing |
| `release/` | Packaging, signing, release gates and checklists. | Beta release checklist |
| `domains/` | Domain knowledge catalog and playbooks. | finance, inventory, operations |
| `design/` | Visual/UX rules and later design system. | UI baseline |
| `plugins/` | Provider/plugin contracts and manuals. | plugin SDK manual |
| `history/progress/` | Milestone and phase implementation history. | milestone-1..8, phase 13..30 |
| `history/changelog/` | Dated implementation logs. | 2026-06-01 changelogs |
| `history/handoffs/` | Agent handoffs, verification packets, checkpoints. | AGENT_HANDOFF_* |
| `research/` | External/reference research not owning product truth. | `references/` materials |
| `project-book/` | AI/human entry point and provenance index. | this directory |

The cleanup phase must classify before moving, preserve Git history where practical, and update bookmarks atomically.
---

# Part XI — Known Open Questions Before Coding

## 36. Documentation alone is not enough to claim full project understanding

This book intentionally stops short of calling the project fully understood. The user-defined next audit sequence is part of the project methodology.

The remaining knowledge gaps are:

### 36.1 Codebase ownership map

Need to read the current codebase and map:

- packages/crates/apps and their dependency directions;
- canonical state owners;
- source-intake flow;
- semantic registry/detector call paths;
- M1/M2/M3 implementation boundaries;
- Home/Advanced/Investigation handoffs;
- DuckDB/browser/backend/native execution paths;
- persistence/session contracts;
- export/dashboard/Deep BA flows;
- account/distribution/update/telemetry integrations;
- Tauri/native packaging boundaries.

Deliverable: a code map linking feature → entry point → owner → dependencies → tests → docs.
### 36.2 Git history reconciliation

After the code map, audit Git commits to answer:

- which architecture docs correspond to which actual commits;
- which closures were committed, local-only, later superseded, or never pushed;
- when ownership moved between legacy and canonical paths;
- which current working-tree changes are post-HEAD;
- what recent recovery/beta branches changed;
- whether docs claim a state that was later reverted or rewritten.

Deliverable: code-map nodes annotated with introducing/change commits and a chronological architecture history based on Git, not filename dates alone.

**Edition 0.4 status: COMPLETE.** See [`LIGHTBI_GIT_HISTORY_MAP.md`](./LIGHTBI_GIT_HISTORY_MAP.md). The audit proves that public `main` is an intentional re-rooted/sanitized snapshot lineage, while `storage` and backup/codex refs preserve the full internal development history. It also corrects branch-relative Code Map labels for public-main account, updater, Advanced SQL, release, and distribution history.

### 36.3 GitHub Actions / CI/CD audit

Read every workflow and relevant action log/config to determine:

- what runs on push/PR/tag/manual dispatch;
- frontend/backend/native test matrices;
- corpus/evaluator gates;
- Windows/Linux/macOS packaging;
- signing/notarization status;
- artifact retention/publication;
- release manifest creation;
- GitHub Release behavior;
- Cloudflare R2 or other distribution steps;
- secrets/environment assumptions;
- what failures are blocking versus allowed debt.

Deliverable: CI/CD map from source event → jobs → artifacts → release/distribution destination.
### 36.4 Distribution/control-plane reconciliation

The later audit must connect the local app to the separate control-plane and answer:

- exact account/session architecture;
- Beta and future entitlement model;
- license activation/pairing semantics;
- offline/local behavior when control-plane is unavailable;
- payment fulfillment and webhook authority;
- release discovery/update contract;
- telemetry opt-in and privacy boundary;
- admin analytics and account/license management;
- transactional email flows;
- which secrets/keys must never live in public app source.

Only after this cross-repo audit can the Project Book state the current commercial architecture as canonical.

### 36.5 Commercial packaging reconciliation

Need an explicit current decision for Basic/Pro/Team feature boundaries and pricing. The June draft and later product direction must be reconciled with actual entitlement code and the current business philosophy before any public pricing table is treated as authoritative.
---

# Part XII — Bookmark Route Guide

## 37. If you need to verify a claim, start here

| Question | First source to open | Then inspect |
|---|---|---|
| What is the product? | [`ADR-117`](../adr/ADR-117-business-understanding-engine-product-boundary.md) | [`product-direction-and-pricing-v1.md`](../product/product-direction-and-pricing-v1.md), [`MVP_sol.md`](../MVP_sol.md) |
| Why Understanding First? | `ADR-097` via source catalog | `dataset-understanding-layer.md`, BVQ reset docs, milestone 8.5 |
| What is the latest canonical UI/runtime flow? | [`phase-8f-core-ui-functional-parity-closure.md`](../architecture/phase-8f-core-ui-functional-parity-closure.md) | Phase 8F/8F1/8F2 JSON audits |
| How is full-source continuity enforced? | [`phase-8f1-ready-action-runtime-closure.md`](../architecture/phase-8f1-ready-action-runtime-closure.md) | `phase-8f1-*source*` audits |
| How are user mappings/evidence stored? | [`phase-8b-production-evidence-interaction-closure.md`](../architecture/phase-8b-production-evidence-interaction-closure.md) | Phase 8B overlay/evidence JSON |
| How does multi-source work? | [`phase-8d1-production-multisource-closure.md`](../architecture/phase-8d1-production-multisource-closure.md) | Phase 8D.1 contract/runtime/relationship audits |
| What proves the six-file flow? | [`phase-8f2-six-file-operational-journey-audit.json`](../architecture/phase-8f2-six-file-operational-journey-audit.json) | Phase 8F.2 closure/regression audits |
| What owns semantic signals? | [`phase-30-semantic-registry-unification.md`](../history/progress/phase-30-semantic-registry-unification.md) | Phase 29 dictionary docs, registry tests in code later |
| How does Business Brain work? | [`phase-28-business-brain-orchestrator.md`](../history/progress/phase-28-business-brain-orchestrator.md) | Business Brain tests/code later |
| What is domain knowledge? | [`domain-catalog/README.md`](../domain-catalog/README.md) | six domain catalog files |
| What is provider/plugin policy? | [`provider-plugin-manual.md`](../plugin-sdk/provider-plugin-manual.md) | `packages/plugin-sdk/README.md` and later code map |
| What is the historical visual baseline? | [`ui-baseline.md`](../design/ui-baseline.md) | Phase 8E/8F functional parity before redesign |
| What is current Beta release proof? | [`BETA_RELEASE_CHECKLIST.md`](../release/BETA_RELEASE_CHECKLIST.md) | later Git/Actions audit because checklist is dated |
| What is pricing? | [`product-direction-and-pricing-v1.md`](../product/product-direction-and-pricing-v1.md) | **Do not treat as current without commercial reconciliation** |
## 38. Phase history map

Use this as the fast route through the architecture evolution:

| Era | Main concern | Key source family |
|---|---|---|
| June foundation | Dataset/project/storage/runtime contracts | `docs/changelog/2026-06-01-*`, `docs/progress/phase-13..27-*` |
| Milestones 1–4 | First visible analytics, Question First, real file intake, guided Home | `docs/progress/milestone-1..4-*` |
| Milestone 5 | Relationship discovery and Business View planning | `milestone-5-*`, relationship architecture |
| Milestones 6–8 | Runtime preview, SQL compilation, trust/confidence | `milestone-6..8-*` |
| BVQ/DU reset | Understanding First, Analysis Opportunities, Investigation | `milestone-8-5-*`, ADR-097 onward, historical memory |
| Phase 28 | Business Brain Orchestrator | `phase-28-*`, ADR-119 |
| Phase 29 | Context-aware semantic dictionary | `phase-29-*`, ADR-120 |
| Phase 30 | Semantic registry unification | `phase-30-*` |
| Phase 0–4 canonical research | semantic candidates, grain, relationships, readiness | `docs/architecture/phase-0-*` through `phase-4c2-*` |
| Phase 5 | authority migration, aggregation safety, governed metrics/actions/runtime | `phase-5a-*`, `phase-5b*`, `phase-5m*` |
| Phase 6 | canonical consumer cutover | `phase-6a-*`, `phase-6b*` |
| Phase 7 | MVP proof, corpus quality, release gates | `phase-7-*`, `phase-7r1..r41-*` |
| Phase 8A–8B | full-source boundary and evidence interaction | `phase-8a-*`, `phase-8b-*` |
| Phase 8C–8D | functional blocker UX and feature reachability | `phase-8c-*`, `phase-8d-*` |
| Phase 8D.1 | production canonical multi-source | `phase-8d1-*` |
| Phase 8E | code separation without behavior change | `phase-8e-*` |
| Phase 8F–8F.2 | core/UI parity, source continuity, authentic six-file flow | `phase-8f*` |
---

# Part XIII — AI Handoff Contract

## 39. Before an AI proposes code changes

An AI agent should be able to answer all of the following before touching a governed path:

- Which source/contract currently owns this behavior?
- Is the behavior semantic recognition, readiness, metric policy, action policy, runtime permission, presentation, or execution?
- What source identity and evidence must remain bound?
- What stale-state invalidation rules apply?
- Does the feature operate on sample/preview rows or the full source?
- What grain assumptions are required?
- What relationships/cardinality are required?
- What decision-use restrictions survive execution?
- Is a user-visible suggestion authoritative or only a candidate?
- Is the path source-local or multi-source?
- Which negative probes must remain fail-closed?
- Which exact regression/oracle results must remain unchanged?
- Which tests own the boundary?
- Is the document being used current, historical, or draft?

If these questions cannot be answered, the correct next action is **audit**, not implementation.
## 40. Snapshot provenance

This edition was created from the repository working tree on **2026-08-29** after a full documentation review.

At capture time:

- repository: `/home/ubuntu/n8n2erpnext/LightBI`;
- branch: `codex/beta-recovery-20260801`;
- HEAD: `0142e92c75e9fd3e190f82fe2a67cf255180cfca`;
- worktree: dirty, with many tracked modifications and untracked Beta/distribution/update/account artifacts;
- no existing source files were moved, renamed, staged, committed, reverted, or deleted as part of this book creation.

The documentation review included the previously inventoried historical Markdown corpus and all 354 JSON documents under `docs/`, which parsed successfully with zero JSON parse failures. A broader source catalog is generated separately for project Markdown/JSON outside build/dependency directories.

## 41. Planned edition upgrades

This book becomes progressively more authoritative through the following editions:

- **0.1 Docs Baseline** — completed.
- **0.2 Documentation Reorganization** — completed.
- **0.3 Codebase Map** — completed.
- **0.4 Git History Reconciliation** — completed.
- **0.5 CI/CD Map** — completed.
- **0.6 Control-Plane Reconciliation** — completed.
- **1.0 Project Truth Baseline** — completed on 2026-08-30.

Edition 1.0 is now sufficient for repository-wide onboarding. Future AI work should perform scoped feature archaeology rather than repeat the entire historical audit.
---

# Part XIV — Road to 1.0: Distribution, Licensing, Trust, and Release Direction

## 42. Source authority for this part

This part incorporates the externally supplied session handoff `LightBI_Session_Handoff_Phase2_2026-08-29.md`.

Provenance at intake:

- supplied on: `2026-08-29`;
- line count: `2,089`;
- byte size: `42,546`;
- SHA-256: `f20e05a6097882907047f950680ec67d66f004170676be608b50b33c674ecdd7`;
- source class: **approved session/design handoff**;
- authority level: stronger than casual conversation memory, but **not yet equivalent to code/Git/CI truth**.

The rules below therefore describe the intended road-to-1.0 architecture unless later code/Git/CI reconciliation proves divergence.
## 43. Strategic priority to 1.0

LightBI is the near-term product and monetization engine for the broader ecosystem, but 1.0 work must resist ecosystem scope creep.

Near-term priority chain:

```text
install
→ usable
→ trustworthy
→ repeated use
→ willingness to pay
→ painless updates
```

The canonical workflow remains continuous rather than tool-fragmented:

```text
receive → clean → merge → understand → analyze → explain
→ drill → refine → reanalyze → deliverable → export
```

The strongest invariant is: **original data remains evidence; transformation is metadata; result is projection; many consumers must share one truth boundary.**
## 44. Public/private repository boundary and workflow discipline

The handoff identifies the canonical public repository as `n8n2erpnext/lightbi` and records a Phase 0–1 split in which production control-plane code was removed from the public tree while public Basic release/account/updater contracts remained.

The intended operating discipline is:

```text
Sol / architecture audit
→ feature branch
→ Codex implementation / test / commit / push
→ GitHub Actions verification
→ independent review
→ PR merge
```

`main` must not be edited directly.

An important security premise is permanent: historical public source is already disclosed. Security must never depend on old public code becoming secret again.

Git-history reconciliation verifies `c06ef003242e06884e65d992627b5706ad13dfab` as the Phase 0–1 merge/base used by the Phase 2A branch, and verifies `d17abe0f7c5bc97521347526fb5fcec759857b2e` as the current PR #4 head at audit. The PR remains open/draft and is not current `main`.
## 45. Licensing authority model

Every installation starts as **Basic**. Basic local-first functionality must remain usable even when online trust, account, entitlement, or control-plane validation is unavailable.

Pro authority is deliberately conjunctive:

```text
WHO ARE YOU?        → authenticated account identity
WHAT ARE YOU RUNNING? → trusted official installation
WHAT MAY YOU USE?   → valid entitlement
```

Therefore Pro requires:

```text
authenticated account
+ trusted installation
+ valid entitlement
```

There is no standalone reusable Pro key, no localStorage Pro authority, and no permanent “enter license key to unlock Pro” model.

Installation ID is an identifier only; it is never an authentication secret or sufficient continuity proof.
## 46. Account, organization, and Business entitlement model

Entitlement belongs to an opaque immutable account ID or organization ID. Email may resolve/login identity but must not be the immutable authority identifier.

Business licensing uses **named-user seats**, not installation counts. The v1 seat limits recorded in the handoff are:

```text
5 / 10 / 20 / 25 / 30
```

Organization entitlement carries tier, seat limit, capabilities, validity, entitlement version and source. Membership remains separate mutable control-plane state with roles such as owner/admin/member and invited/active/revoked seat state.

Do not embed the membership list into the signed organization entitlement.

If a Business purchase exposes a “key”, that value is a **one-time organization claim token**, not a permanent shared license key. The server stores a hash/expiry/consumed timestamp rather than retaining plaintext after issuance.
## 47. Public Basic / private Pro capability delivery

Post-1.0 product separation is intended to be explicit:

- public GitHub contains LightBI Basic source;
- official Basic installer contains Basic only;
- proprietary Pro implementation/source remains private;
- no hidden proprietary Pro implementation is bundled inside the public Basic installer.

Preferred delivery flow:

```text
official Basic build
→ optional analytics + attestation + Basic update path
→ login
→ installation trust + verified account + entitlement
   ├─ Basic → remain Basic
   └─ Pro   → short-lived Pro delivery grant
              → private R2
              → signed/encrypted Pro capability package
              → signature/SHA/compatibility verification
              → device-bound decrypt/load
              → Pro Runtime
```

Preferred terminology is **LightBI Pro Capability Package** or **LightBI Pro Runtime**. Reserve “core” for the public Basic core.
## 48. Pro package protection and offline behavior

Private R2 objects must not be permanent public URLs. Delivery should use short-lived grants/presigned URLs only after attestation, authentication and entitlement checks.

Basic update and Pro delivery may reuse downloader primitives but must keep separate trust namespaces and endpoint/bucket or prefix policies.

The preferred future package model encrypts the Pro package once with a random content key, then wraps that key to the installation/device public key. Copying ciphertext and the wrapped key to another device should fail.

This is practical anti-abuse, not a claim of mathematically unbreakable desktop DRM.

Offline Pro policy is not frozen. A previously discussed model is a short-lived signed lease/grace window (for example about seven days), refreshed by periodic re-attestation. Network/clock/transient failures must not immediately punish legitimate users. Expired or revoked Pro authority should downgrade to Basic without destroying Basic local-first capability.
## 49. Installation trust and attestation

First launch should create an installation/device keypair. The private key remains in OS secure storage; the handoff names Windows CNG/NCrypt as the initial Windows boundary, with stronger hardware-backed mechanisms potentially later.

After official-release validation, a private authority issues a signed Installation Certificate bound to product, installation ID, device public key, release/channel, issued time and expiry.

Sensitive requests conceptually bind:

```text
method | path | timestamp | sequence | server nonce
| body_sha256 | certificate_id
```

The device signs this canonical envelope. The server verifies certificate validity/revocation, release allowlist, device signature, nonce, sequence and body hash.

Failure invariant: missing/invalid origin or attestation disables official remote Account/Pro services **but Basic remains usable**.
## 50. Request classes and signing-service boundary

Three logical remote request classes are kept separate:

1. **analytics / traffic** — optional and privacy-sensitive;
2. **attestation / origin / security** — required only for official Account/Pro trust;
3. **update / release** — separate release-trust path.

Analytics must never become a prerequisite for attestation.

The private signing authority must not be exposed as a generic public `/sign` endpoint. Preferred topology:

```text
LightBI
→ Public Control Plane API
→ internal authenticated call
→ Private Attestation / Signing Service
```

Purpose-specific signer operations include release manifest, installation certificate, entitlement and Pro package manifest. The signer validates schema/purpose/key state and signs canonical payloads only; it does not repair arbitrary input.
## 51. Cryptographic trust hierarchy

The intended Phase 2 hierarchy is purpose-separated Ed25519 authority:

```text
LightBI Root (offline private key)
├─ REL issuer → release/update
├─ ATT issuer → installation/attestation
├─ ENT issuer → entitlement
└─ PRO issuer → Pro package manifest
```

The root private key must never exist in the app, VPS runtime, CI, or public repository. Public code may pin the root public key.

Issuer lifecycle states are `active`, `retiring`, `revoked`, and `expired`. Purpose identifiers are frozen to `release`, `attestation`, `entitlement`, and `pro_package`; free-form purposes are not allowed.

Normal issuer rotation uses root-signed overlapping keysets so a compromised issuer can be replaced without compromising root or other purposes. Root rotation is exceptional.
## 52. Phase 2A public trust-contract invariants

Before any private signer may exist, the public trust contracts must freeze deterministically across runtimes.

Frozen design invariants from the handoff:

- signed timestamps are RFC3339 UTC exactly `YYYY-MM-DDTHH:mm:ssZ`, with no offset or milliseconds;
- signed numeric values contain no floats;
- schemas are strict and reject unknown fields;
- purpose enum is exactly the four frozen purposes;
- canonicalization is the public single source of truth;
- duplicate capabilities are rejected rather than silently deduplicated;
- semantic equality must produce identical canonical bytes across runtimes;
- semantic changes must change canonical bytes/signature;
- signer behavior is parse/validate → canonicalize → sign, never normalize/repair;
- hardcoded vectors must carry canonical UTF-8 representation, SHA-256, public key and expected Ed25519 signature;
- private signer work is blocked until the public v1 contract passes audit and freeze.
## 53. Phase 2A current handoff state and audit blockers

Git/GitHub reconciliation confirms draft PR `#4`, branch `codex/phase2-trust-contracts`, base `c06ef003...`. The independent audit was performed against head `d17abe0f...`; its verdict was explicitly **not freezeable yet**.

The remediation was then completed in isolated core worktree `/home/ubuntu/n8n2erpnext/LightBI-core-phase2a` and pushed to the same PR branch as head `fb8225c951fc27692e6b0e7554c3112ada08e49f`. GitHub CI run `33290983683` completed successfully at that head. PR #4 remains open/draft, unmerged, and outside current `main`.

The remediation maps all twelve blocker classes below into code/tests and passes both the full local CI-equivalent gate and the updated GitHub CI gate. It has **not yet received the required independent re-audit**, so the freeze verdict remains unchanged: **NOT FROZEN** and private signer work remains blocked.

The major remediation classes are:

1. remove locale-dependent canonical ordering and scope semantic array ordering to explicit contract locations;
2. align TypeScript/Rust integer acceptance to one safe-integer domain;
3. make the root pin an actual root-signed keyset trust boundary;
4. add keyset expiry, rollback prevention and same-version digest/equivocation checks;
5. separate issuer validity-at-signing-time from payload validity-at-current-time;
6. expose purpose-specific release/install/entitlement/Pro verification paths;
7. enforce account/basic-or-pro versus organization/business subject/tier semantics;
8. enforce all lifecycle windows strictly;
9. harden canonical base64url Ed25519 public-key/signature encoding and lengths;
10. validate SemVer and basename-only release artifacts;
11. use distinct TEST-ONLY ROOT/REL/ATT/ENT/PRO authorities and full-chain vectors;
12. extend public/private boundary checks for obvious private-key material.
## 54. Update and install lifecycle invariants

Canonical updater flow from the handoff:

```text
detect
→ notify
→ background download
→ SHA verify
→ stage
→ READY
→ explicit Update & Restart
```

Do not auto-install or auto-restart without user action. Fail closed on verification errors. Platform package confirmation may still be required on Linux.

Recommended installation lifecycle:

```text
installed
→ heartbeat updates the same installation record
→ uninstall callback when possible
→ uninstalled_at
```

Installation identity is random and credential-backed; updates must not appear as fresh installs. Offline uninstall may leave stale server records, which must be treated as lifecycle uncertainty rather than proof of continued use.
## 55. Open-core legal/technical boundary

The intended first-party model is public Basic under `AGPL-3.0-only` and private proprietary Pro.

Because the same author owns the first-party code, an official commercial distribution may use the same first-party Basic code under a separate commercial/internal license together with private Pro. Third-party dependencies still require their own license audit.

Downloading Pro after login does not automatically guarantee legal separation from AGPL Basic if both are one tightly linked combined program. Separate-process/authenticated IPC may improve technical separation but is not itself a definitive legal conclusion.

Planned first-party source headers use copyright `2026 Thai Duy` plus `SPDX-License-Identifier: AGPL-3.0-only`, excluding generated/vendor/upstream files. Completion is not yet proven by this book.

This section records engineering/legal-risk direction only; final legal interpretation remains outside the project documentation authority.
## 56. Frozen versus provisional road-to-1.0 decisions

Treat as frozen design intent until contradicted by later explicit decisions:

- Basic remains usable;
- no reusable standalone Pro key;
- Pro requires account + installation trust + entitlement;
- public Basic / private Pro;
- Business uses organization named-user seats with v1 limits 5/10/20/25/30;
- installation ID is not trust authority;
- root is offline and issuer purposes are separated;
- canonicalization is public truth; strict schemas/no floats/UTC-second timestamps;
- signer never repairs invalid input;
- no private signer before Phase 2A freeze;
- updater requires explicit Update & Restart.

Still provisional or explicitly unfinished:

- exact offline Pro lease/grace duration;
- hardware-backed attestation strength;
- future Pro package encryption/wrapping implementation;
- final legal packaging boundary after dependency/license audit;
- macOS signing/notarization and production packaging;
- Windows native parity issues such as session persistence, Advanced→Easy source-boundary continuity, and OAuth bootstrap must be verified against current code.
## 57. Documentation-library cleanup state

Documentation reorganization now runs in a dedicated clean worktree rather than the dirty Beta-recovery tree.

First safe move class:

- 176 repository-root human-only Markdown files moved under `docs/history/` by type/provenance;
- `DOMAIN_CORE_AUDIT_REPORT.md` remains at root because `apps/desktop/src/audit-runner.ts` consumes it;
- `validation_report.md` remains at root because perspective-isolation scripts consume it.

Architecture JSON remains intentionally unmoved after the completed Code Map/Git/CI audit. A path-consumer audit found 129/354 `docs/architecture/*.json` files directly referenced by archive tests/scripts, and current public CI intentionally does not carry this internal evidence library. Their path identity remains part of archive governance; Edition 1.0 authorizes no cosmetic move.

This is the governing cleanup rule: **documentation organization may improve human navigation, but must never silently invalidate machine-governed evidence.**

---

# Part XV — Project Truth Baseline 1.0

## 58. What “Project Truth 1.0” means

This edition closes the repository-wide archaeology sequence requested before new product implementation.

It reconciles five evidence layers:

```text
document corpus
+ current/archive code map
+ Git history and release tags
+ GitHub Actions / publication state
+ private control-plane source and running deployment
```

“1.0” here is the **Project Book edition**, not a claim that the LightBI desktop application has reached stable product version 1.0.

Where an implementation is still transitional, the Book says so explicitly rather than converting design intent into fictional completed code.
## 59. Repository topology is now verified

LightBI intentionally has two Git histories:

```text
archive/internal lineage
6145017 → … → 87dce4d → 0142e92

public-clean lineage
b10f8d0 → … → c06ef00 → 4668983
```

The public root is a sanitized snapshot, not a product rewrite. At the publicization boundary almost all desktop/server/package implementation files were byte-identical while the large internal documentation/history corpus was omitted.

Therefore:

- `storage`, recovery, and most dated backup branches are archaeology/archive sources;
- GitHub `main` is the public Basic/release lineage;
- local branch name `main` on the VPS is not current public truth;
- public truth must resolve from `origin/main`/GitHub SHA, not from a local branch label.
## 60. Current public Basic repository truth

At this audit, public `main` is `466898372fcf3869ae10140cafce83bf57c5d392`.

Its production architecture preserves the core findings from the Code Map:

- Home/Easy enters the canonical understanding boundary before governed analysis;
- full runtime-source continuity is required for execution;
- multi-source joins are relationship-governed rather than inferred from file presence;
- Investigation/BA/chart layers consume governed outputs rather than repairing semantic authority;
- Advanced Mode may create/transform data but must re-enter the canonical boundary before Easy/BA trust claims;
- native desktop embeds the Rust/Axum core rather than requiring a separate installed server process;
- Basic is public AGPL source and remains local-first.

Archive-baseline “dirty/untracked” labels are branch-relative historical evidence only. Several such features have later committed public history and must be traced by Git rather than guessed from the recovery worktree.
## 61. Current release truth

The latest official Beta remains `0.9.2-beta.7`, tag commit `28e2aae`.

The Windows/Linux release chain is verified end-to-end:

```text
Beta tag
→ GitHub Actions native Windows + Debian builds
→ updater/integrity gates
→ SHA-256 sidecars
→ GitHub prerelease assets
→ immutable R2 objects
→ lightbi.release.v1 manifest
→ release index / Beta latest
→ distribution release-discovery API
```

Live R2 and the distribution API currently agree on Windows x86_64 EXE and Linux x86_64 DEB artifacts.

GitHub Release contains matching Windows/Linux binaries and checksums.
The current post-control-plane-split release workflow replaces private portal tests with public Basic release/boundary tests. No newer Beta tag has yet exercised that post-split tagged path end-to-end.

Universal macOS Big Sur+ DMG build validation is green, including x86_64 + arm64 and ad-hoc signature verification. Official macOS publication is **not complete**: the latest post-merge publication job failed, and neither GitHub Release nor R2 latest currently advertises a macOS artifact.

Apple Developer ID signing/notarization remains unfinished.

## 62. Current CI truth

Current public CI on `main` is green and blocks public-main push/PR on:

- public Basic release contract;
- public/private source-boundary guard;
- desktop production build;
- a selected governed regression suite.

This is a deliberately bounded gate, not the historical full archive test matrix. Full Rust workspace, all desktop tests, all E2E, and native packaging are not ordinary-main CI gates.
Open draft PR #4 adds public trust-contract TypeScript/Rust verification. Its head `d17abe0` has a successful GitHub CI run, but the branch is not merged into current main.

A green PR #4 CI run proves implementation/test consistency for that branch. It does not override the independent Phase 2A freeze blockers recorded in the approved design handoff.

## 63. Current control-plane ownership truth

The online control plane is now owned by private repository `n8n2erpnext/lightbi-control-plane`, main `87b2ee457c30ac4f7d7d55332bbfc658d51b2c53` at audit.

Its initial private commit copied the disclosed public `apps/distribution/` implementation exactly from public commit `653122e`; private ownership is therefore a forward boundary, not retroactive secrecy.

The private service owns current online distribution/account/admin/analytics/payment/mail/release-discovery behavior.

The running port-5174 service uses `/home/ubuntu/services/lightbi-control-plane/apps/distribution` and is source-aligned with private main for runtime files after line-ending normalization.
The deployment `.deployed-commit` marker still says `5f05a55`; byte-level reconciliation shows that marker is stale and must not be used alone as runtime provenance.

The private repository's current source independently passed 39/39 tests and its build command during this audit without production configuration.

The old untracked `apps/distribution/` directory in Beta-recovery is not current control-plane authority. It is a historical/workbench copy and differs from private main.

A later isolated foundation candidate exists at `/home/ubuntu/n8n2erpnext/lightbi-control-plane-cp1`, local closure `fe9216d`. It implements CP-1→CP-6 foundations and passed 53/53 clean-candidate tests, but it is **not** authoritative private-main history and has not been deployed. Private main/runtime authority above therefore remains unchanged until replay, CI, staging and explicit cutover.

## 64. Current Beta entitlement versus 1.0 trust authority

Current private code has real account, identity, session, device and entitlement records. It also still supports current-Beta license-key flows and installation-ID-based device records.

That implementation is transitional.

The frozen 1.0 authority remains:

```text
authenticated account or organization
+ trusted official installation
+ valid entitlement
```

No reusable standalone Pro key and no browser-local tier may become final Pro authority.
Organization Business named-user seats, one-time organization claim tokens, installation certificates, request attestation, purpose-separated signing issuers, signed entitlements, encrypted Pro capability delivery, and offline Pro leases are **not implemented** in current private main.

That absence is intentional at the current phase boundary.

Post-audit implementation note: the isolated CP foundation candidate now contains organization/membership/named-seat/subject-entitlement models plus identity-security, async-worker and commerce/integration rails. These are foundation code only; they do not make the current private main or running Beta service a 1.0 authority, and signed entitlement/attestation/Pro delivery remain unimplemented and trust-gated.

## 65. Phase 2A status is now fully reconciled

Repository facts are verified:

- Phase 0–1 merge/base: `c06ef003242e06884e65d992627b5706ad13dfab`;
- Phase 2A branch: `codex/phase2-trust-contracts`;
- independent-audit baseline head: `d17abe0f7c5bc97521347526fb5fcec759857b2e`;
- current remediation head: `fb8225c951fc27692e6b0e7554c3112ada08e49f`;
- PR #4 is open and draft;
- GitHub CI run `33290983683` passed at the current remediation head;
- it is not part of current public `main`.

Design-freeze truth also remains: the approved independent audit marked Phase 2A **not freezeable yet** and enumerated canonicalization, keyset trust, lifecycle, semantic validation and vector hardening work.

Therefore private signer work remains blocked until a later explicit Phase 2A freeze decision.

The pushed remediation candidate at `fb8225c` has 20/20 TypeScript trust tests, 5/5 Rust parity tests, public-boundary verification, desktop production build, and the seven-file/26-test governed regression gate passing locally; GitHub CI also passed. It remains a candidate until independent review of that exact commit records explicit freeze approval.
## 66. Basic independence is a cross-repository invariant

All current and future online work must preserve this failure rule:

```text
control plane unavailable
account unavailable
telemetry disabled
entitlement refresh unavailable
future attestation unavailable

→ local Basic remains usable
```

Online services may disable Account/Pro-specific capability when trust cannot be proven. They must not disable the local Basic understanding/analysis workflow merely because a remote dependency is unavailable.

Current control-plane pairing already returns Basic without analytics pairing when telemetry consent is false, which is consistent with this separation.

## 67. Final documentation-library disposition

The documentation cleanup is now complete enough to classify the remaining architecture JSON decision safely.

The 354 `docs/architecture/*.json` files remain in place.

Earlier audit proved at least 129 exact test/script consumers in the archive lineage; other consumers may be dynamic or historical. Current public `main` intentionally does not carry this internal evidence library, so public CI cannot be used to justify moving archive evidence paths.
Final rule:

- do not move machine-evidence JSON merely for visual folder cleanliness;
- keep path identity stable unless a future dedicated migration updates every consumer and proves archive test parity;
- human navigation is already solved through architecture indexes/catalogs, so there is no product value in taking that risk now.

No further machine-evidence move is authorized by Edition 1.0.

## 68. Project Truth checkpoint

After this archaeology pass, a new AI should no longer need to re-read the entire historical repository before beginning a scoped implementation task.

Required onboarding route is now:

```text
project-book/README.md
→ LIBRARY_RULES.md
→ LIGHTBI_PROJECT_BOOK.md
→ LIGHTBI_CODE_MAP.md
→ LIGHTBI_GIT_HISTORY_MAP.md
→ LIGHTBI_CI_CD_MAP.md
→ LIGHTBI_CONTROL_PLANE_MAP.md
→ exact source/tests for the requested change
```

New implementation still requires a fresh **scoped** impact audit around the feature being changed. Project Truth eliminates repository-wide rediscovery; it does not eliminate engineering verification.
## 69. Explicit open gates after archaeology

Edition 1.0 does not pretend these items are complete:

- CP-1→CP-6 foundation candidate replay/CI/staging/production cutover;
- Phase 2A trust-contract freeze/remediation and PR #4 disposition;
- post-split tagged release dry run/real Beta publication;
- failed macOS additive publication repair;
- Apple Developer ID signing/notarization;
- replay/promotion and product wiring of the CP-5 organization/Business entitlement foundation;
- trusted installation/attestation implementation;
- private signing hierarchy and signed entitlement implementation;
- private Pro capability delivery/offline lease implementation;
- final open-core legal/dependency review;
- stale control-plane deployed-SHA marker cleanup.

These are implementation/release tasks, not missing archaeology.

## 70. Coding gate after Project Truth 1.0

Product coding must **not** occur on `docs/project-library-cleanup-20260829`.

This worktree is the durable knowledge/library branch. New code work should start from the correct product lineage and use a dedicated feature branch/worktree after reconciling the intended base with current public `main` and any approved open PR dependencies.

The old dirty Beta-recovery worktree remains evidence/archive unless a specific recovery task explicitly chooses it as source.


## 71. Excel Analysis Workbook / Pivot export direction

LightBI 1.0 must treat Excel export as a first-class decision handoff, not merely a raw-row download. The approved product direction is to let a user import raw operational files, select a business perspective, run LightBI's governed analysis/Deep BA/drill workflow, and export a ready-to-use Excel analysis workbook without manually rebuilding the same logic in PivotTable.

The export must reuse existing LightBI truth rather than create a second analysis engine:

```text
canonical source / source collection
→ semantic + grain + relationship governance
→ selected perspective / governed analysis plan
→ governed result + chart/BA/drill evidence
→ Excel Analysis Workbook
```

Required v1 workbook layers are: clean/canonical data where the current authority permits it; one or more prebuilt perspective analysis tables; evidence/drill-detail rows for the selected result; data dictionary and lineage; transformation/audit notes; caveats/restrictions; and a manifest tying the workbook back to the LightBI source/artifact/analysis identity.

This feature must **not** blindly concatenate multi-source data. Cross-source rows may be combined only through an already-authorized governed relationship/metric path. Same-role period partitions may be represented as separate source/data sheets or governed metric-result tables without inventing row-level joins.

The first production implementation may use precomputed Pivot-style summary tables and ordinary Excel formulas/tables. Native Excel PivotTable/PivotChart generation is an additive later capability if the workbook library/runtime supports it safely. The architecture must therefore preserve a versioned analysis-export plan rather than encoding workbook decisions directly in UI click handlers.

Power BI handoff and Excel Analysis Workbook should share source lineage/canonical-cleaning contracts, but they serve different outcomes: Power BI export prepares trustworthy reusable data for another BI tool; Excel Analysis Workbook carries a ready-made LightBI analysis for users who want to continue working directly in Excel.

Implementation checkpoint: public branch `codex/excel-analysis-workbook-20260830` is pushed at `1be2d152b4ab8b74ec5cdee0c99e39e5487c4acd`. It now writes a formula-driven `Pivot View` referencing the governed `Analysis Summary`, keeps multi-source evidence in separate sheets, and carries the exact `AnalysisWorkbookPlanV1` through an ephemeral in-memory handoff into `Datasets`. After the canonical clean copy is prepared, `Save Excel analysis / Pivot as…` sits beside the existing Power BI package and appends Clean Data, Data Dictionary, Transformation Audit and Clean Handoff Manifest. The public CI-equivalent gate passed release contract, public boundary, desktop build and nine regression files / 30 tests.

## 72. Dual-track 1.0 execution rule

From this checkpoint onward, public core and private control-plane work proceed in parallel only where their dependencies are independent.

```text
PUBLIC CORE / LOCAL-FIRST                 PRIVATE CONTROL PLANE
canonical analysis + export              CP foundation promotion
Excel Analysis Workbook                  identity/org/integration API consumers
BA / chart / drill continuity            commerce/analytics operations
        │                                         │
        └──────── trust-dependent features ───────┘
                          ↓
             Phase 2A explicit FREEZE required
                          ↓
                 Trust-1 private Rust signer
```

Offline/local Basic capabilities such as the governed Excel Analysis Workbook do not wait for the control plane. Online authority features must continue obeying `control-plane foundation first → core consumption second → feature UI third`. No signer, attestation, signed entitlement or Pro-package authority may begin merely because the two tracks are active in parallel; those remain blocked until the exact Phase 2A head receives independent freeze approval.


Parallel control-plane checkpoint: the CP-1→CP-6 chain has now been replayed onto real private-main ancestry and pushed; CP-2.1/2.2 add the v1 HTTP/account compatibility boundary and CP-3.1 hardens staging/migration safety. The current pushed private candidate is `34d9c5dfe40a32f87090fc3a16c9a6fea47286e5`, with 71/71 compiled-runtime tests passing three consecutive times. Production remains unchanged and staging activation remains blocked by staging-origin and PostgreSQL-auth preflight findings.
### Dual-track implementation checkpoint — 2026-08-30

The public Excel-analysis branch `codex/excel-analysis-workbook-20260830` is now pushed through `4911631e3a479302ff417e7d51b279fc7007dd29`. It uses one `AnalysisWorkbookPlanV1` for governed multi-source perspective export and single-source Deep BA. The workbook contains `Analysis Summary`, a formula-driven `Pivot View`, source-bound evidence where available, lineage/decision notes, and can attach the existing clean-data/Data Dictionary/Transformation Audit/Handoff Manifest when the Datasets handoff has canonical clean-source context. Public CI-equivalent verification passed release/public-boundary gates, desktop build, and **10 regression files / 33 tests**. This is a feature-branch candidate, not current public `main`.

The private control-plane branch `codex/control-plane-foundations-20260830` now has real ancestry from private `main` and is pushed through docs head `d58139d9744b2b24b3d0d7638ba93ace8db6ac62`; the CP-5.1 code checkpoint is `3bcc88a8ed3e7cae2aef16b7beba4392663a7a05`. `/api/v1/authority/account` is authenticated and schema-gated, returning only an **unsigned, non-final** account/organization entitlement read model. The full private CI-equivalent suite passed **73/73** compiled-runtime tests. Staging migrations remain unapplied, the staging database credential preflight still fails with PostgreSQL `28P01`, staging public origin still equals production, and production 5174 remains unchanged.

Phase 2A trust remains exactly `fb8225c951fc27692e6b0e7554c3112ada08e49f`, Draft/Open/CI-green but **not frozen**. None of the Excel or control-plane work relaxes the Trust-1 gate.

## 73. Dual-track implementation checkpoint — decision plan + identity security foundations

Public core branch `codex/excel-analysis-workbook-20260830` is pushed through `15fce252ed4f11d0d91d5213aa1aca0ec3db33f6`. `DecisionVisualizationPlanV1` now sits after governed execution and is shared by Chart Library, Dashboard creation, and Excel Analysis/Pivot export when a concrete dimension/metric visualization exists. Single-source metric IDs are explicit rather than inferred from every non-dimension column; KPI-only results are not forced into a fabricated visualization plan. The latest full public CI-equivalent gate passed desktop production build plus 10 regression files / 30 tests.

Private control-plane branch `codex/control-plane-foundations-20260830` is pushed through code head `83fd70463e65e8bd0fe54237e86882cfc969d274` and documentation head `5d2fd3ead8a712a6a1048eb8871acd55226751e1`. CP-4.2 binds security-ready sessions to `account.security_version`, so credential-sensitive version bumps invalidate older sessions; CP-3.2 removes runtime schema auto-migration outside the explicit migration CLI; CP-4.3 establishes encrypted TOTP enrollment primitives and single-use recovery-code service behavior without exposing product enrollment routes yet. The full private CI-equivalent gate passes **85/85** compiled-runtime tests.

TOTP enrollment remains unavailable until MFA-aware login/step-up policy is enforced end-to-end. Passkey verification remains unavailable until an audited WebAuthn implementation is introduced. Production 5174, production databases, staging migrations and workers remain unchanged. Phase 2A remains exact head `fb8225c951fc27692e6b0e7554c3112ada08e49f`, Draft/Open/CI-green and **not frozen**; Trust-1/private signer remains blocked.
