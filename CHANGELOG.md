# Changelog

All notable changes to the LightBI architecture and codebase will be documented in this file.

## [Unreleased]
- **Phase DU-9: Semantic Graph Visualization (Phase 1)**:
  - `apps/desktop`: Implemented `SemanticGraphModel`, `SemanticGraphBuilder`, and `SemanticGraphView` using pure SVG to render an interactive map of business concepts and relationships inline within the `DatasetUnderstandingCard`.
  - `apps/desktop`: Implemented deduplication and layout logic.
  - `apps/desktop`: Added comprehensive unit and component tests ensuring proper type, domain coloring, and relationship mapping.

- **Phase DU-7H: Dataset Source Registration & Execution Mapping**:
  - `apps/desktop`: Implemented automatic dataset upload to the Rust backend upon local parsing in `Home.tsx` to keep the backend `current_source` in sync.
  - `apps/desktop`: Fixed Logical to Physical column mapping utilizing `BusinessSignalRegistry` in `Home.tsx` to prevent DuckDB Binder Errors on non-English headers.
  - `docs`: Created `AUDIT-dataset-source-registration.md` to document the successful execution mapping and bypass of the JS sandbox.

- **Phase DU-7C: Frontend Backend Preview Adapter**:
  - `apps/desktop`: Implemented `executeBackendPreview` adapter to seamlessly route `RuntimePlanPreview` JSON to the Rust Axum execution endpoint.
  - `apps/desktop`: Updated `Investigation.tsx` to execute via `backend_duckdb_preview` as the primary source of truth, eliminating the need to pass massive JS row sets around for large datasets.
  - `apps/desktop`: Configured resilient fallback to `js_sandbox_fallback` if the backend connection drops or no active CSV is found in the current source state. Added explicit UI execution source tags.
  - `docs`: Created `ADR-109-frontend-backend-preview-adapter.md`.

- **Phase DU-7B: Axum Preview Execution Endpoint Contract**:
  - `apps/server`: Implemented a generic `POST /api/preview/execute` endpoint for safe, structured execution of `RuntimePlanPreview` operations.
  - `apps/server`: Added backend SQL compilation logic (`compile_preview_sql`) for logical operations (`group_by`, `trend`, `distribution`, `relationship`) without accepting raw frontend SQL payloads.
  - `apps/server`: Enforced strict security rails: capped limit at 100 rows, safely quoted identifiers, explicitly injected server-stored CSV file path (`state.current_source`), and completely isolated from frontend mock execution.
  - `apps/server`: Extended test suite coverage for query compilation logic ensuring structural integrity.

- **Phase UX-6: Freeze Home as Understanding-First Entry Point**:
  - `apps/desktop`: Removed legacy BVQ UI components from Home (Perspective Selector, Advanced Guided Views, Explore/Investigate/Ask tabs, Chat panel).
  - `apps/desktop`: Renamed "Dataset Understanding" to "What LightBI Found".
  - `apps/desktop`: Removed "Confidence: %" and "Missing / Unavailable" negative UX copy from the dataset understanding card, replacing with positive-first wording.
  - `docs/architecture`: Created `AUDIT-home-freeze-remnants.md` and `AUDIT-home-information-hierarchy.md` to document the removals.

- **Phase UX-5: Home Simplification Audit**:
  - `docs/architecture`: Conducted pure read-only UX/Product audit on the Home screen.
  - Created `AUDIT-home-simplification.md` and `AUDIT-bvq-remnants.md`.
  - Identified severe UX friction caused by legacy BVQ remnants (Perspectives, Advanced Views, missing signal warnings, Ask/Investigate tabs) conflicting with the new Understanding-First product direction. Recommended P0 removal of all non-essential elements from Home.

- **Phase UX-4: Developer Mode Toggle**:
  - `apps/desktop`: Extracted execution warnings into the Developer Diagnostics panel.
  - `apps/desktop`: Made Developer Diagnostics collapsed by default with an explicit Show/Hide toggle button to clean up normal user workflow.

- **Phase UX-3: Investigation Workspace Layout Cleanup**:
  - `apps/desktop`: Reorganized `/investigation` to prioritize user-facing analysis surface.
  - `apps/desktop`: Hid developer diagnostics (Runtime Intents, Plans, SQL Preview) inside a default-collapsed panel.

- **Phase DU-5C: Safe SQL Preview Contract**:
  - `apps/desktop`: Implemented `SafeSqlPreview` to translate logical plans into safely quoted DuckDB SQL.
  - `apps/desktop`: Displayed explainable SQL preview natively in the Investigation workspace.

- **Phase UX-2: Investigation Workspace Routing**:
  - `apps/desktop`: Implemented `/investigation` route and `InvestigationSession` context to decouple analysis selection from chart execution.
  - `apps/desktop`: Removed Runtime Intent and Plan preview diagnostics from the Home page. Routing users straight to Investigation upon clicking an Analysis Opportunity.

- **Phase UX-AUDIT-1: Home Information Density Review**:
  - `docs/architecture`: Created `AUDIT-home-information-density.md` and `AUDIT-home-vs-investigation-boundary.md`.
  - Identified that Home has become a pipeline debugger. Recommended hiding Runtime Intents and Plans behind a Developer Mode and routing Analysis Opportunities directly to chart execution.

- **Phase DU-5B: Runtime Planner Preview**:
  - `apps/desktop`: Implemented `RuntimePlanPreview` to declare logical operations before any database execution.
  - `apps/desktop`: Mapped `RuntimeIntent` to declarative steps like `scan`, `group_by`, `trend`, `distribution`, `relationship`, and `limit`.
  - `apps/desktop`: Displayed logical operation blueprint natively inside the Investigation Preview panel.

- **Phase DU-5A: Analysis Action Runtime Contract**:
  - `apps/desktop`: Implemented `RuntimeIntent` contract to safely map `AnalysisAction` to execution intent without SQL.
  - `apps/desktop`: Added structural validation for dimensions/measures based on analysis type (trend, group_by, etc.).
  - `apps/desktop`: Updated `Home.tsx` Investigation Preview to compute and display runtime status (`ready` vs `blocked`).

- **Phase DU-4: Analysis Opportunity Actions**:
  - `apps/desktop`: Transformed 'Available Analysis' text into actionable `AnalysisOpportunityCard` components.
  - `apps/desktop`: Implemented `generateAnalysisActions` to map dataset understanding to execution-ready actions (group_by, trend, distribution, relationship).
  - `apps/desktop`: Added Investigation Preview panel in `Home.tsx` to display selected action context without generating SQL or charts yet.

- **Phase DU-3: Layout Repositioning**:
  - `apps/desktop`: Reframed the Home layout to position Dataset Understanding as the primary success path.
  - `apps/desktop`: Made Perspective -> Views -> Questions an "optional advanced" path and reframed 0 Questions from a failure state to a descriptive unavailable state, identifying exact missing signals.

