# Agent Handoff: understanding-next UI Wiring — 2026-06-16

## Latest Codex Update: Domain Lens / Question Orientation Rebuild

### 2026-06-18 Online Link Intake Shared-Core Patch

Trigger: local file understanding is now stable enough for Simple mode, so the next product step is to reuse the same Question-first understanding path for online file links. Full-file execution is intentionally deferred; current goal is fast representative 1,000-row sampling for source understanding and runtime preview.

Scope:

- Public/readable Google Sheets via CSV export.
- Direct CSV URLs.
- Direct readable Excel/Microsoft 365 download links at inspector level.
- Private/authenticated Google/M365 links remain connector/backend work, not claimed as complete.

Changes:

- Added `online-source-inspector.ts`.
  - Inspects Google Sheets through `docs.google.com/spreadsheets/d/{id}/export?format=csv&gid=...`.
  - Inspects direct CSV URL.
  - Inspects direct Excel/M365 readable links through SheetJS.
  - Preserves `sourceRowCount` while sampling up to 1,000 representative rows for fast understanding.
  - Returns honest `access_denied`, `not_found`, `no_data`, or `unsupported` instead of creating fake datasets.
- Wired `DataIntakeDrawer` / `GoogleSheetsStep` to perform real inspection and only create a dataset when inspection is `accessible`.
- Wired `Home.tsx` online inspected sources into the same `understanding-core` path using `kind: "online_file"`.
- Added `online_source_intake_probe.spec.ts`.
  - Browser route mocks a public Google Sheet CSV export with 1,205 rows.
  - Verifies the UI shows source/sample row counts honestly (`1,205` source rows, `1,000` sample rows).
  - Verifies the same Question lenses appear (`Money trend`, `Location performance`, `Payment mix`).
  - Executes the first runtime preview and asserts no `CANONICAL`, DuckDB, or execution-boundary leak.

Verification:

```bash
cd apps/desktop && npx tsc --noEmit --pretty false
→ 0 errors

cd apps/desktop && npx vitest run src/lib/online-source-inspector.test.ts src/lib/source-preflight.test.ts src/lib/understanding-core --reporter=verbose --pool=forks
→ 44/44 PASS

cd apps/desktop && npx playwright test e2e/online_source_intake_probe.spec.ts --reporter=list --workers=1
→ 1/1 PASS
```

Evidence:

- `ui-audit/online-source-intake-2026-06-18/google_sheet_inspected.png`
- `ui-audit/online-source-intake-2026-06-18/google_sheet_orientation.png`
- `ui-audit/online-source-intake-2026-06-18/google_sheet_investigation_after.png`

Verdict:

- Online public/readable file link -> shared Question understanding -> local preview runtime: PASS for mocked public Google Sheets CSV export probe.
- Authenticated online connectors: NOT IMPLEMENTED.
- Full-file online execution beyond 1,000-row representative sample: DEFERRED by current product decision.

Follow-up on real user Google Sheet links:

- Locked link tested:
  - `https://docs.google.com/spreadsheets/d/19RjQTV6a2gh_migkKsgHtSUq8PFlUIfXI3m3Nbw7CfI/edit?usp=sharing`
  - Expected behavior: reject cleanly, no dataset creation.
  - Actual behavior: PASS. UI shows failed inspection and does not expose `Use this dataset`.
- Shared link tested:
  - `https://docs.google.com/spreadsheets/d/1llT_7ZfJT7ciA2bPlX4OmM8F2Wxnx6P5lp2BkjqYU00/edit?usp=sharing`
- Added Google Sheets `gviz/tq?tqx=out:csv&gid=0` fallback in `online-source-inspector.ts` because normal `/export?format=csv` is not always enough.
- The shared link reads a real logistics/inventory intake schema:
  - `Mã phiếu gửi`
  - `Bưu cục nhập máy`
  - `Thời gian nhập máy`
  - `Bưu cục hiện tại`
  - `Mã dịch vụ`
  - `Nhóm dịch vụ`
  - `Khối lượng (gram)`
  - `Tiền thu hộ`
  - `Tổng cước`
  - `Ngưỡng tồn`
  - `Trạng thái`
- Added non-mocked Playwright probes for both locked and shared links.
  - Inspects source.
  - Sends sampled rows into the shared `understanding-core`.
  - Shows inventory/logistics lenses: `Inventory aging and backlog risk`, `Inventory value exposure`, `Document structure`.
  - Runs `Inventory aging and backlog risk` preview and reaches `EXECUTED`.

Verification:

```bash
cd apps/desktop && npx tsc --noEmit --pretty false
→ 0 errors

cd apps/desktop && npx vitest run src/lib/online-source-inspector.test.ts src/lib/source-preflight.test.ts src/lib/understanding-core --reporter=verbose --pool=forks
→ 45/45 PASS

cd apps/desktop && npx playwright test e2e/online_source_intake_probe.spec.ts --reporter=list --workers=1
→ 3/3 PASS
```

Evidence:

- `ui-audit/online-source-intake-2026-06-18/locked_google_sheet_rejected.png`
- `ui-audit/online-source-intake-2026-06-18/real_google_sheet_inspected.png`
- `ui-audit/online-source-intake-2026-06-18/real_google_sheet_orientation.png`
- `ui-audit/online-source-intake-2026-06-18/real_google_sheet_investigation_after.png`

Verdict:

- Locked Google Sheet link: PASS for clean rejection.
- Shared Google Sheet link: PASS for inspect -> Question orientation -> preview runtime.
- Still sampled preview, not full-file analytics.

### 2026-06-17 WorldCup / People-Team-Event Understanding Patch

Trigger: `WorldCupPlayers.xlsx` is a simple non-commerce database export with columns such as `RoundID`, `MatchID`, `Team Initials`, `Coach Name`, `Line-up`, `Player Name`, `Position`, and `Event`. The previous understanding layer incorrectly treated `RoundID` as `money.rounding` and failed to offer a useful Simple-mode orientation.

Root cause:

- `money.rounding` used a broad `/round/i` pattern, so technical/event columns like `RoundID` were misclassified as money.
- The universal ontology lacked people/team/role/event participation signals, so non-money event datasets fell through to irrelevant business lenses.
- Runtime projection still needed a safer physical-header direct match before legacy taxonomy fallback.
- Investigation AI briefing was still generated from the old understanding contract for local files, causing the banner to say `No measure detected. No dimension detected.` even when the selected action had real dimensions and `record_count`.

Changes:

- Added universal people/team/event signals:
  - `entity.person`
  - `entity.team`
  - `entity.coach`
  - `entity.role`
  - `event.activity`
  - `event.lineup`
  - `document.match`
  - `document.round`
- Added question candidates:
  - `Participation by team or group`
  - `Role or participation mix`
  - `Activity by person or participant`
- Tightened `money.rounding` so `RoundID` no longer matches money.
- Reduced blocked-question noise: lenses with no required evidence are not shown as if they are relevant.
- Added normalized physical-header direct matching in `canonical-row-projection.ts` for source-neutral runtime.
- Added `generateAIBriefingFromUnderstandingNext()` and wired local-file sessions in `Home.tsx` to use it.
- Added strict WorldCup Playwright probe assertions:
  - no `money.rounding`
  - no `CANONICAL`
  - no DuckDB/runtime leak
  - must show people/team/event questions
  - must execute `Participation by team or group`

Verification:

```bash
cd apps/desktop && npx tsc --noEmit --pretty false
→ 0 errors

cd apps/desktop && npx vitest run src/lib/understanding-core src/lib/canonical-row-projection.test.ts src/lib/local-duckdb-executor.test.ts --reporter=verbose --pool=forks
→ 50/50 PASS

cd apps/desktop && npx vitest run src/lib/ai-briefing-generator.test.ts src/lib/understanding-core --reporter=verbose --pool=forks
→ 23/23 PASS

cd apps/desktop && npx playwright test e2e/world_cup_players_probe.spec.ts --reporter=list --workers=1
→ 1/1 PASS

cd apps/desktop && npx playwright test e2e/superstore_probe.spec.ts e2e/world_bank_indicators_probe.spec.ts e2e/bank_additional_full_probe.spec.ts e2e/world_cup_players_probe.spec.ts --reporter=list --workers=1
→ 4/4 PASS
```

Evidence:

- `ui-audit/world-cup-players-probe-2026-06-17/orientation.png`
- `ui-audit/world-cup-players-probe-2026-06-17/investigation_after.png`

Verdict:

- WorldCup people/team/event Simple-mode orientation: PASS for current probe.
- Participation preview runtime: PASS, executed locally with `Team Initials` + `record_count`, row count 74.
- Broad understanding remains PARTIAL by product standard; this patch adds a reusable participation/event layer, not a one-file hardcode.

### 2026-06-16 World Bank / Wide Indicator Runtime Patch

Trigger: `World Bank Indicators.xlsx` showed a red runtime failure:

```text
CANONICAL_PROJECTION_MISSING: Field 'Business: Internet users (per 100 people)' is required but not found in Taxonomy.
```

Root cause:

- The local DuckDB executor still forced runtime rows through legacy canonical projection.
- The new Question/signal path correctly can produce actions using physical upload headers, but the executor treated those headers as taxonomy IDs.
- Two ontology regexes were also too broad:
  - `money.revenue` matched any `total`, causing `Health expenditure, total (% GDP)` to be treated as revenue.
  - `entity.employee` matched `users`, causing `Internet users` to be treated as an actor/user field.

Changes:

- `local-duckdb-executor.ts` now uses physical upload headers first and only falls back to canonical projection for legacy alias-based actions.
- Added generic `indicator.metric` signal family support for wide metric/benchmark/public-indicator datasets.
- Added `location.country` signal.
- Added indicator-oriented Questions:
  - `Indicator over time`
  - `Indicator by country or region`
- Added `AVG` aggregation support through CoreAction -> understanding-next action -> legacy adapter -> runtime intent -> runtime plan -> safe SQL.
- Tightened broad revenue/user regexes to prevent false positives.

Verification:

```bash
cd apps/desktop && npx vitest run src/lib/understanding-core src/lib/safe-sql-preview.test.ts src/lib/local-duckdb-executor.test.ts src/lib/understanding-next/action-adapter.test.ts --reporter=verbose --pool=forks
→ 69/69 PASS

cd apps/desktop && npx tsc --noEmit --pretty false
→ 0 errors

cd apps/desktop && npx playwright test e2e/world_bank_indicators_probe.spec.ts --reporter=list --workers=1
→ 1/1 PASS

cd apps/desktop && npx playwright test e2e/understanding_core_runtime.spec.ts e2e/bank_additional_full_probe.spec.ts e2e/world_bank_indicators_probe.spec.ts --reporter=list --workers=1
→ 7/7 PASS
```

Evidence:

- `ui-audit/world-bank-indicators-probe-2026-06-16/orientation.png`
- `ui-audit/world-bank-indicators-probe-2026-06-16/investigation_after.png`

Verdict:

- Physical-header runtime path: PASS.
- World Bank wide-indicator orientation/runtime: PASS for current probe.
- Broad product understanding: still PARTIAL; more indicator question variants can be added, but the prior canonical runtime blocker is removed.

### 2026-06-16 Signal-First Understanding Core Track

Decision: stop extending LightBI by guessing a domain first. Add a new pure TypeScript core that starts from universal business signals, then uses questions to narrow user intent.

New package:

- `apps/desktop/src/lib/understanding-core/contracts.ts`
- `apps/desktop/src/lib/understanding-core/ontology.ts`
- `apps/desktop/src/lib/understanding-core/column-profile.ts`
- `apps/desktop/src/lib/understanding-core/signal-engine.ts`
- `apps/desktop/src/lib/understanding-core/question-engine.ts`
- `apps/desktop/src/lib/understanding-core/index.ts`
- `apps/desktop/src/lib/understanding-core/understanding-core.test.ts`
- `apps/desktop/src/lib/understanding-core/README.md`

