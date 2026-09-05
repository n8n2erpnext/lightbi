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
  - [2026-08-31 — R1-P0 Road-to-1.0 execution baseline started](#2026-08-31-r1-p0-road-to-10-execution-baseline-started)
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

## 2026-08-31 — NEXT-016 Monaco SQL suggestion-controller closure

- Core advanced from `d96011b...` to `451c9b6afe0a95bce5bce473a4a84c8b918f42cd` to explicitly enable Monaco's suggestion controller in Advanced SQL while retaining the existing contextual completion provider as semantic authority. Added runtime-contract regression 1/1 PASS.
- Preserved CP `f1879c65453cdf0bc9798257e462264f0424e907` and schema 062. Cut/reconciled `g-2026-08-31-next-016`, app version `0.9.2-beta.7-next.16`, manifest SHA-256 `72f223df5c2508e2d1e278497e1d8a664aa55f87c5c497f8d48d5a76b77e7f90`.
- Live CP diagnostics: schema current/pending 0, worker healthy and generation/commit matched. Gateway serves a real JSON generation manifest; after final desktop build the archived manifest was explicitly restored into `dist` and verified byte-identical.
- Exact Core revalidation PASS: generation 3/3, diagnostics 3/3, desktop build, selected governed 11 files / 39 tests, plus focused Monaco contract 1/1. CP source unchanged; prior exact-head CP suite remains 128/128.
- Replayed secondary-route first-paint acceptance on direct CP `/docs`, `/account` and `/admin`: guard present, homepage hero absent, observed visible-home paints zero. Production 5172/5173/5174 and Trust/signer remain untouched.

## 2026-08-31 — R1-P0 Road-to-1.0 execution baseline started

The owner authorized a single bounded execution roadmap from immutable Internal generation NEXT-016 to stable LightBI 1.0. The operational plan is [`../history/agent/plans/AGENT_PLAN_ROAD_TO_1_0_2026-08-31.md`](../history/agent/plans/AGENT_PLAN_ROAD_TO_1_0_2026-08-31.md).

Two durable architecture contracts were added before implementation work: [`../architecture/road-to-1-0-trust-release-contract.md`](../architecture/road-to-1-0-trust-release-contract.md) owns official-build/trust/anti-impersonation direction, and [`../architecture/commerce-erpnext-revenue-mirror.md`](../architecture/commerce-erpnext-revenue-mirror.md) owns the optional downstream commerce mirror.

The roadmap freezes pre-1.0 scope around product acceptance, security UX, test/release cleanup, official identity, Trust, signed entitlement, physical Basic/Pro separation, platform signing and release engineering. Major new BI/BA scope is excluded unless it repairs a release blocker.

Phase 2A remains exact `fb8225c951fc27692e6b0e7554c3112ada08e49f`, Draft/Open/CI-green and NOT FROZEN. No production Root/issuer keys, signer, installation attestation, signed entitlement or PRO-package authority is authorized yet. Oracle Cloud availability does not alter the offline Ed25519 Root boundary merely to consume a free KMS tier.

The optional ERPNext revenue mirror is deliberately outside payment/entitlement authority. Current private CP already emits `commerce.order.completed.v1` transactionally after order/payment/entitlement state and delivers integrations asynchronously through its worker/outbox foundation. The live ERPNext instance is isolated inside LXD and n8n is available on the VPS; authentic E2E work will use a dedicated LightBI company/master boundary rather than existing sample companies.

R1-P0 documentation/integrity closure verified 1,243 local links with zero missing targets, valid Project Truth/catalog JSON, updated architecture/source indexes, and a clean `git diff --check`. The isolated documentation commit is the final mechanical checkpoint; only after it is created may the optional Internal ERPNext/n8n E2E track mutate runtime/configuration.

## 2026-08-31 — Paddle selected; inactive n8n → ERPNext accounting scaffold created

- Owner selected Paddle as the intended LightBI 1.0 payment provider and deferred gateway/webhook configuration. LightBI payment/order/entitlement authority remains upstream; n8n/ERPNext is asynchronous reporting only.
- Created isolated ERPNext Company `LightBI Inc` (`LBI`, VND), non-stock service item `LIGHTBI-PRO`, `Paddle Clearing - LBI`, and `LightBI Order Mirror` as the downstream retry/idempotency ledger. Existing sample companies are not reused as LightBI commerce authority.
- Reworked n8n workflow `lightbiRevenueMirror01` into `LightBI Paddle Revenue → ERPNext Invoice + Clearing`, 26 nodes and inactive. The target path is non-stock Sales Invoice (`update_stock=0`) → Payment Entry into Paddle Clearing; Sales Order/Delivery Note/Stock Entry are not part of the digital-service flow.
- The event scaffold now requires provider-decimal `providerAmount` separately from `accountingAmountVnd`; n8n does not infer `/100`, FX or tax policy. HMAC/provider activation remains fail-closed and deferred.
- Added ERPNext Email Template `LightBI Purchase Confirmation`, Print Format `LightBI Purchase Invoice`, and bound disabled Notification. Render-only proof produced a valid 24,004-byte PDF and sent no email. A separate synthetic invoice/payment accounting proof was submitted then cancelled.
- Open before live use: Paddle provider wiring, approved currency/tax/FX policy, HMAC activation, CP subscription, synthetic/replay/failure-recovery E2E, payout/fee reconciliation, and owner decision to enable the ERP copy email.

## 2026-08-31 — NEXT-017 reconciled; Account Security management and 1.0 release gate verified

- Core `93296e46d250be7d2f885b2cbb06e25068f38761` and private CP `d615832768f89c861ae508c210713c92ed6b74e2` were committed and pushed on `codex/next017-r1-stabilization`.
- Core defines `pnpm test:release-1.0` as the single platform-independent release-authoritative suite; historical full-desktop Vitest remains a diagnostic command rather than release authority. The release suite passed before packaging.
- CP completes the Account Security management surface: TOTP enrollment/login, one-time recovery codes and rotation, Passkey enrollment/login, factor listing/revoke, inline strong-auth step-up and `security_version` invalidation. Exact-head CP authoritative proof passes 134/134. Passkeys remain fail-closed outside HTTPS/secure browser context.
- Built immutable `g-2026-08-31-next-017`, parent `g-2026-08-31-next-016`, manifest SHA-256 `b1c849eb7c88d46cd6801c340b970a8e9993cd556fdd12a0d0dfbe612510dd0a`. Archived/current/served manifests are byte-identical.
- After supplying the correct user-systemd bus environment, only Internal gateway/CP/worker were restarted. Gateway header, served manifest, CP diagnostics and worker all report NEXT-017 / CP `d615832...`; schema `062_documentation_content` is current with zero pending migrations. Production `5172/5173/5174` retained their pre-existing processes.
- R1-P1 formal owner/native acceptance remains open. R1-P2 is Internal-deployed and machine-verified with secure-context owner acceptance open. R1-P3 is verified. R1-P4 remains a contract candidate pending trademark policy/final verification UI. R1-P5 independent exact-head Phase 2A audit is next; Root/signer/private production-key work remains prohibited.

## 2026-08-31 — R1-P5 independent Phase 2A re-audit passes; freeze remains owner-gated

- Independently audited exact Phase 2A `fb8225c...` from a clean detached worktree. Existing CI was green, but semantic review found additional freeze blockers; the candidate was not frozen.
- Remediation `528b7c220df0bc5f458526fdfca693a3b101dacd` adds provider-neutral `commerce`, canonical SemVer, subject-scoped entitlement rollback/equivocation, half-open lifecycles, strict persisted trust state, Root/purpose key-material separation and stable-channel protection.
- Follow-up `10de4da8e551a46f93f7b62985a0a6e611581b8e` binds signed REL/ATT/PRO `product_id` exactly to `digital.thaiduy.lightbi`. Both commits were pushed to PR #4 branch `codex/phase2-trust-contracts`.
- Fresh detached final audit at `10de4da...` PASS: release 3/3, public boundary, Trust TS 22/22, Rust 5/5, desktop build, governed regressions 7 files / 26 tests, plus adversarial provider/product/state/root probes. GitHub CI run `33397723902` is success at the same head.
- PR #4 remains Draft/Open/unmerged. Technical verdict is `AUDIT PASS / AWAITING OWNER FREEZE`; `phase2aFreezeApproved=false`. No Root, issuer private key, signer, attestation, signed ENT or PRO authority was created.

## 2026-08-31 — NEXT-018 commerce/marketing/Admin-security source candidate verified; infrastructure approval pending

- Public Core `57304194e7c21d3e036c6dcb1793914f97c74118` adds a persistent native announcement inbox; `test:release-1.0` passes 11/39 plus build/generation/UAT gates.
- Private CP `1868e3db5039b3b08df63afe7bee9f7bd6f12125` adds secure Paddle/Stripe catalog authority, public-vs-code discount separation/history, maintenance/checkout controls, managed SMTP/newsletter, Redis marketing throttle, and separate Admin TOTP/Passkey/security-version authority.
- Final CP suite 157/157 PASS; focused commerce/mail/Redis 20/20; Admin Security 4/4; dependency audit reports no known vulnerabilities; no real credential material found in source.
- Read-only infrastructure audit plus owner Oracle Security List evidence confirms public cloud-edge ingress is limited to 80/443 and required NetBird/VPN UDP. Direct host application binds are therefore defense-in-depth debt, not current Internet exposure.
- Candidate migrations 063–066, new secrets, service restart, HTTPS sandbox webhook route, Paddle sandbox configuration, n8n activation and E2E remain unperformed pending explicit owner infrastructure approval. R1-P6 remains HOLD and Production remains untouched.

## 2026-09-01 — NEXT-021 authentication/security closure deployed to Internal

- Owner screenshots confirmed the active NEXT runtime still showed the pre-NEXT-021 Admin/TOTP UX: TOTP setup exposed a manual secret without QR/90-second refresh and Commerce mutations surfaced `admin_reauthentication_required` after password entry.
- Private CP `1ef53f947af030deca54208cb5c6f71ced785e67` on `codex/next021-auth-security` closes the flow: local QR generation, backend 90-second pending-TOTP expiry, refresh/revoke of stale pending factors, managed labels, Passkey-first strong authentication with TOTP fallback, 20-minute one-time magic links, reset URL + temporary-password 2-of-2 verification, bounded reset failures, no email-verification auto-session, and account-bound Passkey session step-up.
- Commerce and other sensitive Admin surfaces now share `adminStrongMutation`: password remains the primary reauthentication input, then an enrolled Passkey is attempted first and the original mutation is retried only after successful strong verification; TOTP/recovery is fallback.
- Verification PASS: dedicated NEXT-021 security 6/6, targeted auth/API/TOTP 31/31, full CP 167/167, production dependency audit with no known vulnerabilities, and source secret scan with no credential material.
- Deployed immutable `g-2026-08-31-next-021`, parent NEXT-020, Core `57304194e7c21d3e036c6dcb1793914f97c74118`, CP `1ef53f9...`, schema `065_marketing_newsletter_mail`, app `0.9.2-beta.7-next.21`. Manifest SHA-256 is `01f86a89ea82127dab49d0aa2ddcdb2a23538b8974461b5cdde08c29ed1190ec`.
- Existing user-systemd CP/worker/Core/gateway units were stopped, the CP service tree was replaced from a separately staged offline-production dependency install, generation env metadata was updated, and the same four Internal units were restarted. A complete NEXT-020 CP service-tree/env rollback backup was retained.
- Post-deploy diagnostics over both NetBird origin and `https://lightbi-next.thaiduy.digital` report NEXT-021, exact CP SHA, schema current/pending 0 and healthy matching worker. HTTPS assets contain the new QR and Passkey-first mutation logic.
- The active runtime manifest registry was discovered stale at NEXT-017 and reconciled to NEXT-021; served/current/archive manifests are byte-identical. Production `5172/5173/5174` remained untouched. Phase 2A remains unfrozen; R1-P6 remains HOLD.

## 2026-09-01 — R1-P4 official identity boundary deployed as NEXT-022

- Added public Core `TRADEMARK_POLICY.md` to separate AGPL fork rights from misleading claims of official LightBI origin, endorsement, domains, publisher/signing identity, update channels or official infrastructure. README now links the policy.
- Added Settings `Build identity` UI with fail-closed wording: Internal successors are not official public releases; unfrozen Trust cannot claim cryptographic publisher verification; `trust1_enabled` alone still does not imply REL/ATT verification.
- Focused identity regression PASS 3/3. Full Core `test:release-1.0` PASS including public/private boundary, generation/UAT contracts, production build and governed 11 files / 39 tests.
- Deployed immutable `g-2026-09-01-next-022`, parent NEXT-021, Core `ed044e0a6ceb98eb8d052ddbac17249893005bb6`, CP `1ef53f947af030deca54208cb5c6f71ced785e67`, schema 065/pending 0, healthy matching worker. Manifest active/archive hashes are byte-identical at `e0b6a250a5d2711da1edc0f1e61ee8d1318c484b58ef1d0e40c289e9672d30fd`.
- Production 5172/5173/5174 remained untouched. R1-P6 remains HOLD; no Root/private issuer/signer work started.

## 2026-09-01 — NEXT-023 Admin sidebar UX deployed to Internal

- Owner requested an ERPNext-style left navigation for `/admin` instead of the horizontal function tabs.
- Private CP `c4db73bfa829e4c6e36a0210fbd9db1ac311aff6` adds one canonical grouped Admin sidebar and responsive mobile fallback without changing payment, auth, catalog, newsletter, documentation or analytics authority.
- Focused Admin UX regression PASS 4/4; full CP suite PASS 169/169.
- Deployed immutable `g-2026-09-01-next-023`, parent NEXT-022, Core unchanged at `ed044e0a6ceb98eb8d052ddbac17249893005bb6`, CP `c4db73b...`, schema 065/pending 0, worker healthy. Manifest current/archive SHA-256 `ad2c062f8458d28a792b3b7843d88aa842ec99feba21dbfdf4028f7f3f37f728`.
- HTTPS Internal assets expose the new `Distribution admin` navigation and sidebar CSS marker. Production 5172/5173/5174 PIDs remain unchanged. Owner visual acceptance pending.

## 2026-09-01 — NEXT-024 Distribution TypeScript closure and collapsible Admin rail

- Fresh audit corrected an over-broad prior claim: Distribution runtime/browser source was TypeScript, but 33 authored `*.test.mjs` files remained. Converted all 33 to `.test.ts`, added `tsconfig.tests.json`, and made the root CP test chain run build -> test TypeScript typecheck -> runtime tests. A boundary regression now rejects authored legacy JS-module extensions outside generated `public/`/`dist/`.
- Private CP `ecb17a8a01ac08aa3c42d391d974bfe13a5cd59b` adds the Frappe-inspired Admin interaction requested by the owner: 220px expanded sidebar, 58px icon rail, persistent local state, collapse/expand control, `Ctrl+/`, grouped dividers, icons/tooltips and preserved active state. Next.js was deliberately not added because it would introduce a second frontend server/router/security surface without being required for this UX.
- Verification PASS: full CP 170/170, test TypeScript typecheck, focused Admin/TS boundary 3/3, `git diff --check`, and production dependency audit with no known vulnerabilities.
- HTTPS browser acceptance used real Admin policy and TOTP fallback after Passkey-first was requested by the backend. DOM proof: expanded 220px/shell-left 244, collapsed 58px/shell-left 82, reload retained 58px, reopen returned 220px; active `Newsletter & Mail` remained selected.
- Deployed immutable `g-2026-09-01-next-024`, parent NEXT-023, Core unchanged `ed044e0a6ceb98eb8d052ddbac17249893005bb6`, CP `ecb17a8...`, schema 065 with 19 applied migrations/pending 0 and healthy matching worker. Served/current/archive manifest SHA-256 is `a61df79d3ff76b652df8880dd95cd846bfca56f0b800bf7147803eb55d4b1c04`. Production 5172/5173/5174 remained untouched. Owner visual acceptance is still open; NEXT remains Internal test state.

## 2026-09-01 — Permanent NEXT pre-production chassis and Oracle-Free-Tier DR foundation verified

- Approved ADR-123: NEXT and Production are permanent, separate chassis; only exact engine identities promote. Chassis data/secrets never promote. The pre-1.0 Production plan is archive Beta state then bootstrap a clean zero-migration Production database for Day-0 metrics; no reset was performed now.
- Activated encrypted off-host Restic/R2 backups for NEXT, Production-Beta and edge state. Eight snapshots were present at verification. Ubuntu user-systemd `Linger=yes`; NEXT/Production/edge backup and retention timers are enabled.
- Real restore drills PASS without mutating active state: NEXT SQLite/Core metadata integrity OK, 48 PostgreSQL public tables and 19 migrations restored to an ephemeral container; Production-Beta SQLite integrity OK and 11 public tables restored.
- Verified encrypted DR bootstrap and wrapped recovery key in R2. Rebuildable Git worktrees, `node_modules` and Rust `target/` caches are intentionally excluded from backup authority.
- Initialized separate R2 Internal release namespace `lightbi-next/releases/` for `https://lightbi-next.thaiduy.digital` and enabled a persistent two-minute release-sync timer. Fixed its first-release lifecycle so a missing `latest.json` is a successful `no_latest_release_yet` no-op while real retrieval/integrity failures remain fail-closed; Core source fix is `2b65b88fa722ca429062a8dee19b9363bfe15baf`.
- Private NEXT-025 CP source has advanced to `2b72e91b32b7f956eb9f1fe26bd4ec39eb4b76d0`. These are source candidates only. Active Internal remains NEXT-024; no NEXT-025 Windows artifact/deployment has been accepted yet, Production 5172/5173/5174 was not touched, and R1-P6 remains HOLD.

## 2026-09-01 — NEXT-025 Windows silent-updater candidate 25.10.x published

- Owner acceptance on earlier Windows pairs proved native catalog/download/progress/SHA staging, then exposed Tauri event ACL, History durability/save, Windows elevation and interactive NSIS reinstall UX defects.
- Core `f1654419c2a0b252795cf9a637d0412c3023de29` accumulates the fixes: durable History at local-source Ready, sample-only overwrite protection, hardened native HTTP/event ACL, monotonic byte-truth progress with bounded UI smoothing, and elevated NSIS launch using `/S /UPDATE /R` for silent in-place update plus relaunch.
- Local release authority PASS: focused updater/progress UI 15/15, History durability 13/13, desktop production build, full `test:release-1.0`, governed product regression 39/39.
- GitHub Actions run `33524736531` / #10 PASS at exact `f165441...`; both Windows A/B jobs passed contracts, built and normalized installer/provenance, and the publisher verified immutable R2 authority.
- R2 pair: A `0.9.2-next.25.10.1`, 29,704,226 bytes, SHA-256 `feb4897de94dfd7859d2d85813a8357c5090967e4342af424f2fcfa6d17e4c59`; B/latest `0.9.2-next.25.10.2`, 29,696,293 bytes, SHA-256 `1f794209f604aebb34808e8b10dd357bb4b5f1f098f6ef49a765ea81c013fc0e`. NEXT mirror/public latest synchronized successfully.
- Owner Windows acceptance remains open: History must persist through analysis/Investigation/restart, and A→B must require at most UAC, show no NSIS wizard, silently update and reopen as B. Active chassis remains NEXT-024; Production and R1-P6 remain untouched/HOLD.

## 2026-09-01 — NEXT-025 indexed A/B mirror fixed; owner 25.10 acceptance lane opened

- GitHub Actions run `33524736531` / run #10 completed success at Windows artifact source `f1654419c2a0b252795cf9a637d0412c3023de29`; both Windows jobs and the isolated R2 publisher passed. Owner-test pair is A `0.9.2-next.25.10.1` SHA `feb4897d...d17e4c59` and B/latest `0.9.2-next.25.10.2` SHA `1f794209...c013fc0e`.
- Post-publication branded-edge proof found A 404 while B was 200 although both existed in R2. Root cause: VPS release sync consumed `index.json` but materialized only the `latest.json` artifact.
- Core ops `98b57aebc4cd038f3c4774d03de1a538edffa1d3` makes the current index authoritative for mirrored Windows releases and verifies every executable, checksum sidecar and manifest before switching local catalog pointers. Full release suite remained PASS with governed regression 39/39.
- Atomically deployed that exact sync script to `/home/ubuntu/services/lightbi-ops/bin/`; manual user-systemd sync exited 0 and reported both `25.10.2` and `25.10.1`. Full branded HTTPS streaming verification then proved A/B HTTP 200, exact content lengths and exact SHA-256 matches.
- Ops commit used `[skip ci]`; acceptance workflow remains run #10 and did not create `25.11.x`. Active Internal runtime truth is `g-2026-09-01-next-025` with Core `0c6a5bc...` and CP `2b72e91b...`; Production remained untouched. Owner Windows A→B + History acceptance is now the only native gate represented by this checkpoint.


## 2026-09-01 — NEXT-025 25.11 transport fallback candidate published

- Owner test of `25.10.1` failed at packaged external transport while server-side Core/CP/release endpoints remained healthy. This isolated the defect from R2/CP availability.
- Core `c78124df3973fcfe2107a966563f3266e97f3deb` adds idempotent GET/HEAD WebView fallback after native transport failure/non-2xx and static `/internal-releases/latest.json` fallback for updater discovery; mutation methods are never replayed.
- Focused transport/updater/diagnostics PASS 20/20; History durability 13/13; full `test:release-1.0` and governed regression 39/39 remain green.
- GitHub Actions run `33529657486` / #11 PASS and published A `0.9.2-next.25.11.1` plus B/latest `0.9.2-next.25.11.2`; indexed mirror and branded HTTPS streams matched published sizes/hashes.
- This remained machine evidence only; Windows A→B/History owner acceptance stayed open. Production and R1-P6 remained untouched/HOLD.

## 2026-09-02 — NEXT-026 Passkey alternate-method recovery UX deployed

- Owner screenshots exposed raw WebAuthn `NotAllowedError`/W3C text after cancelling Passkey and no deliberate TOTP/recovery choice. Root cause was the browser throwing from `navigator.credentials.get()` rather than returning a null credential.
- Private CP `30bb58ffeaaad80014fb7c57522a7b8a4eb6feb8` keeps Passkey preferred but adds explicit **Use authenticator or recovery code** for server-authorized fallback, friendly cancellation/unavailability text, fingerprint iconography, and `Need help?` links for both Account and Admin.
- Added published `/docs/sign-in-and-account-recovery` covering Passkey, TOTP, recovery codes, one-time email links and password reset. One-time email links remain primary factors and cannot bypass configured strong auth; Google remains Account-only authority.
- Verification PASS: focused auth/docs 21/21, full CP authoritative 175/175, generation manifest 3/3. Served HTTPS assets contain the new markers and no raw W3C WebAuthn diagnostic URL.
- Built/deployed immutable `g-2026-09-02-next-026`, parent NEXT-025, Core `c78124df...`, CP `30bb58ff...`, schema 065/pending 0, healthy matching worker. Manifest SHA `98addf25...63b7a`; Core binary SHA `3a6e87f3...b9c8a`.
- Owner browser acceptance of Passkey Cancel → friendly LightBI state → explicit TOTP/recovery on Admin and Account remains open. Packaged Windows A→B/History acceptance also remains open. Production 5172/5173/5174 and Trust R1-P6 were not touched.

## 2026-09-02 — NEXT-027 branded announcement templates deployed; Windows 25.12 pair published

- Owner selected the existing Pro-key email as the visual authority for LightBI customer communications. Core `b3ada6776417fdb422e7e852b6f4363b328ab650` adds branded Inbox rendering; CP `c012c572a7b0794aea75cdbb007490cfa2ebb8a5` adds structured Admin templates `general/promotion/update/warning/hotfix`, live preview, template persistence, and Documentation links in both announcement preview and Pro-key mail footer. Raw announcement HTML is not accepted.
- Verification PASS: CP focused template/mail 4/4 and authoritative 179/179; Core Inbox 4/4; desktop production build 3,767 modules; full `test:release-1.0` with History 13/13 and governed product regression 39/39.
- Migration `066_announcement_templates` preflight showed exactly one pending migration; apply completed and live Internal status is 20 applied/pending 0. Existing announcements are backwards-compatible through default `template_kind=general`.
- Deployed immutable `g-2026-09-02-next-027`, parent NEXT-026, Core `b3ada677...`, CP `c012c572...`, schema 066. Manifest SHA-256 `8cb350fda7e41ef4376574f1d96374acb9275cfd5b59b1b2c06d6cc47ccfbd97`; public diagnostics report exact identity/schema and a healthy matching worker. CP mutable data was preserved independently during source swap and the NEXT-026 service tree was retained for rollback.
- GitHub Actions run `33578098883` / #12 PASS. Branded HTTPS verifies A `0.9.2-next.25.12.1` (29,704,813 bytes, SHA `87c5dd8f55debf701733ee8161c68f618d800e4e8878ea8c4bf6ccc3cfd62e54`) and B/latest `0.9.2-next.25.12.2` (29,698,186 bytes, SHA `2feb44b1a075397dc4e5b46828ee5af239c5be52290709597ba869e543afc740`); index contains both.
- Owner visual/native acceptance remains open for the five templates/Inbox rendering and the existing A→B silent-updater/full-source History gate. Production and Trust R1-P6 remain untouched/HOLD.

## 2026-09-02 — R1-P5 freeze gate revalidated; R1-P6 Root ceremony preflighted

- Owner resumed the main Road-to-1.0 Trust path and requested progression toward R1-P6. Canonical plan semantics were rechecked: R1-P5 owns the explicit freeze exit gate; R1-P6 is the Offline Root ceremony; R1-P7 is the Private Trust-1 signer. The resume instruction is not silently converted into the literal `FREEZE APPROVED` record.
- GitHub PR #4 remains Draft/Open/unmerged at `codex/phase2-trust-contracts` exact head `10de4da8e551a46f93f7b62985a0a6e611581b8e`; historical CI run `33397723902` remains success.
- Fresh exact-head local CI-equivalent PASS: release contract 3/3, public/private boundary, Trust TS 22/22 plus lint, Rust parity 5/5, desktop production build, governed regressions 7 files / 26 tests. Phase 2A worktree remained clean after execution.
- Freeze-negative probes PASS: Root pin is `unconfigured` with null public key; zero tracked private-key literals; no tracked private-key artifact extensions; no production signer implementation detected.
- R1-P5 state is `freeze_ready_awaiting_explicit_owner_freeze_before_r1_p6`; `phase2aFrozen=false`, `rootCeremonyAuthorized=false`, `trust1SignerAllowed=false`. Exact next owner record: `FREEZE APPROVED — PR #4 codex/phase2-trust-contracts @ 10de4da8e551a46f93f7b62985a0a6e611581b8e`.
- R1-P6 preflight generated no keys. Owner custody policy was refined: NEXT may use a distinct non-production test Root plus test REL/ATT/ENT/PRO issuers in a hardened signer service on ARM or the private-subnet 1x1 VPS for E2E rehearsal; those keys are never promoted. Production Root private authority remains offline only. Production issuer signer keys may later run online under R1-P7, preferably on the 1x1 VPS or under a separately hardened ARM container boundary. This NEXT rehearsal authority is permitted before the Production freeze decision because it is cryptographically and operationally non-production; it must never be accepted by stable/public Production verification.
- Read-only runtime reconciliation observes Internal NEXT-028/Core `b3ada677...`/CP `9606c1bd...`/schema 067 with healthy worker and Trust blocked pending Phase2A freeze. Production was not touched.

## 2026-09-02 — NEXT non-production Trust signer rehearsal deployed on ARM

- Implemented isolated private `apps/trust-signer` on `codex/next029-trust-signer-rehearsal`; final source `8568ed90c5a44c52b048dfdca6bd94410027aaee`, pinned to public Trust Contracts exact `10de4da8e551a46f93f7b62985a0a6e611581b8e`. No signer implementation was added to Distribution server/API source.
- Generated a disposable `next_internal_test_only` TEST Root and purpose-separated REL/ATT/ENT/PRO issuer authority. Runtime signer receives only issuer private keys; TEST Root private material is not mounted and Production authority was not generated.
- Final image `lightbi-next-trust-signer:8568ed90c5a4-trust-10de4da8`, image ID `sha256:8dcb8e96feda93bb54c747ced89da02176dc6ad64b425730dab7930561bac0e2`. ARM runtime uses UID 1001, read-only rootfs, `cap-drop=ALL`, `no-new-privileges`, `network=none`, UDS mode 0600, read-only signer mount, no Docker socket, PID 64, RAM 128 MiB, CPU 0.25.
- Verification PASS: signer/custody/boundary tests 6/6; existing CP authoritative suite 183/183; live UDS E2E signs and verifies release/attestation/entitlement/pro-package envelopes. Negative probes reject unauthenticated keyset access, stable-release signing and generic `/sign`. Rootfs/key mount write probes fail as required; logs contain no token, PEM or smoke payload.
- The rehearsal authority directory is outside current NEXT Restic whitelist. Active customer-facing Internal remains NEXT-028/Core `b3ada677...`/CP `9606c1bd...`/schema 067 with healthy worker; CP is not yet wired to signer. Production remains untouched and Production freeze/Root ceremony flags remain false.

## 2026-09-02 — NEXT-029 completes R1-P7/P8/P9 non-production Trust rehearsals

- Connected a bounded CP rehearsal client to the isolated TEST signer without giving the Distribution HTTP runtime signer credentials. Real Internal authority data was exercised inside a rollback transaction; REL/ATT/ENT/PRO signed envelopes verified and zero synthetic entitlement rows remained.
- Added Internal-only public Trust publication. CP source `6936fc4272bc92cd1badc00b9256cfd912e4a9ad` serves public Root/keyset/REL material under `/internal-trust/`; complete CP suite is 189/189. HTTPS re-fetch verified the chain and the streamed Windows `25.12.2` installer SHA exactly matched its signed REL.
- Rotated the Internal application chassis to `g-2026-09-02-next-029`, Core `b3ada677...`, CP `6936fc427...`, schema 067/pending 0, healthy matching worker, manifest SHA `f38c6347...9fa9`. Production was not touched.
- An initial attempt to place request-attestation verification inside Distribution correctly failed the existing foundation guard. The experiment was rolled back; the guard was not weakened. R1-P9 was implemented as separate sibling `apps/trust-attestation`.
- Final attestation source `b4e254ed41cad42af82dcef3376e36ba9afd3c5c`; image `lightbi-next-trust-attestation:b4e254ed41ca-trust-10de4da8`, image ID `sha256:6f47bddc...c5b31`. Runtime is verification-only, `network=none`, UDS 0600, rootfs read-only, no signer secret/mount, with persistent sequence/revocation state.
- Live request proof PASS: ephemeral device key, TEST ATT certificate, valid sequences 1/2; nonce replay, body tamper, sequence rollback and target mismatch rejected. State survived service restart with identical file SHA. Device private material was never persisted. Attestation suite 8/8, Distribution foundation guard 8/8, Distribution authoritative suite 189/189.
- These results close only NEXT rehearsals for R1-P7/P8/P9. Production Phase 2A remains unfrozen and Production R1-P6 Root ceremony remains owner-gated.

## 2026-09-02 — R1-P10 NEXT signed-entitlement migration rehearsal passes

- Extended the verification-only NEXT attestation gate with Pro conjunction enforcement while keeping signer credentials absent from runtime. ENT progression is persisted per subject alongside attestation replay/revocation state.
- Added bounded CP rehearsal `next-pro-authority-rehearsal`: actual AccountAuth register→verify→password login→session, governed `EntitlementAuthorityRepository`, TEST ATT/ENT signer, device proof, and Pro authorization. Distribution HTTP runtime does not import the rehearsal or signer client.
- Live Account Pro: ENT v1 and v2 authorize `pro_runtime`; reusing v1 after v2 fails `entitlement_rollback_detected`; wrong authenticated account fails `pro_authority_subject_mismatch`. Live Business: active organization owner + signed `business` ENT with `seat_limit=5` authorizes.
- Synthetic entitlement/organization rows are transaction-rolled-back and the synthetic account is deleted. Post-run DB counts are zero for rehearsal account, `p10:` authority entitlement, and rehearsal organization. Audit evidence is retained.
- Final source `31fa5428896f6e9cb7877d353e2485b43d7a1671`; attestation image `lightbi-next-trust-attestation:31fa5428896f-trust-10de4da8`, ID `sha256:a08e1f681b6ab564b9dc19b5b3202f33224e44d5ef4f54ab5dbe3be2ee228899`. Gates: verifier/P10 12/12, CP authoritative 193/193. Production remains untouched/unfrozen.

## 2026-09-04 — Micro Semantic Brain vector-inference architecture approved and planned

- Owner approved a local Micro Semantic Brain as a recall/inference layer in front of the canonical semantic resolver. The current semantic registry remains the canonical vocabulary; domain support, grain/readiness, metric preflight and runtime authority remain separate gates.
- ADR-124 and the architecture contract define an approximately 10 MB typed knowledge target, positive/negative/relation knowledge, deterministic hybrid BM25 + TF-IDF/LSA retrieval, reciprocal-rank fusion, and the rule that vector similarity is retrieval provenance rather than semantic confidence.
- Unsupported domains may be surfaced as inferred and analyzed only in evidence-bound mode when generic grain/aggregation safety passes. Understanding UI must disclose inference/support state; Focus, Deep BA and BA Step 2 must preserve that provenance.
- A staged MB-0..MB-7 implementation plan was added. Implementation has not started and must use a clean product worktree; the current Focus experimental worktree is not a Micro Brain implementation base.
- No product runtime, production service, semantic registry entry, domain pack, metric contract, or release artifact changed in this documentation step.

## 2026-09-04 — Micro Semantic Brain MB-5 inferred-domain/support separation verified

- Product branch `codex/exp-focus-subject-analysis` advanced to `8a4a5e4` (`feat(understanding): separate inferred domain support`). A preceding isolated build-closure commit `fbb1444` fixed TypeScript narrowing/conflict-evidence typing and declared the existing Micro Brain retrieval evidence strength `0.2` without increasing semantic authority.
- MB-5 adds `lightbi.domain-inference-artifact.v1`. It composes resolved canonical signals plus validated Micro Brain related-domain evidence into ranked domain hypotheses while keeping `DomainActivationArtifactV1`, the governed domain-support manifest and metric preflight as separate authorities. Domain evidence rank is explicitly ordering evidence, not semantic confidence.
- Understanding now shows domain source, official support state, confirmed/probable/unresolved concept counts, conflict count and analysis mode. A healthcare probe displays `Healthcare`, `Semantic inference (Micro Brain)`, `Not production-active` and `Evidence-bound inferred domain`, plus an explicit unsupported-domain disclosure; the UI test forbids percentage/similarity leakage.
- Verification PASS: 37 targeted Micro Brain/canonical/UI regression tests, desktop production build, and Playwright MB-5 healthcare acceptance 1/1. After making the E2E base URL portable through `LIGHTBI_E2E_BASE_URL`, focused MB-5/UI tests remained 9/9 and Playwright remained 1/1. `git diff --check` passed before commit.
- Existing legacy Phase-3A suites that require machine-audit JSON absent from this product worktree remain path-bound test debt; MB-7 full release-authoritative acceptance is therefore still pending rather than being claimed complete.
- Production 5172/5173/5174, production domain packs, metric authorization, release artifacts and stable runtime were untouched. The exact next phase is **MB-6**: propagate domain inference/support/analysis-mode/authorization/limitations through Focus, Deep BA and BA Step 2 without changing governed factual values.

## 2026-09-04 — One Road-to-1.0 successor stream and Signed Transport foundation checkpointed

- Reconciled product, private control-plane and documentation worktrees before continuing. Product successor is clean/pushed on `codex/r1-roadmap-integration` at `a8d55ee`; private CP Signed Transport branch is clean/pushed on `codex/r1p14-signed-transport` at `c5875eb`. Production services were not touched.
- The successor roadmap keeps **MB-6 → MB-7 as the critical path**. Focus isolation is no longer a separate long-lived execution lane; however this does not renumber or rewrite historical R1 phases and does not change the Production Phase-2A freeze decision.
- Product `a8d55ee` adds a Rust-only Signed Transport proof primitive: deterministic canonical JSON parity, body SHA-256, `lightbi.next-attestation-request.v1` proof payload and Ed25519 signature. It is not exposed to frontend code as a generic signing command and is not yet wired into general native HTTP. Isolated golden-vector harness: **3/3 PASS**.
- Private CP `c5875eb` adds an Internal-only `NextAttestationClient` over a mode-restricted Unix socket, a nonce bootstrap edge, generic private verifier endpoint, persisted anti-replay sequence-floor reporting, and a stricter reconciled foundation guard that permits only the thin verifier client while still forbidding verifier/signing/private-key authority in Distribution. Trust-attestation **15/15 PASS**; full Distribution authoritative suite **220/220 PASS**; TypeScript/build/diff checks PASS.
- Signed-by-default application transport is intentionally not enabled yet. Canonical query binding, response-integrity semantics and exact route classes remain follow-up dependencies; bootstrap trust routes remain separate.
- Future Team/Workspace work records **Private Authenticated Transport** as technology-neutral. WireGuard is one candidate, not the product contract, and this future capability is not a 1.0 blocker.
- SSD guard caught a heavy Rust/Tauri test compiling DuckDB: `/` reached 89% and the worktree `target/` cache reached about 5.6 GiB. The run was stopped, only that rebuildable cache was removed, and `/` returned to 84% / ~20 GiB free. No source/data/service was deleted.
- Exact next product action remains **MB-6**: propagate domain inference/support/analysis-mode/authorization/limitations/evidence through Focus, Deep BA and BA Step 2 without changing governed factual values.

## 2026-09-04 — Micro Semantic Brain MB-6 analysis-authority propagation completed

- Product successor `codex/r1-roadmap-integration` advanced from `a8d55ee` to `94fa40c` (`feat(understanding): propagate analysis authority through BA`). The Signed Transport primitive remains the earlier `a8d55ee` ancestor; MB-6 itself changes BA authority propagation, not transport enforcement.
- Added shared `lightbi.ba-analysis-authority-context.v1`. Focus, Deep BA and BA Step 2 now receive domain inference, official support, analysis mode, governed metric preflight/runtime authorization, limitations and evidence references from the canonical artifact. Formula authority is explicitly `not_independently_authorized`; decision-use authority is not inferred from Micro Brain.
- Factual parity is regression-locked: Focus subject value `30`, `SUM`, population value `70` / population count `3` remain identical with and without authority context; Deep BA KPI, breakdown and finding objects are deep-equal before/after propagation.
- Final verification PASS: 15 Vitest files / 79 tests; TypeScript; production Vite build with 3,790 modules; Playwright healthcare acceptance 1/1 through Deep BA and selected-row Step 2; machine evidence JSON parse; `git diff --check`. The authority banner exposes `Evidence-bound inferred domain`, `Not production-active`, no matched governed metric authority and `Formula: not independently authorized`, while forbidding percentage/similarity/evidence-rank/retrieval-confidence leakage.
- Production 5172/5173/5174, production domain-support activation, metric authorization and release artifacts were untouched. Exact next Micro Brain phase is **MB-7**: corpus/counterfactual/performance/deterministic-index/no-network/full release-authoritative acceptance and cutover review.

## 2026-09-04 — Micro Semantic Brain MB-7 acceptance completed; main roadmap resumes

- Product successor `codex/r1-roadmap-integration` advanced to `a1f6ee8` (`test(understanding): close micro brain v1 acceptance`). MB runtime behavior itself was not loosened; the checkpoint adds acceptance harnesses, current independent oracle evidence and durable machine evidence.
- Deterministic MB index rebuild remains byte-identical at SHA-256 `6415fddef704732e0d2e08936aaed729278f4a9c759b30a4daacb1c7ab7d8ec0`. Runtime has no network dependency; index footprint is 6,605,467 bytes / ~1,866,404 bytes gzip9.
- Active-core benchmark on shared ARM Neoverse-N1: 30 samples / 19 sources / 379 columns; MB OFF p50 ~9.558 s, selective MB ~10.208 s (+650 ms / +6.80%); 243 queries/run, retrieval p50 ~2.25 ms / p95 ~2.94 ms / p99 ~3.35 ms. Three TTKT ETA fields move `unknown -> probable`; confirmed regressions 0.
- Current independent oracle was regenerated from the unchanged isolated oracle logic after proving the historical artifact's metric/identity/relationship/inventory truths still match but its corpus identity hashes were stale. Phase 7R3.5 and Phase 8B pass against current oracle evidence.
- Gates PASS: MB-specific 14 files / 41 tests; runtime/oracle 3 files / 6 tests; acceptance-integrity/runtime-invariant 2 files / 4 tests; complete `test:release-1.0`; production build; source-size gate; Playwright MB-5 + MB-6 2/2; `git diff --check`. SSD remained 84% / ~20 GiB free.
- MB V1 source acceptance/cutover review is complete; Production was not deployed and authority was not expanded.
- Main Road-to-1.0 resumes with multi-file Analysis Context + Focus Subject UX parity, followed by Intelligence Pack updater/trust integration, Signed Transport wiring/negative probes, then packaged Windows/UAT + integrated release acceptance.

## 2026-09-04 — Micro Brain strategic rationale and cross-domain semantic direction recorded

- Distilled the owner-approved external conversation handoff into canonical architecture without importing stale implementation status. Current repo truth remains MB-7 source acceptance complete at `a1f6ee8`; the handoff is used for rationale and future semantic direction only.
- Added `micro-brain-cross-domain-semantic-expansion.md` covering the finite-dictionary problem, pathological schemas, safe learning lifecycle, negative knowledge, guarded formulas, the non-permanent 10 MB guardrail, cross-domain ontology, modular growth and promotion boundaries.
- Froze the future semantic initiative name **LightBI Cross-Domain Semantic Expansion** with priority breadth in hospitality, healthcare/pharma, agriculture/livestock/aquaculture, manufacturing, banking specialization and scientific primitives. The target is reusable semantic breadth, not immediate official support for every industry.
- Reaffirmed that raw user datasets do not self-train production semantic truth. Future learning is curated evidence -> validation -> batch rebuild -> held-out/counterfactual/grain/formula/performance/release gates, with future validated data-only updates fitting the separately governed Intelligence Pack lifecycle.
- Corrected the stale Micro Brain architecture header from `not implemented` to the current MB-7 source-accepted state. Road-to-1.0 sequencing is unchanged: multi-file UX parity / Focus Subject remains next. Production remains no-touch.
## 2026-09-04 — Multi-file Focus Subject closed and NEXT031 activated

- Product successor `codex/r1-roadmap-integration` advanced to `8abc669` with governed multi-file Focus Subject. Focus candidates derive from per-source canonical understanding; cross-source binding requires canonical-concept equality plus exact selected value. Same-label/different-ID values do not create identity.
- Governed summary metrics remain full-population and unchanged. Focus scopes only exact source evidence, focused comparison, Deep BA and Step 2; unresolved sources remain unavailable rather than borrowing evidence. `BA FOCUS` was renamed `Key attention` / `Điểm cần chú ý`.
- Verification on the final source snapshot: targeted Focus 3 files / 8 tests PASS; `test:release-1.0` PASS with governed 11 files / 41 tests; desktop build 3,792 modules; source-size 509 modules PASS; six-file ERP Playwright with `Aqua 250L` PASS and governed-summary parity preserved.
- Built immutable `g-2026-09-04-next-031`, parent `g-2026-09-03-next-030-focus-exp-03`, source `8abc669`, server-binary Core provenance `ed4b9233`, CP `bb50b0d`, schema 067, manifest SHA-256 `08fe08ea9dcc72d575721f1db891cd46ce46d030556c53d14c472dc4149c9797`. Reused server binary SHA-256 remains `95be788197a853cff8c6d1665ef4d62e62ac71fd9dfa9546253efcda0b78aa7e`.
- Rotated only the NEXT generation/runtime. 5272/5273/5274 plus worker now report NEXT031; CP schema is current and worker healthy. Public NEXT generation/distribution diagnostics agree. Direct six-file browser acceptance on `5273/app` passed 1/1 in 46.9 s; generation checksum verification passed. Owner role rotation was not performed.
- Main Road-to-1.0 next action advances to Intelligence Pack Updater V1; Signed Transport integration and packaged Windows/UAT remain after it.


## 2026-09-04 — Intelligence Pack V1 source closure; NEXT032 runtime gate opened

- Product successor is clean/pushed at `262bd768` with strict signed data-only Intelligence Pack verification, compatibility gates, content-addressed atomic store, `staged/active/previous`, accepted-version floor, corrupt-state repair/fallback, Tauri integration, startup-before-render loading and separate Settings/update UX. Existing Micro Brain consumers stay on one resolver path and packs cannot create canonical/domain/metric/formula authority.
- Private CP is clean/pushed at `72eacf75` with Internal-only read-only catalog/artifact routes; no INT signer/private key is present in Distribution. NEXT TEST key `int-next-2026-01` remains non-promotable and separate from REL/ATT/runtime-request authority.
- Exact-head verification PASS: Intelligence Pack Rust 6/6, frontend 2/2; `1.0.0-next.1` verifies envelope SHA `1c244632...3376`, payload SHA `6415fdde...d8ec0`, 6,605,467 payload bytes; CP typecheck/test-typecheck and authoritative 222/222; product `test:release-1.0` PASS; native `cargo check -p lightbi-tauri` PASS.
- Native compile initially hit the existing DuckDB cache/SSD hazard; obsolete Rust `target/` caches only were removed after explicit owner instruction, dropping `/` from ~85% to 60%. A clean standard native check then completed successfully; no source/data/runtime was deleted.
- Active runtime remains immutable NEXT031. No NEXT032, Production change or owner role rotation is claimed by this source closure. Immediate next action: build immutable NEXT032 from exact `262bd768` + `72eacf75`, wire generation-owned candidate pack `1.0.0-next.1`, and run runtime stage/activate/restart/fallback/rollback/downgrade/identity acceptance.

## 2026-09-04 — Intelligence Pack V1 runtime accepted on NEXT032

- Activated immutable `g-2026-09-04-next-032` from product `262bd768` + private CP `72eacf75`; parent NEXT031, manifest SHA `28e8f20e...`, reused Core binary SHA `95be7881...`, schema 067. Only NEXT/Internal services were rotated; Production and owner role state were untouched.
- Live HTTPS catalog/artifact acceptance PASS: `1.0.0-next.1`, envelope SHA `1c244632...3376`, payload SHA `6415fdde...d8ec0`, downloaded object byte-identical to the generation-owned pack.
- Real-candidate temp native-store acceptance PASS: stage→activate, fresh-process active reconcile, accepted-version-floor rejection, corrupt-state fail-closed to bundled. Exact frontend candidate handoff PASS 2/2 and exposes the verified pack through the production Micro Brain accessor.
- Store cryptographic suite PASS 6/6 for rollback/previous recovery, interrupted staging and invalid-active recovery. Only one signed durable Internal pack exists, so a deployed two-version live rollback is explicitly not claimed.
- Restarted CP/worker/Core/Gateway under systemd; all four PIDs changed and post-restart identity remained NEXT032 / CP `72eacf75`, worker healthy, Trust `blocked_pending_phase2a_freeze`, artifact SHA unchanged.
- A nonessential targeted Tauri test was stopped when it triggered the known full `libduckdb-sys` C++ build hazard. It is not counted as PASS. Four generated Tauri schema files produced by that run were the only source-tree churn and were restored exactly to HEAD; product and CP worktrees are clean.
- Intelligence Pack V1 is closed for NEXT/Internal runtime. Critical path advances to Signed Transport query binding, response integrity, route policy, native transport integration and negative probes; packaged Windows/UAT + integrated release acceptance follows.

## 2026-09-04 — Decision Presentation + UI/UX refactor plan consolidated

- Read the current product paths for Question/Perspective generation/presentation, visualization planning/persistence, Dashboard composition, Deep BA/BA Step 2, evidence and export behavior; no product code was changed.
- Owner-supplied chart/dashboard reference and live LightBI screenshots were reconciled into one durable refactor plan covering chart intelligence, domain-aware visual profiles, Dashboard composition, narrative hierarchy, Step 2 drill-down, evidence provenance, export pagination and product-wide card reduction.
- Confirmed the Question/Perspective gap after MB: domain inference is computed in the canonical consumer, but governed question generation does not consume that domain inference; single-source perspective projection still comes from the closed six-domain catalog. The refactor preserves governed question/metric authority while adding open-world discovery/ranking/presentation above it.
- Confirmed presentation defects including duplicate “Other questions” sections, chart-type collapse to Bar on persistence/render paths, hard-coded Bar Dashboard breakdowns, answer-after-charts Decision Workspace ordering, and supporting analysis that can be executable yet semantically/narratively irrelevant to the selected question.
- Owner rules recorded: `canvas-first, card-by-exception`; Domain != Perspective; neutral highest/lowest observed language instead of default Top/Bottom good/bad judgment; Deep BA becomes board-style answer-first narrative; Step 2 becomes selected-subject investigation; evidence remains complete but moves behind a shared inspector.
- Added `AGENT_IMPLEMENTATION_PLAN_DECISION_PRESENTATION_UI_UX_REFACTOR_2026-09-04.md` with DPR-0..DPR-10 staged implementation and acceptance gates.
- Updated the Road-to-1.0 plan and Project Book with this owner-approved planning lane. Current Signed Transport critical path/runtime/Production state is not changed by this documentation task.

## 2026-09-05 — Signed Transport V2 source closure; runtime successor pending

- Recovered exact NEXT032 user-systemd baseline after the VPS reboot using the existing immutable `activate-next032.sh` recipe; CP/worker/Core/Gateway returned active and external generation identity remained NEXT032 / product `262bd768` / CP `72eacf75`. No Production or role state changed.
- Product successor advanced to `6c1f11758093f21b1f7c03218d8fea52d3602d0f`: V2 signs canonical path+query plus exact raw-body SHA, server nonce/issued timestamp, monotonic sequence and certificate identity with the installation device key; native protected scope is `/api/account/*` plus `/api/license/activate`; bootstrap remains unsigned.
- Native transport now fails closed against downgrade: protected-route failure and correlated signed HTTP errors are never replayed through WebView. Response digest + accepted-sequence correlation is checked client-side under HTTPS and is explicitly not represented as independent server cryptographic authentication.
- Private CP advanced to `3afb85b38e7cd6f9bd65eafbda723f9f6e0e88d4`: V2 verification remains in the isolated attestation appliance over UDS; Distribution has no signer token/private key/generic signing endpoint and attestation continues `signingAuthority=false`.
- Final gates PASS: trust-attestation 16/16; full CP authoritative 223/223; frontend native transport 11/11 + TypeScript; real Tauri Signed Transport 6/6; source-size 516 modules after extracting native HTTP from `main.rs` (864 lines); complete `test:release-1.0` including governed 11 files / 41 tests.
- Heavy Cargo execution used an 88% filesystem hard-stop guard. Final `/` remained ~75% used with ~32 GiB free and a 17 GiB rebuildable product `target/` cache; the guard never fired.
- Source gate is closed only. Active runtime is still immutable NEXT032. Exact next action: cut the next immutable NEXT successor from product `6c1f117...` + CP `3afb85b...`, run signed-request and query/body/replay/fallback/response-correlation runtime probes, then update acceptance truth.

## 2026-09-05 — Signed Transport V2 edge/runtime accepted on NEXT033

- Built immutable `g-2026-09-05-next-033`, parent NEXT032, from product `6c1f117` + private CP `3afb85b`; reused byte-identical Core binary SHA `95be7881...`. Generation manifest SHA is `75bece21...`; CP server SHA is `768852b6...`; accepted INT pack `1.0.0-next.1` remained byte-identical.
- Rebuilt only the network-isolated attestation verifier from CP `3afb85b` + Trust Contracts `10de4da8`; image ID `sha256:1f8ff4ee...`, `network=none`, read-only, non-root, `networkAuthority=false`, `signingAuthority=false`. Distribution runtime exposes only installation-issuer + attestation UDS paths and has no signer token/socket authority.
- Shadow and then real HTTPS V2 acceptance PASS: valid signed request reached normal Account authorization and returned correlated `401`; exact replay failed `attestation_nonce_replayed`; query mutation failed `attestation_request_target_mismatch`; raw-body mutation failed `attestation_body_hash_mismatch`. Response sequence/body digest correlation verified exactly.
- Activated NEXT033 with automatic rollback to NEXT032 on identity failure. External generation, CP/worker diagnostics and Intelligence Pack catalog/artifact SHA matched exact immutable identities.
- Restarted CP/worker/Core/Gateway and verifier; all PIDs changed and NEXT033 identity, healthy worker, blocked Trust state and external V2 probes remained green after restart. SSD stayed ~75% used / ~31 GiB free; no heavy Rust/Core rebuild was needed.
- Runtime acceptance boundary is server/edge only. The operator harness used an ephemeral TEST ATT certificate; Distribution never received signer authority. Current TEST Trust publication has two installer RELs and **no `LightBI.exe` runtime REL** for `release:0.9.2-beta.7-next.33:windows:x86_64:runtime`, so packaged Windows `ensure_installation_trust`, OS-protected device key, packaged `native_http_request`, no-WebView-downgrade UAT and owner acceptance remain the next gate.
- Production untouched, owner role rotation not performed, `phase2aFrozen=false`.


## 2026-09-05 — NEXT033 Windows runtime REL published; exact installation issuer passes

- GitHub Actions run `33933622073` on `codex/r1p13-rc-acceptance` built exact product `6c1f117...` / CP `3afb85b...` for `g-2026-09-05-next-033`; exact-source gate, Windows native tests/build, canonical acceptance evidence and upload passed. Orchestration commit `21ea8f8...` is CI authority only.
- GitHub artifact ZIP SHA-256 verified `162a3246...b7572`. Canonical `LightBI.exe`: 76,444,672 bytes / SHA-256 `77952884...dae9d`. NSIS installer: 31,794,432 bytes / SHA-256 `e02b61b2...9c5d4`. Acceptance remains `next_internal_test_only`, `owner_uat_accepted=false`, OS publisher `NotSigned`.
- Published exact runtime REL `release:0.9.2-beta.7-next.33:windows:x86_64:runtime` through TEST authority `next-test-20260902-031220`; external Root/keyset verification and external/local byte parity passed. TEST authority is non-promotable.
- Initial challenge failed `installation_issuer_release_not_allowed` because issuer snapshots the trust index at startup. No issuer code drift existed from its image source to current CP, so the same image was restarted. Post-reload exact external challenge + ephemeral Ed25519 device proof + certificate issue passed; issuer remains attestation-only, `productionAuthority=false`.
- Owner Windows screenshots show correct NEXT033/`6c1f117`/`3afb85b`, healthy services, Isolation OK and Intelligence Pack active, but they predate REL publication and therefore still show REL/artifact not evaluated and installation certificate unavailable. Native installation trust retries only at app startup.
- Next gate: close/reopen the owner Windows app and prove exact installed runtime/certificate plus packaged V2 signed native request/no-WebView-downgrade behavior. Production untouched; role rotation not performed; `phase2aFrozen=false`.