- **Phase DU-2: Dataset Understanding Card**:
  - `apps/desktop`: Implemented `DatasetUnderstandingCard.tsx` and wired it into `Home.tsx`.
  - `apps/desktop`: Replaced the "0 Questions" failure state with a clear UI showing detected entities, available analysis, and missing analysis.

- **Phase DU-1: Dataset Understanding Contract**:
  - `apps/desktop`: Implemented `dataset-understanding-contract.ts` and `createDatasetUnderstanding`.
  - `apps/desktop`: Added strict tests for partial vs understood status logic.
  - `docs`: Created `ADR-098-dataset-understanding-contract.md`.

- **Architecture Reset: Dataset Understanding Before Questions**:
  - `docs`: Created `ADR-097`, `dataset-understanding-layer.md`, and `BVQ-RESET-DECISION.md`.
  - Shifted product philosophy: LightBI is a Business Understanding Layer, not just a Question Generator. Empty question states are no longer considered failures if the system can articulate dataset understanding.

- **Phase BVQ-8D: Real Dataset Vocabulary Patch**:
  - `apps/desktop`: Patched `TAXONOMY` with specific Vietnamese logistics aliases (`tên lái xe`, `mã tài kiện`, etc.) and introduced `report_date` canonical signal.
  - `tests`: Added `business-signal-detector.real-vietnamese.test.ts` to enforce detection and strict Business View threshold enforcement.
  - `docs`: Completed audits `AUDIT-regression-guided-investigation-vs-legacy.md` and `AUDIT-delivery-performance-live-trace.md`.

- **Phase BVQ-8C: Detector Vocabulary Completion**:
  - `apps/desktop`: Expanded `TAXONOMY` in `business-signal-detector.ts` with 22 new canonical concepts (e.g. `delay`, `salesperson`, `efficiency`) to match Domain Knowledge Catalog.
  - `tests`: Added `business-signal-detector.coverage.test.ts` to enforce alias detection and 100% coverage.
  - `docs`: Updated `AUDIT-signal-coverage-report.md` and `AUDIT-business-knowledge-vs-execution-gap.md` to reflect 0% execution gap.

- **Phase BVQ-8B: Signal Coverage Report**:
  - `docs`: Published `AUDIT-signal-coverage-report.md` measuring execution vs knowledge coverage.
  - `docs`: Published `AUDIT-business-knowledge-vs-execution-gap.md` highlighting lexical gap per domain.

- **Phase BVQ-8A: Cross-Domain Validation Dataset Suite**:
  - `tests`: Implemented `guided-investigation-pipeline.cross-domain.test.ts` to ensure strict multi-domain isolation. All 8 validation matrices pass.
  - `apps/desktop`: Fixed `finance` domain mapping in `TAXONOMY` and `PerspectiveCandidateGenerator` to decouple `profit` and `cost` from `revenue` domain.
  - `docs`: Published `AUDIT-cross-domain-validation-suite.md`.

- **Phase BVQ-7E: Final Home Purity Audit**:
  - `docs`: Published `AUDIT-home-guided-investigation-final.md` confirming `Home.tsx` is completely decoupled from heuristic `semantic` maps and `dataset-capabilities.ts`.
  - `tests`: Verified 100% test passing rate (242 tests) and zero type errors across the Guided Investigation Pipeline integration.

- **Phase BVQ-7D: Home Wiring Cleanup - Question Filtering by Pipeline Business View**:
  - `apps/desktop`: Replaced heuristic semantic question filtering in `Home.tsx` with strict `perspectiveId` and `businessViewId` matching.
  - `apps/desktop`: Replaced legacy `semanticSuggestions` object entirely in favor of `visibleQuestionSuggestions`.
  - `apps/desktop`: Upgraded question cards to render `QuestionSuggestion` fields directly (`evidenceSignals`, `confidenceScore`).

- **Phase BVQ-7C: Home Wiring Cleanup - Replace Hardcoded Business View Source**:
  - `apps/desktop`: Completely demolished `PerspectiveBusinessViewMap` from `Home.tsx`.
  - `apps/desktop`: Replaced static business views rendering with dynamic data from `guidedInvestigationResult.businessViews`.
  - `apps/desktop`: Rewrote `BusinessViewSummaryCard` mapping to safely consume `BusinessViewCandidate` fields (evidence, confidence scores, matching required signals).
  - `apps/desktop`: Ensured strict empty states to uphold the No Fallback rule.

- **Phase BVQ-7B: Home Wiring Cleanup - Replace Hardcoded Perspective Source**:
  - `apps/desktop`: Replaced the hardcoded perspective selector array in `Home.tsx` with dynamic `guidedInvestigationResult.perspectives`.
  - `apps/desktop`: Added logic to clear `selectedPerspective` state if it becomes unsupported.
  - `apps/desktop`: Enforced strict empty state and added "Detected from" tags to perspective UI cards.

- **Phase BVQ-7A: Home Wiring Cleanup - Replace Legacy Question Source**:
  - `apps/desktop`: Removed legacy NLP logic (`question-suggestions.ts`).
  - `apps/desktop`: Wired `Home.tsx` to display questions exclusively from `runGuidedInvestigationPipeline`.
  - `apps/desktop`: Added pipeline debug stats to the UI and enforced strict empty state handling for questions.
- **Phase BVQ-6: Guided Investigation Pipeline Orchestrator**:
  - `apps/desktop`: Implemented `guided-investigation-pipeline.ts` to deterministically orchestrate `Dataset -> Signals -> Perspectives -> Business Views -> Question Plans -> Question Suggestions`.
  - `docs`: Authored `ADR-096-guided-investigation-pipeline.md` enforcing a strict unidirectional semantic pipeline without React state side-effects.
- **Phase BVQ-5B: Question Suggestion Renderer**:
  - `apps/desktop`: Implemented `question-suggestion-renderer.ts` to transform abstract `QuestionPlan` objects into `QuestionSuggestion` objects.
  - `apps/desktop`: Strictly mapped text output from predefined `questionTemplates` in `DOMAIN_KNOWLEDGE_CATALOG_V1`.
  - `docs`: Authored `ADR-095-question-suggestion-renderer.md` enforcing the strict separation of presentation and planning.

- **Phase BVQ-5A: Question Plan Contract**:
  - `apps/desktop`: Implemented `question-plan-generator.ts` as the bridge between Business Views and final questions.
  - `apps/desktop`: Deduce generic dimensions and measures (e.g., `time` dimension for `trend` intent) without generating human language text.
  - `docs`: Authored `ADR-094-question-plan-before-question.md` preventing NLP leakage into execution pipelines.

- **Phase BVQ-4B: Registry-Driven Business View Candidate Generator**:
  - `apps/desktop`: Rebuilt the Business View candidate generator to natively consume `DOMAIN_KNOWLEDGE_CATALOG_V1`.
  - `apps/desktop`: Defined rigorous `BusinessViewConfidence` mathematical scoring clamped to 100 max.
  - `docs`: Authored `ADR-093-registry-driven-business-view-generation.md` establishing that execution engines compute math but never hold hardcoded domain logic.

