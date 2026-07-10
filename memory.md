# PROJECT_MEMORY.md — LightBI

## 2026-07-03 Business Brain Orchestrator Direction

Accepted direction:

```text
Raw / imported data
-> Semantic Coverage Engine
-> Business Signal Registry
-> KPI Engine
-> Playbook Matcher
-> Variance Engine
-> Root Cause Engine
-> Risk Engine
-> Recommendation Engine
-> Executive Narrative
```

Why:

* Simple mode must approach a real Business Analyst decision workspace.
* Recent ERP sample work exposed a recurring gap: data can contain valid business evidence, but LightBI can still be blind if the signal/angle is not already modeled.
* This is the same root issue behind categorical `Payment` initially not producing the right Payment Mix angle, and Logistics `Carrier`/`DeliveryStatus`/`DeliveryFee` not yet producing internal-vs-outsourced delivery cost/profit impact analysis.

Rules:

* Every imported field must be classified as `recognized`, `partial`, `unknown_business_like`, or `technical_or_noise`.
* Every selected angle must produce a `BusinessBrainBrief` with readiness, KPI, variance, root cause, risks, recommendations, missing evidence, narrative, and evidence.
* `partial` and `blocked` are valid outputs, but must explain missing evidence.
* Executive Narrative must be selected-angle-first. Cross-domain overview may support the answer, but must not replace it.
* Do not keep patching single signals as the main strategy; build Semantic Coverage + Business Brain Orchestrator first.

Canonical docs:

* `docs/architecture/ADR-119-business-brain-orchestrator.md`
* `docs/progress/phase-28-business-brain-orchestrator.md`

## 2026-07-04 Context-Aware Semantic Dictionary Direction

Accepted direction:

* LightBI must not rely on headers alone. It must infer business meaning from header evidence, value evidence, shape evidence, and later neighbor/cross-file evidence.
* The dictionary is domain-wide, not a one-off fix for finance/revenue or the six ERP sample files.
* Runtime-supported BA domains remain explicit:
  * operations
  * revenue
  * inventory
  * customer
  * performance
  * finance
* Guidance-only domains must not be treated as fully supported BA domains until they have dictionary entries, playbooks, tests, and executable actions.
* The product guarantee is not "perfectly understand arbitrary data"; the guarantee is "do not silently hide populated business-like fields."

Canonical docs:

* `docs/architecture/ADR-120-context-aware-semantic-dictionary.md`
* `docs/progress/phase-29-context-aware-semantic-dictionary.md`

Implementation checkpoint 2026-07-04:

* Added `context-semantic-dictionary.ts` as the first semantic dictionary/evidence layer.
* Added value-based inference for payment method, delivery status, and carrier/provider signals.
* Expanded `CONTEXT_SEMANTIC_DICTIONARY_V1` across all six runtime-supported BA domains: operations, revenue, inventory, customer, performance, and finance.
* Dictionary entries now include route, shipment, delivery fee, revenue, net revenue, invoice total, receivable, branch, salesperson, gross profit, profit, margin, total cost, customer, segment, retention/churn, sku, product, stock quantity, inventory, warehouse, stock status, target, actual, achievement, department, KPI, and time period.
* Generic headers such as `Type`, `Mode`, and `Provider` can now be mapped from values when values are clear.
* Imperfect headers with inventory-status and performance-achievement values are now covered by regression tests.
* Header/value disagreement is surfaced as partial/conflicting semantic coverage instead of being silently trusted.
* Guardrails:
  * shape evidence cannot create a signal by itself;
  * generic `internal` / `external` is not enough to infer carrier;
  * `shipper` / `courier` must not cause driver/person fields to bleed into carrier without stronger provider evidence.
* Verification passed:
  * `pnpm --dir apps/desktop exec vitest run src/lib/context-semantic-dictionary.test.ts src/lib/business-signal-detector.test.ts src/lib/semantic-coverage.test.ts --reporter=dot` -> 34 tests.
  * `pnpm --dir apps/desktop exec vitest run src/lib/context-semantic-dictionary.test.ts src/lib/business-fusion-overview.test.ts src/lib/business-brain-brief.test.ts src/lib/understanding-core/understanding-core.test.ts src/lib/understanding-core/next-adapter.test.ts src/lib/understanding-next/understanding-next.test.ts src/lib/semantic-coverage.test.ts --reporter=dot` -> 110 tests.
  * `pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json` -> pass.

Implementation checkpoint 2026-07-03:

* `BusinessBrainBrief` now has a selected-angle KPI slice for payment/logistics/product charts instead of relying only on cross-domain overview metrics.
* Payment charts can surface payment mix, receivable exposure, and profit/margin signals when those fields are present.
* Logistics charts can surface delivery fee, fulfilled rate, and internal/external carrier share from generic carrier/status/fee fields.
* Missing-evidence checks must inspect action fields, chart fields, and overview fields before claiming a profit, receivable, or delivery-fee gap.
* Root-cause ranking for payment/logistics/product must lead with the selected chart driver; overview drivers are supporting context, not the primary answer.

Implementation checkpoint 2026-07-04:

* Continue Business Brain phases by strengthening the existing selected-angle flow, not replacing stable Simple/Advanced session behavior.
* `BusinessBrainBrief` now computes canonical chart KPI formulas with source columns for revenue, net revenue, invoice total, gross profit, margin, quantity, delivery fee, AR, payment mix, deferred payment share, delivery fee/revenue, and delivery fee/profit.
* Header matching must handle camelCase/PascalCase generically, for example `NetRevenue`, `GrossProfit`, `DeliveryFee`, and `AR_Debit`.
* Chart-level variance now compares previous/current period-like rows and exposes delta/delta percent.
* KPI-backed risks now cover low margin, high AR, high deferred payment share, delivery fee pressure, outsourced carrier dependency, and low fulfilled delivery rate.
* Deep BA UI separates KPI, Variance, Root Cause, Risks, Recommendations, and Missing Evidence.