Core principle:

```text
columns + rows
  -> column health
  -> universal signals
  -> optional industry overlays
  -> question candidates
  -> gated runtime actions
```

This explicitly changes the root model from:

```text
domain first -> fixed questions
```

to:

```text
signal first -> question narrows intent -> overlay adds industry nuance
```

Universal signal families implemented:

- `money`
- `time`
- `entity`
- `item`
- `location`
- `document`
- `status`
- `quantity`
- `inventory`
- `quality`

Cross-industry behavior now locked by tests:

- Retail-like sales export uses `money/time/location/payment` questions without needing a retail-specific root.
- B2B invoice export inherits the same money questions through document/customer/vendor/location signals.
- Healthcare billing export inherits business questions through `money.receivable`, `entity.patient`, `entity.doctor`, `item.medicine`, and `document.prescription`.
- Inventory aging export is treated as backlog/value/status, not logistics SLA.
- Dirty/manual export puts data quality review before aggregate analysis.
- Same columns/rows with different file names and sheet names produce identical signals/questions.

Verification:

```bash
cd apps/desktop && npx vitest run src/lib/understanding-core/understanding-core.test.ts --reporter=verbose --pool=forks
→ 6/6 PASS

cd apps/desktop && npx tsc --noEmit --pretty false
→ 0 errors

cd apps/desktop && npx vitest run src/lib/understanding-core/understanding-core.test.ts src/lib/understanding-next/understanding-next.test.ts --reporter=verbose --pool=forks
→ 74/74 PASS
```

Current scope:

- `understanding-core` is now wired into Home for local files through a typed adapter.
- Existing `UnderstandingNextCard` remains the rendering shell.
- Existing Investigation legacy action path remains in use through the existing `understanding-next/action-adapter`.
- Do not delete `understanding-next` yet; it still owns UI contracts and action adaptation.

Bridge files added/modified:

- `apps/desktop/src/lib/understanding-core/next-adapter.ts`
- `apps/desktop/src/lib/understanding-core/next-adapter.test.ts`
- `apps/desktop/src/pages/Home.tsx`
- `apps/desktop/e2e/sample_data_domain_coverage.spec.ts`

Bridge verification:

```bash
cd apps/desktop && npx tsc --noEmit --pretty false
→ 0 errors

cd apps/desktop && npx vitest run src/lib/understanding-core src/lib/understanding-next/action-adapter.test.ts --reporter=verbose --pool=forks
→ 34/34 PASS

cd apps/desktop && npx playwright test e2e/sample_data_domain_coverage.spec.ts -g "BHX_PHIEUXUAT|Bao_cao_chi_tiet_Ton_kho|motodetail" --reporter=list --workers=1
→ 3/3 PASS under current classifications

cd apps/desktop && npx playwright test e2e/sample_data_domain_coverage.spec.ts -g "PLU|bcctnhapTTKT|QUAN_LY" --reporter=list --workers=1
→ 5/5 PASS under current classifications
```

Observed behavior after bridge:

- BHX now presents universal business lenses: `Money trend`, `Location performance`, `Payment behavior`, `Actor performance`, `Document structure`, and demotes dominated customer analysis.
- Inventory aging sample presents `Inventory aging and backlog risk` plus `Inventory value exposure`.
- `motodetail` remains `Review data quality before analysis` with runtime intentionally disabled.
- `QUAN_LY` remains cleanly blocked before runtime when headers cannot be trusted.

Verdict:

- Signal-first core: PASS for initial synthetic and representative sample coverage.
- UI bridge: PASS for representative smoke coverage.
- Full product understanding: still PARTIAL. More signal families and runtime action templates are needed before claiming broad domain support.

### 2026-06-16 Universal Business Signal Expansion

Goal: make the master signal layer cover more ERP, management-system, and manual-export shapes without adding hardcoded domains or sample names.

Expanded signal coverage:

- Money:
  - `money.payable`
  - `money.debt`
  - `money.margin`
  - `money.profit`
  - `money.opening_balance`
  - `money.closing_balance`
  - `money.balance`
- Time:
  - `time.period`
  - `time.fiscal_month`
  - `time.fiscal_year`
- Entity:
  - `entity.salesperson`
  - `entity.manager`
  - `entity.department`
  - `entity.carrier`
- Document:
  - `document.purchase_order`
  - `document.sales_order`
  - `document.goods_receipt`
  - `document.stock_transfer`
  - `document.return`
- Status:
  - `status.approval`
  - `status.fulfillment`
  - `status.reconciliation`
- Quantity:
  - `quantity.ordered`
  - `quantity.received`
  - `quantity.sold`
  - `quantity.returned`

Expanded universal questions:

- `profit_or_margin`
- `receivable_payable_balance`
- `stock_movement`
- `approval_or_reconciliation_flow`

Added synthetic fixtures proving coverage for:

- profit/margin business performance exports
- accounting-like receivable/payable/debt/balance exports
- stock movement exports with ordered/received/sold/returned quantities
- approval/reconciliation control-status exports

Verification:

```bash
cd apps/desktop && npx vitest run src/lib/understanding-core/understanding-core.test.ts --reporter=verbose --pool=forks
→ 10/10 PASS

cd apps/desktop && npx tsc --noEmit --pretty false
→ 0 errors

cd apps/desktop && npx vitest run src/lib/understanding-core src/lib/understanding-next/action-adapter.test.ts --reporter=verbose --pool=forks
→ 38/38 PASS

cd apps/desktop && npx playwright test e2e/sample_data_domain_coverage.spec.ts -g "BHX_PHIEUXUAT|Bao_cao_chi_tiet_Ton_kho|motodetail|PLU|bcctnhapTTKT|QUAN_LY" --reporter=list --workers=1
→ 8/8 completed under current expected classifications

cd apps/desktop && npx playwright test e2e/understanding_core_synthetic.spec.ts --reporter=list --workers=1
→ 5/5 PASS
```

Synthetic UI E2E now proves Home renders the new universal lenses/questions for generated CSV exports:

- `profit_margin_business_export.csv`
- `accounting_receivable_payable.csv`
- `stock_movement_export.csv`
- `healthcare_billing_export.csv`
- `approval_reconciliation_export.csv`

Status:

- Master signal layer is broader and less sample-bound.
- Runtime/UI smoke did not regress on representative samples.
- Still PARTIAL: finance/accounting needs real sample fixtures and runtime-safe views before it can be called product-supported.

### 2026-06-16 Inventory Aging Snapshot Patch

Trigger: visual QA showed `Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx` being treated too generically instead of as an inventory aging/backlog snapshot.

What changed:

- Added generic, non-filename-specific signals for inventory aging exports: `shipment_id`, `stock_threshold`, `current_location`, `origin_location`, `destination_location`, `cod_amount`, `freight_fee`, `declared_value`, `service_group`, `item_type`, and `load_status`.
- Added `inventory_snapshot` handling in `dataset-profile.ts`, including Vietnamese datetime parsing such as `09:12 28-12-2024`.
- Reoriented inventory snapshot questions around:
  - `Inventory aging and backlog risk`
  - `Inventory value exposure`
  - `Service, item, and status structure`
- Demoted operations/SLA lenses for `inventory_snapshot` so logistics/SLA questions do not override the inventory aging perspective.
- Lowered product/SKU overview priority for inventory snapshots so product-master logic does not dominate stock aging exports.
- Added Playwright screenshot evidence for the orientation layer, not only the final runtime chart:
  - `ui-audit/sample-data-domain-coverage-2026-06-15/Bao_cao_chi_tiet_Ton_kho_vung_tinh_28_12_2024_xlsx_orientation.png`
  - `ui-audit/sample-data-domain-coverage-2026-06-15/Bao_cao_chi_tiet_Ton_kho_vung_tinh_28_12_2024_xlsx_investigation_after.png`

Verification:

```bash
cd apps/desktop && npx tsc --noEmit --pretty false
→ 0 errors

cd apps/desktop && npx vitest run src/lib/understanding-next/understanding-next.test.ts src/lib/understanding-next/real-sample.test.ts src/lib/dataset-profile.test.ts --reporter=verbose --pool=forks
→ 115/115 PASS

cd apps/desktop && npx playwright test e2e/sample_data_domain_coverage.spec.ts -g "Bao_cao_chi_tiet_Ton_kho" --reporter=list --workers=1
→ 1/1 PASS

cd apps/desktop && npx playwright test e2e/sample_data_domain_coverage.spec.ts -g "BHX_PHIEUXUAT|Bao_cao_chi_tiet_Ton_kho|PLU|bcctnhapTTKT|motodetail|QUAN_LY" --reporter=list --workers=1
→ 8/8 completed under current expected classifications
```

Observed UI after patch:

- Home intake classifies the file as `Inventory Aging Reports`, 6.4K rows, 27 columns.
- Orientation panel starts with `Inventory aging and backlog risk` and `Inventory value exposure`.
- Runtime action `Aging risk by threshold` executes with `Ngưỡng tồn` + `record_count`, producing 5 aging buckets.
- This is still not a full inventory analytics product; it is a scoped correction to the semantic/question planner for the inventory aging snapshot shape.

### 2026-06-16 Practical Effect Patch

Follow-up after visual QA:

- Collapsed legacy technical details inside `UnderstandingNextCard`; the primary surface is now the lens-first question selector.
- Hid the stale `No columns detected. Cannot suggest analysis capabilities.` warning when `understanding-next` already produced a result.
- Tightened lens semantics: a lens cannot display `READY` unless at least one orientation question has an executable action.
- Converted payment/document/exception lenses to safe evidence-preview actions when aggregate SQL is not yet implemented, instead of exposing invalid `group_by` actions.
- Fixed runtime time detection for user headers such as `Ngày xuất` / `Thời gian`, not only English canonical names.
- Fixed DuckDB trend SQL to handle Excel serial dates and string dates, and return readable `YYYY-MM-DD` buckets instead of timestamp numbers.
- Clarified Data Sources copy: local file analysis is available offline; backend/API is only for connectors, persistence/shared jobs, or server-side execution.

Verification after this patch:

```bash
cd apps/desktop && npx tsc --noEmit --pretty false
→ 0 errors

cd apps/desktop && npx vitest run src/lib/safe-sql-preview.test.ts src/lib/analysis-runtime-contract.test.ts src/lib/runtime-planner-preview.test.ts --reporter=verbose --pool=forks
→ 30/30 PASS

cd apps/desktop && npx vitest run src/lib/analysis-runtime-contract.test.ts src/lib/runtime-planner-preview.test.ts src/lib/safe-sql-preview.test.ts src/lib/understanding-next --reporter=verbose --pool=forks
→ 157/157 PASS

cd apps/desktop && npx playwright test e2e/sample_data_domain_coverage.spec.ts -g "BHX_PHIEUXUAT|motodetail|bcctnhapTTKT|PLU|QUAN_LY" --reporter=list --workers=1
→ 7/7 PASS (50.1s)
```

Visual QA evidence:

- `ui-audit/sample-data-domain-coverage-2026-06-15/BHX_PHIEUXUAT_xlsx_investigation_after.png` now shows `Revenue over time` with readable date axis `9/20/2021`, not a timestamp number.
- `QUAN_LY` remains BLOCKED before runtime when schema cannot be trusted.
- `motodetail` remains data-quality review with runtime intentionally disabled.
- `PLU` and TTKT files still execute without DuckDB/CANONICAL/runtime boundary errors.

