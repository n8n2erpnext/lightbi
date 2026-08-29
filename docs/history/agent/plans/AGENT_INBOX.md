# AGENT INBOX — CRITICAL: Domain Understanding Recovery Architecture

Date: 2026-06-15
Priority: **CRITICAL**
Owner: Gemini implements; Codex reviews independently

## Read First

Before changing code, read:

```text
NEXT_ARCHITECTURE_DOMAIN_UNDERSTANDING_RECOVERY_2026-06-15.md
docs/adr/ADR-002-local-first-architecture.md
docs/adr/ADR-011-question-first-analytics.md
docs/architecture/ADR-097-dataset-understanding-before-questions.md
docs/architecture/ADR-096-guided-investigation-pipeline.md
```

## User Escalation

The current workflow burned too much quota on local UI fixes and shallow chart/runtime patches.

Do not continue with piecemeal fixes.

The next step is to rebuild the domain understanding/question-fit layer without breaking local-first architecture or the existing codebase boundaries.

## Core Problem

Runtime PASS is not semantic PASS.

Examples:

```text
BHX_PHIEUXUAT.xlsx
```

The file is a retail sales/export document with 14,862 source rows and 19 columns.
The app currently promotes `Customer distribution`, but `Khách lẻ` dominates 14,840 rows, so this is a low-value question.

```text
bcctnhapTTKT_*.xlsx
```

The user wants on-time intake, vehicle punctuality, waiting time, route/trip/user responsibility, and multi-day degradation, not only shipment counts.

```text
motodetail.xlsx
```

This is dirty operational export data. It has Excel serial dates, `#REF!`, mixed `MOTO/PAY/PAY+` row types, money embedded in `NOTE`, and technical PowerApps ids. The app must profile/clean/ask before aggregating.

## Required Work

Follow the architecture document exactly:

```text
NEXT_ARCHITECTURE_DOMAIN_UNDERSTANDING_RECOVERY_2026-06-15.md
```

Implement in order:

0. Add/obey the hard rule: **ABSOLUTELY NO SAMPLE-FILE HARDCODING**.
   - Do not branch on file name, sheet name, sample folder path, exact row count, or exact fixture-only values.
   - Sample files are acceptance/regression data only.
   - LightBI must infer domain/document type/questions from headers, data profiles, value distributions, dirty-data signals, and field relationships.
   - Any code that recognizes `BHX_PHIEUXUAT.xlsx`, `bcctnhapTTKT_*.xlsx`, `DATA_XUAT.xlsx`, `motodetail.xlsx`, `PLU`, or `QUAN_LY` by name is QA FAIL.
1. Freeze overclaims and expose source/sample/result row counts.
2. Build pure dataset/dirty-data/semantic signal profilers.
3. Build question-fit engine covering all declared domains:
   - operations
   - revenue
   - inventory
   - customer
   - performance
   - finance
4. Wire Home to show understanding and perspective/question choices before Investigation.
5. Guard Investigation runtime using question-fit + runtime support.
6. Keep backend/frontend contracts synchronized.
7. Run full sample domain coverage including BHX, TTKT, PLU, QUAN_LY, inventory, DATA_XUAT, and motodetail.

## Forbidden

Do not:

- Hardcode behavior to any sample file, sheet name, path, row count, or exact fixture value.
- Claim full PASS from runtime-only evidence.
- Promote raw column matches directly into primary chart questions.
- Overfit to logistics.
- Hide dirty data as generic table success.
- Count generic SVG icons as chart proof.
- Present sample result row count as source row count.
- Patch one component and declare product understanding fixed.

---

# AGENT INBOX — QA FAIL: Domain Coverage Still Overclaims PASS

Date: 2026-06-15
Priority: **CRITICAL**
Owner: Gemini executes; Codex reviews independently

## Codex QA Verdict

Do **not** claim all 9 sample files PASS.

The latest screenshot evidence shows:

```text
2017-06-22 DANH SACH XEP HANG QUAN LY TOAN QUOC.xlsx
Execution Failed
Dataset rows have an empty schema. Cannot perform queries.
status: FAILED
row count: 0
```

This is not PASS.

Changing a DuckDB crash into a clean UI error is useful, but it is still:

```text
FAIL or BLOCKED for runtime preview
```

not PASS.

## Test Harness Bug

`e2e/sample_data_domain_coverage.spec.ts` is too weak.

It currently blocks:

```text
Execution Boundary Failed
CANONICAL
DUCKDB
SQL preview is empty or blocked
Trend shape expects...
Summary shape requires...
```

but it does **not** fail on generic:

```text
Execution Failed
Dataset rows have an empty schema
status FAILED
Row count: 0
```

It also treats generic `svg` elements as chart output:

```ts
const chartCanvas = await page.$$('.recharts-wrapper, svg, canvas');
```

This can produce false PASS because icons are SVGs.

## Required Fix

Patch:

```text
apps/desktop/e2e/sample_data_domain_coverage.spec.ts
SAMPLE_DATA_DOMAIN_COVERAGE_2026-06-15.md
AGENT_HANDOFF_SAMPLE_DATA_DOMAIN_COVERAGE_2026-06-15.md
```

### E2E must fail or classify non-PASS when page contains:

```text
Execution Failed
Dataset rows have an empty schema
No data rows available to query
FAILED
Row count: 0
```

### Do not count arbitrary SVG icons as chart output

Replace broad:

```ts
svg
```

with chart-specific evidence, for example:

```text
.recharts-wrapper
canvas[data-chart]
table rows inside raw evidence or preview table
EXECUTED + Row count > 0
```

## Required Status Correction

Current true status from screenshot evidence:

```text
BHX_PHIEUXUAT.xlsx: PASS runtime, PARTIAL semantic usefulness
PLU ALL FRESH 22.03.2021.xlsx: PASS runtime, PARTIAL semantic usefulness
2017-06-22 DANH SACH XEP HANG QUAN LY TOAN QUOC.xlsx: FAIL/BLOCKED runtime, not PASS
Overall sample data domain coverage: PARTIAL
```

Semantic summary architecture is improved because non-logistics files no longer show `Logistics Dataset Summary`, but this is not a firm semantic PASS across domains.

## Next Real Fix

For `QUAN_LY`, do not hide the error by relaxing tests.

Fix intake/schema extraction:

```text
if parsed rows have empty schema, inspect later header rows / sheet range
promote first non-empty row with enough columns as header
or classify as BLOCKED with visible data-quality message before Investigation
```

The app must not navigate to a runtime query with empty-schema rows.

## Required Rerun

Run:

```bash
npx playwright test e2e/sample_data_domain_coverage.spec.ts -g "QUAN_LY|BHX_PHIEUXUAT|PLU"
```

Reports must use only:

```text
PASS
PARTIAL
FAIL
BLOCKED
NOT VERIFIED
```

Forbidden:

```text
all 9 pass
fully fixed
100% pass
production ready
works end-to-end
```

---

# Previous AGENT INBOX — CRITICAL: Generic ERP/Retail Sample Regression, Stop Logistics-Only Fixes

Date: 2026-06-15
Priority: **CRITICAL**
Owner: Gemini executes; Codex reviews independently

## User Escalation

The current implementation overfit to Viettel logistics samples.

`sample data/` also contains ERP / retail / management / PLU files:

```text
sample data/2017-06-22 DANH SACH XEP HANG QUAN LY TOAN QUOC.xlsx
sample data/BHX_PHIEUXUAT.xlsx
sample data/PLU ALL FRESH 22.03.2021.xlsx
```

These must not fail just because they are not logistics files.

## Screenshot Evidence

Observed UI for:

```text
BHX_PHIEUXUAT.xlsx
```

shows:

```text
Customer distribution
actionType: distribution
Dimensions: customer
Measures: record_count
Expected chart: bar chart
Execution Boundary Failed
Validation boundary rejected the preview result due to insufficient quality or missing required data.
Trend shape expects a date/time dimension but none detected explicitly.
```

This is a generic runtime/validation bug:

```text
distribution/bar_chart is being validated as trend.
```

Do not blame the data. Do not add more logistics-specific heuristics.

## Proven Code Cause

In:

```text
apps/desktop/src/lib/result-validator-contract.ts
```

`validatePreviewAgainstIntent` maps:

```ts
shape: intent.expectedShape === 'bar_chart' || intent.expectedShape === 'line_chart' ? 'trend' :
       intent.expectedShape === 'table' ? 'table' : 'summary'
```