Implementation checkpoint 2026-07-04 follow-up:

* Root-cause engine now creates adaptive drill-down findings from available chart fields: product, category, store, salesperson, payment, carrier, and delivery status.
* Drill priority must remain selected-angle aware and generic: logistics leads with carrier/status, payment leads with payment, product leads with product/category, profitability leads with product/category/store/payment/logistics.
* Recommendations now include `do_now` only when missing evidence and high-risk blockers are absent.
* Deep BA KPI/Variance UI now shows formula and source columns for auditability.

Implementation checkpoint 2026-07-04 next step:

* `BusinessBrainBrief` now includes `nextQuestions`, and Deep BA renders them as visible follow-up BA questions.
* Variance engine now supports plan/budget/target fields when selected chart evidence has actual-vs-plan columns.
* Deeper scenario and what-if baselines beyond selected chart rows remain future enhancement, not a BB-3 V1 blocker.

Implementation checkpoint 2026-07-04 risk expansion:

* Risk Engine now combines selected chart KPI/variance evidence with multi-file fusion overview context.
* Covered V1 risks now include concentration, revenue/reconciliation gaps, cost/delivery-fee spike, weak key coverage, missing shared keys, relationship/many-to-many warnings, low margin, AR/deferred payment, outsourced carrier dependency, and fulfilled-rate risk.

Implementation checkpoint 2026-07-04 Business Brain V1 completion:

* Phase 28 BB-0 through BB-9 are V1 complete.
* `BusinessBrainBrief` now carries an explicit `evidence` audit trail covering KPI, variance, root cause, risk, and missing evidence.
* Deep BA panel renders Evidence audit trail in addition to KPI, Variance, Root Cause, Risks, Recommendations, Next Questions, and Missing Evidence.
* Regression now reads the six ERP sample files directly and proves LightBI can surface Payment mix/AR/profit, Carrier internal-vs-external share/delivery fee, and DeliveryStatus fulfilled-rate evidence.
* Verification passed:
  * `pnpm --dir apps/desktop exec vitest run src/lib/business-brain-brief.test.ts --reporter=dot` -> 12 tests.
  * `pnpm --dir apps/desktop exec vitest run src/lib/business-brain-brief.test.ts src/lib/business-fusion-overview.test.ts src/lib/understanding-next/understanding-next.test.ts src/lib/understanding-core/understanding-core.test.ts src/lib/semantic-coverage.test.ts src/lib/ai-briefing-generator.test.ts src/lib/ba-decision-engine.test.ts --reporter=dot` -> 118 tests.
  * `pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json` -> pass.

Implementation checkpoint 2026-07-04 UI action visibility fix:

* Business Brain engine support alone was not enough: Payment/Delivery reports did not show in Simple Mode after 6-file fusion because the fusion virtual dataset dropped `payment`, `carrier`, `invoice_total`, and `ar_debit`, and Home uses `understanding-core` actions.
* Fusion virtual dataset now preserves Payment, Carrier, Delivery Status, Invoice Total, and AR evidence.
* `understanding-core` now emits executable Simple actions for:
  * `Payment profitability and receivable mix`;
  * `Carrier cost impact`;
  * `Delivery completion mix`.
* Six-file fusion regression now asserts those labels are present in `availableActions`, so UI visibility is covered, not only downstream BA report generation.
* Verification passed:
  * `pnpm --dir apps/desktop exec vitest run src/lib/business-fusion-overview.test.ts --reporter=dot`
  * `pnpm --dir apps/desktop exec vitest run src/lib/business-fusion-overview.test.ts src/lib/business-brain-brief.test.ts src/lib/understanding-core/understanding-core.test.ts src/lib/understanding-core/next-adapter.test.ts src/lib/understanding-next/understanding-next.test.ts --reporter=dot` -> 103 tests.
  * `pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json`

## 2026-06-28 Product Boundary Update

Accepted product identity:

```text
Raw Data
→ Import
→ Understand
→ Clean / Standardize as non-destructive overlay
→ Trust Score
→ Dashboard / KPI / Insight
→ AI Report, optional
```

LightBI is a **Business Understanding Engine**.

Clarifications:

* Simple Mode is the BA / decision workspace and the product differentiator.
* Advanced Mode should still compete with TablePro-level data workspace capability.
* The competitive position is **TablePro-level Advanced workspace + Simple Mode Business Understanding Engine**.
* AI is optional and must only read LightBI-generated artifacts such as understanding, trust, chart/KPI summaries, insights, caveats, and dashboard state.
* AI must not own raw data profiling, KPI computation, trust scoring, query execution, cleaning, or source mutation.
* Clean / Standardize means reversible overlays, aliases, inferred types, normalized runtime views, presentation formatting, or reviewable export/import artifacts. It must not silently mutate original files, sheets, or databases.
* Provider expansion remains plugin-first.

Canonical docs:

* `docs/architecture/ADR-117-business-understanding-engine-product-boundary.md`
* `docs/product/product-direction-and-pricing-v1.md`

## 2026-06-28 Plugin SDK Phase

`@lightbi/plugin-sdk` is now a richer TypeScript contract for provider plugins, but it is still interface/manual phase, not a dynamic marketplace runtime.

Current SDK docs:

* `packages/plugin-sdk/src/index.ts`
* `packages/plugin-sdk/README.md`
* `docs/plugin-sdk/provider-plugin-manual.md`
* `docs/architecture/ADR-116-plugin-first-system-expansion.md`

Important SDK rules:

* New enterprise systems should be plugin-first, not patched into core.
* A provider must not appear in Simple or Advanced UI until it can connect, discover schema, run bounded read-only queries, return typed rows, and normalize errors.
* SQL Server should be the first real provider plugin once the backend plugin host/registry exists.
* `LightBIPluginRegistry` now exists for trusted built-in/first-party plugin objects. It is not a dynamic marketplace loader. SQL Server currently has an example manifest skeleton only.
* Rust backend now has `apps/server/src/plugin_host.rs` as a manifest/exposure-gate bridge. Public provider route: `GET /api/plugins/providers`. Diagnostics route: `GET /api/plugins/providers/diagnostics`.
* Advanced provider dropdown now loads `GET /api/plugins/providers` and falls back to the five built-in providers if the backend registry is unavailable.