This update rebuilds the broken `signals -> executable actions` layer into:

```
dataset profile -> signals -> business lenses -> orientation questions -> safe action candidates -> runtime
```

Scope is cross-domain, not a BHX-specific patch.

### 2026-06-16 Runtime Question Effect Patch

Goal: make the new Question layer produce executable runtime actions, not only better Home-page suggestions.

What changed:

- Added explicit `measureAggregations` metadata to the legacy action/runtime contract.
- `understanding-next/action-adapter.ts` now marks physical measures from Question actions as `SUM` for `group_by` and `trend`.
- Virtual count measures remain `COUNT`:
  - `record_count`
  - `row_count`
- `analysis-runtime-contract.ts` preserves aggregation metadata.
- `runtime-planner-preview.ts` carries aggregation metadata into logical `group_by` and `trend` operations.
- Existing legacy actions still default to COUNT if they do not opt into SUM, so this is scoped to the new Question-driven action path.
- Added `apps/desktop/e2e/understanding_core_runtime.spec.ts` to prove Question -> Investigation -> Run preview execution.

Runtime E2E coverage added:

- `runtime_money_trend.csv` -> `Money over time`
- `runtime_working_capital.csv` -> `Receivable, payable, and balance review`
- `runtime_stock_movement.csv` -> `Stock movement and quantity flow`
- `runtime_healthcare_billing.csv` -> `Value by employee, doctor, driver, or user`
- `runtime_control_status.csv` -> `Approval or reconciliation flow`

Each case uploads a generated CSV with no sample filename dependency, clicks the relevant business Question, enters Investigation, runs preview, and rejects:

- `Execution Boundary Failed`
- `CANONICAL`
- `DUCKDB`
- `SQL preview is empty or blocked`
- `Trend shape expects a date/time dimension`
- `Summary shape requires at least one measure`

Verification:

```bash
cd apps/desktop && npx tsc --noEmit --pretty false
→ 0 errors

cd apps/desktop && npx vitest run src/lib/understanding-core src/lib/understanding-next/action-adapter.test.ts src/lib/analysis-runtime-contract.test.ts src/lib/runtime-planner-preview.test.ts src/lib/safe-sql-preview.test.ts --reporter=verbose --pool=forks
→ 71/71 PASS

cd apps/desktop && npx playwright test e2e/understanding_core_runtime.spec.ts --reporter=list --workers=1
→ 5/5 PASS
```

Evidence screenshots:

- `ui-audit/understanding-core-runtime-2026-06-16/runtime_money_trend_csv_executed.png`
- `ui-audit/understanding-core-runtime-2026-06-16/runtime_working_capital_csv_executed.png`
- `ui-audit/understanding-core-runtime-2026-06-16/runtime_stock_movement_csv_executed.png`
- `ui-audit/understanding-core-runtime-2026-06-16/runtime_healthcare_billing_csv_executed.png`
- `ui-audit/understanding-core-runtime-2026-06-16/runtime_control_status_csv_executed.png`

Verdict:

- Question -> runtime effect: PASS for these five generic synthetic business shapes.
- Full product analytics: still PARTIAL. This proves the action path and SUM semantics, not every domain-specific analytic.

### 2026-06-16 Bank Additional Full Probe

File tested:

- `sample data/bank-additional-full.xlsx`

Observed file shape:

- 41,188 rows
- 21 columns
- Campaign/response dataset, not a bank-transaction/money dataset.
- Important fields include `job`, `marital`, `education`, `housing`, `loan`, `contact`, `duration`, `campaign`, `previous`, `poutcome`, and binary target `y`.

Initial result before patch:

- UI/runtime did not crash.
- LightBI failed to expose useful executable questions.
- It showed mostly generic PARTIAL business lenses.
- Root cause 1: no generic engagement/response signal family.
- Root cause 2: local intake used `slice(0, 1000)` first-row sampling. This file is sorted: first 1,000 rows are all `telephone`, while full file has both `telephone` and `cellular`.
- Root cause 3: regex `ar\b` misclassified `emp.var.rate` as receivable money.

Changes:

- Added generic `engagement` signal family for campaign/response datasets:
  - `engagement.outcome`
  - `engagement.contact_channel`
  - `engagement.segment`
  - `engagement.campaign_attempts`
  - `engagement.previous_contacts`
  - `engagement.previous_outcome`
- Added `campaign` overlay.
- Added generic questions:
  - `Response or conversion overview`
  - `Response by audience segment`
  - `Response by contact channel`
  - `Campaign effort and prior outcome review`
- Kept imbalanced binary outcomes usable when they have at least two values.
- Changed `local-file-inspector.ts` preview sampling from first 1,000 rows to an evenly spaced representative sample capped at 1,000 rows.
- Tightened receivable regex from `ar\b` to `\bar\b`.

Verification:

```bash
cd apps/desktop && npx vitest run src/lib/understanding-core/understanding-core.test.ts --reporter=verbose --pool=forks
→ 12/12 PASS

cd apps/desktop && npx tsc --noEmit --pretty false
→ 0 errors

cd apps/desktop && npx playwright test e2e/bank_additional_full_probe.spec.ts --reporter=list --workers=1
→ 1/1 PASS
```

E2E assertions now require:

- `Response outcome`
- `Response or conversion overview`
- `Audience segment performance`
- `Response by audience segment`
- `Contact channel performance`
- `Response by contact channel`
- `Campaign effort`
- `Campaign effort and prior outcome review`

E2E also rejects:

- `Execution Boundary Failed`
- `DUCKDB`
- stale no-columns warning
- `emp.var.rate` misclassified as `money.receivable`

Evidence screenshots:

- `ui-audit/bank-additional-full-probe-home.png`
- `ui-audit/bank-additional-full-probe-orientation.png`
- `ui-audit/bank-additional-full-probe-investigation-before.png`
- `ui-audit/bank-additional-full-probe-investigation-after.png`

Verdict:

- `bank-additional-full.xlsx`: PASS for local upload, response/campaign question orientation, and first executable runtime preview.
- Still PARTIAL for advanced analytics because true conversion-rate / response-rate calculations need derived metrics or AVG/ratio runtime support.

### 2026-06-16 Derived Metric Runtime Patch

Goal: make campaign/response questions execute as rates, not only row counts.

What changed:

- Added `derivedMeasures` contract from `understanding-core` through:
  - `understanding-next/contracts.ts`
  - `analysis-opportunity-actions.ts`
  - `analysis-runtime-contract.ts`
  - `runtime-planner-preview.ts`
  - `safe-sql-preview.ts`
- Added `positive_rate` derived metric support:
  - `positive_count`
  - `total_count`
  - `response_rate`
- `Response by audience segment` now groups by the segment only and computes response metrics from the outcome column.
- `Response by contact channel` follows the same derived metric path.
- `chart-preview-model.ts` now prefers `*_rate` fields over count fields for chart y-axis selection.
- `Investigation.tsx` surfaces derived metric names in the Measures chips so the user sees the metric without opening raw rows.

Example generated metric semantics:

```text
group by job
positive_count = count rows where y in yes/true/success/approved/converted/subscribed
total_count = count rows
response_rate = positive_count / total_count
```

Verification:

```bash
cd apps/desktop && npx vitest run src/lib/understanding-core src/lib/understanding-next/action-adapter.test.ts src/lib/analysis-runtime-contract.test.ts src/lib/runtime-planner-preview.test.ts src/lib/safe-sql-preview.test.ts src/lib/chart-preview-model.test.ts --reporter=verbose --pool=forks
→ 83/83 PASS

cd apps/desktop && npx tsc --noEmit --pretty false
→ 0 errors

cd apps/desktop && npx playwright test e2e/understanding_core_runtime.spec.ts e2e/bank_additional_full_probe.spec.ts --reporter=list --workers=1
→ 6/6 PASS
```

Bank probe now asserts:

- `Response by audience segment` is executable.
- Runtime does not leak `Execution Boundary Failed`, `CANONICAL`, `DUCKDB`, or empty SQL errors.
- `response_rate`, `positive_count`, and `total_count` are visible after execution.

Verdict:

- Response-rate runtime path: PASS for `bank-additional-full.xlsx`.
- Derived metrics framework: PARTIAL. It currently supports `positive_rate`; AVG, ratio-of-sums, exception-rate, payment mix percent, and late-rate remain future work.

### Touched Files

| File | Action |
|---|---|
| `apps/desktop/src/lib/understanding-next/contracts.ts` | Added `BusinessLens`, `OrientationQuestion`, and `QuestionIntent`; `DatasetUnderstandingResult` now carries `lenses`. |
| `apps/desktop/src/lib/understanding-next/signal-detector.ts` | Added generic revenue/payment/document/exception signals: receivable, quantity, voucher/bank payment, change, rounding, delivery fee, document type, related document. No filename/sheet hardcoding. |
| `apps/desktop/src/lib/understanding-next/question-fit-engine.ts` | Added cross-domain lens builder for revenue, operations, inventory, customer, performance, dirty export review, blocked schema, and finance not implemented. Runtime actions are secondary and structurally gated before being exposed in lens questions. |
| `apps/desktop/src/lib/understanding-next/orchestrator.ts` | Wires `lenses` into `createDatasetUnderstandingResult()`. |
| `apps/desktop/src/components/analysis/UnderstandingNextCard.tsx` | UI is now lens-first with "What do you want to understand?" as the primary surface. Recommended executable previews are secondary. |
| `apps/desktop/src/pages/Home.tsx` | Hides legacy local guided-view blocks when `understanding-next` is active, including "Optional: Choose a deeper business perspective" and "Advanced guided views unavailable". |
| `apps/desktop/src/lib/analysis-runtime-contract.ts` | Runtime trend guard now accepts normalized multilingual time headers such as `Ngày xuất`. |
| `apps/desktop/src/lib/runtime-planner-preview.ts` | Planner keeps localized time dimensions instead of falling back to the wrong column. |
| `apps/desktop/src/lib/safe-sql-preview.ts` | Trend SQL now supports Excel serial dates/string dates and returns readable date buckets. |
| `apps/desktop/src/pages/DataSources.tsx` | Clarifies backend/offline boundary for local-first usage. |
| `apps/desktop/src/lib/understanding-next/understanding-next.test.ts` | Added cross-domain lens tests for revenue, operations, inventory, dirty export, blocked schema, customer dominance, and finance not implemented. |
| `apps/desktop/e2e/sample_data_domain_coverage.spec.ts` | Added UI assertions that local datasets must show lens-first orientation and must not leak legacy guided-view blocks. |

### Verification

```bash
cd apps/desktop && npx tsc --noEmit --pretty false
→ 0 errors

cd apps/desktop && npx vitest run src/lib/analysis-runtime-contract.test.ts src/lib/runtime-planner-preview.test.ts src/lib/safe-sql-preview.test.ts src/lib/understanding-next --reporter=verbose --pool=forks
→ 157/157 PASS

cd apps/desktop && npx playwright test e2e/sample_data_domain_coverage.spec.ts -g "BHX_PHIEUXUAT|motodetail|bcctnhapTTKT|PLU|QUAN_LY" --reporter=list --workers=1
→ 7/7 PASS (50.1s)
```

### Verdict

- Runtime/UI smoke for covered sample subset: PASS.
- Domain lens orientation: PASS for asserted coverage across revenue, operations, inventory, dirty export, blocked schema, and finance not implemented.
- Semantic usefulness: still PARTIAL until product/user review validates exact wording and business priority.
- Finance: NOT IMPLEMENTED; represented as a blocked/not implemented lens, no executable finance action.

## Session Intent

Complete LIMITED UI wiring of `understanding-next` into Home for local file datasets only.  
QA phase: pure lib verified. UI phase: conditional wiring, no deletion of old pipeline.