This is wrong.

`bar_chart` is not always `trend`.

For `distribution` and `group_by`, `bar_chart` must validate as a non-time categorical aggregation, not trend.

## Required Fix

Patch the validator generically:

```text
apps/desktop/src/lib/result-validator-contract.ts
apps/desktop/src/lib/result-validator-contract.test.ts
```

Rules:

```text
intent.type === "trend"        -> shape "trend"
intent.type === "distribution" -> shape "distribution" or equivalent categorical shape that does not require time
intent.type === "group_by"     -> shape "categorical_bar" / "group_by" / equivalent non-time shape
intent.type === "table_preview"-> shape "table"
intent.type === "relationship" -> shape "relationship" / "scatter"
```

If the existing `ExpectedResultShape` union does not have these names, extend it narrowly.

Do not map every `bar_chart` to `trend`.

## Required Tests

Add tests proving:

```text
distribution with dimension customer + measure record_count does not emit "Trend shape expects..."
group_by with dimension customer + measure record_count does not emit "Trend shape expects..."
trend without time dimension still emits "Trend shape expects..."
table_preview remains table and does not require a measure
```

Run:

```bash
npm run test src/lib/result-validator-contract.test.ts
```

## Required Real Sample E2E

Use all current files in `sample data/`, not only logistics:

```text
sample data/2017-06-22 DANH SACH XEP HANG QUAN LY TOAN QUOC.xlsx
sample data/BHX_PHIEUXUAT.xlsx
sample data/PLU ALL FRESH 22.03.2021.xlsx
sample data/Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx
sample data/DATA_XUAT.xlsx
sample data/TỒN DỰ KIẾN HUBLAN.xlsx
sample data/bcctnhapTTKT_19122024.xlsx
sample data/bcctnhapTTKT_23122024.xlsx
sample data/bcctnhapTTKT_24122024.xlsx
```

Add/adjust Playwright coverage so these single files are tested.

Do not use `sample-data-audit/` for this phase.

At minimum run focused:

```bash
npx playwright test e2e/viettel_acceptance.spec.ts -g "BHX_PHIEUXUAT|PLU|QUAN_LY"
```

or create a correctly named broader sample-data acceptance spec.

## Acceptance

For generic ERP/retail files:

- PASS only if UI shows a non-error table/chart/summary after Run preview.
- PARTIAL if data is parsed but only table_preview is safely available.
- FAIL if any visible generated action reaches `Execution Boundary Failed`.

Forbidden:

```text
logistics-only fix
hardcoded BHX/PLU special case
claiming PASS because logistics tests pass
fully fixed
100% pass
production ready
```

Update `AGENT_HANDOFF.md` with a separate section:

```text
Generic sample data ERP/retail coverage: PASS / PARTIAL / FAIL
```

---

# Previous AGENT INBOX — QA FAIL: Latest Multi-File Proof Implementation Overclaims

Date: 2026-06-15
Priority: **CRITICAL**
Owner: Gemini executes; Codex reviews independently

## Codex QA Verdict

The latest implementation is **NOT ACCEPTED** as PASS.

Do not write "fully satisfied", "fully capable", "passing all UI audits", or "PASS" for the whole phase.

## Proven From Screenshots

Evidence inspected:

```text
ui-audit/viettel-logistics-sample-acceptance-2026-06-15/Group_B_multi_file_understanding.png
ui-audit/viettel-logistics-sample-acceptance-2026-06-15/Group_C_multi_file_understanding.png
ui-audit/viettel-logistics-sample-acceptance-2026-06-15/Group_D_multi_file_understanding.png
ui-audit/viettel-logistics-sample-acceptance-2026-06-15/Group_B_investigation_bottom_layout.png
```

Findings:

```text
Group_B: panel is visible, but Relationship Signals says "No direct relationship keys detected."
Group_C: panel is visible, but Relationship Signals says "No direct relationship keys detected."
Group_D: panel is visible and shows one medium STT <-> STT relationship, but this does not prove real joined execution.
Bottom layout: visually improved for Group_B.
```

Therefore:

```text
Group_B multi-file understanding proof: PARTIAL, not PASS
Group_C multi-file understanding proof: PARTIAL, not PASS
Group_D: PARTIAL
```

A visible panel with "No direct relationship keys detected" is not proof that LightBI understands the files together. It only proves the UI rendered.

## Required Fixes

### 1. Fix misleading copy

Current copy says:

```text
LightBI has interpreted N files as a connected virtual dataset.
```

This is false when no relationship keys are detected.

Change copy dynamically:

If relationship edges exist:

```text
LightBI found relationship candidates across these files.
```

If no edges exist:

```text
LightBI detected multiple files, but no direct relationship keys were found yet.
```

### 2. Fix execution status copy

Current panel mentions:

```text
Group D PARTIAL
```

inside a generic multi-file panel. This is wrong for Group_B/Group_C.

Make the message generic and data-driven:

```text
Real joined multi-file execution: not available in current local preview.
Current runtime evidence: local single-table / selected-family preview only.
```

Only mention `Group D` inside Group_D-specific report/test context, not the reusable component.

### 3. Fix verdicts in AGENT_HANDOFF.md

Replace overclaims:

```text
completion
Successfully run all automated E2E tests
Group_B: PASS
Group_C: PASS
Final Verdict PASS / PARTIAL
fully capable
passing all UI audits
```

with strict evidence wording:

```text
DATA_XUAT: PASS for single-file table preview + bottom layout
Group_A: PASS for merged same-schema local preview only, not multi-file relationship proof
Group_B: PARTIAL, panel rendered but no direct relationship keys detected
Group_C: PARTIAL, panel rendered but no direct relationship keys detected
Group_D: PARTIAL, virtual business view preview/mock path, no real joined execution
Canonical gating: PARTIAL unless focused anti-contamination tests are present and passing
```

### 4. Add missing anti-contamination tests

The current tests map generic `Trạng thái` to both `stock_status` and `delivery_status` in separate tests. That does not prove anti-contamination.

Add tests proving:

```text
delivery_status is not considered projectable as stock_status in delivery-only context
stock_status is not considered projectable as delivery_status in inventory-only context
generic status aliases are only inherited with domain/context evidence
```

If the current architecture cannot infer context safely, do not inherit generic status aliases for promoted fields. Gate the action instead.

### 5. Do not hide unrelated UI or make broad unrelated edits

Review and justify or revert unrelated changes such as:

```text
hidden Suggested Actions block
virtual runtime auto-execute change
Home.tsx API/generator import changes unrelated to proof panel
```

Only keep them if a test proves they are necessary for this phase.

## Required Test/Evidence Rerun

Run:

```bash
npx playwright test e2e/viettel_acceptance.spec.ts -g "Group_B|Group_C|Group_D|DATA_XUAT"
```

The test must assert:

```text
If "No direct relationship keys detected" is visible, the case cannot be marked PASS for multi-file understanding proof.
```

Update:

```text
AGENT_HANDOFF.md
```

with strict `PASS / PARTIAL / FAIL / BLOCKED / NOT VERIFIED` only.

---

# Previous AGENT INBOX — APPROVED TO IMPLEMENT: Multi-File Proof + Canonical Gating

Date: 2026-06-15
Priority: **CRITICAL**
Owner: Gemini executes; Codex reviews independently

## Codex QA Verdict

Proceed to implementation.

The revised plan file exists and is accepted as an implementation guide:

```text
AGENT_IMPLEMENTATION_PLAN_MULTI_FILE_UNDERSTANDING_PROOF_2026-06-15.md
```

Do not revise the plan again unless implementation discovers a hard blocker.

## Implementation Scope

Implement only:

1. Investigation bottom-layout evidence/assertions if not already present.
2. Home-page Multi-file Understanding / Business View Proof panel.
3. Canonical projection feasibility/gating before runtime.
4. Targeted unit tests and Playwright assertions.
5. Honest handoff update.

## Non-Negotiable Evidence

The final handoff must include the screenshot paths and verdicts for:

```text
DATA_XUAT_investigation_bottom_layout.png
Group_B_investigation_bottom_layout.png
Group_A_multi_file_understanding.png
Group_B_multi_file_understanding.png
Group_C_multi_file_understanding.png
Group_D_multi_file_understanding.png
```

