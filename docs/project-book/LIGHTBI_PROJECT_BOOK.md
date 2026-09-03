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
  - [75. NEXT/Internal successor generation foundation](#75-nextinternal-successor-generation-foundation)
  - [74. Core durability, Passkey candidate, and test-taxonomy checkpoint](#74-core-durability-passkey-candidate-and-test-taxonomy-checkpoint)
  - [88. Road-to-1.0 execution freeze and optional ERPNext revenue mirror](#88-road-to-10-execution-freeze-and-optional-erpnext-revenue-mirror)
  - [89. NEXT-017 account security, release gate, and Paddle accounting scaffold](#89-next-017-account-security-release-gate-and-paddle-accounting-scaffold)
  - [90. R1-P5 Phase 2A independent re-audit PASS; owner freeze still required](#90-r1-p5-phase-2a-independent-re-audit-pass-owner-freeze-still-required)
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

### Dual-track security + Excel usability checkpoint — 2026-08-30

The public Excel-analysis branch advanced to `999dc75bc1fbe873e9d5702db9fe655d131a1163`. The workbook keeps the governed formula-driven `Pivot View`, adds bounded content-aware column sizing and verified autofilters, and explicitly records that the current SheetJS Community Edition writer does **not** embed native PivotTable/PivotChart structures. Native Pivot/PivotChart remains an additive adapter decision rather than an OOXML hack. Public CI-equivalent verification passed release/public-boundary gates, desktop build, and **11 regression files / 38 tests**.

The private control-plane branch advanced through CP-4.4 MFA login/step-up (`28b637063c7b67a1e0c186b16df3365583ca5e0e`) and CP-4.5 policy-gated TOTP enrollment (`25fa53348bce84e7220bf530a820c228f43e3fc8`), with private documentation/status through `af80cd53708ac2709333b1242826454257cb86a6`. Accounts with active TOTP cannot receive a single-factor session; TOTP or single-use recovery completes web/native MFA or step-up. Enrollment is available only when migration 040, session-security policy, MFA runtime and secret prerequisites are ready and the session is recent; adding a factor to an already-protected account requires MFA step-up. The full private compiled-runtime gate passed **96/96** tests. Production remains unchanged and Passkey/WebAuthn remains deferred to an audited adapter.

Phase 2A trust remains exactly `fb8225c951fc27692e6b0e7554c3112ada08e49f`, Draft/Open/CI-green but **not frozen**. No signer, attestation, signed ENT or Pro signing work is authorized by these checkpoints.

## 74. Core durability, Passkey candidate, and test-taxonomy checkpoint

The public-core feature branch `codex/excel-analysis-workbook-20260830` is now pushed through `326d991a8f305fef938e9aab47897dd233146770`. `AnalysisSessionIdentityV1` persists only durable analysis identity metadata into the existing workspace-session rail; it does **not** persist execution authority. The contract records workbook/decision-plan identity plus single-source canonical source/fingerprint/generation anchors or multi-source dataset/relationship/membership anchors, while freezing `persistedExecutionAuthority=false`, `requiresRevalidation=true`, and `decisionUseAuthorized=false`.

The restore path is deliberately fail-closed. A saved identity is compared with a reloaded/re-inspected current source. Identity mismatch leaves the saved analysis as history only; multi-source restore additionally requires the governed relationship artifact to be rebuilt. Session open/switch clears the transient Excel-analysis export plan. Home autosave does not infer a durable identity from the global transient export store; the current producer is Investigation, which must hold the current governed execution, current `DecisionVisualizationPlanV1`, and current canonical dataset together before it may persist analysis identity metadata.

Targeted durability verification passed **4 files / 27 tests**, the public release contract passed **3/3**, the public/private boundary guard passed, the desktop production build passed, and `git diff --check` was clean before push.

A broader full-desktop Vitest run exposed an important test-taxonomy debt rather than a durability regression: the current sanitized public lineage reported **198 passed / 27 failed test files**, **1374 passed / 51 failed / 9 skipped tests**, plus one unhandled test-environment error. Many failures are archive-era governance/corpus tests that still read `docs/architecture/*.json` artifacts intentionally absent from the sanitized public tree; others are stale frozen/textual assertions already present at the pre-durability head. A clean detached `999dc75` representative probe reproduced the same **11 pass / 7 fail** set as the current branch, with no new or resolved failure identities in that probe. This is representative differential proof, **not** a claim that the entire full-suite failure set was exhaustively baseline-equivalent.

Therefore two verification statements must remain separate: current GitHub CI intentionally runs a selected governed public regression set, while the historical full Vitest universe is presently baseline-red on the sanitized public lineage. “CI green” must never be rewritten as “every historical test is green.” The full historical suite now needs an explicit taxonomy/reconciliation phase before 1.0 so public-release gates, archive evidence tests, sanitized-path assumptions, and true current regressions are distinguishable.

In parallel, the private control-plane candidate advanced through CP-4.6 `bfbf6d9` (maintained `@simplewebauthn/server` adapter), CP-4.7 `90ba49e` (phishing-resistant session assurance), and CP-4.8 `9c89a81` (policy-gated Passkey registration and discoverable passwordless login). Test progression is **100/100 → 104/104 → 110/110**; private documentation is pushed through `0385b316f54f73fa4d3e7ce481fa377c93f5471b`. Production/staging services and databases remain unmodified, and Trust-1 remains blocked pending explicit Phase 2A freeze approval.

## 75. NEXT/Internal successor generation foundation

The owner-approved development model is now **successor promotion**, not piecemeal merge-back into an older production runtime:

```text
CURRENT N
→ direct inherited NEXT N+1
→ machine gates
→ owner UAT on isolated internal infrastructure
→ explicit promotion
→ NEXT becomes CURRENT N+1
→ retain N for rollback evidence
→ create NEXT N+2
```

Code/schema lineage is inherited; writable data infrastructure is not. NEXT must use separate PostgreSQL, Redis, data directory, public origin, analytics/release namespaces, accounts and integrations. Promotion later wires the accepted successor code to production infrastructure and applies the same ordered migration lineage; internal test data is never promoted as production authority.

The successor source generation was established at Core `ef2434ac01ec6a817f4a04f58d16ef41c447b9dc` / private control plane `c8a667cc0e760572f9aa620ca72cdc8cd5bfb41d` and has now advanced to current Internal Core head `d96011bfe2d3deca8424eac15f6d3e7d39cf7a97` with control plane `f1879c65453cdf0bc9798257e462264f0424e907`. Early lineage after the foundation added the internal gateway (`0a9d20a`), governed Excel perspective identity (`a875098`) and its UAT regression (`b1b4027`); later sections record modularization, native Pivot, SQL completion, Advanced/Easy continuity, native recovery/auth transport, starter demos, governed documentation, portal hardening and first-paint routing through NEXT-015. CP remained source-stable through NEXT-012; NEXT-013 introduced documentation schema 062, NEXT-014 hardened that portal and migrated its web source to TypeScript, and NEXT-015 closes the secondary-route homepage-flash defect without changing analytical authority.

The earlier proof manifest `lightbi.generation.v1` for candidate `g-2026-08-30-next-001` used the foundation SHAs and provisional parent label `prod-v0.9.2-beta.7-28e2aae`. It remains historical proof only. The canonical first parent generation still requires an immutable bootstrap CURRENT record derived from actual deployed production facts; the provisional label must not be promoted into parent authority by convention.

The desktop successor adds a visible `NEXT` marker plus Settings diagnostics for generation ID, parent, exact SHAs, schema target/runtime state, core/control-plane health, worker health, update/trust/analytics/release identity and isolation blockers. Internal distribution calls fail closed against the known production distribution origin. The private successor adds internal-only `/api/v1/internal/diagnostics`, explicit environment isolation verification, migration `033_runtime_heartbeats`, and worker generation/commit heartbeats.

Owner acceptance is now executable product infrastructure, not an informal note. `test-packs/internal-v1/` reuses four hashed existing ERP fixtures and defines **14** scenarios across SMOKE, FEATURE and RELEASE ACCEPTANCE. Golden business answers include May revenue `22,973,896,244`, June revenue `20,637,539,164`, period delta `-2,336,357,080`, May delivery fee `147,925,000`, May gross profit `3,075,721,244`, and zero Sales↔Accounting revenue gap. The pack also covers Deep BA/drill evidence, Excel Analysis/Pivot, Power BI handoff, save/restart/restore, same-filename-different-content rejection, governed multi-source behavior, infrastructure isolation and promotion evidence.

Latest-head revalidation on 2026-08-30 passed at exact Core `b1b40277e5e6e8389bc13c2c75f439fdb861600c`: generation contract 3/3, generation/diagnostics Vitest 8/8, UAT-pack validation 4 fixtures / 14 scenarios / 3 levels, release/public-boundary gates, desktop production build and the selected public governed regression set **11 files / 39 tests**. Exact private head `c251fb1ee981a529c33335d25d3ada4e6ea9d23f` passed strict typecheck/build and **116/116** compiled-runtime tests.

A read-only runtime check then found NEXT already listening on `100.94.184.141:5272/5273/5274`, contrary to the earlier source-only checkpoint. Control-plane diagnostics report generation `g-2026-08-30-next-001`, exact CP commit `c251fb1`, schema `061_integrations_delivery` current with no pending migrations, a healthy worker on the same generation/commit, and Trust blocked pending Phase 2A freeze. However the running Core binary predates the later Core commits, and the latest source-gate desktop build removed the previously generated `apps/desktop/dist/lightbi-generation.json`; the gateway now falls back to `index.html` for that path. Runtime exact-generation reconciliation is therefore **not complete** and owner UAT must not be treated as started or accepted. Production `5172/5173/5174` was not restarted or migrated by this revalidation. The next authority gate is bootstrap of immutable CURRENT generation identity plus exact NEXT runtime reconciliation; Phase 2A remains `fb8225c951fc27692e6b0e7554c3112ada08e49f`, Draft/Open/CI-green but **not frozen**.


## 76. Internal code modularization and anti-bloat governance

The NEXT/Internal Core advanced from `b1b40277e5e6e8389bc13c2c75f439fdb861600c` to `a8ebc27c9d4284665855d7a0a0150c629e44f86e` by structural refactor only: server route contracts and analytical authority rules were preserved while oversized orchestration/engine modules were split by responsibility. The server keeps all 38 route paths unchanged. The selected governed regression remains 11 files / 39 tests, focused semantic verification passes 123/123, backend verification passes 20/20, desktop build/release/public-boundary/generation/UAT gates pass, and no production service was mutated by the refactor.

Code growth is now governed, not periodically cleaned by memory. `pnpm test:source-module-size` scans production `.ts`, `.tsx`, and `.rs` modules across desktop/server/crates/packages. A production module above **1,000 physical lines fails CI**; 800–1,000 lines is refactor pressure and emits a warning. Normal target size is approximately 300–700 lines when cohesion permits. Splitting only to evade the line limit is forbidden: every extracted module must have one coherent responsibility/owner and dependency direction must remain consistent with the Code Map. Page shells remain orchestration/presentation; semantic, execution, persistence, trust, and provider authority may not be moved upward merely to make files smaller.

The first exact parent identity is now [`CURRENT_BOOTSTRAP_RECORD.json`](./CURRENT_BOOTSTRAP_RECORD.json), record `bootstrap-current-8d59d05f575373e6`. It deliberately records CURRENT as a composite legacy authority rather than inventing one exact Git SHA: release `0.9.2-beta.7`/tag commit `28e2aae...`, Core runtime binary SHA `9a55bf...` with unresolved dirty-source provenance, dirty live-demo source-envelope evidence, exact verified control-plane runtime source `87b2ee4...`, persistence schema fingerprints, and unfrozen Phase 2A trust state. Its evidence SHA-256 is `8d59d05f575373e6ddf419fd7c82ca0fe61c49ddcc289889ee4fc9309e7150d1`.

This bootstrap record is provenance only. It does not grant analytical, entitlement, data, or execution authority, and it never authorizes copying production data into Internal. The accepted NEXT runtime must use this immutable record ID as `parent_generation_id` and must still pass exact runtime-generation/isolation diagnostics before owner UAT begins.


## 77. NEXT g-2026-08-30-next-002 exact-runtime proof

After the modularization checkpoint, the first evidence-derived parent was fixed to `bootstrap-current-8d59d05f575373e6` and a fresh successor identity `g-2026-08-30-next-002` was built from exact Core `a8ebc27c9d4284665855d7a0a0150c629e44f86e` and control plane `c251fb1ee981a529c33335d25d3ada4e6ea9d23f`. The generation manifest SHA-256 is `57783e4c370271da5e5b0f16b00405504f56367b2b66a19a24c51fe71a365912`; the rebuilt Core binary SHA-256 is `0c9d37ae54b874e85ff3ad2ce792875a318e72c32146ad9e340383d5831d3d60`.

Because the authorized tool boundary refused termination of the predecessor Internal processes, the fresh runtime was proven on temporary Internal verification ports `5372` Core, `5373` gateway/web, and `5374` control plane rather than pretending that the predecessor `5272/5273/5274` stack had been replaced. This topology is verification infrastructure only; it is not a new product-port contract. Production `5172/5173/5174` remained continuously present and unmodified.

The fresh gateway reports `x-lightbi-generation: g-2026-08-30-next-002`; `/lightbi-generation.json` is now served as real JSON rather than the prior SPA fallback and contains the exact bootstrap parent, Core/CP commits, schema target, Internal distribution origin and Internal analytics/release namespaces. Core `/api/health` passes directly and through the gateway. The running Core executable hash exactly matches the freshly built artifact. Control-plane diagnostics report generation `next-002`, exact CP commit `c251fb1`, schema `061_integrations_delivery` current with no pending migrations, and Trust still blocked pending Phase 2A freeze.

One promotion gate remains deliberately red: the only permitted running Internal worker is still the predecessor `g-2026-08-30-next-001` worker. Attempts to stop the predecessor Internal processes or start another database-writing worker were blocked by the execution safety boundary before they ran. Diagnostics therefore correctly expose a worker-generation mismatch (`expected next-002`, observed `next-001`). No heartbeat was fabricated, no diagnostic check was weakened, and owner UAT/promotion remain blocked until the predecessor worker can be decommissioned and a `next-002` worker produces a matching fresh heartbeat on isolated Internal writable state.
## 78. Canonical Internal bug-test entrypoint now serves NEXT-002

The owner-facing Internal entrypoint `http://100.94.184.141:5273` now serves the freshly rebuilt `g-2026-08-30-next-002` desktop and advertises that generation in both the gateway header and `lightbi-generation.json`. Its Core and control-plane proxy targets are the exact fresh verification processes on `5372` and `5374`, so ordinary product bug testing through the canonical web entrypoint exercises Core `a8ebc27c9d4284665855d7a0a0150c629e44f86e` and CP `c251fb1ee981a529c33335d25d3ada4e6ea9d23f`. The canonical manifest for this entrypoint has SHA-256 `5eb9d570fcdf92f5f7bf5a1c9bedf9ded5d153d1640930ca8212a6dd2c6c7621` and points its distribution origin back to `5273`.

The predecessor direct listeners on `5272` Core and `5274` CP remain present because the execution safety layer refused their direct termination, but the new `5273` gateway no longer proxies to them. The temporary `5373` verification gateway has been stopped. This is sufficient for interactive frontend/Core/CP bug testing, but it is **not** release-acceptance proof: the database worker heartbeat still belongs to predecessor generation `next-001`, so async-worker scenarios, owner UAT and promotion remain fail-closed until worker identity is reconciled.


## 78. Deep BA scope-isolation bug fix and NEXT-003 bug-test generation

Internal bug testing found a real Investigation lifecycle defect: after chart drill-through opened `Deep analysis of selected data` (Deep BA Step 2), closing it and later pressing the main perspective `Analyze deeper` button could reuse the retained selected-row scope. The two user actions are separate product workflows and must never inherit each other's transient scope.

Core commit `eadba8fdf07b04bbdbd674518422713fefb68009` fixes the defect by replacing the loose `showDeepAnalysis + filteredDeepAnalysisScope` coupling with a discriminated `perspective | selected_data` view state. A focused regression reproduces the exact owner flow and, together with the existing Deep Analysis component tests, passes **2 files / 20 tests**. Desktop production build, source-size governance (464 modules, zero >1,000) and diff hygiene also pass.

The owner-facing Internal entrypoint `http://100.94.184.141:5273` now serves `g-2026-08-30-next-003`, parent `bootstrap-current-8d59d05f575373e6`, Core/source `eadba8f...`, CP `c251fb1...`, and manifest SHA-256 `b9a0ae030ad45a959c86a73d863e027d6c77996382c12f9673ecaf763cca3ca2`. The gateway uses the unchanged rebuilt/verified Core artifact on 5372 and a CP API instance carrying NEXT-003 identity on 5474. Production 5172/5173/5174 remains untouched. The async worker still reports predecessor generation `next-001` at the same CP commit, so owner bug testing is ready but release/UAT promotion identity remains blocked.


## 79. Supporting-chart drill-through preserves per-chart lineage

Owner bug testing identified that the two "Supporting analyses for this perspective" charts were useful but read-only, while the primary chart already allowed point/bar drill-through into source rows and Deep BA Step 2. Core `1ecf36e959d3a9aa5af2e1f800b0ac0bb3f7b020` closes that product gap without creating a new execution path. Supporting charts now enter the existing drill-through workflow, but each chart supplies the exact prepared runtime plan and analysis action that produced that supporting view. The primary perspective plan is never substituted for a supporting chart merely to reuse UI code.

The drill lifecycle is owned by `useInvestigationDrillThrough.ts`; `Investigation.tsx` remains orchestration/presentation. The selected-data Deep BA state retains the originating action and chart, so a clicked `Money over time` point or `Activity volume by item` bar is investigated under that supporting angle. Perspective Deep BA remains a separate scope and cannot inherit the supporting selection. This preserves the larger LightBI rule that a visible analytical lens does not acquire execution authority from another lens.

Verification passes: Investigation 18/18 plus DeepAnalysis 3/3, selected governed regression 11 files / 39 tests, TypeScript/build, source-module gate 465/465 with zero >1,000, generation contract 3/3, UAT-pack validation 4 fixtures / 14 scenarios / 3 levels, and focused generation diagnostics 3/3. The owner-facing Internal entrypoint now serves `g-2026-08-30-next-004`, parent `bootstrap-current-8d59d05f575373e6`, Core/source `1ecf36e959d3a9aa5af2e1f800b0ac0bb3f7b020`, CP `c251fb1ee981a529c33335d25d3ada4e6ea9d23f`, manifest SHA-256 `88c19a9f770f4c400c50f64a57fb047a2e065e307fde65cce45e1e2fa1a686e5`. Gateway/Core/CP/schema checks pass; the async worker remains predecessor `next-001`, so manual bug testing is ready while owner UAT/promotion remains fail-closed. Production 5172/5173/5174 was not mutated.


## 80. Native editable Excel Pivot export and NEXT-005 runtime

The formula-driven Excel Analysis Workbook checkpoints remain historical evidence, but they no longer define the current NEXT Pivot direction. Owner testing accepted the three native-Pivot spike workbooks, including the zero-column layout, in a spreadsheet client. Core `1292fd71209dcfeb6d23c9b4a618d5ff081f7714` therefore introduces `lightbi.excel-pivot-export.v1`: one `Export to Excel Pivot` menu with `Full cleaned data + Pivot` and `Current selection + Pivot`. The first mode always rematerializes the canonical full-file source; the second uses only explicitly selected drill-through rows. A perspective configures the initial Pivot recipe but never narrows the source of a Full export.

This is not a second analysis engine. `CanonicalSourceBoundaryV1.runtimeSource` and `createCleanDataHandoff` remain the full-source/cleaning authority. `AnalysisAction`, `DecisionVisualizationPlanV1`, semantic lineage and the governed metric policy resolve the initial row/value/filter fields. The exporter may preset only safe `SUM` or governed `COUNT`; semi-additive, non-additive, AVG and calculated measures are omitted rather than silently aggregated incorrectly. The current native writer presets one value field, while every exported cleaned field remains available in the Pivot Field List for user rearrangement.

The workbook has `Data`, `Pivot` and `About` sheets. `Data` is an actual Excel Table named `LightBI_Data`; `Pivot` contains a native editable PivotTable backed by PivotCache records; `About` records perspective, mode, row counts, filters and omitted unsafe measures. The implementation keeps SheetJS for ordinary workbook construction and uses a small `fflate`-based OOXML presentation adapter to add the native Table/Pivot/PivotCache package parts. The adapter has no business-semantic authority. Export fails before allocation when source rows exceed Excel's 1,048,575 data-row capacity and never truncates silently.

Verification at this head passes Pivot/Deep-BA focused tests 9/9, the exact governed CI set 11 files / 39 tests, desktop build, release/public-boundary gates, generation contract 3/3, UAT-pack validation 4 fixtures / 14 scenarios / 3 levels, generation diagnostics 8/8, and the 467-module source-size gate with zero violations. A workbook generated by the product exporter itself passed ZIP/package inspection with native Table, PivotTable, PivotCache definition/records and their relationships present.

The canonical Internal runtime is now reconciled directly on `5272` Core / `5273` gateway / `5274` control plane, with no temporary 537x/5474 proxy hop. `g-2026-08-31-next-005` pins Core `1292fd7...`, CP `c251fb1...`, parent `bootstrap-current-8d59d05f575373e6`, schema `061_integrations_delivery`, and manifest SHA-256 `1898311c3c3bbea9304158920d5b9e3d5651527e08546bfb2528a180d53ac574`. Core binary SHA-256 remains `0c9d37ae54b874e85ff3ad2ce792875a318e72c32146ad9e340383d5831d3d60`. CP diagnostics report schema current/pending 0 and a healthy worker on the same `next-005` generation and exact CP commit. The NEXT-vs-production environment verifier passes all 8 isolation keys. Production `5172/5173/5174` remains present and unmodified. Formal owner UAT/promotion acceptance and explicit Excel Desktop release acceptance are still open gates.


## 81. Context-aware SQL completion for the Advanced IDE

Core `6d895de57ca42ae0ac530424416bfc2cd741e65e` upgrades the Monaco SQL editor from a flat suggestion list into a cursor-context completion system. `AdvancedSqlEditor.tsx` remains a Monaco adapter; `advanced-sql-completion.ts` owns completion context, source/alias resolution, ranking and suppression rules. The resolver reads the full current SQL document to discover `FROM`/`JOIN` sources even when the cursor is earlier in `SELECT`, while using text before the cursor to decide the active clause and replacement prefix.

Completion contexts are explicit: `FROM`/`JOIN` prioritizes schema/table names; `SELECT`/`WHERE`/`ON`/`GROUP BY`/`ORDER BY`/`HAVING` prioritizes columns; `alias.` returns only columns from that exact aliased source; a new line after a completed source prioritizes continuation clauses such as `WHERE`, `JOIN`, `GROUP BY`, `ORDER BY`, `LIMIT` and `OFFSET`. Multi-source column suggestions are alias-qualified to avoid ambiguous insertion. SQL keywords, functions and snippets remain available, but schema/table/column metadata stays behind the existing Pro/app capability gate. Suggestions are suppressed inside SQL strings and line comments and are capped at 300 items to avoid flooding Monaco on large schemas.

The editor now uses Monaco prefix-aware sorting/filtering, 75 ms quick-suggestion delay, recently-used-by-prefix selection, preview, locality bonus, smart Enter acceptance and disables Monaco word-based noise. Regression covers table context, source-aware columns, alias-qualified columns, ambiguous multi-source qualification, post-source ranking, string/comment suppression, stale-schema rejection and the existing capability gate. Advanced focused verification passes 10 files / 58 tests; completion-focused verification passes 2 files / 12 tests; the selected governed CI set remains 11 files / 39 tests; desktop build and the 468-module source-size gate pass.

The owner-facing Internal runtime is `g-2026-08-31-next-006` on canonical `5272/5273/5274`, parent `bootstrap-current-8d59d05f575373e6`, Core `6d895de...`, CP `c251fb1...`, manifest SHA-256 `4ace871a210349479719408c081e2ce8dbf17e2aa8fa30d536e2eaf0d6a0f42d`. CP diagnostics report schema `061_integrations_delivery` current/pending 0 and a healthy worker on the same generation/commit. Production `5172/5173/5174` remains untouched.

## 82. Advanced/Easy canonical round-trip closure and NEXT-009

Owner browser testing exposed a continuity defect across the otherwise-valid canonical boundaries: `Import -> perspective -> chart -> Back -> Open Advanced -> Return to Easy`. The first repair at Core `d6aaf7e5aa6efbfcca49d6548d8663313a90d044` correctly rebuilt a full-file runtime boundary for Advanced results, but a no-op return still serialized the 1,500-row result into a new `advanced:...` JSON identity. Core `a6beb34327f0bedbfe4ac7d222b0786245f26c51` separated `Return to Easy` from `Analyze result in Simple`: a no-op local-file return now preserves the existing Easy workspace, while an explicitly analyzed query result or a post-commit database table may still become a derived canonical source.

A real browser replay on `next-008` found one remaining routing bug: Investigation had registered its session rows as a secondary Advanced source and, because registration also made that source active, `Open Advanced` could still open the synthetic Investigation source instead of the canonical Easy source. Core `ecfff03fe7924fe5d7477f10df61b26b31cd9258` closes that gap. `Open Advanced` from Home now explicitly activates the exact current Easy dataset source before navigation; a newer Investigation source may remain available as a separate workspace input but cannot silently replace the current canonical source.

The acceptance replay uses `Sales_ERP_May_2026.xlsx` from the repository sample corpus and executes the exact owner sequence. After `Return to Easy`, the application is back on `/` with `Sales_ERP_May_2026.xlsx`, 1,500 rows, 13 columns, `Runtime: full source available`, and the same six evidence-backed perspectives. It does not auto-open a chart, does not expose `advanced:workspace...`, does not ask to reselect the file, and does not create a new synthetic Investigation history record. The pre-existing synthetic history count from earlier bug reproductions remained unchanged at 4; the only new saved session was the valid `local_xlsx` source at 1,500 rows.

Machine verification for the final head passes continuity/session tests 5 files / 20 tests, focused Advanced source/return tests 2 files / 6 tests, the selected governed CI set 11 files / 39 tests, generation contract 3/3, generation diagnostics 8/8, UAT-pack validation 4 fixtures / 14 scenarios / 3 levels, release contract 3/3, public-boundary verification, desktop production build, and the 470-module source-size gate with zero violations.

The canonical Internal runtime is `g-2026-08-31-next-009`, parent `bootstrap-current-8d59d05f575373e6`, Core/source `ecfff03...`, CP `c251fb1...`, schema `061_integrations_delivery`, and manifest SHA-256 `817d27dd90e3245d0d0ef38ade89ef26386b9e5b8850410c784415db6390eff5`. Gateway `5273`, Core `5272`, CP `5274`, and worker are healthy; CP and worker report the same `next-009` generation/CP commit with zero pending migrations. The existing CP/worker user-systemd units now own those two Internal processes, replacing the temporary manual launch lifecycle. Production `5172/5173/5174` remained present and unmodified. This is an Internal bug-test acceptance checkpoint only; formal owner UAT/promotion acceptance remains open and Trust Phase 2A remains unfrozen.

## 83. Investigation sidebar source authority and NEXT-010/NEXT-011

The NEXT-009 Home-header repair was necessary but not sufficient. Owner browser testing then exercised a different route: `Money by location -> sidebar Advanced -> open CURRENT -> Return to Easy`. The sidebar navigation did not pass through Home's explicit source activation. Investigation had already registered its own result rows as a supplementary Advanced source, and ordinary source registration made that newer source active. Advanced therefore opened the Investigation result rather than the canonical Easy source; `Return to Easy` correctly treated that source as derived, which caused the unwanted sales-trend auto-analysis and later source-reselection failure.

Core `92906b1a91b283d248b9a7eb911265a8126498b9` fixes the authority at the registration boundary rather than adding another navigation-specific patch. Investigation may still register its result as a separate Advanced source for intentional exploration, but it registers that supplementary source without activating it. Canonical intake/restore sources retain the default activation behavior. A real browser replay of the exact sidebar workflow then returned to the original Easy workspace without `advanced:workspace...`, auto-charting or source reselection. This behavior was packaged as `g-2026-08-31-next-010`, manifest SHA-256 `d8ce0a61319a565589b74f706984d3c71eaafcca18f2a289220a859490a9eb74`.

Core `fcefeb0d3c3a3c0d36f618d77c9cd654e8635a6d` adds the component-level guard that renders Investigation, registers the synthetic Advanced source and proves that the canonical source remains active. This makes the invariant fail loudly if a future refactor drops the non-activating registration option. The test-guard head was packaged as `g-2026-08-31-next-011`, manifest SHA-256 `5d0495a179e62d8e17f37e80d5efce8be89a467572689463be562d767a841ab0`. The exact owner sidebar workflow passed again on reconciled NEXT-011; the persisted Investigation-session count remained unchanged across the replay. No control-plane source or production service changed in NEXT-010/011.

These checkpoints strengthen one rule: a supplementary workspace source may be discoverable without becoming canonical merely because it was registered later. Source activation is an authority decision, not a recency side effect. Formal owner UAT/promotion remains separate from these bug-test acceptances.

## 84. Governed multi-file Advanced/Easy continuity and NEXT-012

Owner testing next exposed the same continuity requirement at collection scope. The repository six-file ERP fixture set — Sales May/June, Accounting May/June and Logistics May/June — produces six governed sources, 9,000 rows, three business roles and two reporting periods. After choosing `Executive overview`, Advanced correctly opened one `canonical_perspective_collection` with six DuckDB tables, but the toolbar hid `Return to Easy` because the presentation gate only allowed a table context or a one-table file source. The collection's Advanced source also lacked the preserved Easy workspace snapshot.

Core `d82bdb625b69755af51f42c01e2a35fe00731c28` closes both gaps without flattening the collection. `home-canonical-multisource-build.ts` first constructs the ready Easy collection dataset, assigns an explicit Advanced source identity, and attaches that same ready dataset as `easyReturnDataset` when registering the six-table collection. `advanced-source-store.ts` centralizes Easy-continuity detection and explicit source activation; the Advanced toolbar now permits return whenever a valid Easy snapshot exists, regardless of table count. `useAdvancedResultTransferActions.ts` consumes that preserved snapshot directly. A no-op return therefore does not rerun a query, create an Investigation session, collapse six sources into one table, or manufacture a derived `advanced:...` identity.

Headless Chromium acceptance used the exact six repository fixtures and executed `Executive overview -> Advanced -> open CURRENT -> Return to Easy`. The restored Easy workspace reports `6 sources · 3 business roles · 2 periods`, `Runtime: Governed`, retains the Executive Overview result, and contains neither source-reselection nor synthetic Advanced identity. Opening Advanced a second time returns to the same CURRENT collection showing `6 tables · 9,000 rows`, proving that the explicit collection source identity survives the round trip.

Verification at `d82bdb6...` passes the focused Advanced continuity tests 10/10, selected governed CI 11 files / 39 tests, generation contract 3/3, generation diagnostics 8/8, UAT-pack validation 4 fixtures / 14 scenarios / 3 levels, release contract 3/3, public-boundary verification, desktop production build, and the source-size gate at 470 production modules with zero violations. The exact Internal runtime is `g-2026-08-31-next-012`, parent `bootstrap-current-8d59d05f575373e6`, Core/source `d82bdb6...`, CP `c251fb1...`, schema `061_integrations_delivery`, manifest SHA-256 `0f8ec8f1178a6298a69f297f5254ecb81603fea248615e4a7bfdd092f3bc9264`, and Core binary SHA-256 `0c9d37ae54b874e85ff3ad2ce792875a318e72c32146ad9e340383d5831d3d60`. CP and worker diagnostics both report NEXT-012, exact CP commit and current schema with zero pending migrations; Trust remains blocked pending Phase 2A freeze. Production `5172/5173/5174` remained untouched. Formal owner UAT/promotion acceptance remains open.


## 85. NEXT-013 native recovery/auth, starter demos, and governed user documentation

NEXT-013 closes four owner-reported product gaps without weakening the existing canonical source/execution boundaries. The immutable runtime generation is `g-2026-08-31-next-013`, parent `bootstrap-current-8d59d05f575373e6`, Core/source `00e6d89c9465fd75bd72a824f48dabbdc83495b6`, private control plane `d1a7d439fe43d8678626e377c2853558bc50c8d6`, schema `062_documentation_content`, and manifest SHA-256 `c54df6e84f3fe90fe0ca99f9a0107d39c4b7b839ccc47ce6cd6bcbf23e400e7d`.

Native session recovery preserves the Phase 8F.1 fail-closed rule. New local-file sessions can persist the complete source through the existing project source-file vault and later rebuild a current canonical runtime source. Windows native routing is regression-tested against the embedded Core origin `http://lightbi.localhost/api/project/source-files`. A legacy Beta session that never persisted the complete source bytes still requires one explicit source reselection; representative rows are never promoted into full-file authority merely to make history appear restorable.

Native account transport now distinguishes runtime security models. Browser/web uses the existing HttpOnly-cookie path with credentials included. Native uses its OS-vault/Bearer-token path with browser credentials omitted, avoiding the invalid cross-origin WebView combination of wildcard CORS plus credentialed fetches. This change does not loosen the control-plane CORS policy or turn browser storage into authentication authority. Unit/contract proof is green, but packaged Windows owner acceptance remains a separate open gate because this VPS cannot execute the owner's Windows Tauri binary.

Home starter suggestions are now executable teaching scenarios rather than no-data prompts. Synthetic `LightBI_Demo_*` files are created in-memory and enter the same inspect → canonical understanding → governed action → runtime path as user files. Browser acceptance proves `Compare branch revenue` (32 rows), `Review employee attendance` (36 rows), `Review receivables aging` (28 rows), and `Combine Excel reports` as a two-source/two-period governed comparison. Built-in demos are explicitly isolated from Session History so teaching data cannot become user-source or persisted-session authority.

User documentation is now owned by the private control plane rather than a second CMS. Migration `062_documentation_content` adds durable page content; the documentation domain owns validation/persistence, public `/api/docs` reads, and admin CRUD under `/api/admin/docs`. Admin writes remain behind existing admin authority plus the explicit admin-action header. Public rendering escapes raw HTML and supports a bounded Markdown subset. A read-only built-in guide set remains available if documentation persistence is unavailable; mutations fail closed instead of silently writing elsewhere.

The distribution routing contract is intentionally simple and corrects an implementation mistake found during Internal testing: control plane `5274` is already the distribution root. Therefore `http://100.94.184.141:5274/` is the Internal distribution homepage, `http://100.94.184.141:5274/docs` is the direct documentation portal, and `/distribution` is not a route. The desktop gateway exposes `http://100.94.184.141:5273/docs` by proxying only the docs shell/assets to CP; `/distribution-api/*` remains an API proxy for desktop/control-plane calls and is not a public portal mount. The distribution homepage header/footer links directly to `/docs`.

Internal PostgreSQL migration 062 was applied explicitly to `127.0.0.1:55432/lightbi_internal`; all 15 ordered migrations are applied and pending count is zero. CP/worker are deployed through the existing user-systemd Internal units and report NEXT-013, exact CP commit, schema current, and a healthy matching worker. The Core server process was not forcibly restarted because the automation safety boundary refused termination; the exact rebuilt server binary is byte-identical to the running server hash (`0c9d37ae54b874e85ff3ad2ce792875a318e72c32146ad9e340383d5831d3d60`) and this generation changes frontend/gateway behavior rather than Rust server code.

Exact-head verification passes CP **122/122**, selected governed Core **11 files / 39 tests**, release contract 3/3, public boundary, generation contract 3/3, generation diagnostics 8/8, owner UAT-pack validation 4 fixtures / 14 scenarios / 3 levels, desktop production build, and the source-size gate at 471 production modules with zero violations. Browser acceptance passes the four starter demos plus distribution/docs routes; real Internal admin documentation CRUD passes create → public read → update → delete → public 404 with no test page left behind. Production `5172/5173/5174`, production persistence, PR #4, Trust-1/signer/attestation and production keys remain untouched.


## 86. NEXT-014/NEXT-015 documentation hardening and first-paint closure

NEXT-014 packages exact Core `d96011bfe2d3deca8424eac15f6d3e7d39cf7a97` and private control plane `497ffbf9592faddefec72280a4ddd244efab648c` as `g-2026-08-31-next-014`, parent `bootstrap-current-8d59d05f575373e6`, schema `062_documentation_content`, manifest SHA-256 `2878d3b6893db87940ad82d76070da92a34bc546a024ff45ad373a55b917fe05`. Core strengthens deterministic starter demos and purges legacy synthetic demo sessions rather than allowing teaching data to persist as user history. CP expands the documentation library, adds real screenshots and machine-readable SEO surfaces, adds the explicit docs-sync CLI, and makes TypeScript under `src/web/` the source owner for the distribution web bundle while `public/*.js` remains compiled output.

The isolated Internal schema stays at 062 with all 15 migrations applied and zero pending. Documentation sync created 11 missing pages and updated 5 existing pages. `me@thaiduy.digital` was upserted as the Internal admin and a real browser login succeeded. Browser acceptance proved the vertical docs sidebar, real screenshot image responses, Internal noindex/robots/sitemap/llms behavior, admin Docs controls, and demo-history ephemerality: demo-session count stayed zero while 24 existing real sessions remained 24. Machine proof at this checkpoint is CP **127/127**, selected governed Core **11 files / 39 tests**, demo/session regressions **3 files / 10 tests**, generation contract 3/3, generation diagnostics 8/8, UAT manifest 4 fixtures / 14 scenarios / 3 levels, release/public-boundary, desktop build and source-size 471/0.

Owner screen recording then exposed a presentation defect outside those semantic/data gates: navigating to `/docs`, `/account` or `/admin` could visibly paint the distribution homepage for one frame because all frontend routes initially received the same full `index.html` homepage body and the route-specific renderer replaced it only after module startup/API work. CP `f1879c65453cdf0bc9798257e462264f0424e907` fixes this at the first-paint boundary. A guard installed in `<head>` marks only `/docs*`, `/account` and `/admin` before body parsing, and CSS suppresses the homepage's direct `.nav`, `#top` and footer nodes until route-specific rendering replaces the body. It does not add a second router or alter route authority.

That CP fix is packaged as `g-2026-08-31-next-015` with unchanged Core `d96011b...`, schema 062, app version `0.9.2-beta.7-next.15`, and manifest SHA-256 `110d7503bed7b93a849a9e453fa82bb9fc4be7be4aad30670fb69e04f719e97a`. CP/worker diagnostics report exact NEXT-015/`f1879c6...`, current schema and healthy matching worker; canonical Internal 5272/5273/5274 were restarted with the new generation identity. A pre-page browser animation-frame observer proved `homeFlash=false` for Docs index, Docs detail, Account login, Admin login, authenticated Admin and Admin Accounts. CP full compiled-runtime proof is now **128/128**; the exact Core gates remain green at 11/39 plus 3/10 demo/session. Production `5172/5173/5174`, production persistence, PR #4, Trust signer/attestation and production keys remained untouched. Formal owner UAT/promotion acceptance and packaged Windows native acceptance remain separate open gates.

## 87. NEXT-016 Monaco SQL suggestion-controller runtime closure

NEXT-016 is an identity-preserving successor generation for one Advanced-editor runtime defect found after NEXT-015. Core `451c9b6afe0a95bce5bce473a4a84c8b918f42cd` explicitly enables the Monaco SQL suggestion controller in `AdvancedSqlEditor.tsx` and adds a runtime-contract regression. This does not create a new SQL semantic engine: the existing contextual completion provider remains the suggestion authority; the change ensures Monaco's suggestion controller is present so those completions can actually surface in the editor UI.

Private control-plane source remains exact `f1879c65453cdf0bc9798257e462264f0424e907`; therefore the secondary-route first-paint fix from NEXT-015 remains unchanged. Headless Chromium revalidation on the live Internal portal reports the synchronous secondary-route guard on `/docs`, `/account` and `/admin`, no homepage hero node, and zero observed visible-home paints on all three routes.

The reconciled Internal runtime is `g-2026-08-31-next-016`, parent `bootstrap-current-8d59d05f575373e6`, Core/source `451c9b6afe0a95bce5bce473a4a84c8b918f42cd`, CP `f1879c65453cdf0bc9798257e462264f0424e907`, schema `062_documentation_content`, app version `0.9.2-beta.7-next.16`, and manifest SHA-256 `72f223df5c2508e2d1e278497e1d8a664aa55f87c5c497f8d48d5a76b77e7f90`. CP diagnostics report schema current/pending 0 and a healthy worker on the same NEXT-016 generation/CP commit. The served `5273/lightbi-generation.json` is real JSON and byte-identical to the archived manifest.

Exact Core revalidation at `451c9b6...` passes the focused Monaco runtime contract 1/1, generation contract 3/3, generation diagnostics 3/3, desktop production build, and the selected governed regression 11 files / 39 tests. CP proof remains the NEXT-015 exact-head 128/128 suite because CP source did not change. Production `5172/5173/5174`, production persistence, PR #4, Trust signer/attestation and production keys remain untouched. Formal owner UAT/promotion acceptance and packaged Windows native acceptance remain separate open gates.

## 88. Road-to-1.0 execution freeze and optional ERPNext revenue mirror

On 2026-08-31 the owner authorized a single execution roadmap from the immutable NEXT-016 baseline to stable 1.0. The operational sequence is recorded in [`../history/agent/plans/AGENT_PLAN_ROAD_TO_1_0_2026-08-31.md`](../history/agent/plans/AGENT_PLAN_ROAD_TO_1_0_2026-08-31.md). This plan does not reopen the Business Understanding architecture; pre-1.0 scope is now product acceptance, account-security UX, test/release taxonomy, official identity, Trust, entitlement/Pro separation, platform signing, optional revenue mirroring and release engineering.

The canonical official-identity contract is [`../architecture/road-to-1-0-trust-release-contract.md`](../architecture/road-to-1-0-trust-release-contract.md). Fork/rebuild rights remain governed by the public open-source license, while official Account/Pro authority is intended to require LightBI-rooted release/install/entitlement trust. A client-side `Official` claim is never authority. The exact Phase 2A head `fb8225c951fc27692e6b0e7554c3112ada08e49f` remains NOT FROZEN, so production Root/issuer keys, signer, attestation, signed ENT and PRO authority are still forbidden to start.

The owner has Oracle Cloud access, but current direction does not move the LightBI Root into OCI merely to use a free KMS/HSM tier. Phase 2A uses Ed25519 and the Root boundary remains offline and user-controlled after freeze. OCI may later be evaluated for compatible operational secret/signer infrastructure without becoming the Root trust authority by convenience.

A separate optional operational contract is [`../architecture/commerce-erpnext-revenue-mirror.md`](../architecture/commerce-erpnext-revenue-mirror.md). Completed LightBI commerce may be mirrored asynchronously into the owner's ERPNext for revenue tracking. ERPNext and n8n are explicitly downstream: payment/order/entitlement commit happens first in LightBI, then `commerce.order.completed.v1` flows through the transactional outbox and worker. ERPNext/n8n outage must not affect checkout, activation, Basic operation or Trust authority.

The live VPS already provides both an ERPNext installation inside LXD and n8n in Docker. The ERPNext site contains substantial sample data, so any authentic LightBI E2E should use a dedicated LightBI company/master boundary rather than polluting existing sample companies. Synthetic E2E orders must be clearly marked or removed so they cannot be counted as real revenue.

Owner decision on 2026-08-31 selects Paddle as the intended payment provider; payment configuration is deferred. The downstream scaffold now uses dedicated ERPNext Company `LightBI Inc`, custom DocType `LightBI Order Mirror`, and inactive n8n workflow `lightbiRevenueMirror01` (`LightBI Revenue Mirror to ERPNext (Paddle-ready)`) at `lightbi-revenue-mirror-v1`. Its HMAC credential is intentionally unresolved, so the scaffold fails closed and cannot be treated as a live payment receiver.

This checkpoint completes **R1-P0** at the documentation/integrity gate. The plan/contracts are indexed; a scoped link check resolved 1,243 local links with zero missing targets; both Project Truth JSON files parse; and `git diff --check` passes. The documentation commit remains the final mechanical checkpoint before product/integration mutation begins.
## 89. NEXT-017 account security, release gate, and Paddle accounting scaffold

NEXT-017 is the first Road-to-1.0 stabilization successor after the NEXT-016 baseline. Its exact public Core is `93296e46d250be7d2f885b2cbb06e25068f38761`; private control plane is `d615832768f89c861ae508c210713c92ed6b74e2`. The immutable Internal generation is `g-2026-08-31-next-017`, parent `g-2026-08-31-next-016`, schema `062_documentation_content`, app version `0.9.2-beta.7-next.17`, and manifest SHA-256 `b1c849eb7c88d46cd6801c340b970a8e9993cd556fdd12a0d0dfbe612510dd0a`. Archived, current-pointer and served desktop manifests are byte-identical.

R1-P2 now has a real Account Security management surface rather than backend-only capability. The CP browser authority under `src/web/` exposes TOTP enrollment/login, one-time recovery codes and rotation, Passkey enrollment/login, factor listing and revoke controls, plus inline MFA/recovery step-up before sensitive mutations. Security mutations bump `security_version`, so an older session cannot remain authoritative after factor changes. Passkeys remain fail-closed outside HTTPS/secure browser context. The compiled CP authoritative suite passes **134/134** at the exact successor head; `/distribution-assets/account-security.js` is served successfully by direct CP and the Internal gateway. Secure-context/manual Passkey acceptance remains separate from machine verification.

R1-P3 now has one explicit platform-independent release authority: Core `pnpm test:release-1.0`. It composes the existing release contract, public/private boundary, generation/UAT contracts and diagnostics, source-size check, production desktop build and selected governed product regressions. The historical full desktop Vitest universe remains available as `test:historical-desktop:diagnostic` and is not redefined as release authority. The new release suite passed before NEXT-017 packaging.

Runtime reconciliation is complete. Gateway header, served generation manifest, CP diagnostics and worker all report NEXT-017 and exact CP `d615832...`; schema is current with pending migrations `[]`. Production `5172/5173/5174` remained running on their pre-existing processes and was not restarted or repointed. Formal owner UAT and packaged Windows acceptance remain R1-P1 gates.

The optional Paddle→ERPNext path was also corrected from a generic mirror into a digital-service accounting mirror. ERPNext uses isolated `LightBI Inc`, non-stock `LIGHTBI-PRO`, `Paddle Clearing - LBI`, Sales Invoice with `update_stock=0`, Payment Entry, and `LightBI Order Mirror` as idempotent integration state. n8n workflow `lightbiRevenueMirror01` is now `LightBI Paddle Revenue → ERPNext Invoice + Clearing`, 26 nodes and inactive. It requires explicit `providerAmount` plus separately governed `accountingAmountVnd`; it never guesses minor-unit exponents or FX.

Email Template `LightBI Purchase Confirmation` and Print Format `LightBI Purchase Invoice` provide a dedicated LightBI-branded purchase/accounting copy. Notification is bound but disabled. Render proof produced a valid 24,004-byte PDF without sending mail, and the template explicitly states Paddle is Merchant of Record and owns the official payment receipt/invoice. Payment-provider setup, live HMAC activation and live/retry E2E remain intentionally open and cannot become checkout/entitlement dependencies.

The next Trust action is R1-P5: independent re-audit of exact Phase 2A `fb8225c951fc27692e6b0e7554c3112ada08e49f`. Phase 2A is still unfrozen; Root ceremony, issuer private keys, signer, attestation and signed ENT/PRO work remain prohibited until an explicit freeze decision.
## 90. R1-P5 Phase 2A independent re-audit PASS; owner freeze still required

R1-P5 independently re-audited the public Trust Contracts v1 branch rather than accepting CI-green as freeze authority. The first detached audit of exact `fb8225c951fc27692e6b0e7554c3112ada08e49f` reproduced all existing green gates but still rejected the candidate for additional semantic defects: provider-specific `stripe` entitlement source after the Paddle decision, non-canonical SemVer aliases, an unused `entitlement_version`, inclusive issuer expiry, reusable Root/issuer purpose key material, unvalidated persisted trust state, claim-token expiry inconsistency, stable/prerelease ambiguity, and unconstrained signed `product_id`.

Those blockers were remediated on the existing Phase 2A branch without introducing a signer or private production key. `528b7c220df0bc5f458526fdfca693a3b101dacd` adds provider-neutral `commerce`, subject-scoped entitlement rollback/equivocation state, canonical SemVer, half-open issuer/claim lifecycles, Root/REL/ATT/ENT/PRO key-material separation, strict persisted-state validation and stable-channel protection. `10de4da8e551a46f93f7b62985a0a6e611581b8e` additionally binds REL/ATT/PRO `product_id` exactly to `digital.thaiduy.lightbi`. PR #4 remains Draft/Open/unmerged at that exact head.

A fresh detached worktree at `10de4da...` then passed release contract 3/3, public/private-key boundary, TypeScript Trust **22/22**, Rust parity **5/5**, desktop production build, and the governed regression set **7 files / 26 tests**. Adversarial probes prove production Root pin remains `unconfigured` with no public key, provider-specific `stripe`/`paddle` values are not signed entitlement authority, wrong-product REL/ATT/PRO payloads fail schema validation, previous entitlement trust state is required, and no production signing implementation exists outside tests. GitHub CI run `33397723902` also completed successfully at the same exact head.

The independent technical verdict is therefore **AUDIT PASS / AWAITING OWNER FREEZE**. This is deliberately not `FREEZE APPROVED`: `phase2aFreezeApproved=false`, PR #4 remains unmerged/draft, and R1-P6 Root ceremony plus all issuer private-key/signer/attestation/signed-ENT/PRO work remain prohibited until the owner explicitly records the freeze decision. The macOS unsigned-validation workflow is additive and remains outside the Phase 2A gate.

## 91. NEXT-018 commerce, marketing, Admin security and announcement source candidate

The Road-to-1.0 Trust sequence remains owner-gated at R1-P6 HOLD. In parallel, the owner expanded the operational distribution requirements before stable 1.0: managed Paddle/Stripe gateway configuration, package/price/discount administration, checkout pause and website maintenance controls, persistent web/app announcements, newsletter marketing, managed SMTP, and stronger Admin authentication. These are distribution/control-plane capabilities and do not alter the Business Understanding engine or authorize Root/signer work.

Public Core `57304194e7c21d3e036c6dcb1793914f97c74118` adds a native-only persisted notification inbox. Distribution announcements are pulled as text metadata, stored locally by revision, exposed through `/notifications` and `/notifications/:id`, and do not carry executable remote commands. Core `test:release-1.0` remains green at 11 governed files / 39 tests plus production build, generation diagnostics and UAT contracts.

Private CP `1868e3db5039b3b08df63afe7bee9f7bd6f12125` establishes provider-neutral commercial catalog authority. Browser checkout submits only internal catalog price identity and an optional promo code; CP resolves provider price/discount mappings and signs provider/account/package/price/discount context before fulfillment. Public campaign discounts and code-only newsletter promotions are distinct, history/audit is retained, monetary authority is integer minor units plus ISO currency, and Paddle/Stripe webhooks fail closed on signature, price, payment-state or context mismatch. Legacy reusable-key payment fulfillment is not part of this successor path.

The same CP candidate adds encrypted managed SMTP, consent-only newsletter subscribers, immutable queued campaigns and per-recipient durable deliveries. PostgreSQL transactional outbox remains durable truth; Redis coordinates only global marketing rate/defer behavior. Marketing failure cannot become payment/account entitlement authority. Admin authentication is separately hardened from end-user Account security: dedicated Admin TOTP/recovery/passkeys, security-version-bound sessions, phishing-resistant Passkey sessions, and recent strong-auth plus password reauthentication for payment, catalog, discount, announcement, SMTP and marketing mutations. Break-glass access cannot perform those high-value mutations.

Final source verification passes CP 157/157, focused commerce/mail/Redis 20/20, focused Admin Security 4/4, foundation/security 11/11, `git diff --check`, secret-material scan, and production dependency audit with no known vulnerabilities. Read-only infrastructure review confirms NEXT PostgreSQL/Redis are localhost-bound, NEXT services are NetBird-address scoped, Internal env files are mode 0600, and owner-provided Oracle Security List evidence exposes only public 80/443 plus required NetBird/VPN UDP ports. Remaining defense-in-depth debt includes pinning n8n away from `latest`/observed `2.20.7-exp.0`, stronger systemd sandboxing, and possible Docker-socket/proxy/header hardening.

This is **source candidate evidence, not deployment evidence**. Candidate migrations `063`–`066`, encryption/security keys, Internal restart/promotion, Paddle sandbox credentials/webhook routing, managed SMTP configuration and n8n activation remain blocked pending owner infrastructure approval. Active Internal remains NEXT-017; Production 5172/5173/5174 remains no-touch. The reproducible security/impact record is [`../history/audits/AUDIT-next018-commerce-security-infra-2026-08-31.md`](../history/audits/AUDIT-next018-commerce-security-infra-2026-08-31.md).

## 92. NEXT-021 authentication/security closure and current Internal runtime

The current Internal successor is `g-2026-08-31-next-021`, parent `g-2026-08-31-next-020`. Exact runtime identity is Core `57304194e7c21d3e036c6dcb1793914f97c74118`, private control plane `1ef53f947af030deca54208cb5c6f71ced785e67`, schema `065_marketing_newsletter_mail`, app `0.9.2-beta.7-next.21`, and manifest SHA-256 `01f86a89ea82127dab49d0aa2ddcdb2a23538b8974461b5cdde08c29ed1190ec`.

NEXT-021 closes the owner-reported Account/Admin authentication UX without changing Trust authority. TOTP enrollment now generates QR data locally, expires pending enrollment after 90 seconds at the backend boundary, supports refresh that revokes the prior pending factor, and uses LightBI-managed account-distinguishing labels. Password, Google and one-time-link primary authentication prefer an enrolled account-bound Passkey; TOTP/recovery is fallback when configured. One-time sign-in links expire after 20 minutes and are consumed once.

Password reset for both Account and Admin requires two independent reset materials from the same email: the reset URL token plus a generated temporary password. The new password must be confirmed, verifier failures are bounded, password reset invalidates prior sessions/security authority, and email verification no longer creates an authenticated session automatically. Account Passkey step-up upgrades the existing bound session to phishing-resistant assurance rather than creating unrelated login authority.

Admin Commerce/Marketing sensitive mutations use the shared `adminStrongMutation` path. When the backend requires recent strong authentication, the browser attempts Passkey first and retries the original mutation only after successful verification; TOTP/recovery is the fallback path. This replaces the earlier owner-visible `admin_reauthentication_required` dead end.

Private CP verification is 167/167 authoritative tests PASS, including the dedicated NEXT-021 security pack 6/6; production dependency audit reports no known vulnerabilities. HTTPS `lightbi-next.thaiduy.digital` serves the new QR/Passkey mutation assets, and `/api/v1/internal/diagnostics` reports exact NEXT-021/CP SHA, schema current with pending `[]`, and healthy matching worker.

The stale runtime evidence pointer that still referenced NEXT-017 was corrected. Served, active-registry and archived NEXT-021 manifests are byte-identical at the SHA above. Production `5172/5173/5174` was not restarted or modified. Phase 2A remains unfrozen and Trust signer/attestation/private-key work remains blocked; R1-P6 remains HOLD.

## 93. R1-P4 official identity/trademark boundary and NEXT-022

R1-P4 now has an explicit legal/branding boundary and a truthful client identity surface. Public Core successor `ed044e0a6ceb98eb8d052ddbac17249893005bb6` adds root-level `TRADEMARK_POLICY.md`, links the policy from README, and adds a Settings `Build identity` panel. The policy preserves AGPL fork rights while separating them from misleading claims of official origin, endorsement, publisher identity, domains, signing identity, update authority, or official infrastructure.

The client UI is intentionally fail-closed. Internal builds render `Internal test build` and `Not an official public release`. A public build with unfrozen Trust renders publisher verification unavailable. Even `trust1_enabled` does not by itself produce an `Official release verified` badge; that state requires independent REL/ATT evidence from later Trust phases. Editable client branding is never treated as proof of origin.

Focused identity regressions pass 3/3. Core `test:release-1.0` passes the complete platform-independent release gate, including production build and governed 11-file / 39-test product regression. R1-P4 is implemented, machine-verified, committed and pushed; final owner visual acceptance of the Settings panel remains open.

Immutable Internal `g-2026-09-01-next-022` is deployed with parent NEXT-021, Core `ed044e0a6ceb98eb8d052ddbac17249893005bb6`, private CP `1ef53f947af030deca54208cb5c6f71ced785e67`, schema `065_marketing_newsletter_mail`, pending migrations `[]`, healthy matching worker, and manifest SHA-256 `e0b6a250a5d2711da1edc0f1e61ee8d1318c484b58ef1d0e40c289e9672d30fd`. Production 5172/5173/5174 remained on their pre-existing processes. R1-P6 remains owner-HOLD; no Root/signer work was started.

## 94. NEXT-023 ERP-style Admin navigation shell

Owner UX review requested replacing the horizontal `/admin` function tabs with a left navigation pattern similar to ERPNext. Private CP successor `c4db73bfa829e4c6e36a0210fbd9db1ac311aff6` normalizes every Admin section into one canonical sidebar: Monitor (`Overview`, `App usage`), Business (`Accounts`, `Licenses`, `Revenue`, `Commerce`, `Newsletter & Mail`), and System (`Security`, `Docs`). Existing business forms, authentication and mutation authority are unchanged.

Desktop Admin now reserves a fixed 220px left rail with LightBI identity, grouped navigation, active-state highlight and a bottom Sign out action. At widths below 900px the same canonical navigation becomes a horizontally scrollable responsive bar rather than consuming mobile screen width. This is one global shell enhancement rather than duplicated page-specific navigation logic.

UX-focused regression passes 4/4 and the complete CP authoritative suite passes 169/169. Immutable Internal `g-2026-09-01-next-023` is deployed with parent NEXT-022, unchanged Core `ed044e0a6ceb98eb8d052ddbac17249893005bb6`, CP `c4db73bfa829e4c6e36a0210fbd9db1ac311aff6`, schema `065_marketing_newsletter_mail`, pending migrations `[]`, healthy matching worker, and manifest SHA-256 `ad2c062f8458d28a792b3b7843d88aa842ec99feba21dbfdf4028f7f3f37f728`. Production 5172/5173/5174 remained untouched. Owner visual acceptance of the new sidebar is pending.

## 95. NEXT-024 TypeScript distribution boundary and collapsible Frappe-style Admin rail

Owner review of NEXT-023 identified two separate issues: the Admin shell lacked ERPNext/Frappe-style collapse/expand behavior, and the earlier statement that Distribution had completed its TypeScript migration was too broad. A fresh source audit found 33 authored `apps/distribution/*.test.mjs` files even though runtime and browser source authority had already moved to TypeScript.

Private CP successor `ecb17a8a01ac08aa3c42d391d974bfe13a5cd59b` closes both gaps. All 33 legacy Distribution test modules are now `.test.ts`; a dedicated `tsconfig.tests.json` typechecks them before runtime execution, and a boundary regression rejects future authored `.mjs`, `.cjs`, `.jsx`, or `.js` outside generated `public/` and `dist/`. The resulting Distribution authority is TypeScript for runtime source, browser source and tests; generated browser/runtime JavaScript remains an output artifact rather than source authority. Next.js was intentionally not introduced: the private control plane retains its single Node deployment/runtime boundary while adopting the Frappe interaction model without adding a second frontend server/router/security surface.

The Admin shell now implements a stateful Frappe-inspired sidebar contract: 220px expanded navigation, 58px icon rail when collapsed, persistent state across reload, explicit collapse/expand control, `Ctrl+/` keyboard toggle, grouped section dividers, icon/tool-tip affordances and preserved active navigation. The existing responsive horizontal fallback below 900px remains. This changes navigation UX only; Account/Admin auth, Commerce, Marketing, Docs and analytical authority are unchanged.

Verification passes the complete CP authoritative suite **170/170**, Distribution test TypeScript typecheck, focused Admin/TypeScript boundary 3/3, `git diff --check`, and production dependency audit with no known vulnerabilities. HTTPS headless-browser acceptance authenticated through the real Admin policy: password primary authentication returned the expected Passkey-first requirement and the test used the configured TOTP fallback, then proved `220px expanded -> 58px collapsed -> reload remains 58px -> reopen 220px` with the active `Newsletter & Mail` item preserved.

Immutable Internal `g-2026-09-01-next-024` is deployed with parent NEXT-023, unchanged Core `ed044e0a6ceb98eb8d052ddbac17249893005bb6`, CP `ecb17a8a01ac08aa3c42d391d974bfe13a5cd59b`, schema `065_marketing_newsletter_mail`, all 19 Internal migrations applied/pending `[]`, and a healthy worker on the same generation/CP commit. Served, active-registry and archived manifests are byte-identical at SHA-256 `a61df79d3ff76b652df8880dd95cd846bfca56f0b800bf7147803eb55d4b1c04`. Production `5172/5173/5174` remained on their pre-existing processes and was not restarted or repointed. Owner visual acceptance of the NEXT-024 Admin rail remains open; this generation is still Internal bug-test state and is not a promotion of NEXT over Production.

## 96. Permanent pre-production chassis, off-host recovery, and NEXT-025 source checkpoint

The owner approved [`ADR-123`](../adr/ADR-123-engine-chassis-preproduction-and-disaster-recovery.md): `lightbi-next.thaiduy.digital` is now the permanent pre-production chassis and `lightbi.thaiduy.digital` remains the permanent Production chassis. Hostnames do not exchange roles. Promotion moves only an exact accepted engine identity (Core/Control Plane code, artifacts, migrations and runtime contracts); database rows, Redis state, users, licenses/devices, sandbox commerce, mail tests, telemetry, source-vault data and secrets remain local to their chassis and never promote from NEXT to Production.

Before stable 1.0, the existing Beta Production database will be snapshotted/archived and a fresh Production database will be migrated from zero to the accepted schema to establish a clean Day-0 measurement baseline. This is a future cutover gate, not an authorization to reset Production now. After 1.0, Production data is durable and normal engine promotion never resets it.

Oracle Free Tier compute is treated as replaceable. The activated off-host DR lane backs mutable chassis state to encrypted Restic storage on R2 while rebuilding Git worktrees, dependencies and Rust build caches from pinned identities. Restore drills on 2026-09-01 passed without mutating the active chassis: NEXT restored SQLite/Core metadata integrity plus 48 PostgreSQL public tables and all 19 migrations; Production-Beta restored SQLite integrity plus 11 PostgreSQL public tables. The encrypted bootstrap and wrapped recovery key are present off-host. Ubuntu user-systemd linger is enabled so backup/release timers can survive reboot without an interactive SSH login.

R2 now has a separate Internal release namespace at `lightbi-next/releases/`, initialized with an Internal-channel marker for `https://lightbi-next.thaiduy.digital`. The release-sync timer polls every two minutes. Before the first Internal release, missing `latest.json` is deliberately a healthy no-release-yet state; once a release exists, manifest/artifact/hash errors remain fail-closed.

The current owner-facing runtime remains immutable **NEXT-024** (`g-2026-09-01-next-024`, Core `ed044e0...`, CP `ecb17a8...`, schema 065). The NEXT-025 source candidates are ahead but are not deployed: Core `2b65b88fa722ca429062a8dee19b9363bfe15baf` and private CP `2b72e91b32b7f956eb9f1fe26bd4ec39eb4b76d0`. Their next gate is an Internal Windows artifact wired to the permanent NEXT release lane, followed by real A→B updater, Inbox/announcement, transactional mail and native regression acceptance. Production `5172/5173/5174`, Production data and Trust R1-P6 remain untouched/HOLD.

## 97. NEXT-025 Windows updater acceptance candidate reaches silent-update R2 pair

Owner testing of the earlier `25.8.x`/`25.9.x` Windows acceptance builds proved the native updater could discover the NEXT catalog, download in the background, report progress, verify SHA-256 and stage the installer, but also exposed two separate blockers. Tauri event ACL initially blocked progress listeners; after that was corrected, `Update & Restart` launched the NSIS package as an ordinary elevated installer and exposed the uninstall/install wizard instead of behaving as an in-app update. The same acceptance cycle also exposed local Session History durability defects, including sample-only overwrite and a later save path that could leave History at zero.

Public Core candidate `f1654419c2a0b252795cf9a637d0412c3023de29` on `codex/next025-native-boundary` now contains the accumulated NEXT-025 native fixes. Local source persistence is established when a local dataset reaches Ready, Investigation may not replace durable full-source metadata with a sample-only snapshot, Windows native HTTP uses the hardened transport, update-event ACL is minimal, and the Windows updater launches the verified per-machine NSIS artifact through `ShellExecuteW("runas")` with Tauri's `/S /UPDATE /R` contract. This means the accepted behavior is one Windows UAC approval followed by silent in-place update and automatic relaunch, not an interactive uninstall/reinstall wizard.

Download presentation is also separated from download truth. Native byte-derived progress remains authoritative and is monotonic; the React surfaces interpolate only toward the latest proven percentage, never beyond bytes actually received. Settings, notification menu, sidebar status and the global update bar share that smoothed presentation. Release-authoritative local verification passes the complete `test:release-1.0` suite, including History durability 13/13, desktop production build and governed product regression 39/39; focused updater/progress UI regression passes 15/15.

GitHub Actions `NEXT Internal Update Acceptance` run `33524736531` (run #10) completed successfully at exact Core `f165441...`. Both Windows jobs passed the native-boundary/updater contracts, built MSVC NSIS installers, normalized checksum/provenance and uploaded artifacts. The isolated R2 publisher then passed immutable A/B manifest construction, upload under `lightbi-next/releases/`, and R2 authority verification.

The current owner-test pair is A `0.9.2-next.25.10.1`, 29,704,226 bytes, SHA-256 `feb4897de94dfd7859d2d85813a8357c5090967e4342af424f2fcfa6d17e4c59`; B/latest is `0.9.2-next.25.10.2`, 29,696,293 bytes, SHA-256 `1f794209f604aebb34808e8b10dd357bb4b5f1f098f6ef49a765ea81c013fc0e`. The two-minute NEXT release mirror synced B at 2026-09-01 22:30 ICT, and the public Internal `latest.json` returns the same version/hash.

A branded-edge verification immediately after publication found one additional release-mirror defect: R2 contained both A and B, but the VPS sync script mirrored only `latest.json`'s artifact, so B returned HTTP 200 while A returned HTTP 404 at `/internal-releases/`. Core ops commit `98b57aebc4cd038f3c4774d03de1a538edffa1d3` changes the mirror contract to materialize every Windows x86_64 release currently published by `index.json`, verify each immutable executable/sidecar/manifest SHA before switching catalog pointers, and adds `indexedPairMirror=true` to the pre-production operations gate. The live sync script was atomically replaced from that exact commit and the service completed successfully with `mirrored_versions=0.9.2-next.25.10.2 0.9.2-next.25.10.1`. Full `test:release-1.0` remained green at governed 39/39 after the ops change. Branded HTTPS then proved both A and B HTTP 200 with exact manifest sizes and full streamed SHA-256 matches. The ops-only commit uses `[skip ci]`, and Actions remains at run #10 so no unintended `25.11.x` pair replaced the owner-test lane.

This is **machine-verified candidate evidence, not owner acceptance**. R1-P1/NEXT-025 remains open until real Windows acceptance proves at minimum: a Ready local file immediately creates durable Session History; analysis/Investigation/app restart preserves executable full-source history; A downloads/verifies B; `Update & Restart` shows only the expected Windows permission boundary, no NSIS wizard; and LightBI relaunches as B. The active Internal runtime is already immutable `g-2026-09-01-next-025`, Core `0c6a5bc88304e154cf074233b9f1d43ac1460669`, CP `2b72e91b32b7f956eb9f1fe26bd4ec39eb4b76d0`, schema `065_marketing_newsletter_mail`; this runtime identity is intentionally distinct from Windows artifact source `f165441...` and release-ops source `98b57ae...`. Production `5172/5173/5174`, Production data and Trust R1-P6 remain untouched/HOLD.

## 98. NEXT-025 Windows connectivity hardening after 25.10 owner failure

Owner testing of `0.9.2-next.25.10.1` failed before download: Core API remained Healthy while Control Plane diagnostics were Unavailable and update preparation reported the service unavailable. Immediate server-side verification proved the opposite at the same time: Internal CP `5274`, public `/api/v1/health`, `/api/v1/internal/diagnostics`, `/api/releases/latest`, and `/internal-releases/latest.json` all returned HTTP 200; the exact `LightBI-Native/0.9` User-Agent was also accepted. This isolated the defect to packaged external-client transport behavior rather than CP/R2/Cloudflare availability.

Core `c78124df3973fcfe2107a966563f3266e97f3deb` hardens that boundary. For idempotent GET/HEAD traffic, a native HTTP exception or native non-2xx response may fall back through WebView2; mutation methods are never replayed after native failure. Internal updater discovery additionally falls back from the dynamic `/api/releases/latest` catalog to the static authoritative `/internal-releases/latest.json` edge. Focused transport/updater/diagnostics tests pass 20/20; complete `test:release-1.0` remains PASS with History durability 13/13 and governed product regression 39/39.

GitHub Actions run `33529657486` (run #11) passed both Windows contract/build/provenance jobs and the isolated R2 publisher. Current owner-test pair is A `0.9.2-next.25.11.1`, 29,701,606 bytes, SHA-256 `9f7843afed8c1313d2836fdc2db3599ef5374e138c1ef19ef479c338d46a3039`; B/latest is `0.9.2-next.25.11.2`, 29,696,585 bytes, SHA-256 `f642cf6ee31fe2f6f6cc16f0137b9e9cc494a920502e792b9b748db47e5ed140`. The indexed-pair mirror synced both versions, and full branded-HTTPS streams of A and B matched those hashes. Dynamic API latest and static release-edge latest both identify B.

This remains machine-verified candidate evidence. Because `25.10.1` contains the connectivity defect, the next owner test requires one manual installation of A `25.11.1`, followed by real A→B updater/History acceptance. Active Internal runtime remains `g-2026-09-01-next-025` with runtime Core `0c6a5bc...` and CP `2b72e91b...`; Windows artifact source `c78124d...` is intentionally recorded separately from runtime source. Production and Trust R1-P6 remain untouched/HOLD.


## 99. NEXT-026 Passkey recovery UX and sign-in help closure

Owner testing of the HTTPS Account/Admin sign-in surfaces exposed a WebAuthn UX defect after the NEXT-025 native acceptance work. Cancelling the operating-system Passkey picker throws `NotAllowedError`; the browser flow caught that exception and surfaced its raw diagnostic string, including a W3C WebAuthn URL. Because the fallback was implicit inside the failed Passkey path, a user with an enrolled authenticator could not deliberately choose TOTP/recovery before reopening the Passkey prompt.

Private CP `30bb58ffeaaad80014fb7c57522a7b8a4eb6feb8` on `codex/next025-passkey-login` fixes the authority boundary rather than masking the browser error. Account and Admin now keep Passkey as the preferred strong-authentication method but render an explicit **Use authenticator or recovery code** action whenever a server-issued fallback exists. WebAuthn cancellation/timeout/unavailability is converted to LightBI-owned friendly text; raw browser exception messages and the W3C diagnostic URL are not displayed. Passkey buttons use a fingerprint icon for direct visual recognition.

Both `/account` and `/admin` now expose **Having trouble signing in? Need help?** linking to `/docs/sign-in-and-account-recovery`. The new guide covers Passkey cancellation/unavailability, authenticator TOTP, one-time recovery codes, one-time email sign-in links, password reset, and the distinct Account/Admin authority boundaries. One-time email links remain primary factors only and do not bypass an already configured strong-authentication policy. Google remains an Account primary-authentication option rather than an Admin authority.

Source verification passes the focused auth/documentation pack **21/21** and the complete private CP authoritative suite **175/175** after full TypeScript/build regeneration. The successor manifest contract passes **3/3**. Served HTTPS assets were independently checked for the new alternate-method/help/fingerprint markers and for absence of the raw W3C WebAuthn diagnostic URL.

Immutable Internal `g-2026-09-02-next-026` is deployed with parent NEXT-025, Core `c78124df3973fcfe2107a966563f3266e97f3deb`, CP `30bb58ffeaaad80014fb7c57522a7b8a4eb6feb8`, schema `065_marketing_newsletter_mail`, app `0.9.2-beta.7-next.26`, and manifest SHA-256 `98addf25986a513d728c5e19743106a25af0d0c4e90f37d1a3d76a9e8bf63b7a`. The immutable Core binary SHA-256 is `3a6e87f37a8016eebae71b714cf4fc8e5f6f4af954b1617a543a1a35a23b9c8a`. CP diagnostics report schema current/pending `[]` and a healthy worker on the same generation/CP commit; Trust remains `blocked_pending_phase2a_freeze`.

This is **deployed machine evidence, not owner acceptance**. Owner acceptance still must prove on both Admin and Account that cancelling Passkey returns to LightBI without raw WebAuthn diagnostics, that configured TOTP/recovery remains explicitly selectable and succeeds, and that the help link opens the published recovery guide. The separate packaged-Windows A→B/History acceptance remains open. Production `5172/5173/5174`, Production data and Trust R1-P6 remain untouched/HOLD.

## 100. NEXT-027 branded announcement templates and Inbox/mail visual convergence

Owner UX direction made the existing Pro-key email the visual authority for customer communications. Public Core `b3ada6776417fdb422e7e852b6f4363b328ab650` and private CP `c012c572a7b0794aea75cdbb007490cfa2ebb8a5` implement one structured announcement vocabulary: `general`, `promotion`, `update`, `warning`, and `hotfix`. Admin selects a template and supplies text/optional CTA/schedule/channels; raw announcement HTML is not accepted. The Admin live preview and the LightBI Inbox renderer use the same branded grammar: dark LightBI header, white rounded content card, template-specific priority treatment, and a footer that includes Documentation and Support. The existing Pro-key mail footer now also links to LightBI Documentation.

Migration `066_announcement_templates` adds `template_kind` with `general` as the backwards-compatible default and constrains it to the five governed values. Existing announcements therefore remain readable without rewriting their semantic content. Private CP verification passes the complete authoritative suite **179/179** plus the focused template/mail contract pack **4/4**; Core Inbox-focused tests pass **4/4**, desktop production build transforms 3,767 modules successfully, and the full `test:release-1.0` gate remains PASS with History 13/13 and governed product regression 39/39.

Immutable Internal `g-2026-09-02-next-027` is deployed with parent NEXT-026, Core `b3ada6776417fdb422e7e852b6f4363b328ab650`, CP `c012c572a7b0794aea75cdbb007490cfa2ebb8a5`, schema `066_announcement_templates`, app `0.9.2-beta.7-next.27`, manifest SHA-256 `8cb350fda7e41ef4376574f1d96374acb9275cfd5b59b1b2c06d6cc47ccfbd97`, and unchanged Core-server binary SHA-256 `3a6e87f37a8016eebae71b714cf4fc8e5f6f4af954b1617a543a1a35a23b9c8a`. Internal PostgreSQL reports all 20 migrations applied/pending `[]`; public diagnostics report exact NEXT-027/CP identity, schema current, and a healthy matching worker. The existing app-announcement API returns `templateKind` through the public edge, proving the new contract is live.

GitHub Actions `NEXT Internal Update Acceptance` run `33578098883` / #12 passed both Windows A/B build-contract jobs and the isolated R2 publisher at exact Core `b3ada677...`. Branded HTTPS verification proves A `0.9.2-next.25.12.1`, 29,704,813 bytes, SHA-256 `87c5dd8f55debf701733ee8161c68f618d800e4e8878ea8c4bf6ccc3cfd62e54`; B/latest `0.9.2-next.25.12.2`, 29,698,186 bytes, SHA-256 `2feb44b1a075397dc4e5b46828ee5af239c5be52290709597ba869e543afc740`. `index.json` contains both releases and `latest.json` identifies B.

This is **deployed and machine-verified evidence, not owner visual/native acceptance**. Owner acceptance still needs to confirm the five Admin previews, the branded Inbox rendering/footer links on the packaged app, and the previously open A→B silent updater/full-source History flow. Production `5172/5173/5174`, Production data, and Trust R1-P6 remain untouched/HOLD.

## 101. R1-P5 freeze gate revalidated; R1-P6 Offline Root ceremony remains owner-gated

The owner resumed the main Road-to-1.0 Trust path on 2026-09-02 and requested progression from R1-P5 toward R1-P6. The canonical execution plan defines R1-P5 as the independent Phase 2A re-audit whose exit requires explicit `FREEZE APPROVED`, and R1-P6 as the **Offline Root ceremony**. The resume instruction authorizes revalidation and preflight, but it is not silently rewritten into the required freeze-decision record. R1-P5 authority has not drifted: GitHub PR #4 (`codex/phase2-trust-contracts`) remains Draft/Open/unmerged and points exactly to `10de4da8e551a46f93f7b62985a0a6e611581b8e`; GitHub CI run `33397723902` remains successful and no later PR head has replaced the audited candidate.

A fresh local CI-equivalent revalidation was executed at that exact head rather than relying only on historical GREEN evidence. Release contract passes **3/3**; the public/private source-boundary guard passes; Trust TypeScript lint passes and Trust tests pass **22/22**; Rust cross-runtime parity passes **5/5**; the desktop production build passes; and the exact seven-file governed regression set passes **26/26**. The Phase 2A worktree is clean after the gate. Negative freeze probes independently confirm `LIGHTBI_ROOT_PIN_V1` is still `status='unconfigured'` with `public_key=null`, there are zero tracked private-key literals, no tracked `.pem/.p12/.pfx/.key/.jwk` authority material, and no production signer/signing implementation outside test-only vectors and the boundary scanner.

The R1-P5 technical verdict is therefore **FREEZE-READY / AWAITING EXPLICIT OWNER FREEZE**. Machine truth remains deliberately fail-closed: `phase2aFrozen=false`, `rootCeremonyAuthorized=false`, and `trust1SignerAllowed=false`. The exact next owner record is `FREEZE APPROVED — PR #4 codex/phase2-trust-contracts @ 10de4da8e551a46f93f7b62985a0a6e611581b8e`. Only after that record may **R1-P6** begin the Offline Root ceremony; R1-P7 remains the later Private Trust-1 signer phase. Production Root/issuer private material, Production signer provisioning, Production REL/ATT/ENT/PRO signing and official-service enforcement remain prohibited before the freeze record. The separately named NEXT/Internal rehearsal signer is exempt only as non-production test authority and cannot satisfy a Production trust check.

R1-P6 was also preflighted without generating any authority material. The owner then refined custody policy so NEXT can exercise the complete chain without weakening Production identity. NEXT/Internal may create a cryptographically distinct non-production test Root and test REL/ATT/ENT/PRO issuer authority inside a hardened signer service on the existing ARM host or the owner's separate 1x1 private-subnet VPS. That authority is disposable, uses distinct identifiers/namespaces, and is never promoted or accepted as Production trust.

The **Production Root** rule remains strict: its private key is generated and retained on a separate owner-controlled offline machine after freeze approval. When an accepted NEXT engine becomes public Production, engine code may promote but trust material does not; Production receives its offline Root and separate production issuer authority. R1-P7 may host only purpose-specific Production issuer private keys online, preferably on the 1x1 signer VPS. Same-host ARM deployment is permitted only under a dedicated hardened signer boundary with separate OS/container identity and key volume, no Docker socket or host-filesystem authority, private-only network exposure, minimal egress, read-only/no-new-privileges sandboxing, bounded signing operations, durable audit and secret-redaction controls. Production Root private material never enters the online signer.

The currently running Internal chassis was read-only reconciled as `g-2026-09-02-next-028`, Core `b3ada6776417fdb422e7e852b6f4363b328ab650`, CP `9606c1bd052dff641a7949b79caf47b87bbe6eb7`, schema `067_catalog_quarterly_pricing`, with pending migrations `[]`, healthy matching worker and Trust status `blocked_pending_phase2a_freeze`. That operational successor is separate from Phase 2A freeze authority and does not alter the exact audited PR #4 head. Production remains untouched.

## 102. NEXT non-production Trust signer rehearsal deployed on hardened ARM boundary

After the owner approved environment-separated custody, a private NEXT-only signer rehearsal was implemented on branch `codex/next029-trust-signer-rehearsal`. The final signer source is `8568ed90c5a44c52b048dfdca6bd94410027aaee`; it consumes the exact independently audited public Trust Contracts v1 authority at `10de4da8e551a46f93f7b62985a0a6e611581b8e` rather than defining a second canonicalization or schema dialect. The signer remains a separate private workspace/service and is not imported into the Distribution API/control-plane server. The existing Distribution foundation guard therefore remains green.

The rehearsal authority is explicitly `next_internal_test_only` and non-promotable. One disposable TEST Root signs a TEST issuer keyset containing purpose-separated REL, ATT, ENT and PRO issuer public keys. The runtime signer does **not** receive the TEST Root private key; only the four issuer private keys, signer configuration and bearer token are mounted into the signer boundary. The authority uses NEXT-specific key identifiers and can never satisfy stable/public Production trust. Production Root/issuer authority was not generated.

The deployed container image is `lightbi-next-trust-signer:8568ed90c5a4-trust-10de4da8` with image ID `sha256:8dcb8e96feda93bb54c747ced89da02176dc6ad64b425730dab7930561bac0e2`. The service runs as non-root UID/GID `1001:1001`, with read-only root filesystem, `cap-drop=ALL`, `no-new-privileges`, PID limit 64, 128 MiB memory limit and 0.25 CPU limit. On the ARM rehearsal host it uses `network=none`; requests cross only a local Unix-domain socket with mode `0600`. The issuer-key/config mount is read-only, Docker socket is absent, host TCP exposure is absent, and direct negative probes confirm rootfs and signer-config writes are blocked. The signer authority directory is outside the current NEXT Restic backup whitelist, so the disposable private rehearsal material is not automatically exported by the chassis backup.

Signer tests pass **6/6** after custody hardening, including overwrite refusal and binding every mounted issuer private key to the Root-signed issuer keyset. The complete existing private CP authoritative suite remains **183/183 PASS**, including the guard that keeps private Trust implementation outside Distribution server source. Live UDS E2E verification signs and independently verifies all four purpose-specific envelope classes — REL release, ATT installation certificate, ENT entitlement and PRO package — with the exact public Trust verifier. Negative live probes also pass: unauthenticated keyset access is rejected, a `stable` release request is rejected by the NEXT signer, and no generic `/sign` endpoint exists. Logs were checked for API-token, PEM and smoke-payload leakage; only bounded audit metadata such as request ID, purpose and `kid` is emitted.

This rehearsal service does **not** make the active application generation NEXT-029. The customer-facing/Internal chassis remains `g-2026-09-02-next-028`, Core `b3ada6776417fdb422e7e852b6f4363b328ab650`, CP `9606c1bd052dff641a7949b79caf47b87bbe6eb7`, schema `067_catalog_quarterly_pricing`, with a healthy matching worker. Its current Trust status remains `blocked_pending_phase2a_freeze`; CP has not yet been wired to the signer. Production remains untouched, `phase2aFrozen=false`, and Production R1-P6 still requires the explicit owner freeze record before Production Root ceremony.

## 103. NEXT-029 Trust-chain rehearsal reaches REL publication and request attestation

Internal Trust rehearsal progressed without changing Production authority. The active customer-facing/Internal chassis is now immutable `g-2026-09-02-next-029`, Core `b3ada6776417fdb422e7e852b6f4363b328ab650`, runtime CP `6936fc4272bc92cd1badc00b9256cfd912e4a9ad`, schema `067_catalog_quarterly_pricing`, with 21 migrations applied/pending `[]`, a healthy matching worker, and manifest SHA-256 `f38c634760db258f18dae9c0996b36b16df7007f146f13d3374b6f229a3d9fa9`. Production services and persistence were not modified.

R1-P7 **NEXT rehearsal** is machine-complete without claiming Production phase completion. A bounded CP-side rehearsal client uses real Internal authority/read-model code, opens a synthetic entitlement transaction, signs and verifies REL/ATT/ENT/PRO through the isolated TEST signer, rolls the transaction back, and records bounded audit evidence. No synthetic entitlement row remains. Distribution itself never receives the signer token and still exposes no generic signing endpoint. Private CP verification remained green at **187/187** after this bounded-client addition.

R1-P8 **NEXT rehearsal** publishes only public TEST trust material under the Internal `/internal-trust/` namespace. Source `6936fc4272bc92cd1badc00b9256cfd912e4a9ad` separates signing and serving planes: the publisher may use the UDS signer, while the CP HTTP runtime only reads public Root/keyset/REL material. Complete CP verification is **189/189**. HTTPS re-fetch verified the TEST Root-signed issuer keyset and REL for Windows `0.9.2-next.25.12.2`; streaming the actual installer produced SHA-256 `2feb44b1a075397dc4e5b46828ee5af239c5be52290709597ba869e543afc740`, exactly matching the signed REL. The namespace is `next_internal_test_only` and `promotableToProduction=false`.

R1-P9 **NEXT rehearsal** is implemented as a separate verification-only sibling service rather than weakening the existing Distribution foundation guard. Exact private source is `b4e254ed41cad42af82dcef3376e36ba9afd3c5c`, image `lightbi-next-trust-attestation:b4e254ed41ca-trust-10de4da8`, image ID `sha256:6f47bddcd728158812caea198e4c98207eea9e31ba0d4e85ce680655c8dc5b31`. The verifier has `network=none`, UDS `0600`, non-root execution, read-only rootfs, dropped capabilities, no Docker socket, no signer mount/token, public Trust material read-only, and a mode-0600 persistent replay/revocation state file. Its runtime explicitly reports `signingAuthority=false`.

The rehearsal request protocol is named `lightbi.next-attestation-request.v1` because audited Phase 2A defines the ATT certificate but not a frozen Production request-proof wire schema. A live ephemeral Ed25519 device key obtained a TEST ATT certificate and proved request binding over method, path, timestamp, monotonic sequence, server nonce, body digest, and certificate identity. Sequences 1 and 2 were accepted; nonce replay, body tamper, sequence rollback, and target mismatch were rejected fail-closed. Sequence floor persisted byte-identically across verifier restart. Device private material was not persisted. Workspace/boundary tests pass **8/8**, the pre-freeze Distribution guard remains **8/8**, and the Distribution authoritative suite remains **189/189**. These are R1-P7/P8/P9 rehearsal results only; `phase2aFrozen=false`, Production Root ceremony remains owner-gated, and no TEST authority is promotable.

## 104. R1-P10 NEXT signed-entitlement conjunction rehearsal passes Account Pro and Business 5-seat authority

R1-P10 has been exercised on the non-production Trust domain without promoting any TEST authority. Final private rehearsal source is `31fa5428896f6e9cb7877d353e2485b43d7a1671`; the verification-only attestation/Pro gate runs `lightbi-next-trust-attestation:31fa5428896f-trust-10de4da8`, image ID `sha256:a08e1f681b6ab564b9dc19b5b3202f33224e44d5ef4f54ab5dbe3be2ee228899`, pinned to public Trust Contracts `10de4da8e551a46f93f7b62985a0a6e611581b8e`. Main application runtime remains NEXT-029 at CP `6936fc4272bc92cd1badc00b9256cfd912e4a9ad`; the new rehearsal CLI and verifier are not imported into the Distribution HTTP runtime.

The conjunction gate now authorizes Pro only when all independent proofs agree: a real AccountAuth-authenticated account subject, a fresh device-signed request under a trusted ATT installation certificate tied to an allowed REL, a valid Root→ENT signature chain, exact subject or active organization-membership binding, and the requested signed capability. ENT trust state is persisted per subject so version rollback/equivocation cannot be hidden by process restart. Account entitlements must be tier `pro`; organization entitlements must be tier `business` with a governed named-user seat limit.

Live E2E created an isolated email account through the actual register→verify→password-login→session flow, then issued account Pro ENT versions 1 and 2 through `EntitlementAuthorityRepository` and the TEST ENT signer. Both authorized `pro_runtime`; replaying version 1 after version 2 was rejected as `entitlement_rollback_detected`, and an authenticated-subject mismatch was rejected as `pro_authority_subject_mismatch`. A synthetic organization with an active owner membership and signed Business entitlement at `seat_limit=5` also authorized successfully. Device private material remained ephemeral. The organization/ENT rows were inside a rolled-back transaction and the synthetic account was deleted; post-run database probes report zero rehearsal accounts, zero `p10:` authority entitlements and zero rehearsal organizations. Durable audit evidence remains.

Final exact-head gates pass: attestation/Pro verifier suite **12/12** and private CP authoritative suite **193/193**. The verifier runtime remains `network=none`, UDS-only, non-root, read-only rootfs, no signer mount/token, and `signingAuthority=false`. This closes only **R1-P10 NEXT rehearsal**. Production signed-entitlement authority still depends on Production R1-P6/R1-P7/R1-P9 and the explicit Phase 2A freeze record.

## 105. `cli-lightbi` signer operator console plan freezes operator UX before further Trust-plane expansion

The owner approved a bounded operator-console workstream before R1-P11 continues. The durable operational plan is [`AGENT_PLAN_CLI_LIGHTBI_SIGNER_OPERATOR_CONSOLE.md`](../history/agent/plans/AGENT_PLAN_CLI_LIGHTBI_SIGNER_OPERATOR_CONSOLE.md). `cli-lightbi` is a host-side operator UX/control surface only; it cannot become signing authority, contain Root/issuer private material, expose a signer web admin, add arbitrary signing, weaken REL/ATT/ENT/PRO purpose separation, or turn NEXT TEST authority into Production authority. The existing hardened signer container remains the cryptographic appliance.

Only **Phase A / v0.1 read-only** is authorized in the current implementation pass: keyboard-driven TUI, unmistakable environment identity, signer/issuer status, public Root→issuer verification, bounded audit viewer, and aggregate `doctor` diagnostics. The first usable release must have no mutation commands, no operator-MFA implementation, no new TCP/web listener, no embedded secrets and no signer-container redesign. After Phase A acceptance the implementation must stop/report before Phase B MFA or Phase C/D mutation/lifecycle helpers begin.

R1-P11 is paused rather than abandoned. Its private worktree remains based on P10 head `31fa5428896f6e9cb7877d353e2485b43d7a1671` with uncommitted rehearsal work isolated to the attestation verifier and new `trust-pro-delivery` workspace. `cli-lightbi` implementation must use a separate clean worktree so that operator tooling cannot accidentally absorb or normalize that WIP. Production remains untouched; `phase2aFrozen=false` and the Production Root ceremony remains owner-gated.

Owner visual acceptance refinement for `cli-lightbi` Phase A now requires a Rust/Ratatui presentation layer comparable in quality to `btop`; the TypeScript/Node read-only collector remains the Trust-verification bridge so cryptographic semantics are not duplicated. Plain ANSI menus are explicitly below acceptance.

## 106. `cli-lightbi` v0.1 read-only Ratatui operator console reaches Phase A machine closure

The owner-approved signer-console Phase A is implemented separately from the signer appliance at private CP source `86512968d02ceca91c3292bb8a8648275ce60a22`. `cli-lightbi` is now a host-side Rust/Ratatui operator surface with exact environment labeling, issuer/health/audit panels, realtime refresh, keyboard navigation, responsive layouts and modal detail views. It consumes a bounded local TypeScript/Node collector that performs only existing signer UDS reads and exact public Trust verification against `10de4da8e551a46f93f7b62985a0a6e611581b8e`; it contains no signer private material, Production Root, signing primitive, generic signing route, web listener or lifecycle mutation path.

Immutable host installation points `~/.local/bin/cli-lightbi` at source-pinned release `86512968d02ceca91c3292bb8a8648275ce60a22`; the installed Rust binary SHA-256 is `ee2f65c5a80e64bae49ac190be52ac5cab3e35d9d3da23a6fc5bbf58f919a7b6` and its provenance records `readOnly=true`, `signerRuntimeModified=false`, environment `next_internal_test_only`. Exact-head verification passes Node **15/15**, Rust TUI **5/5** plus Clippy, signer **6/6**, attestation/Pro **12/12**, and private Distribution **193/193**. Actual TEST token/Root bytes are absent from source/build/binary artifacts.

Live operational acceptance proves keyboard/modal/resize/quit behavior under a real PTY, visible stale state when the NEXT signer is stopped, fail-closed nonzero command behavior while signer is unavailable, rejection of an over-permissive 0644 UDS until restored to 0600, and rejection of rotate/revoke/sign/raw-sign/bypass-style commands without changing the signed keyset. Final `doctor` is green across signer process/socket/container hardening, Production Root absence, Root→issuer chain, four active issuers, audit leak scan and clock synchronization. The signer remains image `sha256:8dcb8e96feda93bb54c747ced89da02176dc6ad64b425730dab7930561bac0e2`, `network=none`, no published port and no Docker socket.

This closes **only `cli-lightbi` Phase A / v0.1 machine acceptance**. Per owner plan, Phase B operator MFA and Phase C/D mutation helpers remain closed. The owner subsequently directed execution back to the main Road-to-1.0 path, so the previously paused R1-P11 physical Basic/Pro separation rehearsal is the next active work item. Production Trust freeze/Root gates remain unchanged and Production was not mutated.

## 107. R1-P11 NEXT physical Basic/Pro separation rehearsal closes device-bound private delivery

The main Road-to-1.0 path resumed after `cli-lightbi` Phase A and the preserved R1-P11 work was completed on private branch `codex/next031-pro-delivery-rehearsal`. Final source is `deda7c284a6eafaa8cb69d491b96476a025ed15c`, pinned to exact public Trust Contracts `10de4da8e551a46f93f7b62985a0a6e611581b8e`. R1-P11 remains a non-production rehearsal: the customer-facing application chassis stays NEXT-029 and no Production trust authority is generated or accepted.

The rehearsal separates Basic and Pro physically rather than relying on a UI tier flag. The private Pro publisher signs a PRO manifest through the isolated TEST PRO issuer, encrypts the package once with a random AES-256-GCM content key, and persists only ciphertext, the protected content key, and the signed record under a mode-0700 private package root with mode-0600 files. The runtime `trust-pro-delivery` sibling has no signer token/key and mounts public Trust, the encrypted private package, and the attestation UDS read-only. P10 authorization issues a one-time 60-second delivery grant bound to `package_id` plus an ephemeral X25519 delivery public key. The delivery runtime consumes that grant and wraps the content key to the bound device with X25519/HKDF-SHA256/AES-256-GCM.

Live E2E uses a real AccountAuth session, trusted ATT/device proof, Root-verified signed ENT and signed PRO manifest. Correct-device decrypt verifies the PRO plaintext SHA/size; a different X25519 private key fails unwrap and replaying the consumed grant returns `pro_delivery_grant_invalid_or_consumed`. Device and delivery private keys are ephemeral and are not persisted by the client rehearsal. Synthetic account and entitlement authority rows are cleaned to zero while durable audit evidence remains. Public Basic engine, CP, release and public-Trust trees were scanned for the private Pro marker and actual content key with zero hits; journals also contain neither marker/key nor private-key PEM material.

A pre-closure flattened-image scan exposed one hardening issue: the first delivery image included `publisher-cli.js`, which contained a rehearsal private-Pro marker literal even though it contained neither the actual plaintext package nor content key. That publisher code is unnecessary at runtime, so commit `deda7c2...` changed the image builder to copy only `contracts-loader.js`, `delivery.js`, and `server.js` and added a regression that forbids publisher/issuance CLI in the runtime image. The rebuilt image `lightbi-next-trust-pro-delivery:deda7c284a6e-trust-10de4da8`, ID `sha256:d176985adbf35ef30275d15d53660be5d512c28ca02613c5009ca09e8c5ecfda`, then produced zero private-marker/content-key hits. Its runtime remains UID 1001, rootfs read-only, `network=none`, ports `{}`, `cap-drop=ALL`, `no-new-privileges`, and UDS 0600.

Final exact-head gates pass Pro delivery **9/9**, attestation/Pro **14/14**, and private Distribution **197/197**. This satisfies the R1-P11 **NEXT rehearsal** exit shape `private signed/encrypted device-bound Pro package delivery`; it does not satisfy Production R1-P11. The next active Road-to-1.0 work is R1-P12 anti-impersonation closure, where REL/ATT/legal identity can be rehearsed on NEXT but supported-platform publisher signing remains a separate trust plane and must not be faked.

## 108. R1-P12 NEXT anti-impersonation software closure is verified; Production platform-signing gate remains blocked

R1-P12 now has two exact successor-source authorities without altering the active NEXT-029 application chassis. Public Core branch `codex/next033-r1p12-identity` is finalized at `079c344952749d7a01c830a1b88c1d4247a1f5cf`; its first fail-closed identity state-machine commit is `304d4b48b2f410fe623afecef86c9ab35a8352f7`. Private Distribution verifier branch `codex/next033-r1p12-anti-impersonation` is clean and pushed at `85fa6a6961ba2bb00e2d09d92e6a9f5f815a3478`. These are source/verification candidates, not a new governed generation deployment and not Production authority. Active runtime remains `g-2026-09-02-next-029`, Core `b3ada6776417fdb422e7e852b6f4363b328ab650`, CP `6936fc4272bc92cd1badc00b9256cfd912e4a9ad`, schema 067.

The software closure makes official identity explicitly conjunctive and fail-closed. Internal/NEXT is always presented as TEST authority rather than an official public release. Production `official_verified` requires REL verification, matching artifact digest, valid ATT installation state and the applicable OS publisher identity. SHA-only updater staging is now named **integrity checked** end to end: user-visible copy no longer says a downloaded installer is “verified”, native Tauri command `prepare_verified_update` became `prepare_integrity_checked_update`, staged metadata uses `integrityChecked`, and a regression forbids restoring `verified` vocabulary to this SHA-only path. The Settings external-verifier link also fails closed: NEXT derives `/verify` from the public site origin rather than the Distribution API path; Production shows no verifier link unless an explicit HTTPS verifier URL is configured.

The independent NEXT `/verify` surface is served by the private Distribution candidate and remains public verification-only code. It independently verifies the TEST Root → issuer keyset → REL chain, detects modified REL metadata, validates a TEST ATT certificate only when bound to the verified release, and keeps OS publisher trust separate from REL and SHA-256. Exact private suite is **204/204 PASS**. Live `https://lightbi-next.thaiduy.digital/verify` returns 200 and its shipped verification bundle explicitly states `NEXT cannot become “Official LightBI — verified”`, `TEST Root → keyset → REL verified · non-production evidence only`, `verification_unavailable for Production official identity`, and that OS publisher identity is separate.

Public exact-head gates at `079c344952749d7a01c830a1b88c1d4247a1f5cf` pass focused updater/identity **24/24**, Rust updater **5/5** with one intentionally ignored live-only acceptance test, `git diff --check`, desktop production build (3,767 modules), and the full authoritative `test:release-1.0` suite including governed product regression **39/39**. GitHub independently exposes the exact commit and parent; no Actions run exists at that exact head, so this record deliberately claims local authoritative machine verification rather than GitHub CI.

The R1-P12 exit gate is still **BLOCKED** by real publisher evidence. The current Windows NEXT installer `0.9.2-next.25.12.2` has PE certificate-table offset `0` and size `0`, so it is not Authenticode signed. The macOS validation job explicitly performs `Build universal ad-hoc signed DMG` and `Validate ... ad-hoc signature`; it is not Apple Developer ID signed or notarized. A Production independent-verification URL is also not configured, and Production REL/ATT authority cannot exist before the explicit R1-P5 freeze and later Production Root/signer phases. Therefore R1-P12 is **NEXT software closure verified / Production official-identity closure blocked**. R1-P13 remains unauthorized because its dependency is `all prior release gates`. Production was not touched and `cli-lightbi` Phase B/C/D remain unauthorized.

## 109. Owner prioritizes Windows stabilization before macOS/Linux re-entry

On 2026-09-02 the owner changed the execution order for the remaining Road-to-1.0 platform work after testing the current macOS Beta and finding substantial product defects. **Windows is now the authoritative stabilization lane.** macOS Beta defects are recorded as deferred debt, and both macOS and Linux package/platform testing are postponed until the Windows application is genuinely stable. This is a sequencing decision rather than a permanent Windows-only product declaration.

R1-P12 therefore continues on the Windows lane: the existing anti-impersonation state machine, TEST external verifier and SHA-vs-official vocabulary closure remain valid, while the current Windows installer still lacks Authenticode and Production REL/ATT/external-verifier authority is still blocked. Apple Developer ID/notarization is no longer an immediate blocker for Windows stabilization, but macOS must remain Beta/deferred and must not be represented as stable or `official_verified`. Linux receives no new 1.0 acceptance claim until its deferred validation lane is reopened.

R1-P13 remains closed for the active Windows lane until its prior Production trust/release gates pass. When macOS or Linux is later promoted as a supported stable platform, each platform must independently satisfy its then-applicable product/package/publisher gates before receiving official-stable claims. This owner decision does not freeze Phase 2A, authorize Production R1-P6, or authorize `cli-lightbi` Phase B/C/D.

## 110. Windows Beta release authority is hardened without pretending Authenticode exists

R1-P12 continues on the owner-approved Windows-first lane at public source `72cfb385f1d35c605d3a09f80657572dc25abe02` (`ci: harden Windows beta release authority`). The public release workflow is now explicitly **Windows Beta Release**: it accepts Beta publication authority only, refuses non-Beta tag publication, no longer builds or publishes a Linux Beta artifact, and leaves macOS/Linux validation deferred until Windows is genuinely stable. The release schema still understands Linux/macOS for later re-entry; this workflow change is execution sequencing rather than permanent platform removal.

Windows packaging now records a native Authenticode evidence sidecar directly from PowerShell `Get-AuthenticodeSignature`, bound to the exact installer SHA-256. Beta mode records the real native state without treating an unsigned artifact as official. Stable-mode validation requires `Valid` Authenticode status, exact expected signer subject and exact artifact digest. `build-release-manifest.mjs` additionally refuses to author a Windows `stable` manifest when the publisher evidence or expected subject is absent. This is a fail-closed readiness gate, not a substitute for a real code-signing certificate.

The Beta publisher can no longer overwrite an existing stable global `release/lightbi/latest.json`: it reads the authoritative object directly from R2 and preserves it when its channel is `stable`, while continuing to update `beta/latest.json`. Authenticode sidecars are uploaded beside the immutable installer and are themselves protected by immutable-object existence checks.

Exact-head machine proof passes public release contract **7/7**, public/private boundary, YAML parse, full `test:release-1.0`, desktop production build and governed product regression **39/39**. GitHub independently exposes exact commit `72cfb385...`; no workflow run/status exists at that head, so these remain local authoritative gates rather than GitHub-CI evidence. A fresh PE-header probe of the current NEXT installer `0.9.2-next.25.12.2` still reports certificate-table offset/size `0/0`, so it is **not Authenticode signed**. R1-P12 therefore remains open on real Windows publisher identity plus Production REL/ATT/external-verifier authority, and R1-P13 remains closed. Production and `cli-lightbi` Phase B/C/D were not touched.


## 111. R1-P12 Windows Native Acceptance #6 passes owner UAT; Bell dropdown is deferred and official identity remains blocked

On 2026-09-03 the Windows acceptance lane advanced to public source `13202fd7136b134f05768a797f3c5dd12d717889`. GitHub Actions `Native Acceptance Artifact` run `33696477945` / run #6 completed **SUCCESS** at that exact source and uploaded artifact `9873149821` (`LightBI-Windows-R1P12-Native-Acceptance`). The acceptance manifest identifies version `0.9.2-next.r1p12.6`, generation `g-actions-r1p12-33696477945-1`, installer `LightBI-NEXT-0.9.2-next.r1p12.6-x64-setup.exe` and SHA-256 `398760459a69520f9b6fa3ec80d7007dc6c8989d64e17764ac66fe2810887cd7`. Native publisher evidence for those exact bytes reports `signature_status=NotSigned`, no signer subject/thumbprint, and `production_authority=false`. This is successful NEXT/Internal packaging evidence, not Authenticode or Official LightBI authority.

Owner UAT accepted the bounded Windows shell exercised in this cycle: installation succeeded, the sidebar behavior was accepted, and external web links opened in the system browser after the NEXT gateway correction. The grouped Bell dropdown defect remains real but was explicitly deferred by the owner as **non-blocking UX debt** for this Road-to-1.0 step. This acceptance does not claim that deferred updater/uninstaller/platform behaviors outside the exercised scope were manually accepted.

Runtime provenance is intentionally separate from the UAT artifact. The active engine symlink and public generation header identify `g-2026-09-03-next-030`; its immutable manifest records Core `7d15d69f2cf0bf39ac98dac9d91faa95edec7847` and intended private Control Plane source `bb50b0d53542da5cd908e2237cbca368f7f87073`. The active gateway service additionally runs bounded overlay `6bb55ab35c2126ae0a584aa662e919f5e3b29ea2`. However, live CP `/api/v1/internal/diagnostics` still identifies generation `g-2026-09-02-next-029` at `6936fc4272bc92cd1badc00b9256cfd912e4a9ad`, and its worker is `unhealthy` with last heartbeat on that NEXT-029 identity. The older `/home/ubuntu/services/lightbi-next-runtime/lightbi-generation.json` likewise still describes NEXT-029. Therefore the Internal chassis is **not fully generation-reconciled**: NEXT-030 Core/gateway is active while CP diagnostics/worker identity remains NEXT-029. The Windows UAT source `13202fd7136b134f05768a797f3c5dd12d717889` is ahead of the immutable Core source and must not be mislabeled as the deployed generation.

R1-P12 therefore remains **ACTIVE / BLOCKED at official identity**, not complete. The exact Windows #6 installer is `NotSigned`; Production Phase 2A still lacks explicit owner freeze, the Production ATT request wire format is not frozen, Production REL/ATT/external-verifier authority is not established, `official_verified` remains unreachable, and R1-P13 remains closed. macOS Developer ID/notarization and Linux validation remain deferred platform debt under the owner-approved Windows-first sequencing and may not receive stable/official claims before their own gates. Production was not touched by this reconciliation.

## 112. R1-P12 NEXT-030 runtime generation drift is closed; signing and Production authority remain the exit blockers

On 2026-09-03 the NEXT-only runtime reconciliation required by the previous checkpoint completed. Private Control Plane exact head `bb50b0d53542da5cd908e2237cbca368f7f87073` passed its full **209/209** suite and read-only migration status against the isolated Internal database reported **21 applied / 0 pending**, schema `067_catalog_quarterly_pricing`. A temporary candidate instance on port 5374 first proved NEXT-030 identity and current schema before the live cutover.

The existing user-systemd Control Plane was then moved from deployed source marker `6936fc4272bc92cd1badc00b9256cfd912e4a9ad` to exact `bb50b0d...`, with a NEXT-030 identity override and the prior runtime folder retained for rollback. The existing worker unit, which had been disabled/inactive, was re-enabled under the same lifecycle owner. Live diagnostics now report generation `g-2026-09-03-next-030`, CP `bb50b0d...`, schema current/pending `[]`, and a **healthy** worker heartbeat on the same generation and commit. The immutable generation manifest remains Core `7d15d69...`, CP `bb50b0d...`; gateway overlay remains `6bb55ab...`. Public NEXT routes and `/distribution-api` health verify through HTTPS.

After runtime reconciliation, public source `13202fd7136b134f05768a797f3c5dd12d717889` was revalidated with the full `test:release-1.0` suite: release contract **8/8**, generation contract **8/8**, generation diagnostics **8/8**, workspace-history durability **13/13**, governed product regression **39/39**, public/private boundary, native capability contract, source-size gate and desktop production build all pass.

R1-P12 therefore no longer has a NEXT runtime-generation blocker. It remains **ACTIVE / BLOCKED** on real Windows Authenticode evidence and the explicitly owner-gated Production official-identity chain: Production Phase 2A freeze, Production ATT request-wire freeze, Production REL/ATT authority and Production external verifier. The exact Windows #6 installer remains `NotSigned`; no code-signing certificate or signing execution path is currently configured in the Windows workflow. Under the owner rule, Production remains read-only until separately authorized. R1-P13 remains closed and the Bell dropdown remains deferred non-blocking UX debt.

## 113. R1-P12 NEXT Windows Authenticode lane is wired but has not signed any bytes

Public R1-P12 source advances to `901dda8fee8d386ed0779c3f4b8ebd5a6d7d8105` (`ci: wire NEXT Windows eSigner Authenticode lane`). This is a source/CI authority update only: the immutable deployed NEXT-030 Core remains `7d15d69f2cf0bf39ac98dac9d91faa95edec7847`, gateway overlay `6bb55ab35c2126ae0a584aa662e919f5e3b29ea2`, and reconciled CP/worker `bb50b0d53542da5cd908e2237cbca368f7f87073`. The previously owner-accepted Windows #6 artifact remains bound to source `13202fd...` and remains `NotSigned`.

The new `.github/workflows/windows-next-esigner-signing.yml` is NEXT-only and non-publishing. It has `contents: read`, no GitHub Release/R2/stable-publication authority, and only runs for narrowly named exact-SHA branches: `codex/native-signing-r1p12-sandbox-<40-sha>` or `codex/native-signing-r1p12-product-<40-sha>`. The branch suffix must equal `GITHUB_SHA`; ordinary pushes to the current R1-P12 source branch cannot invoke the signing provider. GitHub reports zero workflow runs at the wiring head, so no SSL.com credential or signing operation has executed yet.

The lane uses SSL.com eSigner CKA only after the exact-source guard passes. CKA setup is ephemeral on the Windows runner, requires username/password/TOTP plus an expected product certificate Subject, verifies the downloaded CKA installer Authenticode before use, loads the code-signing certificate into CurrentUser, exports its thumbprint for the build, and removes the temporary master key/runner material in an always-run cleanup step.

Windows publisher proof is deliberately stronger than signing the outer installer alone. `windows_publisher.rs` verifies `std::env::current_exe()` with WinVerifyTrust and compares the observed signer thumbprint with compile-time `LIGHTBI_WINDOWS_PUBLISHER_THUMBPRINT`. The new lane therefore feeds the loaded certificate thumbprint into Tauri `bundle.windows.certificateThumbprint`, so the application executable and NSIS package are signed through the native Tauri Windows signing path. Post-build evidence hashes and probes both the application EXE and installer, requires their signer thumbprints to match each other and the runtime-compiled thumbprint, and in `product` mode requires native `Valid` status plus the exact expected signer Subject. `sandbox` is connectivity/rehearsal evidence only and cannot close public publisher trust.

Machine proof after wiring is green: release contract **11/11**, public/private boundary PASS, generation/routing **8/8**, complete `test:release-1.0` PASS including governed product regression **39/39** and desktop production build. The VPS has no Windows provider credentials and no signing run was attempted. R1-P12 therefore remains active: real product Authenticode evidence is still absent, `windowsAuthenticode=false`, and Production Phase 2A/ATT/REL/external-verifier authority plus role rotation remain owner-gated. R1-P13 stays closed and the Bell dropdown remains deferred non-blocking UX debt.

## 114. Owner restores LightBI-rooted signing authority; R1-P12 NEXT anti-impersonation machine gate closes and R1-P13 opens

On 2026-09-03 the owner corrected the interpretation of R1-P12 signing authority. Windows Authenticode, Apple Developer ID/notarization and equivalent vendor/platform credentials remain useful future platform hardening, but they are **not** the LightBI-origin signature required by the current anti-impersonation roadmap. Canonical Trust contract commit `511a2d947495d8092846cffaf8e2268446ed28c2` now records the controlling definition: Official LightBI origin is derived from the LightBI Root → purpose-separated REL → exact artifact digest/size → valid release-bound ATT chain plus independent verification. A fork may reproduce branding/client text, but it cannot mint evidence accepted beneath the LightBI Root.

Public R1-P12 source advanced through `a8e3db5abae935ac0e6238d892e51ffbb1d34c0f` (restore LightBI-rooted official identity), `148f27a8db743f75bd4fe0c06ceee0461fb14cb5` (bind native acceptance provenance to exact installer byte size), and current `68e5bc159fe0054fd4ab08083dbeb4fa84817847` (route `/internal-trust/` through the NEXT gateway). The new gateway code is deployed only as immutable NEXT overlay `gateway-overlay-68e5bc1`; live `https://lightbi-next.thaiduy.digital/internal-trust/latest.json`, immutable REL JSON and `/verify` all return through generation `g-2026-09-03-next-030`. Production was not touched.

GitHub Actions `Native Acceptance Artifact` run `33713352231` / run #8 completed **SUCCESS** at exact artifact source `148f27a8db743f75bd4fe0c06ceee0461fb14cb5`. Artifact `9878574548` (`LightBI-Windows-R1P12-Native-Acceptance`) has archive digest `sha256:092a90d5e5ae537c1cebc580b41f6ed6ee9cdb3610fdc6375091959abe3783d5`. Its installer `LightBI-NEXT-0.9.2-next.r1p12.8-x64-setup.exe` was independently extracted and measured at exactly **29,781,164 bytes**, SHA-256 `1b55ee32690f01ffb7cbaedfbd2bba22c50222c049b4902356504f858eed8151`; these values match `native-acceptance.json`. The accompanying `NotSigned` OS publisher sidecar is retained as truthful future platform evidence and no longer blocks the LightBI Root authority gate.

The existing schema-bound NEXT REL publisher then signed those exact name/SHA/size values under TEST authority `next-test-20260902-031220`. Public trust latest now points to `release:0.9.2-next.r1p12.8:windows:x86_64`; `promotableToProduction=false`. The browser-independent public verifier fetched the live HTTPS Root/keyset/REL chain and verified Root KID `next-test-root-2026-01`, REL KID `next-test-rel-2026-01`, that release ID and the exact installer SHA. Private Distribution remains **209/209 PASS**, including modified-REL fail-closed and release-bound ATT tests.

After the verification-only attestation service reloaded the new public trust index, the existing ATT rehearsal successfully issued a TEST installation certificate for the #8 REL and accepted valid device-signed sequences 1 and 2. Nonce replay, body tamper, sequence rollback and wrong-target probes all failed closed. A stronger impersonation probe used the legitimate TEST ATT issuer to sign a structurally valid certificate for forged release `release:fork-impostor-r1p12.8:windows:x86_64`; the verifier rejected it with HTTP 401 / `attestation_release_not_allowed`. Current public head `68e5bc1` independently re-passes the complete `test:release-1.0` gate including release contract **11/11**, generation routing **8/8**, desktop production build and governed product regression **39/39**.

The earlier bounded owner Windows UAT remains valid for the exercised install/sidebar/external-browser scope; it is not rewritten as manual acceptance of #8. The Bell dropdown remains explicitly deferred non-blocking UX debt. Under the owner-corrected signing definition, the **R1-P12 NEXT anti-impersonation machine gate is complete**. Authenticode/Developer ID remain deferred platform-hardening work rather than phase blockers.

The owner has now authorized progression into **R1-P13 RC → stable 1.0 work**. R1-P13 begins on NEXT with a separately fail-closed RC lane; it must not turn the existing Beta publisher into stable authority by changing one variable, and it must not invent an `rc` release channel because the governed release contract remains `beta | stable` with SemVer prereleases allowed. A `1.0.0-rc.N` NEXT/RC artifact may therefore exercise the release candidate path without Production publication authority. Actual Production Root/issuer ceremony remains separately gated by the exact Phase 2A freeze decision; `phase2aFrozen=false` remains truthful until the owner records that freeze explicitly.

Signer administration remains **CLI-only** under the owner-approved Frappe Bench mental model. `cli-lightbi` Phase A/Ratatui is the operator surface and the hardened signer container remains the cryptographic appliance. R1-P13 does not implicitly authorize CLI Phase B/C/D, signer web administration, generic signing or movement of Root/issuer private material into the CLI.

## 115. Road-to-1.0 freezes at NEXT R1-P13 while Focus Subject Analysis branches experimentally

On 2026-09-03 the owner temporarily froze further Road-to-1.0 feature progression at public NEXT R1-P13 baseline `827ac888350193c7aac6c3a577b7411378e4a1c8`. This is a pause for a bounded product experiment, not a rollback, Production authorization, role rotation, or replacement of the R1-P13 RC work already proven at that baseline.

The owner-approved experiment is documented at [`focus-subject-analysis.md`](../design/focus-subject-analysis.md). It adds an optional **Focus Subject** beside the existing perspective/question selection so a user can declare the entity that the analysis should revolve around. The canonical use case is employee `24128 — Thái Đăng Duy` inside the 2,200-row management-ranking workbook.

The feature is strictly additive. No Focus Subject means the current `Understand -> Perspective/Question -> Analysis -> Chart -> Deep BA/Step 2` behavior remains unchanged. Selecting a subject must preserve the full governed population for benchmarking; it is not equivalent to filtering the dataset down to one row. Initial analytical behavior may compare the subject with population average, Top N, Bottom N, rank/percentile and evidence-backed drivers when the selected plan supports those measures.

Implementation is isolated on a new experiment branch/worktree derived from exact NEXT baseline `827ac88...`; the frozen R1-P13 branch must not be used as the experimental coding surface. Merge-back requires no-focus regression equivalence, deterministic evidence-bound subject identity/comparisons, preserved Step-2 isolation, full release gates and explicit owner UAT. Production/main/CURRENT remain untouched.