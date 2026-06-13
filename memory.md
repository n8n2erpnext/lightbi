# PROJECT_MEMORY.md — LightBI

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