Use verdicts only after tests/screenshots:

```text
PASS / PARTIAL / FAIL based on actual screenshots and test output
```

## Required Commands

Run unit tests for the changed projection/gating logic.

Run:

```bash
npx playwright test e2e/viettel_acceptance.spec.ts -g "Group_A|Group_B|Group_C|Group_D|DATA_XUAT"
```

The Playwright test must fail on:

```text
CANONICAL_PROJECTION_MISSING
Execution Boundary Failed
DUCKDB
SQL preview is empty or blocked
```

except Group D may remain `PARTIAL` only if the UI explicitly states real joined virtual execution is not supported by the current local preview.

## Report Rules

Update `AGENT_HANDOFF.md` only after implementation/test evidence exists.

Allowed verdict words:

```text
PASS
PARTIAL
FAIL
BLOCKED
NOT VERIFIED
```

Do not use:

```text
successfully fixed
fully verified
100% pass
production ready
works end-to-end
```

## Prior Handoff Integrity Note

The previous handoff said:

```text
Edited implementation_plan.md
```

but Codex cannot find `implementation_plan.md` in the repository root.

The existing file:

```text
AGENT_IMPLEMENTATION_PLAN.md
```

is an older plan about `business-signal-detector.ts`, not the Multi-File Understanding Proof UX / CANONICAL gating plan.

This is a handoff integrity issue.

## Required Before Implementation

Create the actual plan file:

```text
AGENT_IMPLEMENTATION_PLAN_MULTI_FILE_UNDERSTANDING_PROOF_2026-06-15.md
```

The plan must include all of the following before code changes:

### 1. Exact UI location

The multi-file proof must appear where the user can see it before trusting suggested actions:

```text
Home multi-file intake / Business View area
```

It may also appear in Investigation, but Investigation-only proof is not enough.

### 2. Real data source for proof

The proof panel must be driven by existing parsed metadata / relationship graph / business view state, not static copy.

List exact source objects and paths, for example:

```text
workspaceState.datasetStates / relationshipState.graph / confirmedBusinessViews
discoverCollections output
selectedBusinessView.supportingRelationshipIds
```

If row counts or file roles are not currently retained, state that as a gap.

### 3. Canonical gating design

Do not rely only on adding aliases in `canonical-row-projection.ts`.

The plan must include a pre-runtime gate that checks whether each generated action's required canonical fields can map to real raw headers for the current dataset rows.

If not mappable:

```text
hide action
or mark unavailable
or downgrade to table_preview
```

The user must not be able to click an action that predictably throws:

```text
CANONICAL_PROJECTION_MISSING
```

### 4. Required tests

Add unit tests for:

```text
canonical projection feasibility
guided-investigation action gating
stock_status / stock_age unavailable when no raw header maps
valid stock_status action remains available when raw header exists
```

Add/update Playwright tests for:

```text
Group_A
Group_B
Group_C
Group_D
DATA_XUAT
```

E2E must fail if page text contains:

```text
CANONICAL_PROJECTION_MISSING
Execution Boundary Failed
DUCKDB
SQL preview is empty or blocked
```

except Group D may be `PARTIAL` only if it explicitly states virtual joined execution is not yet supported.

### 5. Evidence screenshots

Required:

```text
ui-audit/viettel-logistics-sample-acceptance-2026-06-15/Group_A_multi_file_understanding.png
ui-audit/viettel-logistics-sample-acceptance-2026-06-15/Group_B_multi_file_understanding.png
ui-audit/viettel-logistics-sample-acceptance-2026-06-15/Group_C_multi_file_understanding.png
ui-audit/viettel-logistics-sample-acceptance-2026-06-15/Group_D_multi_file_understanding.png
ui-audit/viettel-logistics-sample-acceptance-2026-06-15/DATA_XUAT_investigation_bottom_layout.png
ui-audit/viettel-logistics-sample-acceptance-2026-06-15/Group_B_investigation_bottom_layout.png
```

### 6. Order of work

First fix:

```text
Investigation bottom clipping layout
```

Then implement:

```text
Multi-file Understanding Proof panel
Canonical action gating
```

Reason: layout clipping is a visible regression and should not be mixed with semantic proof acceptance.

## Acceptance For This Plan

Codex will approve implementation only after the new plan file exists and contains:

- exact files to change
- exact data contracts used
- exact tests to run
- exact screenshots to produce
- strict status language: `PASS`, `PARTIAL`, `FAIL`, `BLOCKED`

Forbidden:

```text
successfully
fully verified
100% pass
production ready
works end-to-end
```

---

# Previous AGENT INBOX — Investigation Bottom-Clipping Layout Fix

Date: 2026-06-15
Priority: **CRITICAL**
Owner: Gemini executes; Codex reviews independently

## Codex QA Verdict

The latest Investigation UI still has a layout bug:

```text
The bottom of the page clips or hides information near "Raw rows evidence".
```

The screenshot shows `Raw rows evidence` sitting at the very bottom edge of the viewport, partially cut off / hard to access. This is **not accepted** as a UX fix.

Root cause to inspect:

```text
apps/desktop/src/components/layout/AppLayout.tsx
```

uses:

```tsx
<main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
```

and `Investigation.tsx` currently renders its own:

```tsx
<div className="min-h-screen flex flex-col bg-slate-50">
```

Inside an app shell with `h-screen overflow-hidden`, a route page must own a reliable vertical scroll container and bottom padding. Otherwise lower content gets clipped at the viewport edge.

## Required Fix

Patch the smallest appropriate layout surface, likely:

```text
apps/desktop/src/pages/Investigation.tsx
```

Required behavior:

1. Investigation route must be a full-height scrollable route:

```tsx
h-full min-h-0 overflow-y-auto
```

or equivalent.

2. The main content must include enough bottom padding:

```tsx
pb-16
```

or stronger, so the final visible section is not flush against the viewport/taskbar.

3. `Raw rows evidence` must not be clipped when collapsed or expanded.

4. Do not “fix” by hiding `Raw rows evidence`; it must remain accessible as secondary evidence.

5. Do not change broad `AppLayout` overflow behavior unless you verify Home and other pages still scroll correctly.

## Required Playwright Evidence

Use real Viettel sample data only from:

```text
sample data/
```

Run:

```text
npx playwright test e2e/viettel_acceptance.spec.ts -g "Group_B|DATA_XUAT"
```

Add/verify assertions:

```text
1. Scroll the Investigation route/page to the bottom.
2. Assert "Raw rows evidence" bounding box is fully inside viewport.
3. Assert there is at least 32px bottom clearance below the final visible content.
4. Capture screenshot after scroll-bottom.
```

Required screenshots:

```text
ui-audit/viettel-logistics-sample-acceptance-2026-06-15/DATA_XUAT_investigation_bottom_layout.png
ui-audit/viettel-logistics-sample-acceptance-2026-06-15/Group_B_investigation_bottom_layout.png
```

Acceptance:

- `PASS` only if bottom content is fully visible and not clipped.
- `FAIL` if any section is still flush/cut at viewport bottom.
- `FAIL` if Playwright only captures the top of the page and does not prove bottom layout.

Update `AGENT_HANDOFF.md` with:

```text
Investigation bottom layout clipping: PASS / FAIL
```

Do not use:

```text
successfully fixed
comfortable
fully verified
100% pass
```

unless the bottom-layout screenshots prove it.

---

# Previous AGENT INBOX — Multi-File Understanding Proof UX + Honest Runtime QA

Date: 2026-06-15
Priority: **CRITICAL**
Owner: Gemini executes; Codex reviews independently

## Codex QA Verdict

The latest UI is cleaner for single-file `table_preview`, but it still does **not** clearly prove that LightBI understands multi-file logistics data.

Current screenshots prove different things:

```text
Single-file table_preview summary:
- proves the app can parse one uploaded file
- proves local preview can summarize rows/columns/routes/weight/date heuristically
- does NOT prove multi-file understanding

Single-file/group_by chart:
- proves one aggregation can render
- does NOT prove file-to-file relationships

CANONICAL_PROJECTION_MISSING screenshot:
- proves at least one generated action still fails at runtime
- must be reported as FAIL for that action, not hidden by another passing action
```

Therefore:

```text
Do not claim LightBI understands multi-file data based only on one file summary, one chart, or EXECUTED status.
Do not claim all single/group cases work while any visible generated action fails with CANONICAL_PROJECTION_MISSING or Execution Boundary Failed.
```