---

## Phase 1 Results (Pure Lib — from previous session, unchanged)

- `MET.ID` / `MET.\nID` fix: classified as `row_type` (not `technical`) when values are MOTO/PAY/PAY+
- Finance domain explicitly `NOT IMPLEMENTED`
- Real-sample test suite: 92/92 tests PASS

---

## Phase 2 Results (UI Wiring — this session)

### Touched Files

| File | Action |
|---|---|
| `apps/desktop/src/components/analysis/UnderstandingNextCard.tsx` | **NEW** — UI card for local file datasets only. Shows: documentType, grain, detectedDomains, sourceRowCount, sampleRowCount, parsedRowCount, dirtySignals, perspectives, recommendedQuestions, availableActions, unavailableActions. Finance domain explicitly shown as "Not implemented". |
| `apps/desktop/src/pages/Home.tsx` | **MODIFIED** — Added `datasetUnderstandingNext` memo using `createDatasetUnderstandingResult()`. Conditionally renders `UnderstandingNextCard` for local files, `DatasetUnderstandingCard` for virtual business views. Old pipeline preserved. |
| `apps/desktop/src/pages/Investigation.tsx` | **MODIFIED** — `isDataQualityReview` check: if `_originalNextAction.actionKind === 'data_quality_review'`, renders amber "Data Quality Review Required" banner and disables Run preview button. |
| `AGENT_IMPLEMENTATION_PLAN_UNDERSTANDING_NEXT_UI_WIRING.md` | **NEW** — Implementation plan file as required. |

### UI Architecture

```
Local file dataset:
  Home → createDatasetUnderstandingResult() → UnderstandingNextCard
         → adaptNextActionsToLegacy() → AnalysisOpportunityGrid
         → handleSelectAnalysisAction (typed, no as any)
         → isDataQualityReviewAction() → Investigation (Run disabled for DQR)

Virtual business view / legacy:
  Home → guided-investigation-pipeline → DatasetUnderstandingCard (unchanged)
```

---

## Phase 3 Results (Typed Bridge Adapter — this session)

### Touched Files

| File | Action |
|---|---|
| `apps/desktop/src/lib/understanding-next/action-adapter.ts` | **NEW** — Typed bridge: `NextAnalysisAction → AdaptedAnalysisAction`. Preserves `sourceUnderstandingActionKind`, `questionId`, `executionScope` in `_nextMetadata`. Exports `isDataQualityReviewAction()` type guard and `isAdaptedFromUnderstandingNext()`. No `as any`. |
| `apps/desktop/src/lib/understanding-next/action-adapter.test.ts` | **NEW** — 26 unit tests: data_quality_review mapping, metadata preservation, structural blocking, type guard correctness. |
| `apps/desktop/src/components/analysis/UnderstandingNextCard.tsx` | **MODIFIED** — Replaced inline `as any` map with `adaptNextActionsToLegacy()`. |
| `apps/desktop/src/pages/Home.tsx` | **MODIFIED** — Removed `as any`, uses `isDataQualityReviewAction()` typed helper. Handler now typed with legacy `AnalysisAction`. |
| `apps/desktop/src/pages/Investigation.tsx` | **MODIFIED** — Replaced `(analysisAction as any)._originalNextAction?.actionKind` with `isDataQualityReviewAction(analysisAction)`. |

Codex QA follow-up: removed the remaining `onSelectAction={handleSelectAnalysisAction as any}` casts in the local understanding/legacy card wiring. Remaining `as any` occurrences in `Home.tsx` are unrelated batch/source metadata and question-suggestion legacy casts, not the `understanding-next` action bridge.

---

## Verification Evidence

### 1. TypeScript
```bash
cd apps/desktop && npx tsc --noEmit --pretty false
→ 0 errors
```

---

## 2026-06-19 — Period Trend Runtime + Branding Assets

### Runtime Follow-up

- Fixed `month`/`year`/`period` dimensions being rejected as non-temporal trend dimensions.
- Added shared `apps/desktop/src/lib/time-dimension.ts` classification.
- Safe DuckDB SQL now treats month labels such as `may`, `jun`, and `jul` as period buckets instead of forcing timestamp casts.
- Result validation uses the same temporal rule and no longer emits a false missing-date warning for `month` trends.
- Runtime/SQL/validator focused suite passes: 5 files, 50 tests; TypeScript has 0 errors.

### Branding

- Copied `sample data/Group 9.svg` to:
  - `apps/desktop/public/favicon.svg`
  - `apps/desktop/public/branding/lightbi-icon.svg`
- Copied `sample data/LightBI.png` to `apps/desktop/public/branding/lightbi-wordmark.png`.
- Replaced the temporary `L` sidebar badge and text label in `AppLayout.tsx` with the supplied icon and wordmark.
- Both branding asset URLs return HTTP 200 from Vite.
- Frontend dev server restarted with `--host 0.0.0.0`; external URL: `http://100.94.184.141:5173/`.

Branding follow-up: replaced the sidebar PNG wordmark with the newer `sample data/lightbi.svg`, served as `apps/desktop/public/branding/lightbi-wordmark.svg`. `AppLayout.tsx` now references the SVG; HTTP check returns 200 and TypeScript remains clean.

---

## 2026-06-19 — Full-File Worker Runtime Phase 4

### Goal

Close the large local-file path end to end: use a representative matrix sample for understanding, keep full rows out of React state, and execute local analysis against the full source file.

### Changes Applied

- Added `runtime-dataset-source.ts` with local file references and explicit runtime row scopes.
- Added worker-backed full-file materialization:
  - `full-file-runtime-parser.ts`
  - `full-file-runtime.worker.ts`
  - `full-file-runtime-materializer.ts`
- Local runtime now stores lightweight `File` references in the investigation session.
- On `Run preview`, the worker parses all rows and emits normalized JSON text directly for DuckDB registration.
- `local-duckdb-executor.ts` prefers the full local source when available and reports `executionScope: "full_file"`.
- Online/database paths retain the existing row fallback behavior.
- Home dataset status now reports representative understanding scope and whether runtime uses the full local file.
- Investigation result now displays `Full file`, `Retained rows`, `Representative sample`, or `Preview rows`.
- Added `bank_additional_full_trend.spec.ts` to lock the exact `month` trend failure reported from the UI.

### Verified

```bash
cd apps/desktop && npx vitest run src/lib/full-file-runtime-parser.test.ts src/lib/local-duckdb-executor.test.ts src/lib/analysis-runtime-contract.test.ts src/lib/runtime-planner-preview.test.ts src/lib/safe-sql-preview.test.ts src/lib/result-validator-contract.test.ts src/lib/row-surface.test.ts --reporter=verbose --pool=forks
→ 7 files passed, 66 tests passed
```

```bash
cd apps/desktop && npx playwright test e2e/bank_additional_full_trend.spec.ts --reporter=line --workers=1
→ 1 passed (14.4s)
```

The E2E uploads `bank-additional-full.xlsx` (41,188 rows), selects `Indicator over time`, executes the `month` trend, and asserts:

- `EXECUTED`
- `Full file`
- no `DUCKDB_` error
- no blocked/empty SQL
- no false missing date/time warning

Screenshot: `ui-audit/bank-additional-full-trend-full-file.png`.

```bash
cd apps/desktop && npx tsc --noEmit --pretty false
→ 0 errors
```

```bash
cd apps/desktop && npx vite build
→ PASS; emitted full-file-runtime.worker chunk and DuckDB worker/WASM assets
```

### Build Boundary

`npm run build` still fails during the broader `tsc -b` project build because of numerous pre-existing legacy contract/test type errors outside this phase. The new worker runtime itself passes focused typecheck, tests, browser E2E, and direct Vite production bundling.

### Next Phase

Database pushdown: count/profile/aggregation should execute inside PostgreSQL, MySQL/MariaDB, MongoDB Atlas, and SQLite instead of transferring sampled table rows into the frontend runtime.

### Table Preview Summary + Chart Follow-up

- Table preview results now keep the existing dataset/logistics information summary and render an automatic chart underneath when a useful categorical dimension exists.
- Auto-chart selection prefers fields such as route, status, branch/hub, warehouse, region, category, and control state.
- Numeric fields and high-cardinality identifier columns are excluded from automatic category selection.
- The chart shows the top 10 category counts from the bounded table preview and is explicitly titled `Preview distribution by <field>`.
- If no reliable category exists, the existing table-only behavior remains unchanged.
- Added regression tests to `chart-preview-model.test.ts`.
- Added browser E2E `table_preview_summary_chart.spec.ts` using `bcctnhapTTKT_19122024.xlsx`.

Verified:

```bash
cd apps/desktop && npx vitest run src/lib/chart-preview-model.test.ts src/lib/full-file-runtime-parser.test.ts src/lib/local-duckdb-executor.test.ts --reporter=dot --pool=forks
→ 3 files passed, 26 tests passed
```

```bash
cd apps/desktop && npx playwright test e2e/table_preview_summary_chart.spec.ts --reporter=line --workers=1
→ 1 passed (8.3s)
```

Screenshot: `ui-audit/table-preview-summary-and-chart.png`.

---

## 2026-06-19 — TablePro Advanced-Mode Reference

- Shallow-cloned `https://github.com/TableProApp/TablePro` into `references/TablePro`.
- Reference commit: `e84c6bf` (`2026-06-18`, `Update appcast.xml for v0.52.0`).
- Repository size after shallow clone: approximately 135 MB.
- TablePro is a native Swift/macOS codebase, so it is an interaction and architecture reference rather than a directly reusable React implementation.
- License is AGPLv3. Use UI/workflow ideas and independently implement LightBI components; avoid copying source implementation unless AGPL obligations are intentionally accepted.
- Relevant Advanced Mode concepts: connection manager, schema browser, SQL editor, split panes, data grid, filter/sort/edit workflow, query history, SSH/SSL profiles, AI explain/optimize, and plugin-based database drivers.

### 2. Unit / Integration Tests (Phase 3 — with adapter)
```bash
cd apps/desktop && npx vitest run src/lib/understanding-next --reporter=verbose --pool=forks
→ 118/118 PASS (3 test files: understanding-next.test.ts + real-sample.test.ts + action-adapter.test.ts)
→ 26 new adapter tests added this session
```

### 3. E2E Sample Data Domain Coverage (post-adapter rerun)
```bash
cd apps/desktop && npx playwright test e2e/sample_data_domain_coverage.spec.ts \
  -g "BHX_PHIEUXUAT|motodetail|bcctnhapTTKT|PLU|QUAN_LY" --reporter=list --workers=1
→ 7/7 passed (49.8s, Codex QA rerun after removing action wiring casts)
```


---

## Sample File Verdict Table

| File / Pattern | documentType | UI Verdict | Runtime Verdict | Semantic Verdict | Evidence |
|---|---|---|---|---|---|
| `BHX_PHIEUXUAT.xlsx` | `retail_sales_document` | PASS | PASS | PARTIAL — customer demoted (dominance), top questions: revenue/store/payment | e2e PASS + real-sample test |
| `bcctnhapTTKT_19122024.xlsx` | `logistics_intake_report` | PASS | PASS | PARTIAL — on-time/route signals detected, top questions include logistics ops | e2e PASS + real-sample test |
| `bcctnhapTTKT_23122024.xlsx` | `logistics_intake_report` | PASS | PASS | PARTIAL — same as 19122024 pattern | e2e PASS |
| `bcctnhapTTKT_24122024.xlsx` | `logistics_intake_report` | PASS | PASS | PARTIAL — same as 19122024 pattern | e2e PASS |
| `motodetail.xlsx` | `dirty_operational_export` | REVIEW | INTENTIONALLY DISABLED | MET.\nID → row_type (not technical); data_quality_review top action; Run button disabled | e2e REVIEW + real-sample test |
| `PLU ALL FRESH 22.03.2021.xlsx` | `product_master` | PASS | PASS | PARTIAL — SKU/product signals detected; inventory questions | e2e PASS + real-sample test |
| `QUAN_LY (DANH SACH XEP HANG)` | N/A (schema empty) | BLOCKED | BLOCKED (no runtime leak) | BLOCKED — headerStatus=failed; no DuckDB/SQL error shown to user | e2e BLOCKED (clean) + real-sample test |