- **Phase DK-3: Machine-Readable Domain Catalog Registry**:
  - `apps/desktop`: Transcribed the 6 Markdown domain catalogs into a strongly-typed `domain-knowledge-catalog.ts` Registry.
  - `apps/desktop`: Added 14 explicit validation tests guaranteeing the TS registry exactly mirrors the architectural rules set in Markdown (no orphaned intents, no hallucinated signals, no duplicate IDs).
  - `docs`: Authored `ADR-092-machine-readable-domain-catalog.md` establishing the TS Registry as the single runtime source of truth.

- **Phase DK-2: Domain Knowledge Catalog Layer**:
  - `docs`: Established a formal `docs/domain-catalog/` directory to separate Business Knowledge from the Execution Engine.
  - `docs`: Authored canonical Markdown catalogs mapping Concepts -> Intents -> Question Templates -> Views for 6 domains (Operations, Revenue, Inventory, Customer, Performance, Finance).
  - `docs`: Created `ADR-091-domain-knowledge-catalog.md` defining the architectural rule that new domains are added via catalog packs, not engine rewrites.

- **Phase DK-1: Existing Domain Knowledge Consolidation**:
  - `docs`: Completed exhaustive inventory (`AUDIT-domain-knowledge-inventory.md`) of all capabilities scattered across `home-guidance.ts`, dataset capabilities, and documentation.
  - `docs`: Created `domain-knowledge-catalog-v1.md` outlining the implementation status (Supported vs Partially Supported) of 10 major business domains.
  - `docs`: Created `ADR-090-domain-knowledge-preservation.md` enforcing that architectural refactoring must never reduce existing analytical capability.

- **Phase BVQ-4A: Business View Registry V1 Audit & Design**:
  - `docs`: Completed comprehensive audit of legacy code (`AUDIT-existing-business-domain-coverage.md`) to guarantee zero capabilities are lost in the BVQ refactor.
  - `docs`: Designed `business-view-registry-v1.md` defining over 20 specific Business Views across 5 core domains.
  - `docs`: Created `ADR-089-business-view-registry-v1.md` locking the registry as the canonical, evidence-driven catalog.

- **Phase BVQ-4: Business View Candidate Generator**:
  - `apps/desktop`: Implemented `business-view-candidate-generator.ts` to strictly derive Business Views from a combination of a Perspective and supporting Business Signals.
  - `apps/desktop`: Enforced the "No Fallback" rule where partial signals or missing evidence (`minimumMatch`) results in zero generated views.
  - `docs`: Created `ADR-089-signal-driven-business-view-generation.md`.

- **Phase BVQ-3: Perspective Candidate Generator**:
  - `apps/desktop`: Implemented `perspective-candidate-generator.ts` to derive Perspectives strictly from the `BusinessSignalRegistry`.
  - `apps/desktop`: Ensured Perspectives are ranked dynamically by average confidence score + signal density bonus.
  - `apps/desktop`: Added strict tests prohibiting hardcoded/fallback Perspectives when no evidence exists.
  - `docs`: Created `ADR-088-signal-driven-perspective-generation.md`.


- **Phase BVQ-2B: Business Signal Detector MVP**:
  - `apps/desktop`: Implemented `business-signal-detector.ts` that converts dataset evidence into canonical `BusinessSignals`.
  - `apps/desktop`: Supported robust Vietnamese string normalization (accents, spaces, hyphens) to handle diverse column aliases.
  - `apps/desktop`: Ensured the detector strictly merges duplicate signal candidates and calculates combined confidence scoring.
  - `apps/desktop`: Explicitly banned the emission of Perspectives or Questions at the detection layer.


- **Phase BVQ-2A: Business Signal Registry Architecture Lock**:
  - `docs`: Created `ADR-085-business-signal-registry.md` establishing the Signal Registry as the semantic source of truth.
  - `docs`: Created `ADR-086-business-concept-canonicalization.md` to prevent dataset label leakage.
  - `docs`: Created `ADR-087-signal-taxonomy.md` defining V1 signal families.
  - `docs`: Authored `business-signal-registry-contract.md` defining strict TypeScript interfaces.
  - `docs`: Completed `AUDIT-business-signal-dependencies.md` tracking all downstream violations of the semantic layer.

- **Phase BVQ-1: Business View Driven Question Pipeline Contract**:
  - `docs`: Documented audit finding that current Perspective/Business View layer is purely cosmetic.
  - `docs`: Created `ADR-084-business-view-driven-question-pipeline.md` enforcing the strict `Dataset -> Signal -> Perspective -> Business View -> Question` flow.
  - `docs`: Created `business-view-question-pipeline-contract.md` defining strict TypeScript shapes for Signals, Perspectives, and Questions, and hard-banning cosmetic fallbacks.
  - `docs`: Added `milestone-8-5-guided-investigation.md` to track the implementation of the new pipeline.


- **Phase UX-5: Business View Summary Layer**:
  - `apps/desktop`: Created `BusinessViewSummaryCard` component to serve as a mandatory understanding step before showing questions.
  - `apps/desktop`: Replaced the direct jump from Business View to Questions in `Home.tsx` by inserting the Summary Card to display Purpose, Evidence, Relationships, Coverage, and LightBI's semantic belief.
  - `apps/desktop`: Ensured no technical BI concepts, SQL, or schemas leak into the understanding layer.
  - `docs`: Added `ADR-083-business-view-summary-layer.md` to formally document "Understand First, Question Later".



- **Phase UX-4: Perspective Before Questions**:
  - `apps/desktop`: Added a global Perspective Selector (Operations, Revenue, Inventory, Customer, Performance) to `Home.tsx`.
  - `apps/desktop`: Updated `Explore` tab to hide questions until a perspective is chosen, and filter questions to match the perspective.
  - `apps/desktop`: Overhauled `Investigate` tab to act as a Business Understanding workspace (displaying Perspective-driven Business Views) instead of a manual SQL query builder.
  - `apps/desktop`: Updated `Ask` tab to visually confirm the active Perspective and Business View.
  - `docs`: Added `ADR-082-perspective-before-question.md`.


- **Phase UX-3: Learn From Data, Not Explore Dataset**:
  - `apps/desktop`: Overhauled the `Explore` tab to shift from "Dataset Exploration" to "Business Learning". Grouped generated questions by business perspective (e.g., Operations, Revenue). Replaced raw percentage confidence scores with qualitative "Question Match" signals (Strong/Moderate/Weak). Removed database jargon (unique, fields) from the UI.
  - `docs`: Added `ADR-081-learning-first-question-discovery.md`.


