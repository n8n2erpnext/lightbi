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

Implementation was performed in the isolated workspace `/home/ubuntu/lightbi-control-plane-cp1`, not in the production control-plane directory and not in the historical LightBI Beta-recovery worktree.

Private GitHub authentication was unavailable during the implementation session. The workspace was therefore reconstructed from deployed source previously reconciled with private control-plane main `87b2ee457c30ac4f7d7d55332bbfc658d51b2c53`. Its local Git commits are migration checkpoints, **not remote ancestry**:

- `d5b532f` — strict TypeScript runtime migration;
- `94ee5cb` — TypeScript CI and compiled runtime entry-point contract;
- `51ba3bc` — CP-1 technical documentation and control-plane worklog.

Local reconstructed verification passed strict typecheck, compiled build, browser syntax checks, credential scan, and 34/34 available compiled-runtime tests. The earlier authoritative private-main audit had 39/39 tests; the full private suite must be rerun after this migration is replayed onto current private `main`.

No production service was restarted or modified. The live control plane remains authoritative until an explicit staging/cutover is approved.

The future Rust signer/attestation boundary remains deferred and blocked by the independent Phase 2A freeze gate; CP-1 does not implement signing, attestation, Pro delivery, Next.js, or Python workers.