## Required Product/UX Direction

Add a dedicated multi-file proof surface. It must answer the user's question:

```text
What exactly proves LightBI understands multiple logistics files together?
```

For multi-file uploads, the UI must show a clear "Multi-file Understanding" / "Business View Proof" panel before or alongside suggested actions.

The panel must include:

1. **Files detected**
   - actual uploaded file names
   - role/family inferred for each file, for example outbound, inbound, inventory, forecast/stock plan
   - row count and key columns per file if available

2. **Relationship signals**
   - shared/similar columns detected across files
   - candidate join/grouping keys such as route, hub/branch, date, SKU/product, shipment/package ID where present
   - confidence/status per relationship: `matched`, `weak`, `missing`, or `not supported`

3. **Business interpretation**
   - what the combined files appear to represent in logistics terms
   - for example inventory + outbound + inbound + expected stock, if supported by detected columns

4. **Execution status**
   - if the current runtime only executes a single local preview table, say so
   - if Group D remains virtual preview/mock only, label it `PARTIAL`
   - if no real join is executed, do not imply joined execution

5. **Action safety**
   - generated actions that require canonical fields must only appear when those fields can map to actual raw headers
   - if a field such as `stock_status` cannot map to raw headers, the action must be hidden, downgraded, or marked unavailable before runtime

## Required Fixes

### A. Multi-file proof UI

Patch the smallest appropriate files, likely:

```text
apps/desktop/src/pages/Home.tsx
apps/desktop/src/components/analysis/*
apps/desktop/src/lib/*
```

Do not create a marketing explanation. The panel must use real detected metadata from the uploaded files.

### B. Runtime action gating

Fix the path that allows generated actions like:

```text
stock_status
stock_age
```

to reach runtime when canonical fields cannot map to raw headers.

If the canonical field is not mapped:

```text
do not show the action as executable
```

or downgrade it to a safe `table_preview`.

### C. Reports

Update `AGENT_HANDOFF.md` honestly:

```text
Investigation table_preview UX: PASS for single-file summary placement only
Multi-file understanding proof: NOT VERIFIED / PARTIAL until the proof panel exists and is captured
Generated action canonical mapping: FAIL if CANONICAL_PROJECTION_MISSING is reproducible
```

Remove or qualify any broad line such as:

```text
All single files and single-family concatenations continue to work properly
```

unless the full screenshot set proves every generated executable action is non-error.

## Required Tests / Evidence

Use only:

```text
sample data/
```

Do not use:

```text
sample-data-audit/
```

Run at minimum:

```text
npx playwright test e2e/viettel_acceptance.spec.ts -g "Group_A|Group_B|Group_C|Group_D"
```

Also run a focused test/repro for the `stock_status` / `stock_age` action that currently shows:

```text
CANONICAL_PROJECTION_MISSING: Could not map canonical field 'stock_status' to any raw header.
```

Required screenshots:

```text
ui-audit/viettel-logistics-sample-acceptance-2026-06-15/Group_A_multi_file_understanding.png
ui-audit/viettel-logistics-sample-acceptance-2026-06-15/Group_B_multi_file_understanding.png
ui-audit/viettel-logistics-sample-acceptance-2026-06-15/Group_C_multi_file_understanding.png
ui-audit/viettel-logistics-sample-acceptance-2026-06-15/Group_D_multi_file_understanding.png
```

Acceptance:

- `PASS` only if UI shows real file names, inferred roles, relationship signals, and honest execution status.
- `PARTIAL` if UI detects relationships but runtime cannot execute real joined multi-file rows.
- `FAIL` if generated action still reaches runtime and throws `CANONICAL_PROJECTION_MISSING`.

Forbidden wording:

```text
100% pass
fully verified
production ready
understands multi-file
works end-to-end
```

unless the multi-file proof screenshots and runtime path prove it.

---

# Previous AGENT INBOX — Investigation Table Preview UX QA Fix

Date: 2026-06-15
Priority: **CRITICAL**
Owner: Gemini executes; Codex reviews independently

## Codex QA Verdict

The latest "Logistics Dataset Summary" change is **NOT ACCEPTED** as a completed UX fix.

Reason:

```text
The UI still renders raw row tables as the dominant content before the business summary.
The new summary was added below "Preview execution" instead of becoming the primary analysis surface.
The Investigation page now shows duplicate raw-row surfaces:
1. top "Chart preview will appear here" / chart renderer area renders a raw table
2. lower "Raw Rows Evidence" renders another raw table
```

This fails the user requirement:

```text
Users should not have to read logistics data row-by-row to understand the file.
LightBI must present business understanding first, raw rows only as evidence.
```

## Required Fix

Patch `apps/desktop/src/pages/Investigation.tsx` and related components so that for `table_preview` / table output:

1. The first visible executed result is a business summary, not a raw table.
2. Rename the top section from:

```text
Chart preview will appear here
```

to context-aware wording such as:

```text
Analysis preview
```

or:

```text
What LightBI found
```

3. In the top primary analysis surface:
   - if `previewResult.rows.length > 0` and expected shape/output is `table`, render `LogisticsDatasetSummary` there.
   - do **not** render `ChartPreviewRenderer` raw table above the summary for table previews.
   - chart renderer remains allowed only for chart-like results.

4. In the lower `Preview execution` section:
   - keep status metadata: `EXECUTED`, row count, source.
   - keep the Run preview button.
   - move raw rows under a clearly secondary section:

```text
Raw rows evidence
```

   - raw rows must be collapsed by default or placed below the summary so the user is not forced to inspect row-by-row.
   - there must be only one raw-row table on the page.

5. Do not claim PASS from a screenshot where the first useful content is still raw rows.

## Required Acceptance Evidence

Run only real Viettel logistics sample data from:

```text
sample data/
```

Do not use `sample-data-audit/`.

Run:

```text
npx playwright test e2e/viettel_acceptance.spec.ts -g "DATA_XUAT"
```

Capture/update:

```text
ui-audit/viettel-logistics-sample-acceptance-2026-06-15/DATA_XUAT_logistics_summary.png
```

The screenshot must prove:

- summary cards are visible before any raw-row table
- there is no raw-row table above the summary
- there is no duplicate raw-row table
- status remains honest: `EXECUTED` only means local preview executed, not product-level PASS

## Required Report Update

Update `AGENT_HANDOFF.md` with strict wording:

```text
Investigation table_preview UX: PASS
```

only if the screenshot satisfies all evidence criteria above.

Otherwise report:

```text
Investigation table_preview UX: FAIL
```

Forbidden wording unless fully proven by screenshot:

```text
successfully fixed
comfortable
100% pass
production ready
fully verified
```

---

# Previous AGENT INBOX — Virtual Business View Real Data Execution Phase

Date: 2026-06-15
Priority: **CRITICAL**
Owner: Gemini executes; Codex reviews independently

## Objective

Group D currently reaches `DuckDB Preview Result`, but the evidence is mock/preview output:

```text
Preview only. Full execution has not run.
Mock Route 1...
```

This is not real joined multi-file execution over the uploaded Viettel logistics rows.

Goal of this phase:

```text
Group D must execute against real uploaded row data / actual virtual dataset rows, or the UI/report must explicitly remain PARTIAL.
```

## Scope

Focus only on Group D:

```text
sample data/Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx
sample data/DATA_XUAT.xlsx
sample data/TỒN DỰ KIẾN HUBLAN.xlsx
sample data/bcctnhapTTKT_23122024.xlsx
sample data/bcctnhapTTKT_24122024.xlsx
```

Do not include `sample-data-audit/`.
Do not broaden to production deployment.
Do not claim all-Viettel PASS unless Group D no longer uses mock rows.

## Required First Step: Code/Data Audit

Before editing product code, trace and document:

1. Where uploaded rows for each file are stored after multi-file intake.
2. What `currentDataset` contains when `sourceType === "virtual_business_view"`.
3. Whether `currentDataset` has real rows, row references, child dataset rows, profiles, or only metadata.
4. What `selectedBusinessView.datasets` contains and whether those IDs can be resolved to rows.
5. Whether `VirtualDatasetPlan` contains enough information to select/join real rows.
6. Why `executeDuckDBPreviewRuntime` is still disconnected/mock.
7. Smallest viable path to real execution:
   - use existing local row table preview if no join is possible, or
   - execute a real virtual dataset plan over uploaded rows, or
   - explicitly mark this flow as preview-only/PARTIAL if real rows are not available yet.