## 0. Operating Workflow

This project uses a multi-agent handoff workflow:

```text
ChatGPT/Codex memory -> PROJECT_MEMORY.md
Codex issues instructions -> AGENT_INBOX.md
Gemini in Antigravity reads AGENT_INBOX.md
Gemini implements code -> AGENT_OUTBOX.md
Codex reads AGENT_OUTBOX.md, reviews, and issues next instruction
```

Rules:

* `PROJECT_MEMORY.md` is the source of project context.
* `AGENT_INBOX.md` contains the next actionable instruction.
* `AGENT_OUTBOX.md` contains implementation result, logs, tests, and notes.
* Every phase must update walkthrough/changelog/progress docs.
* Do not let agents “fix forward” blindly.
* Prefer: audit → decision → implementation → verification → commit.
* If a phase touches large UX/runtime boundaries, checkpoint commit first.
* Never claim runtime success without logs, response bodies, source badge, or test evidence.

---

# 1. Product Identity

LightBI is a **Business Understanding Layer**, not a classic dashboard builder.

Core identity:

```text
Raw Data
→ LightBI Understands
→ Analysis Opportunity
→ Investigation
→ Answer
```

LightBI should not behave like:

```text
Raw Data
→ Configure Perspective
→ Configure Business View
→ Configure Question
→ Configure Dashboard
```

Primary value:

* Understand messy SME data.
* Explain what the data appears to contain.
* Show what can be analyzed now.
* Show what additional analysis may become possible later.
* Let user click directly into investigation.
* Serve as a semantic bridge between raw data and downstream clean data / BI / analyst workflows.
* Decompose raw input through multiple layers of understanding and reveal the most relevant analytical angles based on user context.

Old BI mindset to avoid:

* forcing dashboards first
* forcing questions first
* forcing business views first
* exposing SQL/plans/debug info to normal users
* making “0 questions” feel like failure

---

# 2. Product Philosophy

## 2.0 Product Modes

LightBI has two intentional product modes:

### Standard Mode

Audience:

* domain users
* SMEs
* non-technical operators
* decision makers working inside covered business domains

Primary job:

* visually explain what the dataset contains
* answer the user's business intent within supported domains
* help the user understand whether the data is reliable enough to act on
* turn raw data into decision-support, not just charts
* guide non-technical users step by step from raw data to useful visualization and decision support

Standard mode must output:

* What LightBI Found
* analysis opportunities
* visual explanation
* answer / preview
* decision readiness guidance
* contextual question suggestions that help the user move forward step by step

Decision readiness guidance is required.

Example heuristic:

* `>= 90%` clean / trustworthy → acceptable as decision-support with evidence
* `85% - 89%` → useful as reference, but LightBI should explicitly advise caution
* `< 85%` → exploratory only, not recommended as a decision basis

This readiness layer is part of product value, not decorative scoring.

Standard mode interpretation rule:

* LightBI should not treat the dataset in isolation only
* LightBI should interpret the data through multiple layers:
  * what is structurally inside the data
  * what business concepts exist
  * what domain the data most likely belongs to
  * what the user is trying to achieve
  * who the user likely is in that context
* from that layered understanding, LightBI should propose the next best questions, views, and steps until the data becomes understandable and visualized

This is a major product differentiator versus classic BI:

* classic BI expects the user to already know what to ask and how to model
* LightBI should progressively guide the user from raw data -> understanding -> question refinement -> visualization -> decision readiness

### Advanced Mode

Audience:

* Data Analysts
* technical operators
* users preparing raw data for further modeling or BI

Primary job:

* accelerate raw-data standardization
* classify columns faster than hand-written Python cleanup scripts
* infer semantic roles and candidate grain
* surface data quality issues
* prepare a cleaner semantic handoff for downstream systems

Advanced mode must help users:

* map raw columns to canonical business concepts
* identify dimensions / measures / time / status fields
* detect likely entities and workflow shape
* produce a clean-data handoff artifact

Important:

* LightBI is not only an end-user BI surface
* LightBI may be used purely as a semantic cleaning / preparation layer before another BI tool

Target modern stack shape:

```text
Multi Raw Data
→ LightBI
→ Clean / Prepared Data
→ Human Reading / BI / Downstream Analytics
```

### AI Mode

Audience:

* AI assistants
* local copilots
* agentic workflows operating on user-owned data

Primary job:

* help AI read the key structure and semantics of raw data quickly before executing user requests
* reduce blind command execution against unknown datasets
* provide a local-first understanding layer between user intent and AI action
* let AI consume dataset meaning, readiness, and caveats before analysis or transformation

AI mode is a support layer, not the primary product identity.

AI mode must provide:

* key columns and likely semantic roles
* candidate dataset grain
* canonical business concepts detected
* quality / trust readiness signals
* important caveats before execution
* lightweight clean-data handoff context when available

Local-first rule:

* LightBI should prefer understanding and processing data locally whenever feasible
* AI should not need to send raw data away just to understand basic structure, semantics, or readiness
* LightBI should act as a local semantic briefing layer before AI executes user commands

Target AI-assisted flow:

```text
Raw Data
→ LightBI local understanding
→ AI reads semantic keys / readiness / caveats
→ AI executes user intent more safely and faster
```

## 2.0.1 Trust & Mapping Review

LightBI includes a core intake layer called **Trust & Mapping Review**.

Purpose:

* evaluate raw data quality and recognizability before deeper analysis
* detect recognized keys, ambiguous keys, unrecognized keys, and conflicting keys
* propose safe, reversible mapping or merge suggestions without modifying the original raw file
* raise data cleanliness, domain confidence, readiness, and analysis opportunity quality through a controlled review step

This capability is not optional decoration.