- **Phase UX-2: Explore, Investigate, Ask Navigation**:
  - `apps/desktop`: Renamed the analysis tabs in `Home.tsx` from `Auto/Advanced/AI` to `Explore/Investigate/Ask` to align with the Business Understanding Engine philosophy.
  - `docs`: Added `ADR-080-explore-investigate-ask-navigation.md`.


- **Phase UX-1: Data Quality vs Business Confidence Separation**:
  - `apps/desktop`: Renamed `DatasetHealthCard.tsx` to `DataQualityCard.tsx` and updated all labels/copy to reflect "Data Quality".
  - `apps/desktop`: Updated `Home.tsx` to introduce a reserved `Business Confidence` section below `Data Quality`, visually separating technical data integrity from analytical trust.
  - `docs`: Added `ADR-079-data-quality-vs-business-confidence.md`.


- **Phase R.7: Result Validator Integration**:
  - `apps/desktop`: Replaced and implemented `result-validator-contract.ts` to strictly score preview results against expected contracts (dimensions, measures, shape).
  - `apps/desktop`: Integrated validation output into the `ConfidenceSignalRegistry` as the `result_validation` signal.
  - `apps/desktop`: Added `ResultValidationCard.tsx` to visualize the scoring evidence in the UI.
  - `docs`: Added `ADR-078-result-validator-integration.md`.

  - `apps/desktop`: Implemented `duckdb-preview-runtime.ts` to mock constrained data execution without generating charts or full materialization. Added strict row enforcement logic and downstream business confidence warnings. Created `DuckDBPreviewRuntimeCard.tsx` and wired into `Home.tsx` to handle post-contract evaluations. Added `ADR-077-duckdb-preview-runtime.md`.


- **Phase T.3: Trust Layer Wiring Review & Cleanup**:
  - `apps/desktop`: Trust Layer wiring reviewed and verified.
  - `apps/desktop`: Enforced explicit "Provisional confidence" copy in the Business Confidence Card.
  - `apps/desktop`: Ensured final confidence is strictly reserved for post-runtime validation (when `result_validation` and `coverage` exist).

- **Phase T.2: Business Confidence Engine MVP**:
  - `apps/desktop`: Implemented `business-confidence-engine.ts` to aggregate signals using the ConfidenceSignalRegistry. Added `confidence-signal-adapters.ts` to transform health and relationship data into signals. Created `BusinessConfidenceCard.tsx` for provisional trust visualization. Added `ADR-076-business-confidence-engine.md`.
  - `apps/desktop`: Integrated Business Confidence Card into `Home.tsx` to display right before DuckDB runtime phases.

- **Phase R.6: Confidence Signal Registry Architecture Lock**:
  - `docs`: Added `ADR-075-confidence-signal-registry.md`. Established signal-based trust architecture where Business Confidence Engine will aggregate signals instead of owning them. Future confidence sources can be added without engine redesign.

- **Phase R.5: Business Confidence Formula Design**:
  - `docs`: Authored `ADR-074-business-confidence-formula.md` defining provisional vs final confidence modes, V1 formula weights, and output contracts. Reaffirmed that DuckDB runtime is deferred until trust scoring is ready.
- **Phase R: Result Validator Contract**:
  - `apps/desktop`: Created `result-validator-contract.ts` to assert physical rows against `ExpectedResultContract`.
- **Phase T.1: Dataset Health Engine MVP**:
  - `apps/desktop`: Created `dataset-health-engine.ts` to compute dataset health metrics (completeness, consistency, uniqueness, key quality).
  - `apps/desktop`: Added `DatasetHealthCard.tsx` UI to visualize dataset health.
  - `docs`: Authored `ADR-073-dataset-health-engine.md`.
- **Milestone 8: Business Confidence & Trust Layer (Design)**:
  - `docs`: Added `ADR-070-business-confidence-engine.md` to define the multi-signal trust scoring layer.
  - `docs`: Added `ADR-071-dataset-health-model.md` to define a reusable data quality assessment model.
  - `docs`: Added `ADR-072-insight-contract.md` to formally decouple abstract data results from user-facing business statements.
  - `docs`: Created `milestone-8-business-confidence.md` progress tracker.
- **Phase Q: Preview Result Contract**:
  - `apps/desktop`: Created `preview-result-contract.ts` to statically define the physical column structure of the final result before any real execution occurs.
  - `apps/desktop`: Added `PreviewResultContractCard` UI to display the empty skeleton table and validate it against the expected intent.
  - `docs`: Authored `ADR-069-preview-result-contract-before-runtime.md`.
- **Phase P: Sandbox Contract & Execution Policy**:
  - `apps/desktop`: Created `runtime-sandbox-policy.ts` to statically evaluate query complexity and enforce resource limits (datasets, relationships, memory, timeout).
  - `apps/desktop`: Added `SandboxPolicyPreview` UI to present execution risks and require explicit user acknowledgment before hitting the engine.
  - `docs`: Authored `ADR-068-sandbox-before-runtime.md`.
- **Phase O: Safe SQL Compiler Contract**:
  - `apps/desktop`: Created `CompiledQueryContract` to safely transpile boundary artifacts into structured SQL building blocks (sources, joins, aggregates) without execution.
  - `apps/desktop`: Added `CompiledQueryPreview` UI to display the transpiled placeholder SQL to the user.
  - `docs`: Authored `ADR-067-safe-sql-compiler-contract.md`.
- **Phase N: Expected Result Contract**:
  - `apps/desktop`: Created `ExpectedResultContract` to formally define what a successful answer should look like (dimensions, measures, shape) *before* any SQL compilation or execution.
  - `apps/desktop`: Added `ExpectedResultPreview` UI component to visualize the answer's intent.
  - `docs`: Authored `ADR-066-expected-result-contract-before-sql.md` and initiated Milestone 7 for Result Understanding.
- **Phase M.5: Runtime Boundary Contract**:
  - `apps/desktop`: Designed `RuntimeBoundaryArtifact` as the sole, auditable, strictly validated handoff object to future execution engines.
  - `apps/desktop`: Implemented cross-layer ID provenance and strict rules preventing raw SQL leakage.
  - `docs`: Added `ADR-065-runtime-boundary-contract.md` to formally seal the frontend planning boundary.
- **Phase M: DuckDB Logical Plan Adapter**:
  - `apps/desktop`: Created `DuckDBLogicalPlan` to cleanly translate virtual intent operations (`select_dataset`, `use_relationship`) into deterministic data engine operations (`scan`, `join`, `aggregate`).
  - `apps/desktop`: Added `DuckDBLogicalPlanPreview` UI component to preview the adapter's output.
  - `docs`: Authored `ADR-064-duckdb-logical-plan-before-sql.md` restricting SQL generation from skipping this logical layer.
- **Phase L: Execution Guard**:
  - `apps/desktop`: Implemented `ExecutionGuard` to definitively allow, warn, or block runtime execution based on relationship status, confidence, and preview acceptance.
  - `apps/desktop`: Added `ExecutionGuardNotice` UI to surface blocking reasons directly to the user before DuckDB handoff.
  - `docs`: Added `ADR-063-execution-guard-before-runtime.md` centralizing safety checks.