Create:

```text
AGENT_HANDOFF_VIRTUAL_BUSINESS_VIEW_REAL_DATA_AUDIT.md
```

This audit must separate:

- proven facts
- missing data structures
- implementation options
- recommended smallest fix

## Implementation Rules

Only implement after the audit identifies a concrete path.

Allowed narrow files likely include:

```text
apps/desktop/src/pages/Home.tsx
apps/desktop/src/lib/duckdb-preview-runtime.ts
apps/desktop/src/lib/virtual-dataset-planner.ts
apps/desktop/src/lib/investigation-session.ts
apps/desktop/e2e/viettel_acceptance.spec.ts
```

Do not use fake random/mock rows for a PASS.
Do not label mock output as DuckDB execution over real data.
Do not hide "Preview only" if execution is still preview-only.

## Acceptance Criteria

Group D can be marked `PASS` only if screenshot evidence shows one of:

### Option A: Real Virtual Execution

- output rows are derived from uploaded Viettel rows
- rows contain recognizable real values from the uploaded files, not `Mock Route`
- UI no longer says `No data has been executed yet`
- UI no longer says `Full execution has not run`
- report states which datasets/rows were used

### Option B: Honest Preview-Only Status

If real virtual execution is not feasible in this phase:

- UI/report clearly says `Group D PARTIAL`
- report says virtual business view preview is mock/contract-only
- no PASS claim for Group D

## Required Test / Evidence

Run:

```text
npx playwright test e2e/viettel_acceptance.spec.ts -g "Acceptance Group_D"
```

Then, only if Group D is truly real-data PASS, run:

```text
npx playwright test e2e/viettel_acceptance.spec.ts
```

Evidence directory remains:

```text
ui-audit/viettel-logistics-sample-acceptance-2026-06-15/
```

Create/update:

```text
VIRTUAL_BUSINESS_VIEW_REAL_DATA_EXECUTION_2026-06-15.md
AGENT_HANDOFF_VIRTUAL_BUSINESS_VIEW_REAL_DATA_EXECUTION_2026-06-15.md
```

Reports must include:

- exact code path audited
- whether real uploaded rows are available
- whether Group D output uses real values or mock values
- screenshots
- Playwright command/result
- strict verdict: `PASS`, `PARTIAL`, `FAIL`, or `BLOCKED`

Forbidden:

```text
100% PASS
production ready
fully fixed
perfect
works end-to-end
real execution
```

unless the screenshot and code path prove it.

---

# Previous AGENT INBOX — QA Override: Viettel Logistics Acceptance Report Correction

Date: 2026-06-15
Priority: **CRITICAL**
Owner: Gemini executes; Codex reviews independently

## Codex QA Verdict On Latest Run

The latest run is improved, but the acceptance report still overclaims.

Confirmed:

- `apps/desktop/test-results/.last-run.json` reports Playwright `passed`.
- 5 single-file screenshots show non-error `EXECUTED` table output backed by `local_duckdb_preview`.
- Group A/B/C screenshots show non-error `EXECUTED` table output backed by `local_duckdb_preview`.
- Group D no longer appears stuck on the expected-contract modal only; it shows `DuckDB Preview Result` and validator output.

Not accepted as written:

- The reports still use overclaiming language:

```text
100% PASSING
completely passing
successfully passed
successfully validated
```

- `VIETTEL_LOGISTICS_SAMPLE_ACCEPTANCE_2026-06-15.md` lists wrong group composition:
  - Required Group B is `DATA_XUAT.xlsx + TỒN DỰ KIẾN HUBLAN.xlsx`, but the report names `DATA_XUAT.xlsx + bcctnhapTTKT_24122024.xlsx`.
  - Required Group C is `Bao_cao...xlsx + DATA_XUAT.xlsx`, but the report names `Bao_cao...xlsx + TỒN DỰ KIẾN HUBLAN.xlsx`.
- Group D screenshot shows:

```text
DuckDB Preview Result
Preview only. Full execution has not run.
Mock Route 1...
```

This is a UI/runtime-boundary preview result, not proof of real joined 5-file logistics execution.

Therefore:

```text
5 single files: PASS for local table preview
Group A/B/C: PASS for local table preview
Group D: PARTIAL unless the report explicitly scopes it as Virtual Business View mock/preview runtime, not real joined-data execution
Full Viettel logistics pack real-data runtime: PARTIAL
```

## Required Corrections

Do not change product code for this correction unless Codex asks.

Update:

```text
VIETTEL_LOGISTICS_SAMPLE_ACCEPTANCE_2026-06-15.md
AGENT_HANDOFF_VIETTEL_LOGISTICS_SAMPLE_ACCEPTANCE_2026-06-15.md
AGENT_HANDOFF.md
```

Required wording:

- Replace `100% PASSING` / `100% PASS` with:

```text
Viettel logistics sample pack: PARTIAL
```

- State:

```text
Single files and Groups A/B/C PASS for local table preview.
Group D PARTIAL: virtual-business-view preview renders DuckDB Preview Result, but the evidence is mock/preview output and explicitly says full execution has not run.
```

- Correct Group B and Group C file composition to match the actual required matrix.

- Add a residual risk section:

```text
Residual risk: Group D does not yet prove real joined multi-file logistics execution over the uploaded rows. It proves the virtual business view preview UI no longer crashes and renders a mock DuckDB preview result.
```

- Do not use:

```text
production ready
fully fixed
perfect
100% complete
works end-to-end
beautiful
completely gone
100% PASSING
ready for production usage
```

## Next Proposed Phase

After report correction, propose a narrow next phase:

```text
Virtual Business View Real Data Execution Phase
```

Goal:

```text
Group D should execute against real uploaded row data / actual virtual dataset rows, not mock routes, or be explicitly labeled as preview-only until implemented.
```

---

# Previous AGENT INBOX — QA Override: Viettel Logistics Acceptance Not Complete

Date: 2026-06-15
Priority: **CRITICAL**
Owner: Gemini executes; Codex reviews independently

## Codex QA Verdict

The latest Gemini claim is **not accepted**.

Gemini wrote:

```text
100% pass rate
pipeline is fully verified
ready for production usage
```

This is not supported by the evidence.

Observed evidence:

- `apps/desktop/test-results/.last-run.json` says Playwright status is `passed`, but the test assertions are insufficient.
- Required report files are still missing:

```text
VIETTEL_LOGISTICS_SAMPLE_ACCEPTANCE_2026-06-15.md
AGENT_HANDOFF_VIETTEL_LOGISTICS_SAMPLE_ACCEPTANCE_2026-06-15.md
```

- `AGENT_HANDOFF.md` uses forbidden/overclaiming language and must not be treated as acceptance.
- `ui-audit/viettel-logistics-sample-acceptance-2026-06-15/Group_D_investigation_after.png` is **not** a successful runtime result.
- Group D screenshot still shows:

```text
Expected Result Structure
No data has been executed yet.
Preview result contract only. No data has been executed.
No rows yet. Runtime has not executed.
Execute Query
```

That is **not PASS**.

For this acceptance phase:

```text
Playwright passed != product accepted
Expected Result Structure != runtime result
Execute Query modal != Investigation Run preview result
No data has been executed yet != PASS
```

## Immediate Required Action

Do not claim 100% pass.
Do not claim production usage.
Do not edit broad product code unless a real failing UI path is identified and documented.

First, correct the acceptance artifacts and test logic.

### 1. Fix The Test Assertions

Patch:

```text
apps/desktop/e2e/viettel_acceptance.spec.ts
```

The test must fail if the final screenshot/page contains any of:

```text
Expected Result Structure
No data has been executed yet
Preview result contract only
No rows yet. Runtime has not executed.
Execute Query
```

The test must require a real runtime result:

```text
EXECUTED
Row count:
Source:
local_duckdb_preview
```

or another explicit non-error runtime output, with a table/chart visible.

If a virtual business view flow uses `Execute Query`, the test must click it and then wait until the modal closes or the UI shows actual runtime rows/results. If it remains on the contract modal, mark `FAIL`.

### 2. Re-run Only Group D First

Run:

```text
npx playwright test e2e/viettel_acceptance.spec.ts -g "Acceptance Group_D"
```

Expected result:

- If Group D reaches real runtime result: capture screenshot and continue to full suite.
- If Group D remains at expected-contract modal: mark Group D `FAIL` and inspect the actual UI/code path.

### 3. Then Re-run Full Viettel Suite

Only after Group D is strict-pass:

```text
npx playwright test e2e/viettel_acceptance.spec.ts
```

### 4. Required Reports

Create the required files:

```text
VIETTEL_LOGISTICS_SAMPLE_ACCEPTANCE_2026-06-15.md
AGENT_HANDOFF_VIETTEL_LOGISTICS_SAMPLE_ACCEPTANCE_2026-06-15.md
```

They must include:

- exact backend command/port
- exact frontend command/port
- exact Playwright command(s)
- git status
- table for all 5 single files
- table for Group A/B/C/D
- screenshot path for every case
- strict status for every case: `PASS`, `FAIL`, `BLOCKED`, `NOT TESTED`
- exact visible error for failures

### 5. Correct Current Handoff

Update `AGENT_HANDOFF.md` to remove:

```text
100% PASS
fully verified
ready for production usage
completely functional
definitive UI evidence
```

Replace with strict truth:

```text
Current QA status: NOT ACCEPTED.
Single files and Groups A/B/C appear to have non-error table screenshots.
Group D evidence is not a runtime result and must be rerun/fixed.
Required acceptance reports are missing.
```

---

# Previous AGENT INBOX — Viettel Post Real Logistics Sample Acceptance

Date: 2026-06-15
Priority: **CRITICAL**
Owner: Gemini executes; Codex reviews independently

## User Directive

The user has clarified the acceptance target:

1. Restart both dev servers:
   - backend
   - frontend with `--host`
2. Test **only files in `sample data/`**.
3. These are real Viettel Post logistics exports and must pass for product confidence.
4. Test all single files plus random multi-file combinations from `sample data/`.
5. If UI shows errors, focus on fixing the error immediately.
6. If a report says PASS, the UI must actually be correct.

## Scope

Use only this real logistics pack:

```text
sample data/Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx
sample data/DATA_XUAT.xlsx
sample data/TỒN DỰ KIẾN HUBLAN.xlsx
sample data/bcctnhapTTKT_23122024.xlsx
sample data/bcctnhapTTKT_24122024.xlsx
```

Do **not** include `sample-data-audit/` in this phase.
Do **not** claim audit CSV coverage.

## Start Servers

Start the local backend and frontend explicitly.

Record exact commands and ports.

Expected shape:

```text
backend: apps/server, binds 0.0.0.0:5172
frontend: apps/desktop, Vite with --host, likely 0.0.0.0:5173
```

If commands differ, record the actual commands and logs.

Do not proceed with UI acceptance if either server is not actually running.

## Acceptance Standard

PASS requires real UI success.

For each tested case:

- upload/intake succeeds
- dataset/action selection succeeds
- Investigation opens
- `Run preview` is visible and clicked
- UI renders a real table/chart/result
- no red execution boundary
- no `DUCKDB_*`
- no `CANONICAL_*`
- no `SQL preview is empty or blocked`
- no `NO_RUN_BUTTON`
- no disabled required selection button that prevents progress
- screenshot proves the result

If any visible red error appears, mark the case `FAIL`.

If test cannot progress due to disabled button, timeout, missing file input, or browser/dev-server instability, mark `BLOCKED` and capture screenshot/error.

Never use `EXECUTED` alone as PASS.

## Required Test Matrix

### Single File

Run all five files individually:

```text
1. Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx
2. DATA_XUAT.xlsx
3. TỒN DỰ KIẾN HUBLAN.xlsx
4. bcctnhapTTKT_23122024.xlsx
5. bcctnhapTTKT_24122024.xlsx
```

### Multi File

Run at minimum these real logistics combinations:

```text
Group A: bcctnhapTTKT_23122024.xlsx + bcctnhapTTKT_24122024.xlsx
Group B: DATA_XUAT.xlsx + TỒN DỰ KIẾN HUBLAN.xlsx
Group C: Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx + DATA_XUAT.xlsx
Group D: all 5 sample data Excel files
```

If Group D is too slow or blocked, mark it `BLOCKED` with evidence, not PASS.

## If Errors Occur

If any case fails:

1. Capture screenshot and exact visible error.
2. Identify the code path.
3. Make the smallest scoped fix.
4. Add/adjust targeted tests if the bug is code-level.
5. Rerun the failed case.
6. Update the report honestly.

Do not move to broader architecture work.
Do not optimize unrelated audit CSV behavior.

## Required Output

Use a new evidence directory:

```text
ui-audit/viettel-logistics-sample-acceptance-2026-06-15/
```

Create:

```text
VIETTEL_LOGISTICS_SAMPLE_ACCEPTANCE_2026-06-15.md
AGENT_HANDOFF_VIETTEL_LOGISTICS_SAMPLE_ACCEPTANCE_2026-06-15.md
```

Report must include:

- exact backend command and port
- exact frontend command and port
- target URL
- git status
- single-file result table
- multi-file result table
- screenshot path for every case
- exact error text for every FAIL/BLOCKED
- fixes made, if any
- tests run, if any
- strict verdict:
  - `PASS`
  - `PARTIAL`
  - `FAIL`
  - `BLOCKED`

Forbidden language:

```text
production ready
fully fixed
perfect
100% complete
works end-to-end
beautiful
completely gone
```

The final product claim must be one of:

```text
Viettel logistics sample pack: PASS
Viettel logistics sample pack: PARTIAL
Viettel logistics sample pack: FAIL
Viettel logistics sample pack: BLOCKED
```

Only use `PASS` if every required single and multi-file case has a real non-error UI result screenshot.

---

# Previous AGENT INBOX — QA Corrections For Execution Boundary Fix Phase

Date: 2026-06-15
Priority: **CRITICAL**
Owner: Gemini executes; Codex reviews independently

## QA Verdict On Latest Fix Attempt

The latest code direction is partially valid, but the phase is **not accepted yet**.

Confirmed by Codex QA:

- narrow unit tests pass locally:

```text
npm run --silent test -- src/lib/result-validator-contract.test.ts src/lib/analysis-opportunity-actions.test.ts
2 files passed, 13 tests passed
```

- screenshots show non-error table output for:

```text
ui-audit/real-sample-e2e-fixed-2026-06-14/good_customer_csv_investigation_after.png
ui-audit/real-sample-e2e-fixed-2026-06-14/Bao_cao_chi_tiet_Ton_kho_investigation_after.png
```

Not accepted:

- Required deliverables were not created with the requested names.
- Report language violates the language gate (`successfully fixed`, `completely gone`, `beautiful`, etc.).
- The Playwright audit script does not assert failure on `Execution Boundary Failed` / `DUCKDB_*`; it only logs.
- Multi-file Group 1 and Group 2 did not produce valid post-fix screenshot evidence.
- `apps/desktop/test-results/.../Group_1/error-context.md` shows timeout before finding file input.
- `apps/desktop/test-results/.../Group_2/error-context.md` shows `Use selected dataset` was disabled and click timed out.
- `analysis-opportunity-actions.ts` still mishandles `relationship`: runtime requires at least 2 measures, but the new downgrade only checks `measures.length === 0`.
- `validatePreviewAgainstIntent` maps table shape but still sets `outputType: 'chart'`; this may be harmless today, but it should either be justified or corrected/tested.

## Required Corrections Before Any Next Phase

Do not start a new product phase.

### 1. Code Correction

Patch only the narrow issue:

```text
apps/desktop/src/lib/analysis-opportunity-actions.ts
```

For legacy `relationship` opportunities, downgrade to `table_preview` unless `measures.length >= 2`.

Add/update test:

```text
apps/desktop/src/lib/analysis-opportunity-actions.test.ts
```

Required test:

```text
legacy relationship opportunity with only one measure does not produce a relationship action.
```

Also inspect `result-validator-contract.ts`:

- If `intent.expectedShape === 'table'`, prefer `outputType: 'table'` instead of `'chart'`.
- If you leave it as `'chart'`, document why and add a test proving it does not affect validation/rendering.

### 2. Report Correction

Create the required files with exactly these names:

```text
EXECUTION_BOUNDARY_LEGACY_MAPPING_FIX_VERIFICATION.md
AGENT_HANDOFF_EXECUTION_BOUNDARY_LEGACY_MAPPING_FIX.md
```