---

## Domain Coverage Status

| Domain | Status | Notes |
|---|---|---|
| `operations` (logistics) | PARTIAL | on-time/route/trip/vehicle detected; not all question variants covered |
| `revenue` (retail/sales) | PARTIAL | BHX: documentType correct; customer demoted; top questions revenue-oriented |
| `inventory` | PARTIAL | PLU: product_master detected; SKU identifier; not used as default dimension |
| `customer` | PARTIAL | Detected but demoted when dominance > 0.9 |
| `performance` | PARTIAL | management_ranking documentType works when schema recoverable |
| `finance` | **NOT IMPLEMENTED** | No questions generated; clearly marked in code and UI |

---

## Hard Rules Verified

- ✅ No filename/sheet/path hardcoding in lib or UI code
- ✅ Finance domain explicitly NOT IMPLEMENTED (not falsely claimed)
- ✅ QUAN_LY schema empty → BLOCKED clean, no runtime/DuckDB leak
- ✅ motodetail data_quality_review → Run button intentionally disabled
- ✅ MET.\nID NOT classified technical when values are MOTO/PAY/PAY+
- ✅ `__PowerAppsId__` correctly classified as technical
- ✅ Customer signal demoted when dominanceRatio > 0.9 (BHX Khách lẻ)
- ✅ sourceRowCount / sampleRowCount / parsedRowCount shown separately in UI
- ✅ Old guided-investigation-pipeline and DatasetUnderstandingCard NOT deleted
- ✅ Virtual business views still use old pipeline

---

## Open Issues / Not Verified

1. **Finance domain**: NOT IMPLEMENTED. No questions generated.
2. **Semantic quality of questions** (TTKT/BHX): top questions are correct category but not yet validated for exact relevance in product/user testing.
3. **E2E motodetail**: REVIEW state only — no chart/table output, Run button intentionally disabled. Test harness correctly classifies this as non-error REVIEW.
4. **PLU PASS**: e2e passes but semantic question quality (specific PLU analysis questions) is PARTIAL.
5. **Multi-file (Group A/B/C/D)**: Not in scope for this session. Separate track.

---

## Next Steps (NOT started this session)

1. Finance domain: add minimal question templates for balance/profit/expense signals.
2. TTKT semantic: validate specific question labels against user expectations.
3. BHX semantic: confirm revenue/store/payment questions are actually most useful.
4. E2E harness: strengthen assertions beyond "no crash" to verify correct documentType shown in UI.

---

## Codex QA Update — Superstore / Physical Measure Aggregation Fix

### Scope

User reported `Sample - Superstore for Tableau 9.x versions.xls` crashed with:

```text
Cannot convert a BigInt value to a number
```

After the BigInt route was fixed, Codex QA found a second runtime issue: `Sales over time` rendered `$1.00`, `$2.00`, etc. because physical measure aggregation metadata was being lost and DuckDB fell back to `COUNT(Sales)`.

### Fixes Applied

- `local-duckdb-executor.ts`: normalizes DuckDB `BigInt` values before returning rows to React.
- `understanding-core/question-engine.ts`: core actions now default physical trend/group_by measures to `SUM`, while virtual measures (`record_count`, `row_count`) remain `COUNT`.
- `understanding-core/next-adapter.ts`: preserves `measureAggregations` and `derivedMeasures` when converting core questions to understanding-next questions.
- `understanding-next/contracts.ts`: `BusinessQuestion` now carries `measureAggregations` and `derivedMeasures`.
- `understanding-next/runtime-action-guard.ts`: guarded actions preserve aggregation and derived-measure metadata.
- `understanding-next/question-fit-engine.ts`: lens `defaultAction` preserves aggregation metadata, and legacy question-fit actions also default physical measures to `SUM`.
- `guarded-sum-bridge.ts`: does not downgrade explicit `SUM` / `AVG` metadata to `COUNT`.
- `numeric-health-gate.ts`: accepts decimal JS numbers and decimal numeric strings as valid numeric values.
- `safe-sql-preview.ts`: numeric SUM/AVG uses a safer decimal-preserving cast path.
- `ChartPreviewRenderer.tsx`: currency axis formatting no longer compresses small currency values into misleading compact labels.
- `e2e/superstore_probe.spec.ts`: added real UI regression for the Superstore file. It asserts no BigInt crash, no canonical/DuckDB leak, `Sales` is used as the measure, and runtime values are real aggregated currency values rather than COUNT output.

### Verified Commands

```bash
cd apps/desktop && npx tsc --noEmit --pretty false
→ 0 errors
```

```bash
cd apps/desktop && npx vitest run src/lib/guarded-sum-bridge.test.ts src/lib/understanding-next src/lib/understanding-core src/lib/safe-sql-preview.test.ts src/lib/local-duckdb-executor.test.ts --reporter=verbose --pool=forks
→ 8 test files passed, 189 tests passed
```

```bash
cd apps/desktop && npx playwright test e2e/superstore_probe.spec.ts --reporter=list --workers=1
→ 1/1 passed
→ Raw evidence sample: Sales values include $272.74, $127.10, $468.90; no $1.00 COUNT-only output.
```

```bash
cd apps/desktop && npx playwright test e2e/understanding_core_runtime.spec.ts e2e/bank_additional_full_probe.spec.ts e2e/world_bank_indicators_probe.spec.ts e2e/superstore_probe.spec.ts --reporter=list --workers=1
→ 8/8 passed
```

### Evidence

- `ui-audit/superstore-probe-2026-06-16/home.png`
- `ui-audit/superstore-probe-2026-06-16/orientation.png`
- `ui-audit/superstore-probe-2026-06-16/investigation_before.png`
- `ui-audit/superstore-probe-2026-06-16/investigation_after.png`

### Verdict

Superstore local-first runtime: **PASS** for this probe.

This is not a filename-specific patch. The fix is at the action/aggregation bridge, numeric health, DuckDB value normalization, and SQL compilation layers.

---

## Codex Architecture Update — Source-Neutral Understanding Boundary

### Why

LightBI's critical semantic layer must work for local files first, then online sheets/files and database tables without rewriting the understanding logic. The source type must be metadata only. It must not alter signal detection, questions, or actions for the same columns and rows.

### Changes Applied

- `understanding-core/contracts.ts`
  - Added `UnderstandingSourceKind`: `local_file`, `online_file`, `database_table`, `api_response`, `unknown`.
  - Added `sourceKind` and `sourceLabel` to `UnderstandingCoreInput`.
  - Added `kind`, `label`, `fileNames`, and `sheetNames` to `UnderstandingCoreResult.source`.

- `understanding-core/source-input.ts`
  - New adapter boundary: `createUnderstandingCoreInputFromSource(source)`.
  - Normalizes local file, online file, database table, API response, and unknown descriptors into the same `UnderstandingCoreInput`.

- `understanding-core/question-engine.ts`
  - Preserves source metadata while keeping semantic generation based only on `columns + rows`.

- `understanding-core/next-adapter.ts`
  - Preserves source file/sheet metadata when converting to the existing understanding-next UI shape.

- `Home.tsx`
  - Local file flow now enters `understanding-core` through `createUnderstandingCoreInputFromSource({ kind: "local_file", ... })`.
  - This keeps current local-first behavior while preparing the same boundary for online/database sources.

- `understanding-core/source-input.test.ts`
  - Proves local file metadata normalization.
  - Proves source metadata survives adapter conversion.
  - Proves local file, online file, and database table descriptors with the same schema/rows produce identical signals/questions/actions.

### Verified Commands

```bash
cd apps/desktop && npx vitest run src/lib/understanding-core src/lib/understanding-next/action-adapter.test.ts --reporter=verbose --pool=forks
→ 4 test files passed, 48 tests passed
```

```bash
cd apps/desktop && npx tsc --noEmit --pretty false
→ 0 errors
```

```bash
cd apps/desktop && npx playwright test e2e/superstore_probe.spec.ts e2e/bank_additional_full_probe.spec.ts e2e/world_bank_indicators_probe.spec.ts --reporter=list --workers=1
→ 3/3 passed
```

### Verdict

Source-neutral understanding boundary: **PASS** for contract/unit coverage and current local-file UI regression.

Next implementation target: connect online-file and database-table sample previews to `createUnderstandingCoreInputFromSource()` instead of building separate semantic logic.

---

## 2026-06-19 — Full-File Understanding Evidence Phase 1

### Context

Local files, online links, and database sources now pass the first "understand source" layer and can show a bounded preview in the UI. The next issue was semantic truth: `Home.tsx` still passed `currentDataset.previewRows` into `understanding-core`, so signal health, dominance, distinct counts, and top values were based on preview/sample rows even when inspectors had parsed the full local/online file.

This matters for sorted files such as `bank-additional-full.xlsx`: first preview rows can hide later values like `cellular`, causing the understanding layer to miss valid campaign/contact-channel questions.

### Changes Applied

- `apps/desktop/src/lib/column-profiler.ts`
  - `profileColumns()` now profiles the provided full row set instead of slicing the first 1,000 rows.
  - Extended `ColumnProfile` with optional full-evidence fields:
    - `topValueCounts`
    - `nonEmptyCount`
    - `dominanceRatio`
    - `profiledRowCount`
    - `profilingScope`

- `apps/desktop/src/lib/understanding-core/contracts.ts`
  - Added `InputColumnProfile`.
  - Added optional `columnProfiles` to `UnderstandingCoreInput`.

- `apps/desktop/src/lib/understanding-core/source-input.ts`
  - Preserves/clones `columnProfiles` across the source-neutral adapter.

- `apps/desktop/src/lib/understanding-core/signal-engine.ts`
  - Signal health now prefers `input.columnProfiles[column]` when available.
  - Falls back to profiling `input.rows` only when full/source profiles are absent.
  - Signal usability thresholds now compare against `sourceRowCount`, not preview row count.

- `apps/desktop/src/pages/Home.tsx`
  - Passes `currentDataset.profiles` into `createUnderstandingCoreInputFromSource()` for local files, online files, and database tables.
  - UI preview rows remain bounded; only semantic evidence is upgraded.

- Tests
  - Added `apps/desktop/src/lib/column-profiler.test.ts`.
  - Added understanding-core regression: preview rows show only `telephone`, full profile shows `telephone + cellular`, and the core still produces `engagement_by_contact_channel`.

### Verified Commands

```bash
cd apps/desktop && npx vitest run src/lib/column-profiler.test.ts src/lib/online-source-inspector.test.ts src/lib/source-preflight.test.ts src/lib/batch-inspection.test.ts src/lib/understanding-core --reporter=verbose --pool=forks
→ 7 test files passed, 53 tests passed
```

```bash
cd apps/desktop && npx tsc --noEmit --pretty false
→ 0 errors
```

### Current Boundary

- Full-file evidence is now available to the understanding layer when the inspector has full rows, which is true for local files and current online file parsing.
- Database connectors still inspect bounded samples by design. Their `profiles` reflect sampled rows until a separate full-table profiling/count strategy is added.
- Runtime execution scope is unchanged: actions can still be marked `sample_preview` when only preview rows are present.