- **Phase K: Runtime Preview Contract**:
  - `apps/desktop`: Implemented `RuntimePreview` contract to translate abstract `VirtualDatasetPlan` steps into user-readable business operations.
  - `apps/desktop`: Added `RuntimePreviewCard` to ensure users explicitly "Accept Plan" before handing off to the future execution engine.
  - `docs`: Added `ADR-062-runtime-preview-before-execution.md` enforcing the strict review boundary.
- **Milestone 5 Completed**: Locked frontend-only Relationship Discovery & Planning architecture.
  - Added major modules: `business-key-detector.ts`, `relationship-discovery.ts`, `relationship-graph.ts`, `business-view-generator.ts`, `workspace-understanding-state.ts`, `virtual-dataset-planner.ts`.
  - Added UI components: Business View Review UI, Relationship Evidence Drawer, VirtualDatasetPlanPreview.

### Added
- **Milestone 5: Relationship Discovery & Dataset Collections**:
  - `docs`: Authored Architecture Decision Records (ADR-055 to ADR-058) establishing the Business Key Detection Engine, Relationship Discovery Engine, Dataset Collection, and Virtual Dataset Layer.
  - `docs`: Defined the explicit Relationship Discovery Scoring contract `relationship-discovery-scoring.md` detailing the multi-signal algorithm (semantic tag, name, profile, pattern, overlap) to detect cross-domain joins without manual modeling.
- **Phase J: Virtual Dataset Plan Preview UI**:
  - `apps/desktop`: Created `VirtualDatasetPlanPreview` component to visually summarize datasets, relationships, planning steps, and warnings to the user.
  - `apps/desktop`: Integrated plan preview into `Home.tsx` auto-mode analysis question clicks.
- **Phase I: Virtual Dataset Planner Contract**:
  - `apps/desktop`: Created `VirtualDatasetPlan` contract that deterministically maps a Business View and a Semantic Question into abstract query steps (select, group_by, filter, sort).
  - `apps/desktop`: Implemented `createVirtualDatasetPlan` to handle relationship blocking rules (rejected vs ignored relationships) and confidence scoping without emitting SQL.
  - `docs`: Added `docs/architecture/virtual-dataset-planner.md` defining the boundary between planning and future materialization.
- **Phase H.5: Active Business Context Cleanup**:
  - `apps/desktop`: Extracted active context formatting logic into `getActiveAnalysisContextLabel`.
  - `apps/desktop`: Strictly prioritized Business View suggested questions in Auto mode, preserving Field-level questions for Advanced mode when a Business View is selected.
  - `apps/desktop`: Refined header to hide row/column counts when exploring virtual business views.
- **Phase H: Persist Accepted Relationship Graph**:
  - `apps/desktop`: Added `WorkspaceUnderstandingState` to capture explicitly selected data contexts (`dataset`, `dataset_group`, `business_view`).
  - `apps/desktop`: Persisted user review selections (Business Views and Relationships) seamlessly from the intake flow without triggering execution.
- **Phase G.5: Business Review UX Cleanup**:
  - `apps/desktop`: Improved copy and layout of `BusinessViewReviewCard` and `RelationshipEvidenceDrawer` to emphasize business meaning over technical joins.
  - `apps/desktop`: Preserved confirmed Business View context into the next analysis step.
  - `apps/desktop`: Prioritized generated business questions over generic field-level semantic questions when a view is selected.
  - `apps/desktop`: Created `DataUnderstandingSummary`, `BusinessViewReviewCard`, and `RelationshipEvidenceDrawer`.
  - `apps/desktop`: Implemented `BusinessViewReviewStep` to allow user confirmation/rejection of business views and technical relationships.
  - `apps/desktop`: Integrated relationship discovery engine and `BusinessViewReviewStep` into the data intake flow in `Home.tsx`.
  - `apps/desktop`: State updates remain local prior to Phase H persistence.
- **Phase F.6: Business View Generator**:
  - `apps/desktop`: Added rule-based Business View Generator on top of RelationshipGraph.
  - `apps/desktop`: Added business domain detection for product/order/customer/supplier/inventory/logistics/finance/operations.
  - `apps/desktop`: Added deterministic suggested question generation.
  - `apps/desktop`: Confirmed no SQL/DuckDB/AI/materialization in this phase.
- **Phase F.5: Relationship Graph Foundation**:
  - `apps/desktop`: Refactored `relationship-discovery.ts` to derive Dataset Collection Candidates from a connected components graph model (`relationship-graph.ts`), not directly from pairwise scoring.
  - `apps/desktop`: Established `RelationshipEdge` as the core unit containing `risk` (based on cardinality) and `confidence` (HIGH/MEDIUM/LOW).
  - `apps/desktop`: Refactored evidence output to use machine-readable `EvidenceItem` structures.
- **Phase F: Relationship Discovery Scoring Engine MVP**:
  - `apps/desktop`: Implemented `business-key-detector.ts` to identify generic keys and emit `KeyCandidates` using null ratios and distinct counts.
  - `apps/desktop`: Implemented `relationship-discovery.ts` scoring logic. Introduces an explicit `-15` penalty to generic keys (like "Mã", "Code") within the Name Similarity component, but recovers `-5` if the sample overlap is strong (>=70%).
  - `apps/desktop`: Designed `RelationshipCandidate` to explicitly expose `scoreBreakdown` evidence for every component.
  - `apps/desktop`: Formulated `DatasetCollectionCandidate` grouping logic which triggers only when at least one relationship is >= 70 or multiple weak connections >= 50. Strictly frontend only; no physical merges performed.
- **Phase 4.7: Multi-File Dataset Classification & Context Switching**:
  - `apps/desktop`: Implemented `classifyDatasetFamilies` to fingerprint and hash uploaded schemas into logical "Dataset Groups" with auto-generated names based on keywords (e.g. "Delivery Performance Reports").
  - `apps/desktop`: Refactored the UI to explicitly reject blind merging of mixed schemas. The pending batch card now forces users to explicitly select an active schema family before semantic analysis can proceed.
  - `apps/desktop`: Added "Change Group" flow. Users can seamlessly switch context between different schema groups uploaded in the same batch without needing to re-upload or re-parse files, maintaining strict semantic safety.
- **Phase 4.6: Analysis Mode Switcher**:
  - `apps/desktop`: Added a segmented control to switch between three top-level analysis modes: **Auto** (Semantic suggestion), **Advanced** (Manual Field Builder), and **AI** (Natural Language Prompt).
  - `apps/desktop`: Created `Advanced Mode` manual field builder UI. The UI reads semantic profiles from `currentDataset` and groups columns into Measure, Dimension, Time, and Status fields. Identifier columns are explicitly excluded from default dimensions. Status drop-downs dynamically populate with `topValues`.
  - `apps/desktop`: Structured UI scaffolds for the upcoming AI execution engine. Prepared `ManualAnalysisIntent` and `AutoAnalysisIntent` concepts to feed into the upcoming Recipe Planner.
