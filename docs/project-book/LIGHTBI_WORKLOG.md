# LightBI Worklog — Architecture and Product Journal

**Edition:** 0.1 Documentation Reconstruction  
**Snapshot:** 2026-08-29  
**Purpose:** Reconstruct the work history so future humans/AI can see not only what LightBI is, but **why each architecture exists and what previous failure it corrected**.




<!-- AUTO_TOC_START -->
## Timeline Index

  - [Reading rule](#reading-rule)
  - [2026-06-01 — Architecture-first foundation](#2026-06-01-architecture-first-foundation)
  - [Early June 2026 — Milestone 1: first visible vertical slice](#early-june-2026-milestone-1-first-visible-vertical-slice)
  - [Early June 2026 — Milestone 2: Question First landing](#early-june-2026-milestone-2-question-first-landing)
  - [June 2026 — Milestone 3: real CSV intake](#june-2026-milestone-3-real-csv-intake)
  - [June 2026 — Milestone 4: guided Home and data-intake orchestration](#june-2026-milestone-4-guided-home-and-data-intake-orchestration)
  - [June 2026 — Milestone 5: relationship discovery and planning](#june-2026-milestone-5-relationship-discovery-and-planning)
  - [June 2026 — Milestones 6–7: runtime boundary and safe compilation](#june-2026-milestones-6-7-runtime-boundary-and-safe-compilation)
  - [June 2026 — Milestone 8: trust/business confidence](#june-2026-milestone-8-trustbusiness-confidence)
  - [Late June 2026 — Guided Investigation pipeline, then BVQ reset](#late-june-2026-guided-investigation-pipeline-then-bvq-reset)
  - [2026-06-28 — Product boundary formalized as Business Understanding Engine](#2026-06-28-product-boundary-formalized-as-business-understanding-engine)
  - [2026-06-28 — Plugin-first provider expansion](#2026-06-28-plugin-first-provider-expansion)
  - [2026-07-03 to 2026-07-04 — Phase 28 Business Brain V1](#2026-07-03-to-2026-07-04-phase-28-business-brain-v1)
  - [2026-07-04 — Phase 29 Context-Aware Semantic Dictionary](#2026-07-04-phase-29-context-aware-semantic-dictionary)
  - [2026-07-04 onward — Phase 30 Semantic Registry Unification](#2026-07-04-onward-phase-30-semantic-registry-unification)
  - [Canonical research era — Phase 0 through Phase 4](#canonical-research-era-phase-0-through-phase-4)
  - [Canonical authority migration — Phase 5A / 5B](#canonical-authority-migration-phase-5a-5b)
  - [Canonical governed business execution — Phase 5M1 through 5M4](#canonical-governed-business-execution-phase-5m1-through-5m4)
  - [Phase 6 — Canonical consumer cutover](#phase-6-canonical-consumer-cutover)
  - [Phase 7 — MVP proof exposed real release-gate defects](#phase-7-mvp-proof-exposed-real-release-gate-defects)
  - [Phase 7R1 — held-out semantic recall remediation](#phase-7r1-held-out-semantic-recall-remediation)
  - [Phase 7R2 — advertised action/runtime alignment](#phase-7r2-advertised-actionruntime-alignment)
  - [Phase 7R3 — metric correctness separated from metric-family coverage](#phase-7r3-metric-correctness-separated-from-metric-family-coverage)
  - [Phase 7R3.1–7R3.7 — closing finance, delivery and inventory evidence gaps](#phase-7r3-1-7r3-7-closing-finance-delivery-and-inventory-evidence-gaps)
  - [Phase 7R3.8 — release measurements passed except clean-checkout reproducibility](#phase-7r3-8-release-measurements-passed-except-clean-checkout-reproducibility)
  - [Phase 7R4 / 7R4.1 — repository-safe release corpus closure](#phase-7r4-7r4-1-repository-safe-release-corpus-closure)
  - [Phase 8A — production full-source boundary](#phase-8a-production-full-source-boundary)
  - [Phase 8B — source-bound evidence interaction](#phase-8b-source-bound-evidence-interaction)
  - [Phase 8C — functional blocker/remediation UX](#phase-8c-functional-blockerremediation-ux)
  - [Phase 8D — feature reachability exposed the missing production multi-source boundary](#phase-8d-feature-reachability-exposed-the-missing-production-multi-source-boundary)
  - [Phase 8D.1 — canonical production multi-source closure](#phase-8d-1-canonical-production-multi-source-closure)
  - [Phase 8E — code separation without changing product truth](#phase-8e-code-separation-without-changing-product-truth)
  - [Phase 8F — functional core/UI parity](#phase-8f-functional-coreui-parity)
  - [Phase 8F.1 — false-ready runtime-source continuity defect](#phase-8f-1-false-ready-runtime-source-continuity-defect)
  - [Phase 8F.2 — operational multi-file parity and authentic six-file browser proof](#phase-8f-2-operational-multi-file-parity-and-authentic-six-file-browser-proof)
  - [2026-07-30 — Beta release checklist snapshot](#2026-07-30-beta-release-checklist-snapshot)
  - [2026-08-29 — documentation archaeology and Project Book creation](#2026-08-29-documentation-archaeology-and-project-book-creation)
  - [2026-08-29 — Road-to-1.0 technical direction handoff ingested](#2026-08-29-road-to-1-0-technical-direction-handoff-ingested)
  - [2026-08-29 — Documentation cleanup isolated in a dedicated worktree](#2026-08-29-documentation-cleanup-isolated-in-a-dedicated-worktree)
<!-- AUTO_TOC_END -->

---

## Reading rule

This is a chronological journal, not the canonical specification.

For current behavior, read [`LIGHTBI_PROJECT_BOOK.md`](LIGHTBI_PROJECT_BOOK.md) first and use this journal to understand evolution and provenance.

Each entry records:

- problem or goal;
- architecture/decision;
- implementation or proof introduced;
- verification/evidence;
- what remained open;
- source bookmarks.

Where dates are inferred from phase/changelog filenames, the journal preserves that source chronology rather than claiming an exact commit timestamp. Git history will be reconciled in a later edition.

---

## 2026-06-01 — Architecture-first foundation

### Goal

Create a project architecture before building a large amount of UI/runtime behavior.

### Decisions established

- dataset-centric rather than query-centric product model;
- strict local-first direction;
- Rust core and typed domain boundaries as the original architectural intent;
- application runtime layer to isolate UI state;
- SQLite for metadata, DuckDB for analytics;
- declarative recipes and lineage;
- Question First and virtual-dataset concepts;
- source capability and connector contracts;
- project-scoped registries rather than global data systems;
- schema/semantic models;
- perspective/question context;
- planner/runtime separation;
- runtime datasets, DataViews, chart/dashboard/export/render contracts.

### Source route

Start with `docs/changelog/2026-06-01-*` and `docs/progress/phase-13-*` through `phase-27-*`. These documents are the historical foundation and should not be mistaken for a complete description of current code ownership.
## Early June 2026 — Milestone 1: first visible vertical slice

### Goal

Prove architecture could produce a real visible analytical result before adding more conceptual layers.

### Implemented/proved

- CSV source path;
- DuckDB execution backend;
- normalized ResultSet;
- Excel export using `rust_xlsxwriter`;
- Axum backend endpoints;
- frontend ECharts rendering;
- first end-to-end import/query/chart/export slice.

### Known shortcuts at the milestone

- hardcoded `sales.csv`;
- naive schema typing;
- browser `fetch` instead of native IPC;
- temporary error-handling shortcuts.

### Bookmark

- [`../progress/milestone-1.md`](../history/progress/milestone-1.md)
## Early June 2026 — Milestone 2: Question First landing

### Goal

Replace dashboard-first entry with a natural business-question starting point.

### Implemented/proved

- Home prompt centered on “What do you want to understand today?”;
- deterministic Question → Template → Chart → Insight presentation;
- neutral analytical visual baseline;
- route error boundaries;
- early question-template backend orchestration.

### Important limitation

The classifier and execution were still intentionally deterministic/hardcoded proofs. This milestone demonstrated UX architecture, not general natural-language analytics.

### Later disposition

Question First remains useful history and an optional intent layer, but later BVQ/DU work rejected it as the mandatory primary product path.

### Bookmarks

- [`../progress/milestone-2-question-first.md`](../history/progress/milestone-2-question-first.md)
- [`../design/ui-baseline.md`](../design/ui-baseline.md)
## June 2026 — Milestone 3: real CSV intake

### Goal

Remove the hardcoded CSV and prove real user file upload, dynamic schema extraction and dynamic execution.

### Implemented/proved

- multipart CSV upload;
- schema extraction from uploaded files;
- current-source session metadata;
- dynamic measure/dimension/date selection;
- backend execution against the uploaded absolute file path;
- configurable frontend API base URL;
- upload timeout/error stabilization.

### Debt introduced

The backend still had a single active `current_source` concept. This was explicitly recognized later as unsafe for multi-user/multi-dataset production architecture.

### Bookmark

- [`../progress/milestone-3-real-csv-import.md`](../history/progress/milestone-3-real-csv-import.md)

---

## June 2026 — Milestone 4: guided Home and data-intake orchestration

Home evolved from a bare question box into a progressive workspace with contextual upload/connect/sample actions, schema-aware suggestions, capability detection, an intake drawer, dataset summary, and explicit separation of analysis intent from source attachment.

Bookmark: [`../progress/milestone-4-guided-home.md`](../history/progress/milestone-4-guided-home.md).
## June 2026 — Milestone 5: relationship discovery and planning

### Goal

Move from isolated files toward multi-file business understanding without forcing users to manually model joins.

### Implemented

- Business Key Detector;
- relationship scoring from semantics/profile/pattern/overlap;
- `RelationshipGraph` as source of truth;
- connected components and Dataset Collections;
- Business View candidates;
- user confirm/edit/ignore review;
- `VirtualDatasetPlan` and plan preview.

### Critical boundary

No physical DuckDB join was authorized by this milestone. Discovery/planning and execution were deliberately separate.

### Bookmarks

- [`../progress/milestone-5-relationship-discovery.md`](../history/progress/milestone-5-relationship-discovery.md)
- [`../progress/milestone-5-summary.md`](../history/progress/milestone-5-summary.md)
- [`../architecture/relationship-discovery-scoring.md`](../architecture/relationship-discovery-scoring.md)
## June 2026 — Milestones 6–7: runtime boundary and safe compilation

### Goal

Turn abstract plans into bounded executable structures without allowing UI text or arbitrary SQL to become runtime authority.

### Milestone 6

- Runtime Preview contract;
- Execution Guard;
- logical-plan adapter;
- `RuntimeBoundaryArtifact`;
- explicit user confirmation path.

### Milestone 7

- Expected Result Contract;
- Safe SQL compiler;
- runtime sandbox policy;
- preview result structural validation.

### Governing principle

Planner ≠ Executor. SQL preview/explainability is not automatically the execution source of truth.

### Bookmarks

- [`../progress/milestone-6-runtime-preview.md`](../history/progress/milestone-6-runtime-preview.md)
- [`../progress/milestone-7-result-understanding.md`](../history/progress/milestone-7-result-understanding.md)
## June 2026 — Milestone 8: trust/business confidence

### Goal

Prevent LightBI from presenting structurally valid query results as trustworthy business answers without evaluating result validity and context.

### Direction

- Result Validator before Business Confidence;
- explicit confidence-signal registry;
- dataset health;
- safe preview runtime;
- traceable deterministic insight contracts;
- separation of data quality from business confidence;
- no full runtime before trust boundaries existed.

### Bookmark

- [`../progress/milestone-8-business-confidence.md`](../history/progress/milestone-8-business-confidence.md)

This line later feeds directly into the stricter canonical readiness/decision-use architecture of Phase 4–8.
## Late June 2026 — Guided Investigation pipeline, then BVQ reset

### Initial direction

The project formalized:

```text
Signals → Perspectives → Business Views → Plans → Question Suggestions
```

It consolidated domain knowledge, built machine-readable domain catalogs, generated perspectives/business views/questions deterministically, removed heuristic Home question sources, and added cross-domain validation.

### Failure discovered

The increasingly strict BVQ path could leave valid sparse SME datasets with no Business View and no Questions, making successful understanding look like failure.

### Architecture correction

The product was reset to:

```text
Signals → Dataset Understanding → Analysis Opportunities → Investigation
```

Home was simplified around positive understanding and runnable opportunities. Business Views and Questions became optional higher layers rather than prerequisites.

### Bookmark

- [`../progress/milestone-8-5-guided-investigation.md`](../history/progress/milestone-8-5-guided-investigation.md)
- Historical reset details are indexed in `SOURCE_CATALOG.md` under `ADR-097`, `BVQ-RESET`, and `dataset-understanding-layer`.
## 2026-06-28 — Product boundary formalized as Business Understanding Engine

### Decision

LightBI was explicitly positioned as a Business Understanding Engine rather than a classic BI tool or AI dashboard.

The documented product pipeline became:

```text
Raw Data
→ Import
→ Understand
→ Clean / Standardize as reversible overlay
→ Trust Score
→ Dashboard / KPI / Insight
→ Optional AI Report
```

Simple Mode became the differentiation layer; Advanced Mode was positioned as a technical data workspace whose results can hand back into Simple Mode.

AI was explicitly constrained to explanation/reporting over LightBI artifacts rather than raw analytical authority.

### Commercial draft

A Draft v1.0 Basic/Pro/Ultra packaging and pricing proposal was recorded. It remains historical/draft until reconciled with later entitlement decisions.

### Bookmarks

- [`../architecture/ADR-117-business-understanding-engine-product-boundary.md`](../adr/ADR-117-business-understanding-engine-product-boundary.md)
- [`../product/product-direction-and-pricing-v1.md`](../product/product-direction-and-pricing-v1.md)
## 2026-06-28 — Plugin-first provider expansion

### Problem

Enterprise/source integrations risked turning the core into provider-specific branches and UI options that looked supported before they actually worked.

### Decision

Introduce `@lightbi/plugin-sdk` and a provider exposure gate.

A provider should not appear to users until it can connect, discover schema, run a bounded read-only query, return typed rows and normalize diagnostics without leaking credentials.

SQL Server was selected as the first intended real provider-plugin path, but the historical starter manifest was explicitly not a working connector.

### Bookmark

- [`../plugin-sdk/provider-plugin-manual.md`](../plugin-sdk/provider-plugin-manual.md)
- [`../../packages/plugin-sdk/README.md`](../../packages/plugin-sdk/README.md)
## 2026-07-03 to 2026-07-04 — Phase 28 Business Brain V1

### Problem

ERP samples showed that LightBI could technically understand data yet still fail to surface useful BA angles when relevant signals were missing from current playbooks.

### Decision

Stop fixing isolated signals as the main strategy. Build a structured Business Brain:

```text
Semantic Coverage
→ KPI
→ Variance
→ Root Cause
→ Risk
→ Recommendation
→ Executive Narrative
```

### Implemented V1

- `BusinessBrainBrief`;
- selected-angle KPI evidence;
- chart-level and plan/target variance;
- adaptive root-cause drill-down;
- KPI-backed business risks;
- typed recommendations;
- next questions;
- evidence audit trail;
- regression against six ERP files.

### Bookmark

- [`../progress/phase-28-business-brain-orchestrator.md`](../history/progress/phase-28-business-brain-orchestrator.md)
## 2026-07-04 — Phase 29 Context-Aware Semantic Dictionary

### Problem

Header-only recognition was too brittle for real enterprise files. Business evidence could exist in values or surrounding columns while the header was generic, wrong, or ambiguous.

### Implemented direction

Semantic inference gained multiple evidence channels:

- header;
- values;
- shape;
- neighboring columns;
- cross-file context.

Guardrails prevented shape/cross-file context from creating unsupported mappings by themselves. Header/value conflict became partial/conflicting instead of silently resolved.

The dictionary expanded across all six runtime BA domains and then into broader external/manual data families.

### Bookmark

- [`../progress/phase-29-context-aware-semantic-dictionary.md`](../history/progress/phase-29-context-aware-semantic-dictionary.md)

---

## 2026-07-04 onward — Phase 30 Semantic Registry Unification

The project centralized runtime semantic definitions into `semantic-registry.ts`, made detector/dictionary/core/next layers registry-backed, and added drift guards so supported signals could not silently diverge across engines.

Bookmark: [`../progress/phase-30-semantic-registry-unification.md`](../history/progress/phase-30-semantic-registry-unification.md).
---

## Canonical research era — Phase 0 through Phase 4

### Purpose

Replace loosely coupled historical heuristics with measured canonical artifacts before migrating production authority.

### Phase 0–3: semantic candidate and resolution work

The architecture inventoried registry coverage, measured candidate recall, separated candidate generation from contextual resolution, added independent context evidence, counterfactual tests and deterministic rule-lattice resolution.

Key governance themes:

- do not tune production rules from sample identity;
- distinguish candidate absence from resolution failure;
- preserve ambiguity rather than force a mapping;
- separate golden tuning data from holdout/adversarial evaluation data;
- measure precision/recall explicitly.

### Phase 4A: grain

The system added grain candidates, orthogonal grain axes, abstention rules, measure-safety evidence and counterfactual validation.

### Phase 4B: relationships

Relationship evidence/resolution became axis-based and explicitly separated from join safety/operation execution.

### Phase 4C: readiness

Readiness became capability-specific rather than one global score, with explicit blockers, remediation and trust dimensions.

Source route: `docs/architecture/phase-0-*`, `phase-3*`, `phase-4a*`, `phase-4b*`, `phase-4c*`.
## Canonical authority migration — Phase 5A / 5B

### Problem

The project had legacy consumers that could still derive numeric health, aggregation choices, preview results, chart/BA inputs and other decisions independently of the new canonical understanding model.

### Phase 5A

Created runtime-envelope/projection artifacts so canonical readiness/trust/blockers/remediation could be compared against production consumers without immediately changing production authority.

### Phase 5B family

The project audited and progressively closed aggregation-authority debt:

- mapped legacy outputs to canonical concepts;
- identified where automatic SUM behavior could conflict with grain restrictions;
- replayed divergences without changing production behavior first;
- created result-use restriction codes;
- separated exploratory display from decision-use eligibility;
- audited actual plan/result bindings and request identity;
- identified unsafe result correlation and TypeScript baseline defects;
- restored build integrity;
- froze a governed regression-failure allowlist by test identity/signature.

### Core lesson

A chartable numeric result is not automatically eligible for BA conclusion, narrative claim, alert or persisted metric.

Source route: `docs/architecture/phase-5a-*` and `phase-5b*`.
## Canonical governed business execution — Phase 5M1 through 5M4

### Phase 5M1 — domain/metric governance

A canonical commerce/distribution pack and governed metric catalog were introduced without making dictionary coverage itself sufficient to activate support. Metric preflight became an explicit gate and decision use remained false.

### Phase 5M2 — question/action policy

The system generated deterministic question/action candidates from governed metric/domain state, with stable ranking and no free-form question authority over runtime.

### Phase 5M3 — runtime preflight and controlled execution

The project defined runtime contracts, deterministic query planning, safe operators, controlled DuckDB execution, ground-truth comparison and negative probes. Runtime execution was still isolated from production consumers while safety was measured.

### Phase 5M4 — acceptance gate

The governed core reached a state classified as ready for Phase 6 cutover, with understanding-core regression and the frozen baseline debt separated from unexpected failures.

### Governing result

The canonical core was now capable of deciding not merely “what signal exists,” but whether a specific metric/action could be safely planned and executed under current evidence.

Source route: `docs/architecture/phase-5m1-*` through `phase-5m4-*`.
## Phase 6 — Canonical consumer cutover

### Goal

Make Home, Investigation and Advanced consume the canonical artifact instead of keeping parallel legacy truth.

### Phase 6A

- introduced one canonical artifact identity for the selected production path;
- Home derived questions/caveats/presentation from that artifact;
- Investigation received the canonical handoff and executed through the governed runtime boundary;
- legacy detectors/executors were audited for reachability;
- golden revenue execution was reproduced through the canonical path.

### Phase 6B

- Advanced handoff was moved onto the canonical boundary;
- partial/incomplete results were blocked from full-source decision support;
- legacy production session paths were retired or reduced to compatibility/test-only roles;
- production reachability scans required zero legacy/mock execution from the canonical session path.

### Phase 6B.2

Unexpected regressions and TypeScript diagnostics found during cutover were explicitly resolved, producing the classification `phase6_canonical_cutover_complete_ready_for_mvp_proof`.

Source route: `docs/architecture/phase-6a-*`, `phase-6b-*`, `phase-6b1-*`, `phase-6b2-*`.
## Phase 7 — MVP proof exposed real release-gate defects

### Initial measurements

The first release-gate audit found strong precision and safety but insufficient held-out signal recall, incomplete advertised-action execution success, incomplete verified metric-family coverage and clean-machine reproducibility debt.

Important measured properties included:

- high-confidence mapping precision near/above target;
- runnable-action precision 100%;
- zero false decision-support cases;
- canonical production path with zero legacy/mock execution reachability;
- held-out core signal recall below the release threshold;
- advertised-action execution and metric-family coverage below release targets.

### Decision

Do not declare release readiness from attractive precision numbers alone. Break the remaining failures into owned defects and fix them without weakening safety.

Primary bookmark:

- [`../architecture/phase-7-mvp-proof-and-release-gate.md`](../architecture/phase-7-mvp-proof-and-release-gate.md)
- [`../architecture/phase-7-release-gate-audit.json`](../architecture/phase-7-release-gate-audit.json)
## Phase 7R1 — held-out semantic recall remediation

The canonical release denominator was clarified as held-out required core-signal occurrence recall. Generic semantic corrections raised the measured recall to approximately **90.91%** while preserving 100% high-confidence precision in the audited result.

The phase explicitly avoided tuning from evaluation-only groups.

Bookmarks:

- [`../architecture/phase-7r1-recall-denominator-audit.json`](../architecture/phase-7r1-recall-denominator-audit.json)
- [`../architecture/phase-7r1-corpus-regression-audit.json`](../architecture/phase-7r1-corpus-regression-audit.json)

---

## Phase 7R2 — advertised action/runtime alignment

A key defect was discovered: some actions were advertised as conditionally ready by the action layer while M3 correctly blocked them at runtime because required identity/grain semantics were not bound.

The correction aligned action classification with runtime truth. Runtime safety was **not** weakened.

After correction, advertised-action execution success for the audited executable set reached 100% while mapping precision, held-out recall, domain activation precision and zero false-decision-support behavior were preserved.

Bookmarks:

- [`../architecture/phase-7r2-action-runtime-alignment.md`](../architecture/phase-7r2-action-runtime-alignment.md)
- [`../architecture/phase-7r2-release-gate-impact-audit.json`](../architecture/phase-7r2-release-gate-impact-audit.json)
## Phase 7R3 — metric correctness separated from metric-family coverage

Revenue correctness defects were addressed without weakening source-level grain safety. Independent expected values were compared against governed runtime results.

The remaining failure shifted from “wrong metric” to “insufficient verified family coverage.” This distinction mattered: one passing metric must not imply that finance, delivery and inventory families are all verified.

Bookmarks:

- [`../architecture/phase-7r3-revenue-correctness-audit.json`](../architecture/phase-7r3-revenue-correctness-audit.json)
- [`../architecture/phase-7r3-required-family-coverage-audit.json`](../architecture/phase-7r3-required-family-coverage-audit.json)

---

## Phase 7R3.1–7R3.7 — closing finance, delivery and inventory evidence gaps

This sequence decomposed the remaining family-coverage debt into truthful blockers:

- delivery identity and deduplication semantics;
- gross-profit binding, currency evidence and metric preflight;
- authentic inventory snapshot evidence;
- relationship evidence;
- UOM/as-of/item/warehouse identity;
- full-detail oracle comparison.

The work repeatedly rejected “just execute anyway” fixes. Missing currency or snapshot evidence remained blockers until explicit scenario/corpus evidence existed.

By Phase 7R3.7 the governed corpus reported **4/4 required metric-family coverage** with exact detailed comparison and no unexpected regression.
## Phase 7R3.8 — release measurements passed except clean-checkout reproducibility

The evaluator recorded:

- 100% high-confidence mapping precision;
- 90.91% held-out core-signal recall;
- 100% domain-activation precision;
- 100% governed action execution for the evaluated sets;
- 4/4 metric-family coverage;
- zero false decision-support cases;
- zero production legacy/deprecated execution reachability.

The remaining release blocker was repository/input reproducibility rather than analytical correctness.

Bookmark: [`../architecture/phase-7r38-release-measurements.json`](../architecture/phase-7r38-release-measurements.json).

---

## Phase 7R4 / 7R4.1 — repository-safe release corpus closure

Initial clean-checkout packaging failed because historical evaluation depended on excluded operational sample inputs. The project did not solve this by committing unsafe/unlicensed raw operational data.

Instead it introduced repository-safe sanitized/frozen corpus inputs, provenance manifests, deterministic sanitization/oracle rules and a release-authoritative corpus version.

Phase 7R4.1 clean-checkout evidence then showed tracked release inputs, offline dependency reconstruction, corpus regeneration and canonical verification without absolute-path or ignored-file fallback.

Bookmark: [`../architecture/phase-7r41-repository-safe-corpus-release-closure.md`](../architecture/phase-7r41-repository-safe-corpus-release-closure.md).
---

## Phase 8A — production full-source boundary

### Problem

Canonical semantic understanding could be correct while production execution still lacked a rigorous distinction between representative/sample evidence and the complete source required for authoritative aggregation.

### Correction

Phase 8A introduced explicit source scope and full-file execution evidence. The production path had to retain source identity, fingerprint/generations and observed row counts. Sample/profile data could not substitute for complete runtime source materialization.

### Verification themes

- small-file compatibility preserved;
- large-file production flow verified;
- source replacement invalidated stale identity;
- actual row count had to be observed rather than copied from expectation;
- legacy/mock executor production reachability remained zero;
- negative probes failed closed.

### Bookmark

- [`../architecture/phase-8a-production-full-source-boundary-closure.md`](../architecture/phase-8a-production-full-source-boundary-closure.md)
## Phase 8B — source-bound evidence interaction

### Problem

Canonical inference could identify likely meanings, but production users needed a truthful way to supply missing evidence such as currency, UOM, as-of date, role or identity without mutating raw data or bypassing governance.

### Correction

A versioned `canonicalUserOverlay` became the source-bound review artifact. Mapping/evidence changes rebuild the canonical artifact and rerun unchanged governed policy.

The UI separated inferred candidates from user-confirmed evidence and exposed stale/invalid/rebuild states.

### Positive proof

- explicit VND/reporting-period evidence allowed the governed Gross Profit path only after other requirements passed;
- inventory required item, warehouse, quantity, time, UOM, snapshot role, as-of date and identity evidence;
- removing required evidence returned the analysis to non-advertised/non-authoritative state.

### Safety

The overlay cannot create signals, rewrite source rows or authorize execution by itself.

Bookmark: [`../architecture/phase-8b-production-evidence-interaction-closure.md`](../architecture/phase-8b-production-evidence-interaction-closure.md).
## Phase 8C — functional blocker/remediation UX

### Problem

A correct canonical core can still create a misleading product if UI collapses all blockers into one dataset status or offers fake remediation.

### Correction

A canonical presentation contract projected exact governed states into UI. Metric-specific blockers no longer globally blocked an otherwise understood dataset. One deterministic primary blocker could be shown while secondary evidence remained available.

Ready actions alone could enter Investigation. Resolvable actions routed to the exact source-bound review control. Unsupported and safety-blocked cases did not offer fake execution.

Runtime failure, semantic blocking and stale state remained separate.

### Verification

Seven positive flows passed; 24 required negative probes remained fail-closed/non-authoritative; functional accessibility rules were added for keyboard/focus/disabled explanations and stable selectors.

Bookmark: [`../architecture/phase-8c-functional-blocker-remediation-closure.md`](../architecture/phase-8c-functional-blocker-remediation-closure.md).
## Phase 8D — feature reachability exposed the missing production multi-source boundary

### Work completed

Home exposed full-source profile scope, quality issues, mapping provenance, grain, relationship status, domain support, governed actions, resolvable blockers and unsupported concepts. Investigation retained exact result lineage and Advanced exposed complete/partial scope truthfully.

### Blocking finding

The production Home consumer still built a canonical artifact for one source boundary. Relationship inference existed in the core, but production UI could not yet construct one governed logical multi-source dataset for the required Sales + Accounting journey.

Therefore Phase 8D deliberately refused to claim the multi-file gate had passed.

Classification at that point: `not_ready_multifile_ui_flow`.

Bookmark: [`../architecture/phase-8d-functional-ui-feature-closure.md`](../architecture/phase-8d-functional-ui-feature-closure.md).

---

## Phase 8D.1 — canonical production multi-source closure

The missing logical multi-source dataset, source membership/roles, relationship artifact, full-source execution and Home/Investigation handoff were implemented for the bounded commerce/distribution MVP.
### Phase 8D.1 key constraints

- source-local canonical artifacts stay immutable;
- composite multi-source identity is deterministic and order-invariant;
- source roles, document identity, period, currency and measure evidence are explicit;
- relationship inference/resolution reuses the canonical relationship engine;
- full files are registered independently in DuckDB;
- no sample/preview/filename-role/row-position/legacy-fusion fallback;
- raw local-file bytes and executable handoffs are not serialized;
- stale/legacy fusion sessions are rejected;
- inventory snapshot remains source-local rather than being forced into a multi-source join.

### Verified positive case

Sales + Accounting May each contain 1,500 rows with 1,500 matched document identities. Gross Profit remained governed by the Accounting formula while Sales independently verified relationship/scope.

Exact result: **3,075,721,244 VND**.

### Important restriction

Because source grains differ, the confirmed relationship is limited to identity reconciliation and does not authorize generic cross-source measure joins.

Bookmark: [`../architecture/phase-8d1-production-multisource-closure.md`](../architecture/phase-8d1-production-multisource-closure.md).
## Phase 8E — code separation without changing product truth

### Goal

Reduce page monoliths and clarify ownership after functional reachability was complete, without mixing refactor with new semantics or visual redesign.

### Result documented

- `Home.tsx`: 2,822 → 789 lines;
- `Investigation.tsx`: 1,550 → 799 lines;
- `Advanced.tsx`: 2,072 → 770 lines;
- extracted modules kept below the documented size gate;
- canonical source/overlay/multi-source/handoff/persistence contracts stayed byte-for-byte unchanged;
- dependency checks prevented pages from becoming lower-layer dependencies;
- no legacy fusion execution path was restored;
- full canonical and regression verification preserved the governed baseline.

The closure classification was:

`phase8_codebase_clean_ready_for_visual_ui_design`

This phase is important evidence that later visual/UI work should not casually reopen semantic/runtime ownership.

Bookmarks:

- [`../architecture/phase-8e-code-separation-and-cleanup-closure.md`](../architecture/phase-8e-code-separation-and-cleanup-closure.md)
- [`../architecture/phase-8e-final-checkpoint-closure.md`](../architecture/phase-8e-final-checkpoint-closure.md)
## Phase 8F — functional core/UI parity

### Goal

Make the production UI a faithful projection of the frozen canonical core without visual redesign or policy changes.

### Corrections documented

- Home/Investigation stopped keeping competing trust/readiness/fusion/mapping/result truth;
- source roles/evidence remained empty until explicitly supplied;
- remediation rebuilt source-bound overlays rather than marking actions ready directly;
- only M3-approved actions became runnable;
- legacy Home quality/trust/fusion/mock-insight surfaces were disconnected;
- unsupported capabilities used truthful limitation language;
- BA narrative and governed totals became post-execution only;
- Investigation consumed canonical full-scope totals instead of recomputing from bounded display rows.

### Browser/oracle evidence

Later corrected proof included exact Revenue, Delivery, Inventory and Gross Profit values while preserving lineage and restrictions.

Bookmark: [`../architecture/phase-8f-core-ui-functional-parity-closure.md`](../architecture/phase-8f-core-ui-functional-parity-closure.md).
## Phase 8F.1 — false-ready runtime-source continuity defect

### Defect found by real browser review

Home could advertise Revenue as ready after workspace restoration even though only representative rows remained. Investigation correctly blocked with `canonical_full_file_runtime_source_required`.

### Root cause

The restore path reconstructed semantic state but lost the complete runtime source reference, and Home did not include runtime-source continuity in its ready projection.

### Correction

A runnable action now requires exact continuity across source ID, fingerprint, inspection generation, profile generation and expected row count. Multi-source actions require every source used by that exact action.

If a persisted complete file is available, LightBI re-inspects/rebuilds the canonical source boundary. If not, the session becomes stale and exposes `Reselect source`, with zero Investigate actions.

### Lesson

A semantically valid saved state is not enough to authorize execution. Runtime source continuity is a first-class fail-closed boundary.

Bookmark: [`../architecture/phase-8f1-ready-action-runtime-closure.md`](../architecture/phase-8f1-ready-action-runtime-closure.md).
## Phase 8F.2 — operational multi-file parity and authentic six-file browser proof

### Defects/corrections

- browser relationship hashing was made safe for the actual remote origin;
- canonical source detections were projected as source-bound suggestions rather than auto-evidence;
- same-period Sales + Accounting and source-local Logistics bundles replaced a generic all-six selection;
- shared document identity presentation was corrected so Sales/Accounting could use the canonical `OrderID` evidence even when source-local headers differed;
- invalid relationship bundles remained in review with exact blockers instead of exposing misleading source-local runnable actions;
- Strict Mode auto-preview lifecycle was corrected;
- blocked result presentation was made defensive against missing chart/template fields.

### Authentic remote proof

The six ERP files from `sample-corpus/anchors/1.3.0` were uploaded to the actual remote origin. LightBI projected two Sales, two Accounting and two Logistics sources, proposed business perspectives, and left source selection empty by default.

The May Profitability flow explicitly confirmed roles, `OrderID`, May period and VND. Both complete 1,500-row sources were materialized, relationship status became confirmed, Gross Profit executed at `full_file_multisource`, and the exact result was **3,075,721,244**.

The chart rendered and Deep BA opened with governed scope, lineage, limitations and decision-use restrictions.

Final classification:

`ready_governed_six_file_perspective_flow`

Bookmarks:

- [`../architecture/phase-8f2-multifile-operational-parity-closure.md`](../architecture/phase-8f2-multifile-operational-parity-closure.md)
- [`../architecture/phase-8f2-six-file-operational-journey-audit.json`](../architecture/phase-8f2-six-file-operational-journey-audit.json)
## 2026-07-30 — Beta release checklist snapshot

The release checklist recorded a strong test/web QA state and an x64 Windows NSIS packaging experiment.

At that point:

- 188 desktop test files / 1,272 tests passed;
- Rust/native tests passed after test-dependency fixes;
- production web QA build passed;
- representative Easy Mode single-file E2E journeys passed;
- a Windows installer was built and static imports inspected;
- the installer still shipped a separate `lightbi-server.exe`, so it was explicitly **not** the final embedded-core Beta candidate;
- native clean-machine launch/E2E and signing remained release gates in that document.

Bookmark: [`../release/BETA_RELEASE_CHECKLIST.md`](../release/BETA_RELEASE_CHECKLIST.md).

Important: later working-tree development exists after this dated checklist. Current packaging truth requires code/Git/CI audit.

---

## 2026-08-29 — documentation archaeology and Project Book creation

The documentation corpus was re-read as a whole before further implementation work. The docs directory contained 322 Markdown and 354 JSON documents; all 354 docs JSON files parsed successfully. A broader project scan excluding dependency/build directories found additional root/reference/app/package documentation.

This `project-book` directory was added as a provenance layer. No pre-existing documentation/code was moved or deleted during this step.
### 2026-08-29 snapshot provenance

- branch: `codex/beta-recovery-20260801`;
- HEAD: `0142e92c75e9fd3e190f82fe2a67cf255180cfca`;
- working tree: dirty before this documentation work;
- numerous tracked application/native/package files were already modified;
- untracked account/update/telemetry/distribution/native/release artifacts already existed;
- the Project Book work does not claim ownership of those pre-existing changes.

### Next authorized work sequence

1. review the Project Book and source catalog;
2. reorganize documentation by provenance-preserving categories;
3. read the complete current codebase and produce a code map;
4. audit GitHub commits and reconcile implementation history;
5. audit GitHub Actions/CI/CD/release behavior;
6. audit the separate distribution/control-plane repository;
7. update Project Book to 1.0 current-truth baseline;
8. only then begin new implementation work.

This sequence is deliberate: **understanding is a release gate for the people/agents modifying LightBI itself.**
---

## 2026-08-29 — Road-to-1.0 technical direction handoff ingested

An external 2,089-line session handoff was reviewed and incorporated into the Project Book.

Newly captured design authority includes:

- Phase 0–1 public/private repository split;
- Basic/account/installation/entitlement trust model;
- organization Business named-user seats and one-time claim-token ownership;
- public Basic/private Pro capability delivery;
- private R2 and future device-bound Pro package protection;
- installation certificate and request-envelope attestation model;
- offline root and purpose-separated REL/ATT/ENT/PRO issuer hierarchy;
- public Phase 2A trust-contract invariants;
- Phase 2A independent audit blockers and freeze gate;
- updater and installation lifecycle invariants;
- open-core licensing direction and remaining platform parity debt.

## 2026-08-29 — Documentation cleanup isolated in a dedicated worktree

A clean worktree was created at `/home/ubuntu/n8n2erpnext/LightBI-docs-cleanup` on branch `docs/project-library-cleanup-20260829`, starting from HEAD `0142e92c75e9fd3e190f82fe2a67cf255180cfca`.

Project Book baseline was checkpointed first as commit `a7b3e32`.

Move-safety audit then classified repository-root Markdown by actual non-doc consumers. Of 178 root Markdown files, only `DOMAIN_CORE_AUDIT_REPORT.md` and `validation_report.md` are read by code/scripts, so they remain at root. The other 176 human-only files were moved with `git mv` into `docs/history/` categories.

A separate audit of `docs/architecture/*.json` found 129 of 354 files directly consumed by tests/scripts. Therefore architecture JSON paths remain frozen during documentation-only cleanup; the other JSON files also stay put until the code/CI map proves safe movement.

The clean worktree catalog contains 924 tracked Markdown/JSON sources versus 1,077 sources in the original dirty working-tree snapshot. The difference is preserved as provenance evidence that working-tree knowledge included non-HEAD/untracked/reference material.

All Project Book, Worklog and current Source Catalog links resolve after the move. Twenty-seven pre-existing historical link debts remain separately recorded; none were introduced by the reorganization.

## 2026-08-30 — Documentation library governance established

The second library-cleanup pass was checkpointed as commit `6f74635` (`docs: reorganize documentation library`). It consolidated ADRs, historical audits, post-Beta handoffs, progress/changelog chronology, architecture resets, and the superseded MVP v1 roadmap into authority-oriented shelves while preserving machine-consumed architecture JSON paths.

A permanent documentation governance contract was then added as [`LIBRARY_RULES.md`](./LIBRARY_RULES.md), with [`DOCUMENT_TEMPLATE.md`](./DOCUMENT_TEMPLATE.md) as the standard starting structure for justified new durable documents.

The governance contract requires future humans and AI agents to:

- read the Project Book entry point before writing;
- search for an existing document owner before creating another file;
- classify authority explicitly;
- follow naming and shelf rules;
- keep repository root free of arbitrary documentation;
- preserve historical identity and machine-evidence path contracts;
- update navigation/index surfaces after documentation changes;
- verify links and isolate documentation commits from product/code changes.

This turns documentation organization from a one-time cleanup into an ongoing engineering contract.

## 2026-08-30 — Codebase Map baseline completed

`LIGHTBI_CODE_MAP.md` was completed as the code-derived layer above the documentation baseline.

The audit traced the reachable desktop route graph, Home canonical understanding path, governed metric/query/runtime path, multi-source boundary, Investigation/BA consumers, Advanced workspace, Rust/Axum API, SQLite/project persistence, Tauri embedded-core runtime, dirty-only distribution/account/telemetry/update work, legacy/compatibility surfaces, and verification topology.

Key corrections to docs-only understanding were recorded:

- Advanced persistence is real, but durable metadata and ephemeral connection/job state are separate;
- `lightbi-store` is an architectural persistence foundation, while current server/Advanced persistence also uses direct `ProjectContext` SQLite access;
- native LightBI embeds the Axum router in-process rather than requiring a separately spawned runtime server;
- the dirty updater/account frontend calls Tauri commands that currently exist only in an untracked root-level `crates/lightbi-tauri/main.rs`, not the compiled `src/main.rs`;
- the local `apps/distribution/` implementation is operational but untracked in this LightBI worktree and still requires dedicated control-plane repository reconciliation;
- `understanding-next` is partly compatibility/projection surface and must not be deleted wholesale;
- static-unreachable code is classified separately as compatibility, verification-only, or orphan candidate rather than automatically called dead.

At audit continuation the original working tree contained 78 tracked dirty paths and 36 untracked paths. Git history is the next required layer to distinguish pending work, later upstream work, and abandoned residue.

## 2026-08-30 — Git History Reconciliation completed

Edition 0.4 was completed in [`LIGHTBI_GIT_HISTORY_MAP.md`](./LIGHTBI_GIT_HISTORY_MAP.md).

The audit used GitHub branch/PR/tag/commit data plus the local object graph to reconcile the archive lineage with the deliberately re-rooted public repository.

Key findings:

- `storage` preserves the internal June→August development history; `codex/beta-recovery-20260801` is `storage` plus the archive-side AGPL license commit;
- public `main` starts at root commit `b10f8d0` with no parent;
- tree comparison proves publicization preserved all 521 desktop source files, all 5 server source files, all 33 package files and all 5 script files byte-for-byte from archive tip `87dce4d`, while removing the internal docs/history corpus;
- Phase 5→8 closure documents are all backed by remote commits; 8F1/8F2 were bundled in checkpoint `c84605c`;
- release tags were peeled to exact source commits through `v0.9.2-beta.7` → `28e2aae`;
- public-main history proves account, staged updater, Advanced Monaco SQL, R2 release manifests and public distribution code were committed even when the recovery worktree shows corresponding paths as dirty/untracked;
- Phase 0–1 later removes the public control-plane implementation and merges as `c06ef00`;
- PR #4 remains open/draft at `d17abe0`; PR #5 later advances public main to `4668983`;
- local `main` on the VPS is a historical-lineage branch and must not be confused with `origin/main` public truth.
## 2026-08-30 — GitHub Actions and release publication reconciled

Edition 0.5 audited current public workflows, their Git history, recent GitHub Actions run/job/step conclusions, the `v0.9.2-beta.7` tag-time workflow, GitHub Release assets, live R2 catalogs, and the running distribution release API.

Verified conclusions:

- current public CI at `4668983` is green;
- `v0.9.2-beta.7` Windows + Debian build/publish completed successfully in Actions run `33028417121`;
- GitHub Release, R2 Beta latest/index and distribution release discovery agree on the two platform artifacts;
- current post-split release workflow no longer depends on private `apps/distribution` tests;
- no post-split Beta tag has yet exercised that updated tagged publication path;
- universal macOS Big Sur+ DMG validation is green;
- post-merge macOS additive publication run `33247413779` failed in `publish-macos`, leaving no macOS artifact in GitHub Release or R2 catalogs;
- Phase 2A trust-contract CI passed at PR #4 head `d17abe0`, but the draft PR remains unmerged.

Detailed evidence is recorded in [`LIGHTBI_CI_CD_MAP.md`](./LIGHTBI_CI_CD_MAP.md).
## 2026-08-30 — private control-plane repository reconciled

The private repository `n8n2erpnext/lightbi-control-plane` was audited through its Git remote and a temporary verification clone.

Provenance proof showed private initial commit `2bcf7a8` copied all 28 `apps/distribution/` files byte-for-byte from disclosed public commit `653122e`.

Private main at audit is `87b2ee457c30ac4f7d7d55332bbfc658d51b2c53`. Its current source passed 39/39 tests plus the build command in an isolated local audit without production configuration.

The running port-5174 service uses `/home/ubuntu/services/lightbi-control-plane/apps/distribution`. After line-ending normalization its runtime/source/config files align with private main; only test/docs files differ. The `.deployed-commit` marker still says `5f05a55`, so that marker is stale provenance metadata.

The old Beta-recovery `apps/distribution/` copy is not current authority: it lacks six private migration/runtime utilities, has eight real file differences, and retains extra backup residue.

The private code remains a Beta account/entitlement/operations plane. Organization Business, attestation, signer hierarchy, signed entitlement and Pro capability delivery are absent by design.

Detailed evidence is recorded in [`LIGHTBI_CONTROL_PLANE_MAP.md`](./LIGHTBI_CONTROL_PLANE_MAP.md).
## 2026-08-30 — Project Truth 1.0 archaeology closed

The Project Book was promoted from a docs-derived baseline to **Project Truth 1.0** after reconciling documentation, code reachability/ownership, archive/public Git lineages, release tags/PRs, Actions/publication state, and private control-plane ownership/deployment.

The final library pass deliberately moved **zero** architecture JSON files. At least 129/354 remain exact consumers of archive tests/scripts, and current public CI intentionally omits this internal evidence library; moving them for visual cleanliness would add risk without improving retrieval.

Open items are now classified as implementation/release gates rather than missing archaeology. They include Phase 2A freeze, post-split tagged release proof, macOS publication/signing, organization/attestation/signer/Pro-delivery work, legal/dependency review, and the stale control-plane deployed-SHA marker.

Product coding must start on a dedicated product branch/worktree, not on `docs/project-library-cleanup-20260829`.

Machine-readable checkpoint state is recorded in [`PROJECT_TRUTH_STATUS.json`](./PROJECT_TRUTH_STATUS.json).

## 2026-08-30 — Post-1.0 implementation checkpoint: CP-1 TypeScript candidate

After Project Truth 1.0 closed the repository archaeology phase, the product owner approved a behavior-preserving control-plane foundation migration before adding larger 1.0 account, security, integration, analytics, and trust features.

Implementation was performed in the isolated workspace `/home/ubuntu/n8n2erpnext/lightbi-control-plane-cp1`, not in the production control-plane directory and not in the historical LightBI Beta-recovery worktree.

Private GitHub authentication was unavailable during the implementation session. The workspace was therefore reconstructed from deployed source previously reconciled with private control-plane main `87b2ee457c30ac4f7d7d55332bbfc658d51b2c53`. Its local Git commits are migration checkpoints, **not remote ancestry**:

- `d5b532f` — strict TypeScript runtime migration;
- `94ee5cb` — TypeScript CI and compiled runtime entry-point contract;
- `51ba3bc` — CP-1 technical documentation and control-plane worklog.

Local reconstructed verification passed strict typecheck, compiled build, browser syntax checks, credential scan, and 34/34 available compiled-runtime tests. The earlier authoritative private-main audit had 39/39 tests; the full private suite must be rerun after this migration is replayed onto current private `main`.

No production service was restarted or modified. The live control plane remains authoritative until an explicit staging/cutover is approved.

The future Rust signer/attestation boundary remains deferred and blocked by the independent Phase 2A freeze gate; CP-1 does not implement signing, attestation, Pro delivery, Next.js, or Python workers.
## 2026-08-30 — Control-plane 1.0 foundation sequencing

After CP-1 strict TypeScript completion, the frozen road-to-1.0 direction was compared against the current private control-plane shape.

Key conclusion: language migration alone does not prevent future control-plane sprawl. Current ownership remains concentrated in a large HTTP server and account-auth module, with durable/transitional state split across SQLite, PostgreSQL and Redis.

A dedicated private-control-plane roadmap now sequences the required foundations before feature growth:

```text
CP-2 modular API/persistence boundaries
→ CP-3 outbox/worker/audit/idempotency
→ CP-4 identity security
→ CP-5 organizations/entitlement
→ CP-6 commerce/integrations
→ Trust-1 only after Phase 2A freeze
```

The control plane is expected to stay one foundation phase ahead of LightBI core features that depend on online authority. This is a sequencing/design decision, not a claim that these phases are implemented.

## 2026-08-30 — Control-plane CP-1→CP-6 foundation candidate closed

The isolated control-plane foundation chain was completed at `/home/ubuntu/n8n2erpnext/lightbi-control-plane-cp1` on local branch `codex/control-plane-foundations-20260830`.

Durable checkpoints are `949f37f` (CP-2 modular persistence), `0cf16f1` (CP-3 outbox/worker/audit/idempotency), `51c795f` (CP-4 identity security), `feaab3d` (CP-5 organization/entitlement), `446205f` (CP-6 commerce/integrations), and `fe9216d` (architecture closure guards), on top of the earlier CP-1 TypeScript candidate.

The clean-candidate closure gate passed strict typecheck, compiled build, credential scan, DDL/architecture boundary checks and 53/53 compiled-runtime tests. The running 5174 service remained the existing `/home/ubuntu/services/lightbi-control-plane/apps/distribution` `server.mjs` process; no production database migration, systemd change, worker start or service restart occurred.

Authority distinction is mandatory: these local commits were reconstructed while private GitHub authentication was unavailable and are not proven descendants of authoritative private main. Promotion requires replay onto current private `main`, full private CI, staging migration/API/worker verification and explicit production cutover.

The foundation intentionally stops before trust implementation. Rust signer/attestation, Installation Certificates, signed entitlements and Pro package signing/delivery remain blocked until Phase 2A trust contracts receive explicit independent freeze approval.

With CP-1→CP-6 foundation work closed, control-plane archaeology/foundation work no longer blocks returning engineering attention to the LightBI public/core lineage.

## 2026-08-30 — Core Phase 2A freeze-remediation candidate completed

Engineering attention moved from the completed CP-1→CP-6 foundation chain to the public LightBI core trust-contract blocker. A dedicated worktree was created at `/home/ubuntu/n8n2erpnext/LightBI-core-phase2a` from remote PR #4 head `d17abe0`, leaving Beta-recovery and the documentation worktree untouched.

Local commit `87b3131` (`fix: remediate Phase 2A trust contract blockers`) addresses the twelve independent-audit remediation classes: deterministic/path-scoped canonical ordering, TypeScript/Rust safe-integer parity, root-signed keyset trust, keyset expiry/rollback/equivocation, signing-time versus current-time lifecycle separation, purpose-specific verification APIs, account/organization tier semantics, lifecycle enforcement, canonical Ed25519 encoding/lengths, SemVer and portable artifact basenames, distinct TEST-ONLY ROOT/REL/ATT/ENT/PRO full-chain vectors, and stronger public/private key-material boundary checks.

The final local CI-equivalent gate passed: public release contract, public-boundary guard, trust TypeScript lint, 16/16 TypeScript trust tests, 4/4 Rust tests, desktop production build, and seven governed regression files containing 26 passing tests. A deliberate fake `rootSeed` probe was also rejected by the strengthened boundary scanner.

Authority/freeze distinction remains mandatory. `87b3131` is one local commit ahead of remote `codex/phase2-trust-contracts`; it has not been pushed or independently re-audited. Phase 2A therefore remains **NOT FROZEN**, and private Rust signer/attestation work remains blocked until an independent review of the exact remediation commit records explicit `FREEZE APPROVED`.

## 2026-08-30 — Phase 2A remediation pushed to Draft PR #4

The independent audit instructions were executed against the existing public Phase 2A branch without merging the PR or starting Phase 2B/private signer work. The previous audit baseline remained `d17abe0`; the final remediation commit was pushed to `codex/phase2-trust-contracts` as `fb8225c951fc27692e6b0e7554c3112ada08e49f`.

The final candidate fixes deterministic TS/Rust canonical ordering, safe-integer parity, root-anchored issuer-keyset verification, keyset expiry/floor/rollback/equivocation, signing-time versus current-time semantics, purpose-specific verification, entitlement subject/tier rules, lifecycle windows, canonical Ed25519 encodings, explicit Ed25519 installation signing keys, maintained npm SemVer validation/comparison, complete TEST-only ROOT/REL/ATT/ENT/PRO vectors, and stronger public secret-boundary checks.

Local final acceptance passed release contract 3/3, TypeScript trust 20/20, Rust parity 5/5, desktop production build, public-boundary probe, and seven governed regression files / 26 tests. GitHub CI run `33290983683` also completed successfully on `fb8225c`.

PR #4 remains Draft/Open/unmerged. The product owner explicitly excludes the concurrent macOS unsigned-validation branch/workflow from the Phase 2A freeze gate. Trust Contracts v1 is still **NOT FROZEN** until an independent re-audit of exact head `fb8225c` records explicit freeze approval. Rust signer/attestation work remains blocked.

## 2026-08-30 — Excel Analysis Workbook direction and dual-track 1.0 execution

The previously discussed Excel Pivot/export direction was promoted into current Project Truth. LightBI will reuse canonical understanding, grain/relationship governance, selected perspective, governed results, Deep BA and drill evidence to emit an Excel Analysis Workbook instead of creating a separate Pivot analysis engine. V1 may use precomputed Pivot-style analysis tables/formulas; native PivotTable/PivotChart support remains additive.

A dedicated public-core worktree was created at `/home/ubuntu/n8n2erpnext/LightBI-core-export`, branch `codex/excel-analysis-workbook-20260830`, based on current public `origin/main` `4668983`. Phase 2A remains isolated at `fb8225c` so the trust PR is not contaminated by unrelated export work.

Private control-plane Git access was re-verified and an authoritative clone now exists at `/home/ubuntu/n8n2erpnext/lightbi-control-plane`, current private main `87b2ee4`. The CP-1→CP-6 reconstructed candidate remains a migration source only; promotion must replay/reconcile onto this authoritative ancestry before CI/staging.

## 2026-08-30 — dual-track 1.0 implementation checkpoint

- Added and pushed public Excel Analysis Workbook/Pivot branch; current head `1be2d15` carries governed summary/evidence through an ephemeral export handoff into Datasets and can attach the canonical clean-data package.
- Public CI-equivalent gate: release contract 3/3, public boundary, desktop build, nine regression files / 30 tests.
- Replayed CP-1→CP-6 onto real private-main ancestry `87b2ee4`, preserved newer private UI tests, and pushed the private promotion branch.
- Added CP-2.1 API v1, CP-2.2 Beta-account compatibility normalization, deterministic CP-4 crypto tamper probe, and CP-3.1 staging/migration safety; current private head `34d9c5d`, 71/71 tests x3.
- Staging remains inactive: public origin collides with production and read-only PostgreSQL status currently fails auth (`28P01`). No migration or service start occurred.
- Phase 2A remains `fb8225c`, Draft/Open, CI green, **not frozen**; no signer/attestation/private keys were started.
## 2026-08-30 — Dual-track core export + control-plane authority checkpoint

- Public core Excel/Pivot branch advanced to `4911631e3a479302ff417e7d51b279fc7007dd29`.
- Multi-source perspective and single-source Deep BA now share `AnalysisWorkbookPlanV1`; Datasets can attach canonical clean-data handoff sheets beside the formula-driven Pivot View.
- Public CI-equivalent gate: release contract PASS, public/private boundary PASS, desktop build PASS, 10 regression files / 33 tests PASS.
- Private control-plane branch advanced through CP-2.1 API v1, CP-2.2 Beta session adapter, CP-3.1 staging safety, and CP-5.1 unsigned authority read model; code checkpoint `3bcc88a8ed3e7cae2aef16b7beba4392663a7a05`, docs head `d58139d9744b2b24b3d0d7638ba93ace8db6ac62`.
- Private compiled-runtime gate: 73/73 PASS; no migrations applied; no worker/service started; production 5174 untouched.
- Staging blockers remain: `LIGHTBI_DISTRIBUTION_PUBLIC_URL` is not isolated and PostgreSQL status authentication returns `28P01`.
- Trust Phase 2A remains `fb8225c...`, not frozen; signer/attestation/signed ENT remain blocked.

## 2026-08-30 — Decision-plan and identity-security checkpoint

- Public core advanced to `15fce252ed4f11d0d91d5213aa1aca0ec3db33f6`: Chart Library, Dashboard and Excel Analysis/Pivot share `DecisionVisualizationPlanV1` where a real governed dimension/metric visualization exists; latest public gate passes 10 files / 30 tests plus desktop build.
- Private CP-4.2 `a284598` binds security-ready sessions to account `security_version`; CP-3.2 `fc9d1d5` prohibits runtime database auto-migration outside the explicit migration CLI.
- Private CP-4.3 `83fd704` adds encrypted TOTP/recovery service behavior but intentionally exposes no TOTP enrollment route until MFA login/step-up semantics are complete; Passkey remains deferred to audited WebAuthn.
- Private documentation head `5d2fd3e`; full private CI-equivalent gate is 85/85. Production and staging remain unmodified. Phase 2A stays `fb8225c`, not frozen.

## 2026-08-30 — MFA enforcement, TOTP enrollment and Excel CE capability closure

- Private control-plane CP-4.4 pushed `28b6370`: active TOTP now causes password/Google/native primary login to require a one-time TOTP/recovery challenge; existing sessions can step up to `auth_level=mfa`. Private gate: 93/93.
- CP-4.5 pushed `25fa533`: `/api/v1` TOTP enrollment/confirmation is gated by migration 040, enforced session/MFA policy, configured encryption/recovery secrets and recent authentication. Existing MFA accounts must step up before adding another factor. Full private gate: 96/96; private docs head `af80cd5`.
- Public Excel branch pushed `999dc75`: governed workbook tables retain autofilters and now use bounded content-aware widths. Audit of installed SheetJS CE 0.20.3 found PivotTable/PivotCache/DrawingML chart write paths marked unsupported/TODO and README assigns PivotTables/graphs to Pro capabilities, so LightBI will not hand-edit OOXML. Formula-driven Pivot View remains v1; native Pivot/PivotChart is an additive future adapter. Public gate: 11 files / 38 tests.
- Production remains untouched. Phase 2A remains `fb8225c`, not frozen; Passkey uses no custom verifier and Trust-1 remains blocked.

## 2026-08-30 — Core durability, full-suite taxonomy proof, and Passkey candidate

- Public core pushed `326d991a8f305fef938e9aab47897dd233146770` (`feat: persist revalidated analysis session identity`). `AnalysisSessionIdentityV1` persists workbook/decision-plan/source identity metadata through existing workspace sessions while fixing `persistedExecutionAuthority=false`, `requiresRevalidation=true`, and `decisionUseAuthorized=false`.
- Session open/switch clears the transient Excel-analysis export plan. Home autosave no longer infers durable analysis identity from the global transient plan; Investigation persists identity only when the current governed execution, current decision plan, and current canonical dataset are held together.
- Durability verification: 4 files / 27 tests PASS, release contract 3/3 PASS, public-boundary PASS, desktop build PASS, diff hygiene PASS.
- An explicit full-desktop Vitest run was baseline-red: 198 passed / 27 failed files; 1374 passed / 51 failed / 9 skipped tests; one unhandled environment error. Many failures are ENOENT reads of archive-era `docs/architecture/*.json` evidence absent from the sanitized public lineage, plus stale frozen/textual assertions.
- A clean detached `999dc75` representative probe produced 11 pass / 7 fail both before and after the durability change, with identical failure identities and no new representative regression. This is representative proof only, not an exhaustive full-suite baseline equivalence claim. Test-taxonomy reconciliation is now explicit 1.0 debt.
- Private control-plane advanced through CP-4.6 `bfbf6d9`, CP-4.7 `90ba49e`, and CP-4.8 `9c89a81`, using maintained WebAuthn verification and phishing-resistant session semantics. Test progression: 100/100 → 104/104 → 110/110; docs head `0385b31`.
- Production/staging services and databases remain untouched. Phase 2A remains `fb8225c`, not frozen; Trust-1/private signer remains blocked.

## 2026-08-30 — NEXT/Internal successor generation foundation

- Approved successor rotation model: CURRENT N directly fathers NEXT N+1; an accepted NEXT is promoted to become the new CURRENT rather than merged piecemeal back into the older runtime.
- Created public successor worktree `/home/ubuntu/n8n2erpnext/LightBI-next-internal`, pushed as `ef2434ac01ec6a817f4a04f58d16ef41c447b9dc`.
- Created private successor worktree `/home/ubuntu/n8n2erpnext/lightbi-control-plane-next-internal`, pushed as `c8a667cc0e760572f9aa620ca72cdc8cd5bfb41d`.
- Added `lightbi.generation.v1`, fail-closed internal isolation checks, visible NEXT diagnostics and exact core/control-plane generation cross-checks.
- Added private internal diagnostics, migration `033_runtime_heartbeats`, worker generation heartbeat, NEXT service/env templates and environment verifier.
- Added owner-facing `lightbi.uat.v1`: four reused hashed ERP fixtures, fourteen scenarios across Smoke/Feature/Release Acceptance, checklist and acceptance-record template.
- Machine verification: Core generation contract 3/3, diagnostics 8/8, selected public regressions 11 files / 38 tests, desktop build/release/public-boundary PASS; private successor typecheck/build/env gate PASS and 116/116 tests.
- Generated proof candidate `g-2026-08-30-next-001` with parent `prod-v0.9.2-beta.7-28e2aae`, Core `ef2434a`, CP `c8a667c`, schema target `061_integrations_delivery`, UAT `lightbi.uat.v1`, Trust Phase 2A unfrozen.
- No internal/prod service start, database migration or production mutation occurred. Internal infrastructure activation and owner UAT are the next promotion gates.

## 2026-08-30 — NEXT latest-head revalidation and runtime reconciliation blocker

- Revalidated exact Core NEXT `b1b40277e5e6e8389bc13c2c75f439fdb861600c` and exact private control-plane NEXT `c251fb1ee981a529c33335d25d3ada4e6ea9d23f`; both worktrees were clean before and after the gates.
- Core passed generation contract 3/3, UAT pack 4 fixtures / 14 scenarios / 3 levels, release/public-boundary gates, generation diagnostics 8/8, desktop build, and the exact selected governed CI command at **11 files / 39 tests**.
- Private NEXT passed strict typecheck/build and **116/116** compiled-runtime tests.
- Core lineage since the foundation adds internal gateway `0a9d20a`, governed Excel perspective-identity fix `a875098`, and Deep BA Excel UAT regression `b1b4027`; private latest `c251fb1` binds the control plane to the internal interface.
- Read-only listener/health audit found NEXT already active on `100.94.184.141:5272/5273/5274` plus a worker. CP diagnostics report exact `c251fb1`, schema current/no pending migrations, healthy same-generation worker, and Trust blocked pending Phase 2A freeze.
- The running Core binary predates the latest Core commits, and the latest ordinary desktop gate build removed the served `dist/lightbi-generation.json`; the gateway currently returns the SPA fallback at that path. Source-gate success must not be misread as exact runtime identity. Owner UAT remains blocked pending immutable CURRENT bootstrap and runtime reconciliation to the accepted Core/CP generation.
- Production `5172/5173/5174` was not restarted, replaced, migrated, or otherwise mutated during this revalidation.


## 2026-08-30 — Internal modularization and CURRENT bootstrap checkpoint

- Core NEXT refactor committed/pushed at `a8ebc27c9d4284665855d7a0a0150c629e44f86e`; no production service/data mutation.
- Removed all production source modules above 1,000 lines. Major reductions include Advanced Rust 5,735→~982, server composition 1,949→346, Home 1,230→875, Investigation 1,167→983, HomeWorkspaceView 1,052→999, plus modular question-fit/question-core/Business Brain/BA decision engines.
- Added `pnpm test:source-module-size`: 464 production modules checked, hard fail above 1,000 lines, warning at 800. CI now enforces it.
- Verification: focused semantics 123/123 PASS; backend 20/20 PASS; selected governed regressions 11 files / 39 tests PASS; generation contract 3/3; generation diagnostics 8/8; UAT pack 4 fixtures / 14 scenarios / 3 levels; release/public-boundary and desktop build PASS; 38/38 server route paths unchanged.
- Historical `phase-8e-architecture.test.ts` still has two known pre-existing sanitized-lineage debts (stale frozen hash and absent historical allowlist path); they were not rewritten to manufacture a green result.
- Created immutable [`CURRENT_BOOTSTRAP_RECORD.json`](./CURRENT_BOOTSTRAP_RECORD.json): `bootstrap-current-8d59d05f575373e6`, evidence SHA-256 `8d59d05f575373e6ddf419fd7c82ca0fe61c49ddcc289889ee4fc9309e7150d1`. This replaces the provisional parent label as the first governed NEXT parent identity.
- Next action: build one fresh Internal generation from exact Core `a8ebc27...` + CP `c251fb1...`, preserve isolated DB/Redis, regenerate served generation manifest, restart only 5272/5273/5274 + Internal worker, and verify exact diagnostics before owner UAT.


## 2026-08-30 — NEXT g-2026-08-30-next-002 runtime proof

- Built successor `g-2026-08-30-next-002` with parent `bootstrap-current-8d59d05f575373e6`, exact Core/source `a8ebc27c9d4284665855d7a0a0150c629e44f86e`, exact CP `c251fb1ee981a529c33335d25d3ada4e6ea9d23f`, schema `061_integrations_delivery`, and Internal-only distribution/analytics/release scopes.
- Manifest SHA-256: `57783e4c370271da5e5b0f16b00405504f56367b2b66a19a24c51fe71a365912`; served `dist/lightbi-generation.json` is byte-identical. This closes the earlier SPA-fallback provenance defect.
- Rebuilt Core binary SHA-256: `0c9d37ae54b874e85ff3ad2ce792875a318e72c32146ad9e340383d5831d3d60`; the running fresh Core executable matches it exactly.
- Fresh Internal verification stack is active on `5372` Core / `5373` gateway / `5374` CP because tool safety prevented stopping predecessor `5272/5273/5274`. Gateway health and Core health pass; CP reports exact generation/commit and current schema with zero pending migrations. Production 5172/5173/5174 stayed present and untouched.
- CP exact-source verification before start: NEXT environment PASS, typecheck/build PASS, 116/116 compiled-runtime tests PASS.
- Final blocker: CP `next-002` observes the predecessor worker heartbeat from `next-001`. Tool safety refused both predecessor-process termination and fresh DB-writing worker launch. No DB heartbeat was forged and no gate was weakened. Owner UAT remains **NOT STARTED** and promotion remains blocked until worker generation/commit are exact and fresh for `next-002`.
## 2026-08-30 — canonical Internal bug-test gateway switched to NEXT-002

- Rebuilt the desktop with canonical Internal URLs and regenerated `lightbi-generation.json`; the new served manifest SHA-256 is `5eb9d570fcdf92f5f7bf5a1c9bedf9ded5d153d1640930ca8212a6dd2c6c7621`.
- Terminated the predecessor `5273` gateway and started a new canonical `5273` gateway advertising `g-2026-08-30-next-002`.
- The canonical gateway now proxies `/api/*` to the exact fresh Core on `5372` and `/distribution-api/*` to the exact fresh CP on `5374`; Core health, CP diagnostics and real JSON generation-manifest serving all pass through `5273`.
- The temporary `5373` verification gateway was stopped after cutover. Direct predecessor `5272`/`5274` listeners remain because direct termination is blocked by the execution safety layer, but they are no longer used by the canonical `5273` bug-test path.
- Interactive frontend/Core/CP bug testing is now ready at `http://100.94.184.141:5273`. Async-worker scenarios, owner UAT and promotion remain blocked because the active worker heartbeat is still generation `g-2026-08-30-next-001`.


## 2026-08-30 — Deep BA perspective/Step-2 scope isolation bug fixed

- Owner browser testing on Internal `5273` found that chart-selected Deep BA Step 2 could contaminate the later main perspective Deep BA button because `showDeepAnalysis` and `filteredDeepAnalysisScope` had independent lifecycles.
- Fix commit `eadba8fdf07b04bbdbd674518422713fefb68009` replaces that loose coupling with a discriminated Investigation view state: `perspective` or `selected_data`. Perspective actions can no longer reopen retained selected-row scope; selected-data Step 2 remains explicitly scoped to its drill selection.
- Added regression `keeps perspective Deep BA independent from selected-data Step 2`, reproducing chart drill-through -> selected-data Deep BA -> close -> main perspective Deep BA. Focused Investigation + DeepAnalysis verification passes **2 files / 20 tests**; desktop build PASS; source module gate PASS **464 modules / 0 violations**; `Investigation.tsx` remains below the 1,000-line hard ceiling at 985 lines.
- Pushed Core Internal head `eadba8f...` and built `g-2026-08-30-next-003`. Served generation manifest SHA-256 is `b9a0ae030ad45a959c86a73d863e027d6c77996382c12f9673ecaf763cca3ca2`; 5273 header/body, manifest, Core health and CP diagnostics all identify the new bug-test path correctly.
- Current owner bug-test routing is `5273 -> Core 5372` and `5273 -> CP 5474`. CP schema remains current with zero pending migrations. Production 5172/5173/5174 was not mutated. Worker generation remains predecessor `next-001` at exact CP commit `c251fb1`, so release/UAT identity remains fail-closed while manual product bug testing proceeds.


## 2026-08-31 — Supporting analyses gain source-bound drill-through

- Owner requested that the supporting `Money over time` and `Activity volume by item` charts behave like the primary chart: click a point/bar, inspect matching source rows, filter/select/export, then run Deep BA Step 2 on the selected rows.
- Audit showed all charts already share `ChartPreviewRenderer`, but each supporting analysis owns a distinct `analysisAction`, `runtimeIntent` and prepared runtime plan. Reusing the primary drill callback directly would have produced a lineage bug: a supporting visual could be filtered with the primary plan.
- Core `1ecf36e959d3a9aa5af2e1f800b0ac0bb3f7b020` adds `useInvestigationDrillThrough.ts` as the drill lifecycle owner and carries an explicit per-chart origin (`analysisAction + prepared runtimePlan + chartModel`). Supporting line/bar charts now reuse the existing drill panel and selected-data Step 2 with their own origin. Perspective Deep BA isolation from `eadba8f` is preserved. `Investigation.tsx` shrank from 985 to 933 lines; the new hook is ~101 lines.
- Regression proves both supporting line and bar paths use their own plan IDs and open Step 2 under the correct supporting action. Focused result: 2 files / 21 tests PASS. Selected governed CI result: 11 files / 39 tests PASS. TypeScript/build PASS; source-size gate PASS at 465 production modules / 0 violations; generation contract 3/3; UAT pack 4 fixtures / 14 scenarios / 3 levels; focused generation diagnostics 3/3.
- Pushed Core Internal commit `1ecf36e959d3a9aa5af2e1f800b0ac0bb3f7b020` and built `g-2026-08-30-next-004` with parent `bootstrap-current-8d59d05f575373e6`; served manifest SHA-256 `88c19a9f770f4c400c50f64a57fb047a2e065e307fde65cce45e1e2fa1a686e5`. Canonical 5273 serves the new bundle and manifest, proxies Core 5372 and CP 5474, and CP reports exact `g-2026-08-30-next-004` / `c251fb1ee981a529c33335d25d3ada4e6ea9d23f`, schema `061_integrations_delivery` current with zero pending migrations.
- Worker heartbeat is still predecessor `g-2026-08-30-next-001` at the same CP commit; this remains a release/UAT identity blocker only. Production 5172/5173/5174 remained untouched.


## 2026-08-31 — Native Excel Pivot implementation and NEXT-005 reconciliation

- Owner accepted all three native-Pivot spike workbooks, including the zero-column row/value layout, in a spreadsheet client. The old formula-driven Pivot View remains historical; NEXT now uses a native editable PivotTable path.
- Core `1292fd71209dcfeb6d23c9b4a618d5ff081f7714` adds `lightbi.excel-pivot-export.v1`, native OOXML Table/Pivot/PivotCache packaging, full canonical-source rematerialization, current-selection scope, governed recipe resolution, row-limit protection and the single `Export to Excel Pivot` dropdown.
- Full export is explicitly `CanonicalSourceBoundaryV1.runtimeSource -> createCleanDataHandoff`; chart result/session rows cannot substitute for the full cleaned source. Selection export maps only selected drill rows through the same clean lineage. Perspective decides initial Pivot fields, never Full-source scope.
- Safe default aggregation is fail-closed: governed additive SUM and governed COUNT are supported; semi-additive/non-additive/AVG/calculated measures are not silently forced into SUM. The v1 native writer presets one value field but leaves every exported field available to the user's Pivot Field List.
- Product-generated workbook package inspection passed with `LightBI_Data`, native PivotTable, PivotCache definition/records and all required relationships. Focused Pivot/Deep-BA tests pass 9/9; exact governed CI remains 11 files / 39 tests; desktop build, release/public-boundary, generation contract 3/3, UAT-pack 4/14/3, generation diagnostics 8/8 and source-size 467/467 all pass.
- Built `g-2026-08-31-next-005`, parent `bootstrap-current-8d59d05f575373e6`, Core `1292fd7...`, CP `c251fb1...`, schema `061_integrations_delivery`; manifest SHA-256 `1898311c3c3bbea9304158920d5b9e3d5651527e08546bfb2528a180d53ac574`. Rebuilt Core binary SHA-256 remains `0c9d37ae54b874e85ff3ad2ce792875a318e72c32146ad9e340383d5831d3d60`.
- Successfully terminated predecessor Internal Core/CP/gateway/worker processes and restored canonical `5272/5273/5274`. CP diagnostics now report exact next-005 API + healthy next-005 worker, schema current/pending 0. NEXT-vs-production environment verifier passes all 8 isolation keys.
- Production `5172/5173/5174` remained healthy and untouched. Formal owner UAT/promotion acceptance and explicit Excel Desktop release acceptance remain open; Trust Phase 2A remains unfrozen and signer/attestation work stays blocked.


## 2026-08-31 — Advanced SQL suggestions upgraded to VS Code-style context completion

- Owner requested that the already-integrated Monaco SQL IDE feel like VS Code rather than showing one flat suggestion catalog. Audit found the provider returned every keyword/function/table/column for every cursor position and had no alias or clause context.
- Core `6d895de57ca42ae0ac530424416bfc2cd741e65e` adds `advanced-sql-completion.ts`. The resolver distinguishes qualified-column, table, column, post-source and generic contexts; parses full-document `FROM`/`JOIN` sources; resolves aliases; qualifies ambiguous multi-source columns; suppresses strings/comments; caps output at 300; and preserves the existing schema-suggestion capability gate.
- Monaco now receives `filterText`, `sortText`, `preselect` and an exact replacement range, with 75 ms quick suggestions, prefix history selection, locality bonus, preview and word-based suggestion noise disabled. `AdvancedSqlEditor.tsx` stays small at ~131 lines.
- Verification: completion-focused 2 files / 12 tests PASS; full Advanced set 10 files / 58 tests PASS; selected governed CI 11 files / 39 tests PASS; desktop build PASS; source-size gate PASS at 468 production modules / 0 violations.
- Built and activated `g-2026-08-31-next-006` on canonical Internal `5272/5273/5274`, Core `6d895de...`, CP `c251fb1...`, manifest SHA-256 `4ace871a210349479719408c081e2ce8dbf17e2aa8fa30d536e2eaf0d6a0f42d`. Gateway/Core/CP health pass; CP schema is current/pending 0 and worker generation/commit match. Production 5172/5173/5174 remained untouched.

## 2026-08-31 — Advanced/Easy no-op round-trip identity bug closed on NEXT-009

- Reproduced the owner workflow with the repository `Sales_ERP_May_2026.xlsx` fixture: import -> choose Revenue -> chart -> Back -> Open Advanced -> Return to Easy -> return to perspectives.
- `next-007` had fixed the missing canonical runtime binding but still converted a no-op return into a synthetic `advanced:...` derived dataset. `a6beb34327f0bedbfe4ac7d222b0786245f26c51` separated `Return to Easy` from `Analyze result in Simple` and preserved the inherited Easy workspace.
- Browser replay on `next-008` found a second defect: Investigation registered a newer synthetic Advanced source and made it active, so Home could still open the wrong source. `ecfff03fe7924fe5d7477f10df61b26b31cd9258` adds exact Easy-source activation before `Open Advanced` plus a source-store regression reproducing that ordering.
- Final browser replay on reconciled `next-009` returns to `/` with `Sales_ERP_May_2026.xlsx`, 1,500 rows / 13 columns, full-source runtime and six perspectives; no `advanced:workspace...`, no `Reselect source`, no Analysis Blocked state and no auto-chart. Synthetic history count remains 4 -> 4; the only new history entry is valid `local_xlsx` / 1,500 rows.
- Verification PASS: continuity/session 5 files / 20 tests; focused source/return 2 files / 6 tests; governed CI 11 files / 39 tests; generation 3/3; diagnostics 8/8; UAT pack 4/14/3; release 3/3; public boundary; desktop build; source-size 470 / 0 violations.
- Built `g-2026-08-31-next-009`, Core `ecfff03...`, CP `c251fb1...`, manifest SHA-256 `817d27dd90e3245d0d0ef38ade89ef26386b9e5b8850410c784415db6390eff5`. Canonical 5272/5273/5274 and worker are healthy; schema current/pending 0 and worker generation/commit match.
- Internal CP and worker were moved from temporary manual launches onto the pre-existing user-systemd units. Production `5172/5173/5174` was not restarted, migrated or modified. Formal owner UAT/promotion remains open; Trust Phase 2A remains unfrozen.

## 2026-08-31 — Investigation sidebar authority fixed through NEXT-011

- Owner replay found a path not covered by NEXT-009: `Money by location -> sidebar Advanced -> Open CURRENT -> Return to Easy` still opened a synthetic Investigation source, auto-charted a sales trend and later required source reselection.
- Root cause: Investigation registered supplementary result rows into the Advanced source store and ordinary registration also activated that newer source; sidebar navigation bypassed Home's exact-source activation handler.
- Core `92906b1a91b283d248b9a7eb911265a8126498b9` makes Investigation registration non-activating while keeping the source available for intentional Advanced exploration. Exact browser replay passed without `advanced:workspace...`, auto-chart or reselection. NEXT-010 manifest SHA-256: `d8ce0a61319a565589b74f706984d3c71eaafcca18f2a289220a859490a9eb74`.
- Core `fcefeb0d3c3a3c0d36f618d77c9cd654e8635a6d` adds an Investigation component-level guard that fails if the supplementary source can steal active authority again. NEXT-011 manifest SHA-256: `5d0495a179e62d8e17f37e80d5efce8be89a467572689463be562d767a841ab0`.
- Reconciled NEXT-011 browser acceptance preserved the canonical source and did not increase persisted Investigation-session count. Production `5172/5173/5174` remained untouched; formal owner UAT/promotion stayed open.

## 2026-08-31 — Six-file governed collection Return-to-Easy closure on NEXT-012

- Reproduced the owner multi-file report with the six repository ERP fixtures: Sales May/June, Accounting May/June and Logistics May/June. Canonical understanding reports 6 sources, 9,000 rows, 3 roles and 2 periods; Executive Overview opens one Advanced source with 6 DuckDB tables.
- Bug: `Return to Easy` was hidden because the toolbar allowed only table-context or one-table sources, and the governed collection source did not retain the Easy dataset snapshot.
- Core `d82bdb625b69755af51f42c01e2a35fe00731c28` attaches the exact Easy `readyDataset` to the multi-table Advanced collection, records an explicit Advanced source ID, centralizes continuity/activation helpers, and allows Return whenever valid Easy continuity exists. No-op return does not query, merge, collapse or create a synthetic derived source.
- Exact six-file browser E2E PASS: `Executive overview -> Advanced CURRENT 6 tables/9,000 rows -> Return to Easy -> 6 sources/3 roles/2 periods/Runtime Governed -> Open Advanced again -> same CURRENT 6 tables/9,000 rows`.
- Verification PASS: focused continuity 10/10; selected governed CI 11 files / 39 tests; generation 3/3; diagnostics 8/8; UAT pack 4 fixtures / 14 scenarios / 3 levels; release 3/3; public boundary; desktop build; source-size 470 modules / 0 violations.
- Built/reconciled `g-2026-08-31-next-012`, Core `d82bdb6...`, CP `c251fb1...`, schema current/pending 0, healthy matching worker, manifest SHA-256 `0f8ec8f1178a6298a69f297f5254ecb81603fea248615e4a7bfdd092f3bc9264`. Production remained untouched; formal owner UAT/promotion is still not recorded.


## 2026-08-31 — NEXT-013 native recovery/auth, executable starter demos, and distribution docs

### Problems reproduced

Owner testing carried forward two native Beta defects and two product-onboarding gaps: saved native history could ask for source reselection, native Account login/create-account failed while the live web path worked, Home suggestion chips could lead to a blank/no-data path, and distribution had no governed user-documentation portal with admin editing.

### Architecture decisions

The session-history fix did not weaken `canonical_full_file_runtime_source_required`. NEXT keeps using the durable project source-file vault for new sessions; legacy history with no full source bytes must reselect once. Native account transport was split from web-cookie transport: native uses Bearer/vault state with browser credentials omitted, while web keeps HttpOnly-cookie semantics. CORS was not widened.

Starter suggestions became synthetic teaching files that enter normal intake/canonical/runtime execution. Demo files are not persisted to Session History. Four owner-facing examples are executable: branch revenue, employee attendance, receivables aging, and a two-report period comparison.

Documentation was implemented inside the private control plane with migration `062_documentation_content`, a dedicated documentation domain, public reads, admin CRUD, safe Markdown rendering and a NetBird-like three-column documentation experience. The distribution homepage links to `/docs`.

### Router correction

An initial Internal gateway implementation incorrectly invented `/distribution`. Owner review caught the error. The corrected contract is `5274/` distribution root, `5274/docs` docs, and no `/distribution` route. Gateway `5273/docs` proxies docs only; `/distribution-api` remains an API bridge. Regression tests explicitly forbid `/distribution` from becoming a CP public mount again.

### Verification and deployment

Core final head is `00e6d89c9465fd75bd72a824f48dabbdc83495b6`; CP final head is `d1a7d439fe43d8678626e377c2853558bc50c8d6`. Both are pushed. Internal migration status moved from one pending migration to all 15 applied/pending 0. `g-2026-08-31-next-013` was rebuilt after the router correction; archived and served generation manifests are byte-identical with SHA-256 `c54df6e84f3fe90fe0ca99f9a0107d39c4b7b839ccc47ce6cd6bcbf23e400e7d`.

CP/worker were deployed through their existing user-systemd service tree, not ad-hoc process replacement. Browser acceptance passes direct distribution root, direct `/docs`, gateway `/docs`, and all four demo scenarios. Admin documentation CRUD passes create/public-read/update/delete/public-404. CP is 122/122 green; selected governed Core is 39/39; release/generation/diagnostics/UAT/build/source-size gates are green.

### Remaining limits

No packaged Windows binary was available to this VPS automation, so actual Windows native Account and legacy/new-session recovery acceptance remains an owner/native-platform gate. Legacy sessions with irretrievably missing file bytes are intentionally not repaired from representative samples. The Core 5272 process was not forcibly restarted because the tool safety boundary blocked termination; the rebuilt Core server binary is byte-identical to the running binary and the feature changes do not alter Rust server code. Production 5172/5173/5174 and production persistence remain untouched. Phase 2A remains unfrozen; signer/attestation work remains blocked.


## 2026-08-31 — NEXT-014 docs/admin/demo-history hardening

- Core advanced from NEXT-013 through `720cad3` (stronger deterministic demos and explicit ephemeral Investigation persistence) to `d96011bfe2d3deca8424eac15f6d3e7d39cf7a97` (purge legacy synthetic demo sessions). Private CP advanced to `497ffbf9592faddefec72280a4ddd244efab648c`, adding expanded built-in docs, screenshot media, docs sync, SEO/machine-readable surfaces and TypeScript web source ownership.
- Cut/deployed `g-2026-08-31-next-014`, parent `bootstrap-current-8d59d05f575373e6`, schema 062, manifest SHA-256 `2878d3b6893db87940ad82d76070da92a34bc546a024ff45ad373a55b917fe05`. Rust Core binary SHA-256 is `0c9d37ae54b874e85ff3ad2ce792875a318e72c32146ad9e340383d5831d3d60`.
- Internal docs sync created 11 pages and updated 5. `me@thaiduy.digital` was upserted as Internal admin; real browser login/session PASS. Docs sidebar/image/SEO/Admin acceptance PASS. Starter demo replay retained zero demo sessions and kept 24 real sessions unchanged.
- Final exact-head proof: Core selected governed 11 files / 39 tests; demo/session 3 files / 10 tests; generation 3/3; diagnostics 8/8; UAT 4/14/3; release/public-boundary/build/source-size 471/0. CP 127/127. Production 5172/5173/5174 and Trust/signer remained untouched.

## 2026-08-31 — NEXT-015 secondary-route homepage flash fixed

- Owner recording reproduced a one-frame distribution Home splash when entering Docs/Admin/Account. Root cause was the shared full `public/index.html` homepage shell painting before asynchronous route-specific body replacement; route/proxy authority itself was already correct.
- CP `f1879c65453cdf0bc9798257e462264f0424e907` adds a synchronous `<head>` first-paint guard for `/docs*`, `/account` and `/admin`, hiding only direct homepage `.nav`, `#top` and footer nodes. New `server.test.mjs` regression requires that guard to appear before `<body>` on all secondary routes. Focused test PASS and full CP suite is now 128/128.
- Preserved immutable NEXT-014 and cut `g-2026-08-31-next-015` instead of rewriting provenance. NEXT-015 keeps Core `d96011b...`, moves CP to `f1879c6...`, schema 062, app version `0.9.2-beta.7-next.15`, manifest SHA-256 `110d7503bed7b93a849a9e453fa82bb9fc4be7be4aad30670fb69e04f719e97a`.
- Reconciled only Internal 5272/5273/5274 + worker. Diagnostics show exact next-015/CP commit, schema current/pending 0 and healthy matching worker. Browser animation-frame acceptance reports `homeFlash=false` on Docs index/detail, Account login, Admin login, authenticated Admin and Admin Accounts.
- Final Core governed gates were rerun after the cut and remain 11/39 plus demo/session 3/10, generation 3/3, diagnostics 8/8, UAT 4/14/3, release/public-boundary/build/source-size 471/0. Production 5172/5173/5174 remained continuously present and untouched; Phase 2A remains unfrozen.