It is one of the main reasons LightBI exists:

* for Standard mode, it helps normal users understand whether the uploaded data is trustworthy enough to use
* for Advanced mode, it acts as a lightweight semantic cleaning and reconciliation layer so DAs do not need to jump straight to Python for initial normalization
* for AI mode, it provides a deterministic review layer before AI executes commands against partially understood raw data

Non-destructive rule:

* LightBI must never silently rewrite or mutate the user's original raw files
* all merge / map / ignore decisions must live in a temporary overlay, session mapping, or review artifact above the source data

Truthfulness rule:

* if a key is not recognized, LightBI must say it is not recognized
* if a key is only a candidate match, LightBI must expose confidence and rationale
* if the data is partially understood, LightBI must report that explicitly instead of pretending the dataset is clean

User-facing review output should be able to say things like:

* how many files were read
* what percent of keys were recognized
* what percent are ambiguous
* what percent remain unrecognized
* which candidate merges or canonical mappings could improve readiness if accepted

The user must be able to choose options such as:

* map a raw key to a canonical concept temporarily
* merge two likely-equivalent keys into one semantic interpretation
* ignore a mismatch for now
* keep the raw key unchanged and continue in exploratory mode

After review choices are applied, LightBI may recompute:

* cleanliness / trust score
* domain confidence
* readiness tier
* available analysis opportunities
* downstream runtime confidence

Architectural position:

```text
Multi Raw Data
→ Trust & Mapping Review
→ LightBI Understanding Core
→ Readiness / Opportunities / Investigation
→ Human / DA / AI / downstream BI
```

Product framing:

* LightBI is not just a BI surface
* LightBI should become a safe semantic filter between messy raw data and downstream analytics
* even when users only need raw-data cleaning / reconciliation rather than dashboards, that is still valid product value

## 2.1 Understand before analyze

LightBI must first answer:

```text
What is inside this data?
What business concepts did LightBI detect?
What can the user analyze immediately?
```

Then the user may investigate.

## 2.2 Questions are optional

Questions are not the product success metric.

Old failed assumption:

```text
0 Questions = 0 Understanding
```

New rule:

```text
Dataset can be successfully understood even with:
Views = 0
Questions = 0
```

## 2.3 Business Views are optional advanced layer

BVQ pipeline remains useful, but it must never be the primary path.

Old BVQ:

```text
Signals → Perspectives → Business Views → Questions
```

New DU flow:

```text
Signals → Dataset Understanding → Analysis Opportunities → Investigation
```

BVQ may remain as optional advanced/developer/semantic layer.

Important distinction:

* Understanding != only signal detection
* Understanding must produce readiness guidance for Standard mode
* Understanding must produce clean-data handoff artifacts for Advanced mode
* Understanding should produce a local semantic briefing layer for AI mode before command execution

## 2.4 Positive-first UX

Home must not focus on:

* Missing
* Locked
* Unavailable
* Insufficient
* Confidence %
* Partial Understanding

Home should focus on:

* What LightBI found
* What can be analyzed now
* One-click investigation

---

# 3. Current Stable UX Flow

Final frozen Home flow:

```text
Connected Data
↓
Data Quality
↓
What LightBI Found
↓
Analysis Opportunities
```

Removed from Home:

* Explore / Investigate / Ask tabs
* Perspective selector
* Business View selector
* Advanced guided views unavailable
* Missing required signals block
* Ask chat
* Confidence %
* Partial Understanding wording
* BVQ remnants

Investigation flow:

```text
Analysis Opportunity
↓
Investigation Workspace
↓
Run Preview
↓
Chart
```

Developer diagnostics are hidden/collapsed by default.

---

# 4. Architecture Stack

## 4.1 Frontend

Path:

```text
apps/desktop
```

Tech:

* React
* Vite
* Tailwind
* ECharts
* TypeScript

Important pages:

* `apps/desktop/src/pages/Home.tsx`
* `apps/desktop/src/pages/Investigation.tsx`

Important UI components:

* `DatasetUnderstandingCard.tsx`
* `AnalysisOpportunityCard.tsx`
* `AnalysisOpportunityGrid.tsx`
* `ChartPreviewRenderer.tsx`

## 4.2 Rust Backend

Path:

```text
apps/server
```

Server:

* Axum
* DuckDB via `lightbi-duckdb`

Important file:

```text
apps/server/src/main.rs
```

Important endpoint:

```text
POST /api/project/import-csv
POST /api/preview/execute
```

## 4.3 DuckDB crate

Path:

```text
crates/lightbi-duckdb
```

Important file:

```text
crates/lightbi-duckdb/src/backend.rs
```

Bug fixed:

* DuckDB statement panic: `The statement was not executed yet`
* Cause: calling `stmt.column_count()` / `stmt.column_names()` before `stmt.query([])` for `read_csv_auto`.
* Fix: execute query first, then inspect schema/rows.

---

# 5. Key Files and Contracts

## 5.1 Business Signal Detector

File:

```text
apps/desktop/src/lib/business-signal-detector.ts
```

Purpose:

* Convert physical dataset columns into canonical business signals.

Examples:

```text
"Tuyến xe" → route
"Tài xế" → driver
"Mã tài kiện" → shipment
"Tuổi tồn kho" → stock_age
"Mã SKU" → sku
"Trạng thái" → status / stock_status / delivery_status depending context
```

Important concept:

* Canonical ID is not always physical column name.
* Physical column resolution must happen before backend execution.

## 5.2 Dataset Understanding Contract

File:

```text
apps/desktop/src/lib/dataset-understanding-contract.ts
```

Purpose:

* Primary product output after signal detection.

Contains:

* status
* summary
* detected concepts
* inferred entities
* workflow hints
* relationship hints
* available analysis
* unavailable analysis
* narrative
* source trace

Important:

* It lives in `apps/desktop/src/lib` for now, not `@lightbi/core-types`.
* It is derived state, not embedded into Dataset model yet.

## 5.3 Analysis Opportunity Actions