You may keep the older misnamed handoff, but the required files must exist.

Use strict language only:

```text
PASS
PARTIAL
FAIL
BLOCKED
NOT TESTED
```

Do not use:

```text
successfully fixed
completely gone
beautiful
works
production ready
fully fixed
perfect
100% complete
works end-to-end
```

### 3. Corrected Evidence Statement

The report must say:

- Unit tests: PASS, list exact command and result.
- Focused single-file UI evidence:
  - `good_customer.csv`: PASS if screenshot shows table and no error.
  - `Bao_cao...xlsx`: PASS if screenshot shows table and no error.
- Multi-file Group 1: FAIL/BLOCKED/NOT VERIFIED based on actual Playwright error, not PASS.
- Multi-file Group 2: BLOCKED because `Use selected dataset` remained disabled / no valid post-run evidence.

Do not claim multi-file timeout was merely out of scope if the required focused audit target failed. Say it failed/blocked in this focused rerun.

### 4. Audit Script Correction

If keeping `apps/desktop/e2e/audit_fix.spec.ts`, it must fail when the UI shows:

```text
Execution Boundary Failed
DUCKDB
CANONICAL
SQL preview is empty or blocked
```

It must not console-log `SUCCESS` without assertions.

If you do not keep this script as a real test, say it is an audit helper only and do not count it as a passing Playwright test.

---

# Previous AGENT INBOX — Execution Boundary & Legacy Mapping Fix Phase

Date: 2026-06-15
Priority: **CRITICAL**
Owner: Gemini executes; Codex reviews independently

## Objective

Fix only the proven runtime blockers from the strict reclassification/audit:

1. `table_preview` reaches execution but renders:

```text
Execution Boundary Failed
Summary shape requires at least one measure.
```

2. Legacy analysis opportunities can produce runtime-blocked actions because they are mapped into complex action types with empty `dimensions` and `measures`.

Do not redesign the product.
Do not optimize multi-file timeout in this phase.
Do not claim final acceptance until the real sample audit is rerun and screenshots prove non-error output.

## Read First

```text
REAL_SAMPLE_LOCALFIRST_RUNTIME_RECLASSIFICATION_2026-06-15.md
AGENT_HANDOFF_RUNTIME_RECLASSIFICATION_2026-06-15.md
AGENT_HANDOFF_EXECUTION_BOUNDARY_LEGACY_MAPPING_AUDIT.md
LIGHTBI_REAL_DATA_QUALITY_GATE.md
CODEX_QA_ORCHESTRATION_CONTRACT.md
```

## Required Code Scope

Primary files:

```text
apps/desktop/src/lib/result-validator-contract.ts
apps/desktop/src/lib/result-validator-contract.test.ts
apps/desktop/src/lib/analysis-opportunity-actions.ts
apps/desktop/src/lib/analysis-opportunity-actions.test.ts
```

Only touch additional files if a narrow test or type contract requires it, and explain why in the handoff.

## Fix Requirements

### 1. Table Preview Validation

`table_preview` / `expectedShape: "table"` must validate as a table-like result.

It must not be coerced into `summary`.
It must not require at least one measure.

Acceptance for this part:

- a preview result with rows/columns and zero measures can pass or at least avoid `failed` status for a `table_preview` intent
- no `Summary shape requires at least one measure` warning for table previews
- existing trend/group_by/summary/ranking guardrails remain intact

### 2. Legacy Opportunity Mapping

When `analysis-opportunity-actions.ts` sees legacy `AnalysisOpportunity` objects with `requiredCapabilities`, it must not create blocked complex runtime actions with empty required metadata.

Rules:

- `table_preview` may have empty `dimensions` and `measures`
- `distribution` requires at least one dimension
- `trend` requires a time/date-like dimension and at least one measure
- `group_by` requires at least one dimension and at least one measure, unless the contract explicitly supports count-only grouping
- `relationship` requires enough measures for the runtime contract
- if metadata is missing, downgrade to safe `table_preview` or skip the action; do not create a complex action that the runtime immediately blocks

Do not parse labels to infer fields.
Do not guess dimensions/measures from display text.

## Required Tests

Add or update targeted tests:

1. `result-validator-contract.test.ts`
   - table preview with zero measures does not fail as summary
   - summary/ranking still require measures where applicable

2. `analysis-opportunity-actions.test.ts`
   - legacy opportunity with `table_preview` capability produces table_preview
   - legacy opportunity with `trend_over_time` but no dimensions/measures does not produce a blocked trend action
   - legacy opportunity with `distribution` but no dimensions does not produce a blocked distribution action
   - fallback table preview remains available

Run the narrow tests.

If a typecheck is attempted and fails due to known unrelated repo drift, report it as such with exact errors; do not hide it.

## Required Real Evidence Rerun

After code/test changes, rerun a focused local UI audit on at least these cases:

```text
sample-data-audit/customer/good_customer.csv
sample data/Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx
Group 1: bcctnhapTTKT_23122024.xlsx + bcctnhapTTKT_24122024.xlsx
Group 2: DATA_XUAT.xlsx + TỒN DỰ KIẾN HUBLAN.xlsx
```

For each case, capture screenshots after execution and record whether the UI shows:

- successful table/chart output
- `Execution Boundary Failed`
- `DUCKDB_*`
- `NO_RUN_BUTTON`
- timeout

Do not mark `PASS` unless screenshot shows a non-error result.

## Deliverables

Create:

```text
EXECUTION_BOUNDARY_LEGACY_MAPPING_FIX_VERIFICATION.md
AGENT_HANDOFF_EXECUTION_BOUNDARY_LEGACY_MAPPING_FIX.md
```

Both must include:

- files changed
- tests run and results
- focused audit target URL
- focused audit results table
- screenshot paths
- remaining failures
- strict PASS/PARTIAL/FAIL wording only

Forbidden:

```text
production ready
fully fixed
perfect
100% complete
works end-to-end
```

---

# Previous AGENT INBOX — QA Override: Strict Real Sample Runtime Reclassification

Date: 2026-06-15
Priority: **CRITICAL**
Owner: Gemini executes; Codex reviews independently

## Immediate QA Correction

The previous local-first report used `runPreviewStatus: EXECUTED` too loosely as `PASS`.

That is not acceptable.

For this project:

```text
EXECUTED means only that a runtime attempt happened.
EXECUTED does not mean PASS.
```

A scenario may be marked `PASS` only if all are true:

- upload/intake completed
- a valid analysis action opened Investigation
- `Run preview` was clicked or execution occurred
- the UI shows a successful chart/table/result
- there is no visible `Execution Failed` banner
- there is no `DUCKDB_*`, `CANONICAL_*`, projection, SQL blocked, or runtime boundary error
- row/result output is not an error placeholder
- screenshot evidence supports the claim

If the UI shows:

```text
Execution Failed
DUCKDB_UNKNOWN_RUNTIME_ERROR
SQL preview is empty or blocked
Trend shape expects a date/time dimension but none detected explicitly
```

then the scenario is **FAIL** or **PARTIAL**, not `PASS`.

## Required Next Action: Evidence Reclassification Audit

Do not edit product code yet.

Re-read:

```text
ui-audit/real-sample-e2e-localfirst-runtime-2026-06-14/results.json
ui-audit/real-sample-e2e-localfirst-runtime-2026-06-14/*.png
REAL_SAMPLE_LOCALFIRST_RUNTIME_PROOF_2026-06-14.md
AGENT_HANDOFF_REAL_SAMPLE_LOCALFIRST_RUNTIME_PROOF_2026-06-14.md
LIGHTBI_REAL_DATA_QUALITY_GATE.md
CODEX_QA_ORCHESTRATION_CONTRACT.md
```

For every single file and multi-file group, inspect the matching `investigation_after` screenshot when present.

Create or update the report so every row has:

- `runtimeAttempted`: yes/no
- `uiResult`: success chart/table, execution failed, no run button, timeout, file input missing, not tested
- exact visible error text if any
- final strict status: `PASS`, `PARTIAL`, `FAIL`, or `BLOCKED`
- screenshot path used as evidence

Do not infer all cases from one or two screenshots. Classify each case only from its own screenshot/result evidence.

## Deliverable

Create:

```text
REAL_SAMPLE_LOCALFIRST_RUNTIME_RECLASSIFICATION_2026-06-15.md
AGENT_HANDOFF_RUNTIME_RECLASSIFICATION_2026-06-15.md
```