### Verdict

Full-file understanding evidence phase 1: **PASS** for local/online source profiling and source-neutral core wiring.

---

## 2026-06-19 — Full-File Understanding Runtime Rows Phase 2

### Context

Phase 1 moved semantic evidence from preview/sample profiles to full-file profiles, but runtime/investigation still had a second bottleneck:

- Local/online inspectors only exposed `preview_rows`.
- `Home.tsx` stored only preview rows on `currentDataset`.
- `createInvestigationSession()` capped rows at 1,000 before navigating to Investigation.

That meant the UI could understand full-file profiles but actual runtime preview/execution still queried a capped row set.

### Changes Applied

- `apps/desktop/src/lib/source-preflight.ts`
  - Added optional `analysis_rows` to top-level metadata and workbook sheet metadata.

- `apps/desktop/src/lib/local-file-inspector.ts`
  - CSV/TSV/TXT, JSON, and workbook sheets now expose:
    - `preview_rows`: bounded representative rows for display.
    - `analysis_rows`: full parsed rows for understanding/runtime.

- `apps/desktop/src/lib/online-source-inspector.ts`
  - Google Sheets/CSV URL/Excel/MS365 workbook parsing now exposes full `analysis_rows` alongside bounded `preview_rows`.

- `apps/desktop/src/pages/Home.tsx`
  - Stores `analysisRows` on `currentDataset`.
  - For local batch/family selection, combines full `analysis_rows` across files in the selected family.
  - `understanding-core` and investigation sessions now prefer `analysisRows`, then fall back to `previewRows`.

- `apps/desktop/src/lib/investigation-session.ts`
  - Removed the old 1,000-row cap.
  - Sessions still deep-clone rows to protect the original dataset object.

- Tests
  - Added `apps/desktop/src/lib/local-file-inspector.test.ts`.
  - Updated `online-source-inspector.test.ts` to assert `analysis_rows`.
  - Updated `investigation-session.test.ts` so full rows are preserved.

### Verified Commands

```bash
cd apps/desktop && npx vitest run src/lib/local-file-inspector.test.ts src/lib/online-source-inspector.test.ts src/lib/investigation-session.test.ts src/lib/column-profiler.test.ts src/lib/understanding-core src/lib/local-duckdb-executor.test.ts --reporter=verbose --pool=forks
→ 8 test files passed, 46 tests passed
```

```bash
cd apps/desktop && npx tsc --noEmit --pretty false
→ 0 errors
```

### Current Boundary

- Local files and online files now preserve full parsed rows for understanding and local runtime execution.
- UI preview remains bounded via `preview_rows`.
- Database sources still only expose sampled rows because the connector API intentionally samples read-only tables/collections. Full database profiling/execution needs a separate strategy: count query, sampled profile, and optional pushdown runtime per DB engine.

### Verdict

Full-file runtime rows phase 2: **PASS** for local/online file flows and investigation session wiring.

---

## 2026-06-19 — Semantic Matrix Sampling Performance Phase 3

### Context

Phase 2 proved full-file understanding/runtime works, but holding and processing every parsed row in React state is risky for larger local/online files. Files from a few thousand to tens of thousands of rows can still be parsed quickly, but repeatedly profiling, adapting, and passing full row arrays through the UI can make the app feel slow or freeze on weaker browsers.

The new boundary separates three row surfaces:

- `preview_rows`: bounded UI display rows, now representative across the file instead of only the first 1,000.
- `semantic_rows`: deterministic matrix sample for understanding/profile evidence.
- `analysis_rows`: full retained rows only when the file is small enough to keep safely.

### Changes Applied

- `apps/desktop/src/lib/semantic-sampler.ts`
  - Added deterministic matrix sampling with head, tail, evenly spaced, and seeded random rows.
  - Default semantic budget is 2,000 rows.
  - Small datasets under the budget are marked `strategy: "full"`.

- `apps/desktop/src/lib/source-preflight.ts`
  - Added `semantic_rows`, `semantic_sample`, and `analysis_row_scope` metadata to top-level datasets and workbook sheets.

- `apps/desktop/src/lib/local-file-inspector.ts`
  - CSV/TSV/TXT, JSON, and workbook sheets now emit `semantic_rows`.
  - Full `analysis_rows` are retained only up to 20,000 rows.
  - Larger local files report `analysis_row_scope: "not_retained"`.
  - Column profiles are computed from `semantic_rows` with the original source row count preserved.

- `apps/desktop/src/lib/online-source-inspector.ts`
  - Google Sheets, CSV URLs, Excel URLs, and MS365 Excel now use the same `preview_rows` / `semantic_rows` / bounded `analysis_rows` split.

- `apps/desktop/src/pages/Home.tsx`
  - Understanding-core now prefers `semanticRows` so the "Hiểu dữ liệu" layer uses matrix sampling instead of full arrays.
  - Investigation sessions still prefer `analysisRows` when retained, then fall back to `semanticRows`, then preview rows.
  - Local batch/family selection aggregates `semantic_rows` separately from retained `analysis_rows`.

- Tests
  - Added `apps/desktop/src/lib/semantic-sampler.test.ts`.
  - Extended local inspector tests with a 20,050-row CSV regression:
    - preview stays at 1,000 rows.
    - semantic sample uses `matrix_sample`.
    - full `analysis_rows` are not retained.
    - tail-only values such as `cellular` still appear in semantic evidence.

### Verified Commands

```bash
cd apps/desktop && npx vitest run src/lib/semantic-sampler.test.ts src/lib/local-file-inspector.test.ts src/lib/online-source-inspector.test.ts src/lib/investigation-session.test.ts src/lib/column-profiler.test.ts src/lib/understanding-core --reporter=verbose --pool=forks
→ 8 test files passed, 36 tests passed
```

```bash
cd apps/desktop && npx tsc --noEmit --pretty false
→ 0 errors
```

### Current Boundary

- This phase reduces React/UI pressure and semantic profiling cost, but it is not a streaming parser or web-worker architecture yet.
- Files above 20,000 parsed rows no longer keep full `analysis_rows` in metadata; runtime falls back to the semantic matrix sample until a pushdown/worker/full-runtime path is added.
- Database connectors remain sample-first and unchanged in this phase.

### Verdict

Semantic matrix sampling performance phase 3: **PASS** for local/online source inspection, understanding wiring, and oversized-row retention guard.

### Follow-up Runtime Fix

After manual UI testing on `bank-additional-full.xlsx`, Investigation showed `Execution Failed: No data rows available to query.` Root cause:

- Oversized files correctly do not retain full `analysis_rows`.
- `Home.tsx` stored missing retained analysis rows as an empty array.
- The investigation handoff used `analysisRows || semanticRows`; because `[]` is truthy in JavaScript, it passed an empty array instead of falling back to `semanticRows`.

Fix applied:

- Added `apps/desktop/src/lib/row-surface.ts`.
- `selectFirstNonEmptyRows()` skips empty row arrays and falls back to the next available row surface.
- `Home.tsx` now uses it when creating investigation sessions and when feeding understanding-core rows.
- Added `apps/desktop/src/lib/row-surface.test.ts`.

Verified:

```bash
cd apps/desktop && npx vitest run src/lib/row-surface.test.ts src/lib/semantic-sampler.test.ts src/lib/local-file-inspector.test.ts src/lib/investigation-session.test.ts --reporter=verbose --pool=forks
→ 4 test files passed, 11 tests passed
```

```bash
cd apps/desktop && npx tsc --noEmit --pretty false
→ 0 errors
```

---

## 2026-06-19 — TablePro Architecture Audit for Advanced Mode

### Reference Reviewed

- Cloned `TableProApp/TablePro` into `references/TablePro`.
- Reviewed commit `e84c6bf` as an architecture reference.
- TablePro is AGPL-3.0; the audit extracts design principles only and does not copy implementation code.

### Main Findings

- Capability-driven plugin drivers keep database-specific behavior outside UI and orchestration.
- Connections are explicit per session/tab and concurrent connection/schema work is deduplicated with keyed in-flight tasks.
- Query execution is two-phase: rows render first, then keys, foreign keys, enum values, counts, and other metadata enrich the result.
- Query generations and cancellation guards prevent stale async results from overwriting newer runs.
- Results use ordered columns plus a typed row matrix and stable row IDs rather than per-row dictionaries.
- Large row buffers are session-only, evictable, and excluded from persisted tab state.
- Grid updates are delta-based and visible-region oriented; formatting cache work is frame-budgeted and paused during scrolling.
- Queries are bounded by default; fetch-all is an explicit memory-heavy action.

### LightBI Direction

- Keep current Simple Mode and the semantic understanding engine.
- Build Advanced Mode as a separate query workspace sharing connector identity/capabilities.
- Introduce `QueryResultBuffer`, per-tab `QueryRunState`, `ResultBufferStore`, schema catalog cache, query history, cancellation, and server-side pagination.
- Start read-only with Postgres, then MySQL/MariaDB and SQLite; treat MongoDB as a capability-aware non-SQL editor path.
- Feed both the virtualized grid and chart workbench from the same result buffer.

### Detailed Audit

See `docs/architecture/AUDIT-tablepro-advanced-data-workspace.md`.

---

## 2026-06-19 — Shared Simple/Advanced Execution Core Phase 1

### Audit Verdict

- Simple Mode already had representative `previewRows`, `semanticRows`, bounded `analysisRows`, and a local inspection generation guard.
- Replacing all semantic object rows with a matrix would conflict with current profiling and understanding code without enough benefit.
- Cancellation and stale-result protection were incomplete across Investigation, backend fetch, local DuckDB, and the full-file worker.
- A shared execution lifecycle plus a result-buffer boundary improves Simple Mode now and gives Advanced Mode a reusable foundation.

### Changes Applied

- Added `QueryResultBuffer`, column/cell/page contracts, and `QueryRunState` to `@lightbi/core-types`.
- Added `ExecutionRunCoordinator` and object-row/matrix adapters to `@lightbi/runtime`.
- Replaced Home's page-local numeric inspection generation with the shared coordinator.
- Added `AbortSignal` support to local file inspection, backend preview, local DuckDB, JS fallback, and full-file materialization.
- Full-file worker now terminates on cancellation.
- Local DuckDB connections now close in `finally`, including failed runs.
- Investigation rejects stale results and normalizes successful/failed output through one result buffer before applying summary/chart state.
- Added focused lifecycle, buffer, cancellation, and connection-cleanup tests.

### Verification

```bash
cd apps/desktop && npx tsc --noEmit --pretty false
→ 0 errors
```

```bash
cd apps/desktop && npx vitest run src/lib/shared-execution-core.test.ts src/lib/backend-preview-executor.test.ts src/lib/local-duckdb-executor.test.ts src/lib/local-file-inspector.test.ts --reporter=verbose --pool=forks
→ 4 test files passed, 26 tests passed
```

### Existing Repository Test/Build Drift

- `Investigation.test.tsx` has 7 pre-existing text assertions that expect `Execution Boundary Failed`, while the current UI renders `Execution Failed`; one assertion also expects a single match although the UI intentionally renders two failure surfaces.
- `npm run build` remains blocked by broad pre-existing contract drift and unused-symbol errors across Understanding, Dashboard, and test fixtures.
- The error attributable to the new runtime code (`erasableSyntaxOnly` parameter-property syntax) was corrected; direct app typecheck passes.

### Architecture Record

See `docs/architecture/ADR-113-shared-simple-advanced-execution-core.md`.

---

## 2026-06-19 — JiveDB Audit and Advanced Inheritance Blueprint

### JiveDB Reference