File:

```text
apps/desktop/src/lib/analysis-opportunity-actions.ts
```

Purpose:

* Convert `availableAnalysis` into clickable `AnalysisAction`.

Important rule:

* No label parsing.
* No `label.includes("trend")`.
* No `basedOnSignals[0]` guessing.
* Must consume explicit metadata:

  * `actionType`
  * `dimensions`
  * `measures`

## 5.4 Runtime Intent

File:

```text
apps/desktop/src/lib/analysis-runtime-contract.ts
```

Purpose:

* Validate action before runtime.

RuntimeIntent types:

```text
group_by
trend
distribution
relationship
```

Expected shapes:

```text
group_by → bar_chart
trend → line_chart
distribution → bar_chart
relationship → scatter_plot
```

## 5.5 Runtime Plan Preview

File:

```text
apps/desktop/src/lib/runtime-planner-preview.ts
```

Purpose:

* Logical execution plan before SQL or runtime.

Operations:

```text
scan
group_by
trend
distribution
relationship
limit
```

Important:

* RuntimePlan is the execution source of truth.
* SQL is not source of truth.

## 5.6 Safe SQL Preview

File:

```text
apps/desktop/src/lib/safe-sql-preview.ts
```

Purpose:

* Diagnostic/explainability only.

Important:

* Never execute SafeSqlPreview SQL.
* Never parse SafeSqlPreview SQL for execution.
* Backend must not accept frontend SQL as source of truth.

## 5.7 JS DuckDB Preview Sandbox

File:

```text
apps/desktop/src/lib/duckdb-preview-sandbox.ts
```

Purpose:

* JS fallback executor when backend fails/unavailable.

Important:

* It consumes `RuntimePlanPreview.logicalOperations`.
* It ignores SQL.
* It must match backend aggregation semantics.
* Limit must apply after aggregation, not before.
* P0 bug fixed: JS sandbox used to limit raw rows before group_by, causing undercount.
* Now aggregation happens over all provided rows first, then limit applies.

Sources:

```text
duckdb_preview_sandbox
backend_duckdb_preview
js_sandbox_fallback
```

## 5.8 Backend Preview Executor

File:

```text
apps/desktop/src/lib/backend-preview-executor.ts
```

Purpose:

* Frontend adapter for:

```text
POST /api/preview/execute
```

Rules:

* Sends `RuntimePlanPreview`.
* Does not send SafeSqlPreview SQL.
* Does not send arbitrary SQL.
* Does not send frontend rows when backend path is used.
* Falls back to JS sandbox if backend fails or is blocked.

## 5.9 Chart Preview Model

File:

```text
apps/desktop/src/lib/chart-preview-model.ts
```

Purpose:

* Convert preview result into chart model.

Consumes:

* `DuckDBPreviewResult`
* `RuntimePlanPreview.expectedOutput`

Must not:

* execute
* parse SQL
* infer from labels

## 5.10 Chart Preview Renderer

File:

```text
apps/desktop/src/components/analysis/ChartPreviewRenderer.tsx
```

Purpose:

* Render bar/line/scatter/table from `ChartPreviewModel`.

Uses:

* ECharts already present in package.

---

# 6. Important Product Milestones

## 6.1 BVQ Reset

BVQ became too strict:

* 0 Business Views
* 0 Questions
* Blank user experience

Root failure:

* Questions were gated behind complete Business Views.
* SME data is often sparse.
* Strictness killed graceful degradation.

Decision:

* Keep BVQ as advanced safe layer.
* Make Dataset Understanding first-class.
* Questions optional.

Docs:

* `BVQ-RESET.md`
* `BVQ-RESET-DECISION.md`
* `ADR-097-dataset-understanding-before-questions.md`
* `dataset-understanding-layer.md`

## 6.2 DU-1 Dataset Understanding Contract

Created:

* `dataset-understanding-contract.ts`
* tests
* `ADR-098`

## 6.3 DU-2 Dataset Understanding Card

Created:

* `DatasetUnderstandingCard.tsx`

Initial purpose:

* Avoid “0 Questions = failure”.

## 6.4 DU-3 Home Layout Repositioning

Reframed BVQ as optional.
Later superseded by Home freeze.

## 6.5 DU-4 Analysis Opportunity Actions

Created:

* `analysis-opportunity-actions.ts`
* `AnalysisOpportunityCard.tsx`
* `AnalysisOpportunityGrid.tsx`

Flow:

```text
Available Analysis → clickable action
```

## 6.6 DU-5A Runtime Intent

Created:

* `analysis-runtime-contract.ts`

## 6.7 DU-5B Runtime Plan Preview

Created:

* `runtime-planner-preview.ts`

## 6.8 DU-5C Safe SQL Preview

Created:

* `safe-sql-preview.ts`

Important:

* SQL preview is diagnostic only.

## 6.9 DU-5D DuckDB Preview Sandbox

Created:

* `duckdb-preview-sandbox.ts`

Initially mock JS executor.
Later fixed for aggregation parity.

## 6.10 DU-5E Chart Preview Renderer

Created:

* `chart-preview-model.ts`
* `ChartPreviewRenderer.tsx`

## 6.11 DU-5F Dataset Rows Wiring

Created/modified:

* `investigation-session.ts`
* session rows support
* row cap at 1000

## 6.12 DU-6A Data Intake Preview Rows Retention

Created:

* `data-intake-preview-rows.ts`

Modified:

* `local-file-inspector.ts`
* `Home.tsx`

Purpose:

* Keep up to 1000 preview rows in currentDataset.

## 6.13 DU-6B Real File Preview Validation

Validated:

* Delivery file
* Inventory file
* JS sandbox chart rendering

## 6.14 UX-6 Home Freeze

Removed BVQ remnants from Home:

* tabs
* perspectives
* questions panel
* advanced views
* negative states
* confidence

Verified by Playwright:

* Delivery works
* Inventory works
* Home is frozen as Understanding-First entry point