- **Phase 4.5: Column Profiling Engine**:
  - `apps/desktop`: Implemented `column-profiler.ts` to compute data profiles directly from file parsing streams (Excel, CSV, JSON). This engine samples up to 1000 rows to extract `distinctCount`, `topValues`, `nullPercent`, and accurately infer data types (`number`, `date`, `boolean`, `string`), advancing the platform beyond naive column-name guessing.
  - `apps/desktop`: Enhanced the Semantic Field Mapper to rely on profiling data. The semantic engine now forcefully overrides `identifier` types if cardinality matches total row count, detects pure categoricals dynamically, and drops confidence on string-based columns that masquerade as metrics.
  - `apps/desktop`: Supercharged the Question Generation Engine. Replaced static template strings with dynamic `valueTags` interpolation. Instead of generic templates (e.g., "Which driver missed SLA?"), the engine extracts `topValues` from categorical columns (like "Nhập muộn" or "Đúng giờ") and injects them directly into highly specific questions (e.g., "Tên lái xe nào có tỷ lệ Nhập muộn cao nhất?").
  - `apps/desktop`: Upgraded `Home.tsx` to display distinct counts (`[10 uniq]`) and top values (`e.g. Đúng giờ, Nhập muộn`) directly inside the Semantic Field pills. This creates a fully transparent, profiling-aware frontend experience.
- **Phase 4.4: Semantic Field Mapping & Question Suggestions**:
  - `apps/desktop`: Replaced the legacy dataset capability detector with a strictly typed `Semantic Field Mapping` engine. Introduced `semantic-tag-registry.ts` as a centralized registry of domain-agnostic aliases (e.g. `route`, `driver`, `revenue`, `shipment`) to enforce standardization across Retail, Logistics, HR, and Finance.
  - `apps/desktop`: Extracted raw column names out of analytical heuristics. The engine now classifies columns into `FieldSemanticType` (including an explicit `identifier` type, distinct from `dimension`) and maps them to standard `SemanticTag`s with a deterministic `confidence` score.
  - `apps/desktop`: Re-architected question generation using `QuestionTemplate`s that strictly depend on `SemanticTag` presence. If a template requires `driver` and `delivery_status`, it absolutely will not render if the dataset lacks those fields. The UI now dynamically interpolates the user's specific column names into the questions (e.g., "Which Tên lái xes miss SLA most often?") and exposes the required fields and confidence score, paving the way for the future Recipe Planner.
- **Phase 4.3: Guided Workspace Redesign**:
  - `apps/desktop`: Relaxed URL validation logic in `preflightLinkInput` to support natural user behavior (e.g., pasting links without `https://`) while maintaining confidence via pattern and link-structure heuristics. Updated regression unit tests (`input-intent.test.ts`) to enforce Question-First routing, ensuring long natural language texts or random garbage are properly classified as questions, and correctly rejecting malformed formats like missing spreadsheet IDs.
  - `apps/desktop`: Fixed Link Intake Semantics and Architectural State Model by strictly separating `analysisIntent` from `dataAttachment`. The question box no longer treats input as "either a question or a link". Instead, URL pattern detection creates a `dataAttachment` while preserving the existing `analysisIntent` (or safely falling back to a selected topic). Removed the incorrect fallback to marketing hero prompts, establishing true Question-First product behavior. If a link is ready but no intent exists, the UI specifically asks "What would you like to understand from this data?" instead of hallucinating an intent.
  - `apps/desktop`: Refined data intake UI states and fixed a critical architecture bug regarding fake datasets. Removed deep link validation, mock preflight checking, and mock metadata generation from the frontend. The `Home.tsx` view now solely performs lightweight source-family classification. We established a strict 4-stage boundary rule: `URL -> pendingSource -> connector inspection -> currentDataset`. A URL is no longer treated as a dataset, and no fake rows/columns/capabilities are generated.
  - `apps/desktop`: Simplified the Inline Link Intake flow by introducing the `pendingSource` state. Supported links now immediately transition into a "Source Pending Validation / URL attached" UI card rather than appearing as a fully "Connected Data" entity. Capability detection, suggested questions, and analysis execution are strictly disabled until an actual `currentDataset` is returned from a successful backend connector import.
  - `apps/desktop`: Refined the Guided Workspace layout by establishing "Suggested Actions" as the primary workflow layer when data is loaded, and visually demoting "Quick Start" to "Explore more workflows" to reduce cognitive load and visual clutter. Enhanced the "Recent Insights" section to resemble real workspace memory (including descriptions, timestamps, and a footer link) rather than floating cards. Fixed the generic template suggestion logic to accurately interpolate column names into natural English sentences.
  - `apps/desktop`: Implemented Audience-Aware Hero Chips. Transformed static hero suggestions into dynamic, audience-grouped pools with an expanded coverage of 18 specific business personas and domains (including retail, finance, HR, logistics, healthcare, etc.). Integrated a subtle, non-distracting rotation algorithm that crossfades a single chip every 8 seconds, pausing when the user focuses the input, ensuring the workspace feels alive but not noisy. Prepared the data structures and added a TODO for future user-role and project-type personalization.
  - `apps/desktop`: Defined the Persona Selection Contract. Created a lightweight, deterministic `selectHeroSuggestionPool` helper to dynamically route the Home workspace to the most relevant prompt pool based on data schema signals. Added robust metadata with signal arrays and match priorities to 18 persona pools. This ensures that even before full authentication is implemented, the local workspace can intelligently adapt its suggestions when specific column signatures (e.g., "invoice", "payroll", "campaign") are detected, safely falling back to the default pool otherwise.
  - `apps/desktop`: Applied Category Dot Styling to Hero Chips. Mapped prompt strings into structured `{ text, category }` objects via the `getStructuredPool` helper. Introduced `heroChipCategoryStyles` mapping to render a subtle, category-specific colored dot (e.g., emerald for finance, teal for accounting) on each chip, paired with a matching background tint on hover. This avoids the heavy visual noise of full colored pills while providing immediate visual grouping hints. Unknown categories gracefully fall back to a neutral "general" dot.
  - `apps/desktop`: Introduced Dataset Capability Detection with Explanation Microcopy. Built a deterministic `detectDatasetCapabilities` engine that infers analytical capabilities by scanning column names for domain-specific keywords. The engine now returns structured evidence (which columns triggered which capability). Added a lightweight "Detected Opportunities" UI section below the data source. These capability chips feature native tooltips displaying a clear, plain-English description of the capability along with the specific column evidence (e.g., "Detected from: revenue, total_amount"). This visually communicates LightBI's understanding and builds trust before any AI interaction, without exposing heavy technical metadata. Refactored the "Suggested Actions" section to dynamically populate with specific, capability-aware actions (like "Analyze revenue growth") instead of generic placeholders, reinforcing the Goal → Data → Answer paradigm.
  - `apps/desktop`: Implemented Suggested Action Preview Contract. Clicking a capability-aware suggested action no longer triggers the analysis pipeline blindly. Instead, it opens a lightweight inline preview panel directly beneath the grid. This panel explicitly sets expectations by displaying the exact question LightBI will ask, the columns it intends to use, and the expected output format (e.g., "Trend line and growth percentage"). This builds trust and provides explainability before execution. Users can choose to execute the action from the preview or cancel it.
  - `apps/desktop`: Redesigned the Add Data (+) Menu into a strict 2-Level Navigation structure. Shifted the top-level menu architecture from a technology-centric model ("Upload", "Connect") to a human-centric model ("My Computer", "Online Data", "Systems", "Sample Data"). Specific implementation details like PostgreSQL, REST API, and Snowflake are now neatly categorized inside animated drill-down submenus using Framer Motion. This drastically reduces cognitive load, making the primary menu scannable within 1 second while preserving advanced capabilities. Updated menu items to use more specific product-aligned Lucide icons (e.g., Table for Google Sheets, Code for APIs).
  - `apps/desktop`: Established the Data Intake Contract. Created `data-intake.ts` to normalize all human-centric menu selections into structured `DataIntakeRequest` objects (`{ sourceKind, sourceType, requiresInput, nextStep }`). This creates a stable architectural boundary between the UI and the future import pipeline. Menu clicks now deterministically drive UI flows (e.g., triggering a file picker for `local_file`, or queuing a connection setup for `system`) without hardcoding source-specific business logic in the view layer.
  - `apps/desktop`: Implemented the Unified Data Intake Drawer. Replaced the inline connection panel with a global `DataIntakeDrawer` component that slides down from the top using Framer Motion. Driven deterministically by the `DataIntakeRequest` contract, the drawer acts as an orchestrator for dedicated step components (`GoogleSheetsStep`, `DatabaseStep`, `ApiStep`, `WarehouseStep`). This modular architecture cleanly isolates future domain-specific connection logic (e.g. OAuth, test connections, schema detection) while maintaining context with the Home page visible underneath a subtle blur overlay. All intrusive browser alerts have been fully eliminated.
  - `apps/desktop`: Implemented the Dataset Intake Summary Layer. Introduced a new `DatasetSummaryStep` component that displays dataset metadata, measures, dimensions, and capability-aware opportunities after a successful connection simulation. Reuses existing logic from `detectDatasetCapabilities` to maintain a single source of truth for semantic understanding. Decoupled all new user-facing copy into the `datasetSummary` block in `home-guidance.ts`. This structurally shifts the product paradigm to clearly communicate "LightBI understands my data" before offering analysis.
  - `apps/desktop`: Implemented State-Aware Home Behavior. The Home workspace now dynamically adjusts its UI hierarchy and action suggestions based on whether data is absent, loaded, or analyzed. Introduced `homeStates` in `home-guidance.ts` to cleanly decouple stateful copy. Guided onboarding actions are now prioritized when no data exists, while follow-up actions take precedence after an analysis is generated. The "Recent Insights" section now gracefully handles empty states conditionally.