- Cloned `JiveGroup/JiveDBApp` to `references/JiveDBApp` at commit `ecc2057`.
- The repository contains public product docs, release notes, deterministic DB fixtures, and Docker/TLS/SSH test infrastructure, but no application source.
- Its proprietary EULA prohibits reverse engineering and competing-product use; no binary inspection or code/fixture copying was performed.

### Public Product/QA Lessons

- Estimate row counts first and compute exact counts in the background.
- Use server-side bounded filtering, sorting, and pagination with a virtualized grid.
- Bind query tabs explicitly to database/schema context.
- Define multi-statement semantics: sequential, stop on error, preserve prior results, understand dollar-quoted bodies.
- Invalidate only affected schema groups/tabs after DDL.
- Preserve `bigint`/`numeric`/`decimal` precision as strings with native type metadata.
- Serialize SQLite access, use a safe WAL policy, and close cleanly.
- Build an original deterministic acceptance matrix covering multi-DB/schema, native types, relationships, partitions, TLS/mTLS, SSH, and non-relational values.

### LightBI Architecture Finding

- LightBI already has a Rust `SourceRegistry`, `ConnectorContract`, `SchemaRegistry`, `ExecutionBackend`, and matrix `ResultSet`.
- The current `/api/database/inspect` prototype bypasses that architecture, hardcodes engines in `main.rs`, casts Postgres/MySQL values to text, reports sample size as row count, and creates disposable pools.
- Advanced must not build another connector layer. The existing Rust platform should be upgraded, and Simple database intake should migrate to it first as proof of shared ownership.

### Accepted Direction

- Shared: connection sessions, schema catalog, capabilities, execution gate, query lifecycle, result buffers, formatting, and chart input.
- Simple-only: semantic sampling, business understanding, readiness, and guided opportunities.
- Advanced-only: explorer, editor tabs, virtualized matrix grid, history, pagination, and result-set tools.
- Start platform convergence and read-only Postgres before adding MySQL/MariaDB, SQLite, and MongoDB.

### Documents

- `docs/architecture/AUDIT-jivedb-public-product-evidence.md`
- `docs/architecture/ADR-114-advanced-mode-inheritance-blueprint.md`

---

## 2026-06-19 — Advanced SQL Workspace Phase B Foundation

### Implemented

- Added in-memory PostgreSQL connection sessions under `apps/server/src/advanced.rs`; the browser receives only `connectionId`, display name, database, and provider.
- Added Advanced endpoints for connection open/close, schema discovery, bounded query execution, and run cancellation.
- Query execution is protected by lexical `SELECT`/`WITH` admission, PostgreSQL `READ ONLY` transactions, 15-second statement timeout, and a hard maximum of 1,000 rows.
- Schema explorer returns schemas, tables/views, native columns/nullability, and fast estimated row counts.
- Result transport matches shared `QueryResultBuffer`: ordered typed columns and row matrices. `INT8`/`NUMERIC` remain strings to preserve precision.
- Added `/advanced` workspace with session form, schema explorer, quoted table-to-SQL insertion, editor, run/cancel, row limits, windowed grid, and chart tab.
- Advanced uses the shared `ExecutionRunCoordinator`, so stale/aborted responses cannot replace the current result.
- API fallback now uses same-origin reverse proxy. Remote clients call `:5173/api`; backend port `5172` remains private.

### Acceptance Evidence

- `cargo check -p lightbi-server` passed.
- `cargo test -p lightbi-server advanced::tests` passed: 3 tests.
- `apps/desktop/node_modules/.bin/vitest run apps/desktop/src/lib/advanced-api.test.ts` passed: 2 tests.
- Live Docker PostgreSQL acceptance passed against `thaiduy-postgres`: 1 schema, 42 tables, typed query output, exact `INT8`/`NUMERIC` preservation, and mutation rejection with HTTP 400.
- Live cancellation passed: `pg_sleep(10)` cancelled with HTTP 202 and resolved as `ADVANCED_QUERY_CANCELLED`/409.
- Same-origin remote health passed at `http://100.94.184.141:5173/api/health`.
- Chromium 1440x900 checks passed for both disconnected and connected workspace states; explorer, editor, grid, navigation, and controls had no overlap.

### Running Services

- Frontend: `http://100.94.184.141:5173/advanced`
- Backend: `0.0.0.0:5172`, accessed by clients through the frontend `/api` proxy.

### Known Boundary / Next Slice

- This slice is PostgreSQL read-only only. MySQL/MariaDB, SQLite, and MongoDB remain next phases.
- Sessions/results are intentionally process/session-only; history, favorites, tabs, and eviction policy are not implemented yet.
- Schema estimates are immediate; exact background counts and server-side page/filter/sort remain deferred.
- Full desktop typecheck still reports pre-existing Understanding/Dashboard/test-fixture contract drift. No errors were reported for the new Advanced files after filtering the same run.

---

## 2026-06-19 — Advanced SQL Workspace Tabs, Paging, Sort, and Lifecycle

### TablePro Concepts Applied

- Read `QueryTab`, `QueryTabManager`, `QueryTabState`, `ResultSet`, `PaginationCoordinator`, `QueryHistoryManager`, `ConnectionManager`, and `HistoryDataProvider` from the local TablePro reference.
- Implemented the architectural principles in original LightBI code: lightweight persisted tabs, session-only results, per-tab generation/cancel, bounded history, explicit paging, and connection-owned cleanup.

### Changes

- Added multi-tab Advanced workspace. Each tab keeps independent SQL, row limit, page offset, sort, result, grid/chart mode, errors, warnings, and execution lifecycle.
- Tab persistence stores only ID/title/SQL/limit, capped at 12 tabs and 100 KB SQL per tab. Rows are never persisted.
- Added browser-local query history capped at 100 entries with success/failure, database, duration, row count, and replay into the active tab.
- Selecting a table opens/reuses a named table tab; schema nodes expand to columns with native type and nullability.
- Added PostgreSQL outer-query `OFFSET` paging, hard offset cap, server execution timing, and metadata-validated ascending/descending sort.
- Added previous/next controls and sortable grid headers. Grid remains windowed to visible rows plus overscan.
- Closing a connection now aborts all owned runs before closing SQLx pool; browser `pagehide` performs best-effort cleanup.
- Mobile app shell now collapses to a 48px icon rail; Advanced hides its explorer on narrow screens and avoids global horizontal overflow.

### Verification

- Rust Advanced tests: 3 passed.
- Advanced API/workspace/component tests: 3 files, 6 tests passed.
- Vite production transform/build passed: 2,669 modules.
- Live PostgreSQL paging: offset 0 returned IDs 1/2/3; offset 3 returned 4/5/6.
- Invalid result sort returned HTTP 400 with `ADVANCED_SORT_COLUMN_INVALID`.
- Chromium connected acceptance passed: 3 tabs, 3 history entries, paging back to Page 1 after server sort.
- Desktop 1440x900 and mobile 390x844 screenshots passed; connected mobile measured `scrollWidth === clientWidth === 390`.
- Connection lifecycle acceptance passed: deleting a connection during `pg_sleep(10)` returned 204 and cancelled the run with `ADVANCED_QUERY_CANCELLED`/409.

### Running

- Frontend: `http://100.94.184.141:5173/advanced`
- Backend: `0.0.0.0:5172`, reached remotely through same-origin `/api` proxy.

### Remaining Advanced Roadmap

1. Bound server-side filters/search with parameters.
2. Exact row counts in background plus keyed schema cache/invalidation.
3. Project/backend history and favorites.
4. Multi-result/multi-statement execution, query plan, and export.
5. MySQL/MariaDB, SQLite, then capability-aware MongoDB.
6. Migrate Simple `/api/database/inspect` to the shared session/connector platform.
7. Credential vault plus TLS/SSH profiles.

---

## 2026-06-19 — Advanced Bound Filters, Schema Cache, and Lazy Exact Counts

### Changes

- Added PostgreSQL server-side filters with bound values and a strict operator set: contains, equals, starts-with, and ends-with.
- Filter columns are checked against described result metadata before quoted identifiers are emitted. Each request is capped at five filters and 1,000 characters per value.
- Added a 60-second keyed schema cache with duplicate-refresh suppression and explicit refresh invalidation.
- Added lazy exact row counts for base tables. Expanding a table requests `COUNT(*)` under a read-only transaction and five-second timeout; results are cached for five minutes.
- Added per-tab filter state and a compact result filter bar. Applying or clearing a filter resets paging while preserving each tab's independent result lifecycle.
- Closing a connection clears its schema/count caches in addition to cancelling owned runs and closing the pool.

### Verification

- `cargo check -p lightbi-server` passed.
- Rust Advanced tests: 5 passed.
- Advanced frontend tests: 3 files, 7 tests passed.
- Live PostgreSQL acceptance confirmed schema cache miss/hit, exact-count miss/hit (`directus_activity`: 496 rows), a valid `action contains login` filter, and rejection of an unknown filter column.
- A SQL-looking filter value was bound as data and returned zero rows, confirming it did not alter the query.
- Chromium acceptance passed with the expanded schema table, exact count, parameterized filter, and five filtered rows visible without overlap.

### Running

- Frontend: `http://100.94.184.141:5173/advanced`
- Backend: `0.0.0.0:5172`, reached remotely through the frontend `/api` proxy.

### Remaining Advanced Roadmap

1. Project/backend history and favorites.
2. Multi-result execution, query plan, and export.
3. MySQL/MariaDB, SQLite, then capability-aware MongoDB.
4. Migrate Simple `/api/database/inspect` to the shared session/connector platform.
5. Credential vault plus TLS/SSH profiles.

---

## 2026-06-20 — Advanced Roadmap Completion and Multi-Engine Acceptance

### Workspace and Persistence

- Added project-backed query history (bounded to 200) and favorites in `/tmp/lightbi-project-1/metadata.db`.
- Added bounded Run all for up to five quote/comment-aware read-only statements, with one session-only result buffer per generated tab.
- Added PostgreSQL JSON Explain view and CSV export from the current result page. CSV cells that could execute spreadsheet formulas are prefixed before quoting.
- Added encrypted connection profiles. Connection URLs use AES-256-GCM; the separate vault key is created with Unix mode `0600`. Profile/list responses never return URL, cipher, nonce, or key material.
- TLS mode is applied to encrypted driver URLs. SSH host/user/port are profile metadata only; LightBI does not spawn unmanaged SSH processes or store SSH private keys.

### Shared Multi-Engine Platform

- Generalized Advanced sessions to PostgreSQL, MySQL, MariaDB, SQLite, and MongoDB.
- SQL engines share schema/result contracts, bounded paging, validated sort/filter, lazy exact count, timeout, cancellation, cache, and close lifecycle.
- MongoDB uses an explicit document request (`collection`, `filter`, `projection`, `sort`, `limit`, `offset`) and returns the same typed matrix consumed by grid/chart/export.
- Simple database intake now runs open-session, schema discovery, entity validation, exact count, bounded sample, and close-session through the same Advanced APIs. The obsolete `/api/database/inspect` route is no longer registered.

### Verification

- Rust Advanced tests: 5 passed.
- Advanced frontend tests: 3 files, 9 tests passed.
- Vite production build passed: 2,669 modules.
- PostgreSQL Docker: 42 tables, 3-row typed query, JSON Explain passed.
- MySQL Ghost Docker: 81 tables, 3-row typed query passed.
- SQLite fixture: one table, 3 rows, 3 columns passed.
- MongoDB Atlas: 8 collections; `account` returned 1 row and 7 columns through document query.
- MariaDB ERPNext LXD: 1,026 tables; `tabUser` returned 3 rows and 2 columns. A temporary LXD proxy was created because MariaDB binds to loopback and was removed after the test.
- Encrypted profile save/reconnect/delete passed, with no credential material in response.
- Chromium connected SQLite acceptance passed at 1440x900 and 390x844; both measured `scrollWidth === clientWidth`.