## 6.15 DU-7B Axum Preview Execution Endpoint

Added:

```text
POST /api/preview/execute
```

Backend compiles SQL from RuntimePlan logical operations.

Critical rule:

* Backend does not execute frontend SQL.

## 6.16 DU-7C Frontend Backend Preview Adapter

Frontend now prefers backend DuckDB preview.
Falls back to JS sandbox.

## 6.17 DU-7D Execution Integrity Audit

Found:

* P1: backend `current_source` global mutex multi-user risk
* P0: JS sandbox limit before aggregation

## 6.18 DU-7E Execution Integrity Fix

Fixed:

* JS sandbox now aggregates first, applies limit after.
* Sorts aggregated rows deterministically before limit.

## 6.19 DU-7F Backend DuckDB Failure Audit

Found:

* DuckDB panic `The statement was not executed yet`
* Cause: inspecting columns before query on `read_csv_auto`

## 6.20 DU-7G DuckDB Statement Execution Order Fix

Fixed backend panic by executing query before column metadata extraction.

## 6.21 DU-7H Dataset Source Registration

Current state:

* Code exists or is claimed to exist.
* Not fully runtime-verified.
* Audit verdict: `B. Implemented but not verified`.

## 6.22 DU-7I Column Resolution Audit

Verdict:

* Logical IDs are resolved to physical columns correctly according to source audit.

Important:

* Resolution happens in frontend before backend request.
* Backend receives physical column names.
* Backend does not know canonical business IDs.

Example:

```text
route → "Tuyến xe"
stock_age → "Tuổi tồn kho"
```

Still needed:

* runtime proof that backend executes physical columns successfully.

---

# 7. Current Truth State

The trustworthy current state is:

```text
Understanding-first product loop works via JS sandbox fallback.
Backend DuckDB endpoint exists.
Backend DuckDB panic is fixed.
Column resolution appears correct by code audit.
Backend real execution with user-uploaded files is NOT fully proven yet.
```

Do not claim:

```text
Real CSV → Real DuckDB → Real Chart
```

until DU-7J proves it with runtime evidence.

Current verified:

```text
Real CSV → Frontend previewRows → JS Sandbox → Chart
```

Partially verified:

```text
Real CSV → Backend current_source → DuckDB
```

Not yet fully proven:

```text
Real uploaded CSV → backend_duckdb_preview → Chart
```

---

# 8. Next Required Phase

## DU-7J Backend DuckDB Real Source Proof

Goal:

* Runtime proof only.
* No code edits.
* No docs edits unless proof complete.
* Need actual backend success evidence.

Required final table:

```text
| Dataset | import-csv | preview status | row_count | final source | fallback used |
```

Accepted result:

```text
Delivery final source = backend_duckdb_preview
Inventory final source = backend_duckdb_preview
```

If backend still fails:

* return exact backend response
* return failing SQL
* do not auto-fix

Final verdict must be:

```text
A. Backend DuckDB fully verified with real uploaded files.
B. Backend still fails and fallback hides it.
C. Evidence insufficient.
```

---

# 9. Known Risks

## 9.1 P1 Backend current_source global

Backend currently uses global `current_source`.

Risk:

* multi-user or multi-dataset collision

Example:

```text
User A uploads inventory
User B uploads sales
User A executes
→ may run sales
```

Mitigation future:

* sourceId / datasetId / projectId scoped execution
* no global current_source for production

## 9.2 Frontend column resolution only

Backend receives physical columns.
Backend does not resolve canonical signals.

Risk:

* if frontend fails to map physical columns correctly, backend cannot recover.
* future architecture may require explicit column mapping object in request.

## 9.3 JS sandbox fallback still useful but must be labeled

If backend fails:

* fallback is good for UX
* but execution source must clearly show `js_sandbox_fallback`

Do not hide backend failure.

## 9.4 DuckDB backend must prove success

No DU-8 feature work until backend success is proven.

---

# 10. Testing Commands

Common frontend tests:

```bash
cd apps/desktop
pnpm test -- duckdb-preview-sandbox.test.ts backend-preview-executor.test.ts chart-preview-model.test.ts investigation-session.test.ts
npx tsc --noEmit
```

Playwright:

```bash
npx playwright test verify.spec.ts
```

Backend:

```bash
cargo test --manifest-path apps/server/Cargo.toml
cargo test --manifest-path crates/lightbi-duckdb/Cargo.toml
```

---

# 11. Commit / Checkpoint Rules

Before risky phases:

```bash
git status
git add ...
git commit -m "checkpoint: ..."
```

Important checkpoints already made:

* understanding-first pipeline checkpoint
* Home freeze verification
* Axum preview endpoint
* backend preview adapter
* JS sandbox parity fix
* backend failure audits

Always checkpoint before:

* modifying Home
* modifying runtime backend
* modifying data intake
* removing old UI sections
* changing column resolution

---

# 12. Agent Rules

## 12.1 Gemini must not

* claim success without runtime logs
* update docs instead of code and call it done
* infer “works by design”
* repeat earlier audit instead of requested proof
* parse SQL string for execution
* execute frontend SafeSqlPreview SQL
* reintroduce BVQ into Home
* generate fake rows
* hide fallback source
* treat fallback success as backend success

## 12.2 Gemini must

* show exact files changed
* show exact commands run
* show failing layer if failed
* distinguish:

  * implemented
  * verified
  * inferred
  * not proven
* keep Developer Diagnostics hidden by default
* preserve JS fallback
* use RuntimePlan as source of truth
* keep SQL preview diagnostic-only

---

# 13. Current Next Instruction Template

Use this if continuing from here:

```text
# DU-7J Backend DuckDB Real Source Proof

Do NOT modify code.
Do NOT update docs unless proof is complete.
Runtime proof only.

Start backend.
Start frontend.
Run Playwright verify.spec.ts.

Capture:
- POST /api/project/import-csv response
- POST /api/preview/execute request payload
- POST /api/preview/execute response body
- final execution source badge/log
- whether js_sandbox_fallback appeared

Report:

| Dataset | import-csv | preview status | row_count | final source | fallback used |

Expected:
Delivery: backend_duckdb_preview
Inventory: backend_duckdb_preview

If backend fails:
Return exact response and failing SQL.
Do not fix automatically.

Final verdict:
A. Backend DuckDB fully verified with real uploaded files.
B. Backend still fails and fallback hides it.
C. Evidence insufficient.
```

---

# 14. 2026-07-03 Business Brain Semantic Coverage Implementation

Root cause for the current "blindness" issue is in the data-understanding / semantic-coverage layer:

```text
populated business column
-> not mapped to current canonical taxonomy/playbook
-> dropped from downstream AI/BA artifacts
-> Simple Mode and AI Mode answer as if the evidence does not exist
```

Implemented first guardrail:

* Added semantic coverage classification:
  * `recognized`
  * `partial`
  * `unknown_business_like`
  * `technical_or_noise`
* Added coverage report to business signal detector and dataset understanding.
* Unknown business-like fields now:
  * downgrade understanding to `partial` when needed;
  * cap readiness;
  * add caveats;
  * flow into `AISafeBriefing`;
  * surface as a BA `field_gap` insight.
* Do not hardcode the fix to payment, vehicle type, sample file names, month labels, or any one dataset. The system must classify all user-input fields generically before selected-angle analysis.

Verified:

```text
pnpm --dir apps/desktop exec vitest run src/lib/semantic-coverage.test.ts src/lib/ai-briefing-generator.test.ts src/lib/ba-decision-engine.test.ts src/lib/business-brain-brief.test.ts --reporter=dot
pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json
```

Follow-up implementation in the same direction:

* Extended generic ERP recognition in `understanding-next`:
  * payment method;
  * invoice total;
  * receivable / AR debit;
  * gross profit;
  * margin percent;
  * total cost / COGS;
  * carrier / logistics provider;
  * delivery fee;
  * delivery status;
  * order and shipment keys.
* Added executable Simple Mode questions/lenses:
  * `Payment profitability and receivable mix`;
  * `Carrier cost impact`;
  * `Delivery completion mix`.
* Guardrail tests use synthetic clean ERP-like structures, not sample file names, so the behavior generalizes beyond the six demo files.

Verified:

```text
pnpm --dir apps/desktop exec vitest run src/lib/understanding-next/understanding-next.test.ts src/lib/understanding-core/understanding-core.test.ts src/lib/semantic-coverage.test.ts src/lib/ai-briefing-generator.test.ts src/lib/ba-decision-engine.test.ts src/lib/business-brain-brief.test.ts --reporter=dot
pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json
```

---

# 15. 2026-07-04 Context-Aware Semantic Dictionary V1

Phase 29 root-cause fix for "data is present but LightBI is blind" now has a testable V1:

* Added a domain-wide semantic dictionary for the six runtime BA domains:
  * operations;
  * revenue;
  * inventory;
  * customer;
  * performance;
  * finance.
* Detector evidence now supports:
  * header;
  * value;
  * shape;
  * neighbor columns;
  * cross-file context.
* Guardrails:
  * shape evidence alone cannot create a business signal;
  * cross-file context cannot create a mapping by itself;
  * generic `Internal` / `External` values remain unknown unless stronger domain evidence exists;
  * header/value contradiction is partial/conflicting, not silently trusted;
  * dictionary canonical IDs are regression-checked against the runtime taxonomy.
* Important product interpretation:
  * this reduces semantic blindness before BA/AI narrative;
  * it does not claim 100% arbitrary-enterprise-file understanding;
  * populated business-like unknowns must remain visible as gaps/caveats.

Verified:

```text
pnpm --dir apps/desktop exec vitest run src/lib/context-semantic-dictionary.test.ts src/lib/business-signal-detector.test.ts src/lib/semantic-coverage.test.ts --reporter=dot
pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json
```

---

# 16. 2026-07-04 Semantic Registry Unification Safepoint

Phase 30 created a source-of-truth bridge for scattered semantic architecture:

* Added `apps/desktop/src/lib/semantic-registry.ts`.
* `business-signal-detector.ts` now gets `TAXONOMY` from `SEMANTIC_TAXONOMY_V1`.
* `context-semantic-dictionary.ts` now gets `CONTEXT_SEMANTIC_DICTIONARY_V1` from `SEMANTIC_CONTEXT_DICTIONARY_V1`.
* Added drift guard tests:
  * detector taxonomy must come from the registry;
  * context dictionary must come from the registry;
  * supported runtime BA domains remain explicit;
  * every signal referenced by domain BA playbooks and domain knowledge catalog must exist in the registry.
* Added partial registry entries for playbook-only / derived signals so BA playbooks no longer name concepts absent from runtime semantics.
* Generic high-risk aliases such as `category` and `group` were kept out of exact alias matching unless value/context evidence exists.

Verification:

```text
pnpm --dir apps/desktop exec vitest run src/lib/semantic-registry.test.ts src/lib/domain-ba-playbooks.test.ts src/lib/domain-knowledge-catalog.test.ts src/lib/context-semantic-dictionary.test.ts src/lib/business-signal-detector.test.ts --reporter=dot
pnpm --dir apps/desktop exec vitest run src/lib/semantic-registry.test.ts src/lib/context-semantic-dictionary.test.ts src/lib/business-fusion-overview.test.ts src/lib/business-brain-brief.test.ts src/lib/understanding-core/understanding-core.test.ts src/lib/understanding-core/next-adapter.test.ts src/lib/understanding-next/understanding-next.test.ts src/lib/semantic-coverage.test.ts src/lib/domain-ba-playbooks.test.ts src/lib/domain-knowledge-catalog.test.ts --reporter=dot
pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json
```

Cleanup completed:

* Removed the old copied taxonomy and context dictionary migration references after the registry bridge tests stayed green.

Remaining architecture boundary:

* `understanding-core/ontology.ts` remains a broader universal ontology adapter, not the runtime BA source of truth.

---

# 17. 2026-07-10 Semantic Dictionary Expansion + Domain Affinity Safepoint

Continuation of Phase 30 to reduce semantic blindness beyond clean ERP sample files.

Implemented:

* Expanded `semantic-registry.ts` with broader partial/runtime-safe signals across:
  * Salesforce/CRM style sales and service exports;
  * SAP/Dynamics/NetSuite-like sales, billing, material, plant, storage, and fulfillment exports;
  * POS/cashier settlement;
  * bank statement and reconciliation;
  * marketing ads and web analytics;
  * procurement/RFQ/purchase requests;
  * HR payroll, attendance, leave, and employee master;
  * maintenance/assets/IoT measurements;
  * survey, education, and healthcare-like operational exports.
* Improved `context-semantic-dictionary.ts`:
  * compact/camel-like header matching for headers such as `SalesOrderNo`, `TripID`, `AccountId`, `FulfillmentStatus`;
  * identifier string shape support;
  * neighbor/cross-file evidence groups for the new external-data families.
* Added `understanding-next/semantic-domain-affinity.ts`.
  * Builds a lightweight semantic affinity vector from detected signals.
  * Promotes hybrid files into multiple domains when signal clusters co-occur, for example order + revenue + cost + shipment + trip + driver + SKU + quantity.
* Wired affinity into `understanding-next/orchestrator.ts` and `UnderstandingNextCard.tsx` so detected domains are ordered by inferred signal clusters when available.
* Added regression coverage for hybrid ERP exports and non-ERP exports.

Verified:

```text
pnpm --dir apps/desktop exec vitest run src/lib/context-semantic-dictionary.test.ts src/lib/semantic-registry.test.ts src/lib/understanding-next/understanding-next.test.ts src/lib/semantic-coverage.test.ts src/lib/business-signal-detector.test.ts src/lib/semantic-sampler.test.ts src/lib/ai-briefing-generator.test.ts --reporter=dot
pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json
```

Result:

* 7 test files passed.
* 134 tests passed.
* Desktop TypeScript check passed.

Remaining:

* Continue researching and adding broader industry/file families.
* Add more playbook/action support for newly recognized partial signals before exposing them as executable BA angles.

Follow-up in the same phase:

* Expanded partial recognition beyond ERP/SAP/CRM into external/manual operational files:
  * access audit logs and permission/MFA signals;
  * application/API logs with endpoint, HTTP status, latency, error, service, and environment;
  * SaaS/subscription files with plan, MRR/ARR, renewal, and usage;
  * contract/legal, property/lease, construction/project progress;
  * agriculture/field, utility/meter, compliance/risk, nonprofit/donor/grant, and QC inspection data.
* Added neighbor and cross-file evidence groups for those families so generic columns such as `Status`, `Amount`, `ID`, or `Action` are not trusted without surrounding context.
* Extended the semantic domain affinity vector with cluster rules for app reliability, access audit, subscription revenue, contract lifecycle, property operations, construction progress, agriculture/utility operations, risk controls, nonprofit funding, and QC/quality data.
* Fixed an over-broad error-code value regex that mistakenly treated generic values beginning with `E` such as `External` as `error_code`.

Verification:

```text
pnpm --dir apps/desktop exec vitest run src/lib/context-semantic-dictionary.test.ts src/lib/semantic-registry.test.ts src/lib/understanding-next/understanding-next.test.ts src/lib/semantic-coverage.test.ts src/lib/business-signal-detector.test.ts src/lib/semantic-sampler.test.ts src/lib/ai-briefing-generator.test.ts --reporter=dot
pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json
```

Result:

* 7 test files passed.
* 137 tests passed.
* Desktop TypeScript check passed.

Follow-up: semantic layer merge guardrail.

Implemented:

* Converted `understanding-core/ontology.ts` from a standalone rule owner into a registry-backed adapter:
  * rules are generated from `SEMANTIC_SIGNAL_REGISTRY_V1`;
  * legacy core patterns are merged into matching registry-owned IDs for compatibility;
  * remaining core-only supplemental IDs are explicit and allowlisted.
* Converted `understanding-next/signal-detector.ts` to the same registry-backed pattern:
  * registry rules are generated first;
  * next-layer compatibility rules only supplement unmapped IDs;
  * payment/logistics/document/status signals no longer live only inside the chart detector.
* Expanded `semantic-registry.ts` with missing central signals needed to remove detector drift:
  * payment cash/card/bank/voucher, change amount, rounding amount, payment status;
  * on-time status, waiting time, current/origin/destination location, freight fee, service group, item type, load status, row type;
  * debt, balance, fiscal month/year, manager, person, coach, role, doctor, medicine;
  * goods receipt, return document, related document, document type;
  * ordered/received/sold quantity, campaign attempts, previous contacts/outcome, country.
* Tightened alias handling after regression:
  * short aliases such as `cod` now match token boundaries in registry-backed regex generation;
  * `row_type` no longer uses generic values such as `cash`, `credit`, `debit`, or generic `type` aliases that can steal payment/generic columns.
* Added `semantic-registry.test.ts` guard coverage proving:
  * business detector taxonomy and context dictionary still come from the registry;
  * understanding-core and understanding-next are registry-backed adapters;
  * supplemental signal rules cannot silently grow outside explicit allowlists.

Verification:

```text
pnpm --dir apps/desktop exec vitest run src/lib/semantic-registry.test.ts src/lib/context-semantic-dictionary.test.ts src/lib/business-signal-detector.test.ts src/lib/understanding-core/understanding-core.test.ts src/lib/understanding-core/next-adapter.test.ts src/lib/understanding-next/understanding-next.test.ts src/lib/semantic-coverage.test.ts src/lib/semantic-sampler.test.ts src/lib/ai-briefing-generator.test.ts --reporter=dot
pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json
```

Result:

* 9 test files passed.
* 158 tests passed.
* Desktop TypeScript check passed.