- **Phase 4.2: Home Guidance Content Architecture**:
  - `apps/desktop`: Refactored `Home.tsx` to extract all hardcoded business copy, suggestions, and rotating prompts into a dedicated `content/home-guidance.ts` module. This prepares the codebase for future internationalization (i18n) and personalization while strictly decoupling content from React UI rendering.
- **Milestone 4: Guided Home Experience & Conversational Entry Point**: Completely redesigned the Home page to act as a guided workspace rather than a blank canvas.
  - `apps/desktop`: Replaced the explicit "Import Data" button with a universal `[ + ]` menu labeled "Start with your data", categorized intuitively into Upload (CSV, Excel), Connect (ERPNext, Database), and Examples. Replaced technical onboarding topics with business-action cards (e.g., "Analyze a sales report", "Understand inventory") that trigger data import flows without using technical terminology like "Dataset" or "Connector". Generated dynamic, action-oriented dataset suggestions (e.g. "Revenue Trend") rather than full sentence queries. Added a post-analysis "What should I do next?" section providing guided exploration paths (e.g., "Compare by Customer"). Extracted the dataset upload mechanics into a reusable `useDatasetUpload` hook.
  - `apps/desktop`: Added `framer-motion` to handle subtle UI animations. Implemented a ChatGPT/Notion AI style animated prompt rotation under the Home greeting, looping through 10 contextual prompts every 4.5 seconds to build immediate understanding. Added random contextual suggestion chips to the empty state to simulate a "living" workspace. Enforced strict rule: "Never assume the user knows BI terminology." Replaced error modals with inline conversational state guidance when a user selects a topic without loaded data. Enhanced the "What would you like to explore next?" post-analysis footer to ensure the user never reaches a dead end.
  - `apps/server`: Updated `get_current_source` and `import_csv` endpoints to explicitly return the dynamically inferred `date_column`, `measure_column`, and `dimension_column` fields directly in the JSON response, allowing the frontend to generate context-aware suggested questions immediately upon upload.
- **Milestone 2**: Question First Landing Experience
  - `apps/desktop`: Replaced default `/` route with a new `Home.tsx` search interface.
  - `apps/desktop`: Implemented visual Question → Template → Chart → Insight pipeline rendering using Frappe Insights visual styling.
  - `apps/server`: Added `POST /api/question/ask` endpoint to orchestrate template resolution and payload generation.
  - `lightbi-question`: Updated mock `QuestionClassifier` to deterministically return a template match without AI.
  - **UI Standard**: Refactored the overall application layout (`AppLayout.tsx`) to strictly use neutral colors (`gray-900` primary), thin gray borders, and simple typography without bold colorful accents.
- **Milestone 3: Real CSV Import Flow & Stabilization**: Replaced the hardcoded `sales.csv` dependency with a real end-to-end file upload pipeline, followed by a reliability stabilization pass.
  - `apps/server`: Added `axum::extract::Multipart` support to handle CSV uploads. Implemented robust `Result` error handling to prevent silent hangs on stream drops, added structured logs for visibility, and returned strictly typed JSON HTTP errors (400/500). Saved files securely to the project's local directory and integrated with `CsvConnector` for dynamic schema inference. Added dynamic CSV column inference (date, dimension, measure) during upload, removing hardcoded Date/Revenue SQL query crashes. Updated all execution endpoints (chart, export, question) to route DuckDB queries dynamically against the user's uploaded file and replaced unwraps with graceful JSON error responses. Verified `0.0.0.0:3000` binding is correct. Added disk-backed session persistence via `project/session/current_source.json` and a `resolve_current_source` helper. This ensures the uploaded file metadata survives server restarts and properly hydrates the `GET /api/project/current-source` endpoint.
  - `apps/desktop`: Replaced dummy "Add Source" buttons in `DataSources.tsx` with a real `FormData` file picker. Wrapped uploads in strict `try/catch/finally` blocks with an `AbortController` (30s timeout) to prevent indefinite "Uploading..." states. Implemented configurable API endpoints using `VITE_API_BASE_URL` (fallback to `http://localhost:3000`) to resolve mixed-content and network unreachable errors when deployed. Added schema inspection UI upon successful upload (including bytes written) and maintained the strict Frappe Insights UI baseline. Added frontend hydration on mount to fetch and display the current session source, preventing loss of upload context across page navigations.