### Running

- Frontend: `http://100.94.184.141:5173/advanced`
- Backend: `0.0.0.0:5172`, reached through the frontend `/api` proxy.

---

## 2026-06-26 — Advanced PostgreSQL/MySQL/MariaDB Source Commit

### Implementation

- Enabled the existing Advanced source-commit contract for PostgreSQL, MySQL, and MariaDB direct-table results. SQLite behavior is preserved; MongoDB remains explicitly non-writable.
- PostgreSQL mutations compile to quoted, parameterized `UPDATE` statements with a conservative type-cast allowlist for scalar column types. Unsupported writable column types are rejected before execution.
- MySQL/MariaDB mutations compile to quoted, parameterized `UPDATE` statements and use native engine coercion for scalar JSON input values.
- Preview returns redacted SQL with placeholders only. Commit runs the full batch in one transaction, validates base table/primary key/changed columns/expected originals, requires each row update to affect exactly one row, and rolls back with `409 ADVANCED_MUTATION_CONFLICT` on stale or missing rows.
- Successful commits invalidate schema/count/query caches for the affected connection so the next run reloads source truth.
- MySQL/MariaDB result decoding now handles boolean and date/time values instead of surfacing them as unsupported cells.

### Verification

- Added Rust tests for provider-specific SQL preview generation and PostgreSQL type allowlist rejection.
- PostgreSQL Docker acceptance covered writable metadata, redacted preview, one-row commit, stale-row conflict rollback, and persisted verification.
- MySQL Docker acceptance covered the same mutation path against the Ghost database.
- MariaDB ERPNext LXD acceptance covered the same mutation path through a temporary loopback proxy because the service binds internally; the proxy and fixture table were removed after verification.
- Focused Advanced frontend tests, ESLint, and TypeScript passed after enabling SQL source commit in the UI.

### Boundaries

- Source commit is still restricted to direct base-table tabs with complete primary-key metadata. Arbitrary SQL results, local files, and online sheets keep edit/export behavior rather than claiming source overwrite.
- Insert/delete, bulk paste-to-source, and transformed full-file/source export remain future slices.

---

## 2026-06-26 — Understanding Next Readiness Score Fix

### Issue

- Investigation readiness for Understanding Next datasets was effectively constant: any dataset with a runnable action became `caution` with score `70`.
- Root cause was `generateAIBriefingFromUnderstandingNext`, which hard-coded `readinessScore: tier === "caution" ? 70 : 35` instead of scoring the actual quality/profile/signal/action evidence.

### Fix

- Added an evidence-based scorer for Understanding Next AI briefing readiness.
- Score now varies based on header recovery status, detected grain/domain, usable signal roles, signal confidence/count, executable actions, best question fit, dirty signal severity, blocked reasons, and unavailable actions.
- Failed headers remain low/exploratory; strong clean datasets can reach `decision_support`; weak or dirty datasets drop below caution.

### Verification

- Added regression coverage proving a strong dataset scores above 70 and a weak/dirty dataset scores below 70.
- Focused test passed: `src/lib/ai-briefing-generator.test.ts` — 4 tests.
- Focused ESLint and TypeScript passed for the briefing generator.

### Deliberate Boundaries

- Advanced remains read-only. Writeback, DDL, Redis, and ERD editing remain deferred by ADR.
- Automatic SSH tunnel process management is not enabled. Use an approved external tunnel endpoint and keep only non-secret SSH metadata in the profile.

---

## 2026-06-21 — Advanced Unified File, Online Sheet, and Database Workspace

### Scope Correction

- Advanced is no longer presented as database-only. It accepts local CSV/Excel, Google Sheets/online CSV, Microsoft 365 Excel, and all existing database engines.
- Simple still owns preflight, representative matrix sampling, profiling, source understanding, and source-family selection.
- Accepted file/online sources are handed to Advanced through a session-only Zustand descriptor. Original `File` objects, workbook sheets, profiles, row counts, and semantic-sample provenance are reused; there is no second upload or second understanding pass.

### Implementation

- Added `advanced-source-store.ts` as the in-memory source handoff registry.
- Online inspectors now retain fetched CSV/Excel payloads as `File` objects for downstream full-source execution.
- Added `AdvancedFileSession`: each file/sheet is materialized in a worker and exposed as a quoted DuckDB view. Execution permits only `SELECT`/`WITH`, validates result filter/sort columns, and caps each page at 1,000 rows.
- Reused the existing Advanced explorer, query tabs, grid/chart, paging, filtering, history/favorites, multi-result execution, and export across DuckDB and backend database providers.
- Added a source chooser for datasets understood in Simple and an `Open Advanced` action on the connected-data surface. Navigation label is now `Advanced`.
- TablePro was used only to study document-controller/source-adapter/result-set boundaries. No AGPL source was copied.

### Verification

- Focused tests: 3 files, 12 tests passed, including the new Simple-to-Advanced file-source component case.
- Focused ESLint for the new Advanced source/session/UI files passed.
- Browser local workbook acceptance: Simple recognized `bank-additional-full.xlsx` as 41K rows / 21 columns and handed it to Advanced. `motodetail.xlsx` opened as a DuckDB sheet view and returned rows with no console errors.
- Live Microsoft 365 acceptance: the supplied shortened OneDrive link returned one sheet / 1,644 rows, opened in Advanced, and executed successfully with no console errors.
- CSV acceptance: query grid and ECharts chart rendered; at 390x844, body and root measured `scrollWidth === clientWidth === 390`.
- Full production build remains blocked by pre-existing TypeScript contract drift in Understanding/Dashboard files. No build errors referenced the new Advanced source/session files; focused tests, lint, and live runtime passed.

### Running

- Frontend: `http://100.94.184.141:5173/advanced`
- Backend: `0.0.0.0:5172`, reached through the frontend `/api` proxy.

### Deliberate Boundary

- Source descriptors are memory-only. A hard browser refresh discards browser `File` handles and requires re-importing/reopening the online link; neither source bytes nor credentials are persisted by this phase.

---

## 2026-06-21 — Advanced Workbench Result and Navigation Slice

### Added

- Added table search to the desktop schema explorer and a compact table switcher for mobile, both using the same schema/source tree.
- Expanded each result tab from Grid/Chart to Grid, Chart, JSON, Structure/Profile, and PostgreSQL Plan where supported.
- Structure/Profile computes bounded result metadata from the current matrix: logical/native type, null count, distinct count, numeric min/max, and example value. It does not rerun or rescan the source.
- Added clipboard CSV beside download export. Both operate on the current bounded result page and retain spreadsheet-formula hardening from the shared CSV serializer.

### Verification

- Advanced component tests passed and now cover an inherited Simple file source plus Grid to JSON to Structure transitions.
- Focused Advanced ESLint passed.
- DuckDB browser acceptance passed for explorer filtering, Structure metadata (`Utf8`, `Int64`, null/distinct/min/max/example), JSON rendering, and clipboard CSV.
- Mobile acceptance passed at 390x844: quick table switcher visible and functional; body/root `scrollWidth === clientWidth === 390`; no page errors.

### Next Safe Slice

- Add a capability-gated edit-session layer outside the base result buffer: pending cell/row changes, undo/discard, optimistic row identity checks, generated SQL review, and explicit transaction commit/rollback.
- Database writes must default off and require a uniquely identifiable base table. File/sheet sources should produce a transformed copy/export rather than pretending to mutate the original remote/local document.

---

## 2026-06-21 — Advanced Result Edit Session

### Implementation

- Added an immutable edit overlay keyed by result row/column position. Base `QueryResultBuffer` rows are never mutated.
- Added coalesced cell changes, undo/redo stacks, original-value collapse, and discard.
- Grid edit mode uses double-click inline editing and highlights pending cells. Numeric and boolean inputs preserve their logical value type when valid.
- Grid, JSON, Structure/Profile, clipboard CSV, and CSV download all consume the same edited projection.
- Pending positional edits block rerun, sort, filter, paging, and table switching until exported or discarded, preventing stale-row corruption.
- This phase edits a bounded result copy only. It does not claim source persistence or database commit.

### Verification

- Focused edit/workspace tests: 3 files, 9 tests passed.
- Focused ESLint passed.
- Chromium DuckDB acceptance passed the complete sequence: edit `12 -> 99`, undo, redo, clipboard contains `99`, rerun guard appears, discard clears changes; no console/page errors.

### Required Before Source Commit

- Discover primary/unique keys and expose table update capability separately from query capability.
- Bind every mutation to connection, schema, base table, key columns, original key values, and expected original values/version.
- Generate parameterized mutations server-side, preview a redacted SQL/change plan, execute in one explicit transaction, verify affected-row counts, rollback on mismatch, then invalidate only the affected schema/table/query tabs.
- File and online-sheet sources need a transformed full-source export pipeline; current page edits must never be mislabeled as saving the original document.

### Column Projection Follow-up

- Added per-tab column visibility management with a one-visible-column minimum and one-click reset.
- Grid, Chart, JSON, Structure/Profile, clipboard, and CSV export consume the same visible-column projection.
- Projection is immutable and retains stable column IDs. Cell edits from a projected grid map back to the original result column index before entering the edit overlay.
- Tests cover immutable projection. Chromium acceptance hid `category`, edited visible `amount` from `12` to `77`, verified JSON contained only the projected column/value, and verified clipboard CSV started with `"amount"`; no console/page errors.

---

## 2026-06-21 — Advanced SQLite Source Commit Transaction

### Implementation

- Relational schema metadata now exposes primary-key columns and base-table write capability. PostgreSQL, MySQL/MariaDB, and SQLite discovery populate the metadata; MongoDB remains explicitly non-writable.
- A direct table tab retains a session-only base-table identity. Editing SQL, opening a file/sheet, or using an arbitrary query removes commit capability, so positional result edits cannot be mistaken for a writable source result.
- Pending SQLite edits can be reviewed as redacted, parameterized `UPDATE` statements. Values are never interpolated into the SQL preview.
- Commit validates the base table, complete primary key, changed columns, and expected original values server-side. Up to 100 edited rows execute in one explicit transaction.
- Every update must affect exactly one row. A missing or stale row returns `409 ADVANCED_MUTATION_CONFLICT` and rolls back the whole batch. Successful commits invalidate connection schema/count caches and require a result reload.
- The edit overlay remains the source of the mutation delta; the immutable result buffer is still not modified in place.

### Verification

- Rust Advanced tests: 7 passed, including a two-row regression proving that a stale second row rolls back a valid first-row update.
- Advanced frontend ESLint and TypeScript passed; focused edit/workspace tests: 2 files, 6 tests passed.
- Direct API acceptance passed schema PK/write detection, redacted preview, one-row commit, stale `409`, and persisted row verification.
- Chromium acceptance passed SQLite connect, direct table run, inline edit, Review, redacted SQL inspection, transaction commit, and reload of the committed value. No console or page errors.

### Deliberate Boundary and Next Slice

- Source commit is enabled only for SQLite in this slice. PostgreSQL and MySQL/MariaDB already expose PK/write metadata but their provider-specific parameter binding and transaction adapters remain disabled until acceptance.
- Local files and online sheets still export an edited result/copy; they do not claim to overwrite the original source.
- Next: add PostgreSQL and MySQL/MariaDB mutation adapters behind the same request, validation, preview, optimistic concurrency, and transaction contract. Then add capability-gated insert/delete and transformed full-file export as separate operations.

### Running

- Frontend: `http://100.94.184.141:5173/advanced`
- Backend: `0.0.0.0:5172`, reached through the frontend `/api` proxy.