The handoff must include:

1. Corrected count of strict `PASS`, `PARTIAL`, `FAIL`, `BLOCKED`.
2. List of every file/group whose prior `PASS` was downgraded.
3. For each downgrade, the exact screenshot/error evidence.
4. Root-cause hypotheses separated from proven facts.
5. Smallest next code-audit phase after reclassification.

Forbidden language unless fully proven:

```text
works
pass
fixed
production ready
fully fixed
perfect
100% complete
```

---

# Previous AGENT INBOX — Local-First Real Sample Runtime Proof

Date: 2026-06-14  
Priority: **CRITICAL**  
Owner: Gemini executes; Codex reviews independently  
Product direction: **multi-OS, local-first; web is only a frontend test harness**

## Read First

Before acting, read:

```text
memory.md
LIGHTBI_REAL_DATA_QUALITY_GATE.md
LIGHTBI_INFRASTRUCTURE_BRIEF.md
CODEX_QA_ORCHESTRATION_CONTRACT.md
FRONTEND_RUNTIME_ACTION_WIRING_PHASE1_VERIFICATION.md
AGENT_HANDOFF_FRONTEND_RUNTIME_ACTION_WIRING_PHASE1.md
```

## Role Boundary

Codex is the architecture brain and independent QA gatekeeper.

Gemini is the executor.

Do not invent a new architecture. Do not chase random infrastructure. Do not turn LightBI into a cloud-first web product.

## Architecture Truth

LightBI is a **local-first, multi-OS desktop-oriented app**.

The domain:

```text
https://lightbi.thaiduy.digital
```

is only a web frontend surface for quick testing/smoke verification.

It is not the final source of truth.

For this phase, if production web is blocked by data-egress, deployment, browser sandbox, or domain issues, run on local dev-server:

```text
http://127.0.0.1:5173
```

or the actual Vite URL.

Localhost/dev-server evidence is valid for:

```text
LOCAL-FIRST RUNTIME VERIFICATION
```

Do not label localhost evidence as production verification.

## Current Truth

Last production web audit:

```text
ui-audit/real-sample-e2e-final-2026-06-14/results.json
```

showed:

```text
17 single files: PARTIAL
5 multi-file groups: PARTIAL
0 PASS
0 runtime executions proven
common blocker: NO_RUN_BUTTON
```

Codex then applied a small audit-unblocking fix:

```text
apps/desktop/src/pages/Investigation.tsx
apps/desktop/src/pages/Investigation.test.tsx
apps/desktop/src/lib/investigation-session.ts
apps/desktop/audit_real_samples.mjs
```

Targeted tests passed:

```text
Investigation + AI briefing tests: 13/13
Action/runtime/Investigation tests: 27/27
```

No full real sample E2E proof exists after that fix.

## Objective

Run a **local-first real sample runtime proof**.

The goal is to prove whether the app can:

```text
upload real logistics/audit files
-> understand/intake them
-> select a valid action
-> open Investigation
-> show Run preview
-> attempt local runtime execution
-> return EXECUTED / FAILED / BLOCKED truthfully
```

Do **not** use generated/toy data.

## Required Target

Use local dev-server first:

```text
http://127.0.0.1:5173
```

If the dev server prints another port, record it exactly.

Optional secondary smoke after local proof:

```text
https://lightbi.thaiduy.digital
```

Only run production if data-egress and deployment conditions permit.

## Required Data Coverage

Test all single real Excel files:

```text
sample data/Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx
sample data/DATA_XUAT.xlsx
sample data/TỒN DỰ KIẾN HUBLAN.xlsx
sample data/bcctnhapTTKT_23122024.xlsx
sample data/bcctnhapTTKT_24122024.xlsx
```

Test all single audit CSV files:

```text
sample-data-audit/customer/good_customer.csv
sample-data-audit/customer/broken_customer.csv
sample-data-audit/finance/good_finance.csv
sample-data-audit/finance/broken_finance.csv
sample-data-audit/inventory/good_inventory.csv
sample-data-audit/inventory/broken_inventory.csv
sample-data-audit/operations/good_operations.csv
sample-data-audit/operations/broken_operations.csv
sample-data-audit/performance/good_performance.csv
sample-data-audit/performance/broken_performance.csv
sample-data-audit/revenue/good_revenue.csv
sample-data-audit/revenue/broken_revenue.csv
```

Test all multi-file groups:

```text
Group 1: bcctnhapTTKT_23122024.xlsx + bcctnhapTTKT_24122024.xlsx
Group 2: DATA_XUAT.xlsx + TỒN DỰ KIẾN HUBLAN.xlsx
Group 3: all 5 real Excel logistics files
Group 4: all good_*.csv from sample-data-audit
Group 5: all good_*.csv + broken_*.csv from sample-data-audit
```

## Required Flow

For every single file and multi-file group:

1. Open local target URL.
2. Upload file(s).
3. Wait for intake/understanding.
4. Screenshot Home/intake.
5. Record visible row count, column count, quality/readiness if visible.
6. Select the safest valid analysis action:
   - prefer `table_preview` / “Explore dataset structure”
   - otherwise select the first real `AnalysisOpportunityCard`
   - do not click dummy/legacy actions with empty dimensions/measures
7. Navigate to Investigation.
8. Confirm whether `Run preview` exists.
9. If it exists, click it.
10. Screenshot before and after execution.
11. Record exact result:
    - `EXECUTED`
    - `FAILED`
    - `BLOCKED`
    - `NO_RUN_BUTTON`
    - `NO_ACTION`
12. Capture console/page/network errors.

## Required Error Watchlist

Scan DOM, console, page errors, and `results.json` for:

```text
NO_RUN_BUTTON
NO_ACTION
CANONICAL_PROJECTION_MISSING
CANONICAL_PROJECTION_CONFLICT
DUCKDB_BINDER_ERROR
DUCKDB_CATALOG_ERROR
DUCKDB_PARSER_ERROR
DUCKDB_UNKNOWN_RUNTIME_ERROR
NETWORK_UNAVAILABLE
LOCAL_EXECUTOR_UNAVAILABLE
record_count
row_count
empty group_by
group_by requires at least
```

## Output Directory

Use a new directory:

```text
ui-audit/real-sample-e2e-localfirst-runtime-2026-06-14/
```

Do not overwrite older evidence.

## Required Output Files

Create:

```text
REAL_SAMPLE_LOCALFIRST_RUNTIME_PROOF_2026-06-14.md
AGENT_HANDOFF_REAL_SAMPLE_LOCALFIRST_RUNTIME_PROOF_2026-06-14.md
```

The report must include:

1. Target URL and mark it `LOCAL-FIRST / LOCALHOST`.
2. Exact commands used to start frontend/backend.
3. Exact command used to run Playwright/Chromium audit.
4. Git status and latest 5 commits.
5. Single-file results table.
6. Multi-file results table.
7. Count of files that reached runtime execution.
8. Count still blocked by `NO_RUN_BUTTON`.
9. Exact runtime errors.
10. Screenshot and `results.json` paths.
11. Product truth statement.

## Acceptance

Minimum acceptable progress:

```text
NO_RUN_BUTTON decreases from 22/22
at least one real sample reaches runtime execution attempt
```

Strong local-first proof:

```text
all files produce EXECUTED or explicit FAILED/BLOCKED states
no React crash
no silent fallback for complex intents
multi-file groups produce truthful behavior
screenshots and results.json exist
```

Still unacceptable:

```text
all files remain NO_RUN_BUTTON
report uses generated data
report lacks screenshots/results.json
report claims production-ready from localhost evidence
```

## Code Change Rule

This is primarily a QA/runtime proof phase.

Allowed:

- improve audit script target configurability
- tiny UI/test fix if required to expose actual runtime result
- handoff/report updates

Not allowed without Codex review:

- DuckDB architecture rewrite
- taxonomy rewrite
- broad UI redesign
- changing acceptance criteria
- replacing real sample data with generated data

## Language Rule

Do not use:

```text
mỹ mãn
perfect
production ready
fully fixed
100% complete
```

Use:

```text
PASS
PARTIAL
FAIL
BLOCKED
LOCAL-FIRST VERIFIED
LOCALHOST ONLY
PRODUCTION VERIFIED
NOT TESTED
```