- **Milestone 2 Stabilization**: Completed a UI stabilization pass to remove remaining inconsistent blue styles across all pages, replacing them with the standard `gray-900` (primary) and `gray-700` (secondary) palettes. Densified dashboard and table layouts (`text-[13px]`, reduced padding) to match the compact Frappe Insights visual reference. Fixed a "Maximum update depth exceeded" crash on `/charts`, `/datasets`, and `/datasources` by resolving a Zustand selector rendering issue where `Object.values` was continuously returning a new array reference. Introduced a root-level ErrorBoundary to the routing layer with a neutral LightBI style. Documented these rules in `docs/design/ui-baseline.md` to lock the visual standard.
  - `lightbi-connectors`: Implemented `CsvConnector` to extract schema and execute file-based sources.
  - `lightbi-duckdb`: Integrated DuckDB as the primary backend execution engine via `ExecutionBackend`.
  - `lightbi-export`: Added Excel artifact generation using `rust_xlsxwriter` to convert `ResultSet` to `.xlsx`.
  - `lightbi-server`: Created an Axum REST API backend to bootstrap `ProjectContext` and serve analytical requests.
  - `apps/desktop`: Implemented a Vite/React frontend to import CSVs, render `ChartPayload` using `echarts-for-react`, and trigger Excel downloads.
- **Phase 27 (Frontend Rendering Contract)**: Added `lightbi-render-contract` crate. Established the UI boundary by creating versioned `Payload` structs and utilizing `ts-rs` to automatically generate type-safe TypeScript bindings for the frontend.
- **Phase 26 (Dashboard Workspace)**: Added `lightbi-dashboard` crate. Established the `DashboardDefinition` model as a perspective-aware layout blueprint that strictly aggregates existing assets (Charts, Insights) rather than generating them.
- **Phase 25 (Chart Runtime)**: Added `lightbi-chart` crate. Established the `ChartDefinition` model and `ChartValidator` to guarantee that UI rendering blueprints are strictly validated against their underlying Data View shapes before reaching the frontend.
- **Phase 24 (Export Foundation)**: Added `lightbi-export` crate. Abstracted file generation behind an `ExportService` that produces traceable `ExportArtifacts` to ensure unbreakable lineage from PDF/CSV back to the source database.
- **Phase 23 (Insight Foundation)**: Added `lightbi-insight` crate. Established the `Insight` and `InsightNarrative` models to deterministically extract meaning from data without relying on LLM hallucinations.
- **Phase 22 (Data View Foundation)**: Added `lightbi-view` crate. Established the `DataView` layer and `VisualizationContract`, enforcing strict type-safety boundaries before data ever reaches a frontend Chart component.
- **Phase 21 (Virtual Dataset Runtime)**: Added `lightbi-vdataset-runtime` crate. Established the `RuntimeDataset` model and `DatasetMaterializer` to bridge raw execution results with reusable UI-ready analytical assets.
- **Phase 20 (Runtime Foundation)**: Added `lightbi-runtime` and `lightbi-runtime-backend` crates. Created the `RuntimeCoordinator` and `ExecutionBackend` trait to permanently decouple the Planner from DuckDB specifics.
- **Phase 19 (Question Template Foundation)**: Added `lightbi-question` crate. Established `QuestionTemplate` and `QuestionClassifier` resolving the "Question First" requirement without relying on LLM-to-SQL hallucination risks.
- **Phase 18 (Planner Foundation)**: Added `lightbi-planner` crate. Established the `StrategySelector` and `ExecutionPlan` boundary, enabling Pushdown, Cache, and Sampling strategies without coupling to DuckDB.
- **Phase 17 (Recipe Foundation)**: Added `lightbi-recipe` crate. Defined the `AnalyticalIntent` model and `RecipeValidator` to strictly divorce business intent from SQL execution logic.
- **Phase 16 (Perspective Layer)**: Added `lightbi-perspective` crate. Established rule `Question -> Perspective -> Recipe`. Formalized `QuestionContext` as the rigid boundary handed over to Execution Engines.
- **Phase 15 (Schema Foundation)**: Added `lightbi-schema` crate. Defined explicit `SchemaMetadata`, `SemanticField`, and `SemanticMeasure` contracts ensuring Planners don't guess column types or business meaning.
- **Phase 14 (Dataset Foundation)**: Established Virtual Dataset Model. Added `lightbi-dataset` crate. Planners and Charts now execute strictly against Datasets, decoupling entirely from Connectors.
- **Phase 13 (Source Registry)**: Created `lightbi-connectors` crate. Defined `ConnectorContract` and `SourceRegistry`. Integrated registry exclusively into `ProjectContext`.
- **Phase 12 (Project Runtime)**: Created `lightbi-project` crate. Outlined project lifecycle states. Formalized `ProjectContext` and `ProjectManager`.
- **Phase 11 (Persistence)**: Created `lightbi-store` crate using `sqlx`. Set up `ProjectStore` trait and `event_log` SQLite migrations.
- **Phase 10 (Perspective Layer)**: Created schema overlay separating rigid math datasets from Role-specific UI insights.
- **Phase 9 (Source Capabilities)**: Established structural feature flags mapping what varied databases (Postgres vs CSV) can perform.
- **Phase 8 (Recipe Planner)**: Established execution DAG layer.
- **Phase 7 (Question Template Engine)**: Added deterministic templates linking Intent to Recipes.
- **Phase 6 (Question First Analytics)**: Inverted BI paradigm to start with natural language rather than models.
- **Phase 5 (Dataset Recipe Engine)**: Outlined canonical transformations.
- **Phase 4 (Storage Architecture)**: Split dual-storage model (`SQLite` for metadata, `DuckDB` for data).
- **Phase 3 (App Runtime)**: Bootstrapped `Zustand` frontend adapter.
- **Phase 2 (Domain Model)**: Locked base architecture (`Project -> Datasource -> Dataset -> Chart -> Dashboard`).
- **Phase 1**: Initial setup, pnpm workspace, cargo workspace.

## [Unreleased]
### Added
- **DU-9 Semantic Graph Phase 1**: Implemented semantic concept map data layer (\SemanticGraphModel\, \SemanticGraphBuilder\) and visualization component (\SemanticGraphView\) rendered purely in SVG. Concept maps now appear automatically inside the \DatasetUnderstandingCard\ for multi-signal datasets.
