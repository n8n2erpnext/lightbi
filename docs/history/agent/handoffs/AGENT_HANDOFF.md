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

## 2026-06-27 — Advanced TablePro Parity: SQL Import, Export Worker, Profiles, Deep Structure

### Implementation

- Added SQL-file import for Advanced DB sessions. Toolbar "Import SQL file" accepts `.sql/.txt`, opens the file in a script tab, immediately calls the existing script preview endpoint, and uses the same transaction review modal.
- Added backend export worker endpoints for DB CSV/JSON/SQL full-result export:
  - `POST /api/advanced/connections/:connection_id/exports`
  - `GET /api/advanced/exports/:job_id`
  - `GET /api/advanced/exports/:job_id/download`
  - `DELETE /api/advanced/exports/:job_id`
- Advanced UI now uses the backend worker for DB full CSV/JSON/SQL exports, polls row progress, downloads the completed blob, and can cancel the server job. File/online-source exports and XLSX remain on the existing client-paged path.
- Added backend SQL import worker endpoints for reviewed scripts:
  - `POST /api/advanced/connections/:connection_id/imports/sql`
  - `GET /api/advanced/imports/:job_id`
  - `DELETE /api/advanced/imports/:job_id`
- Script commit now starts the backend import worker, polls executed-statement progress in the modal, can cancel the job, and still runs inside one transaction with rollback on failure.
- Added CSV backend row import worker for direct writable relational table tabs:
  - `POST /api/advanced/connections/:connection_id/imports/csv`
  - multipart fields: `file`, `schema`, `table`, `mapping`, `errorMode`
  - supports `stop_rollback`, `stop_commit`, and `skip_continue`
  - validates target table/columns, limits interactive jobs to 100,000 rows, updates executed/skipped progress, and invalidates schema/count caches
- Advanced toolbar now exposes "Import CSV/Excel into current table" for direct writable table tabs.
- Added import mapping modal for CSV/Excel:
  - parses CSV headers client-side
  - parses the first Excel worksheet client-side with the existing `xlsx` library and normalizes it to CSV for the backend worker
  - maps target columns to detected source headers
  - lets the user select `stop_rollback`, `stop_commit`, or `skip_continue`
  - shows imported/skipped progress
- Backend full-result export now also supports XLSX through the export worker. DB "All XLSX" uses the backend job path with progress/download instead of the client-paged path.
- Connection profiles now store and return `groupName`, `tagName`, and `safeMode` (`off`, `confirm_writes`, `read_only`) with lightweight SQLite migrations.
- Connection open requests carry safe mode into the in-memory session. Mutation/script previews set `canCommit=false` for read-only sessions, and mutation/script commits are blocked server-side for read-only profiles.
- Structure editor now goes beyond columns/table rename:
  - column default and comment SQL generation
  - table comments
  - create/drop index
  - add/drop foreign key/constraint
  - trigger SQL passthrough into the reviewable script
- All deep structure operations still generate SQL into a review tab/modal rather than executing silently.

### Verification

- `npm test -- --run src/pages/Advanced.test.tsx src/lib/advanced-api.test.ts` passed: 2 files, 19 tests.
- `npx eslint src/pages/Advanced.tsx src/pages/Advanced.test.tsx src/lib/advanced-api.ts src/lib/advanced-file-session.ts` passed.
- `cargo test -p lightbi-server validates_write_script_statements` passed. Existing unrelated Rust warnings remain.

### Remaining Parity Notes

- Backend export worker is implemented for DB CSV/JSON/SQL/XLSX with server-side paging/progress/cancel.
- Import worker parity is covered for SQL scripts plus CSV/Excel row import with mapping UI, progress/cancel, transaction behavior, and error modes. Excel is normalized to CSV in the browser before entering the backend row worker.

### Strategic Later, Not Current Core Scope

These TablePro-level product/platform directions are intentionally deferred until LightBI can stand on its own with the current Simple + Advanced core:

- Real plugin SDK like `TableProPluginKit`: LightBI currently uses built-in providers/import/export paths rather than third-party driver/import/export plugins.
- Cloud sync and conflict resolution: LightBI has local profile group/tag/safe-mode metadata, but no CloudKit-like sync layer.
- Wider driver ecosystem: TablePro has plugins/core work for BigQuery, DynamoDB, Etcd, MSSQL, and similar providers. LightBI currently focuses PostgreSQL, MySQL/MariaDB, SQLite, MongoDB, local files, online sheets, and Microsoft 365 links.
- Desktop OS polish: TablePro is macOS-native. LightBI's current web surface is only a fast validation shell; the product direction is a desktop app that supports macOS, Windows, and Debian-family Linux. Native-feeling desktop polish should be evaluated per target OS later, not treated as web-only parity.
- Backend-native Excel parser: LightBI currently parses Excel in the browser and normalizes it into the backend row-import worker. Workflow parity is covered, but backend-native workbook parsing can be revisited when the platform layer matures.

This list is strategic roadmap material, not an immediate blocker for declaring Advanced core parity.
- Profile group/tag/safe-mode are local metadata and policy. Cloud sync/conflict resolution is intentionally not implemented.

---

## 2026-06-28 — Plugin-First Provider Expansion Decision

User asked whether LightBI should stop expanding core database/system support directly and move future systems into plugins, after reviewing TablePro's plugin model.

Decision:

- Freeze the current built-in provider core for now: local files, online spreadsheet/file links, PostgreSQL, MySQL/MariaDB, SQLite, and MongoDB/Atlas.
- New enterprise systems should be implemented through a plugin contract, not patched straight into core.
- SQL Server is confirmed in TablePro as a real plugin/core driver surface (`MSSQLDriverPlugin`, `TableProMSSQLCore`, dialect/schema/TLS/writeback support), so LightBI should treat SQL Server as the first future provider plugin rather than a quick core dropdown item.
- Do not expose SQL Server in Simple or Advanced user-facing provider lists until a plugin can connect, discover schema, run bounded read-only queries, and return typed result buffers.

Implemented:

- Added `docs/architecture/ADR-116-plugin-first-system-expansion.md`.
- Added interface-only `@lightbi/plugin-sdk` scaffold under `packages/plugin-sdk`.
- Removed the stale SQL Server source item from legacy `homeGuidance.sourceMenu.database` so the UI does not promise unsupported core SQL Server.

Next when this track resumes:

1. Add a plugin registry/host boundary that can load built-in plugins first.
2. Move current built-in DB provider metadata toward registry descriptors.
3. Implement SQL Server as the first provider plugin with bracket quoting, `dbo` schema default, TLS/encryption fields, schema catalog queries, and read-only query execution.
4. Only then expose SQL Server in Simple database intake and Advanced connection selection.

---

## 2026-06-28 — Advanced.tsx Clean-Code Split Phase 1

User requested cleanup because `apps/desktop/src/pages/Advanced.tsx` had grown to nearly 3,000 lines.

Implemented a low-risk first split without changing Advanced behavior:

- Moved pure workspace helpers, SQL quoting/literal utilities, parameter materialization, import/structure draft types, mutation-row builders, Mongo filter helpers, and SQL assistant static analysis into `apps/desktop/src/lib/advanced-workspace-helpers.ts`.
- Moved result presentation components into `apps/desktop/src/components/advanced/AdvancedResultViews.tsx`:
  - `ResultChart`
  - `ResultJson`
  - `QueryPlanView`
  - `ResultStructure`
- Kept the main `Advanced.tsx` state machine, effects, command palette, dialogs, and data-flow handlers in place for now.
- Reduced `Advanced.tsx` from 2,950 lines to 2,304 lines.
- Fixed adjacent type drift in `DataIntakeDrawer.tsx` and the Advanced test fixture profile shape.

Verification:

```bash
cd apps/desktop
./node_modules/.bin/eslint --config eslint.config.js src/pages/Advanced.tsx src/pages/Advanced.test.tsx src/lib/advanced-workspace-helpers.ts src/components/advanced/AdvancedResultViews.tsx src/components/data-intake/DataIntakeDrawer.tsx
./node_modules/.bin/vitest run src/pages/Advanced.test.tsx src/lib/advanced-api.test.ts --reporter=dot --pool=forks
```

Both passed. Advanced tests: 2 files, 19 tests passed.

Filtered TypeScript check for the touched Advanced/DataIntake files produced no matching errors. Repo-wide `tsconfig.app.json` still has unrelated pre-existing type drift in Understanding/Dashboard/Home areas.

Next clean-code slices:

1. Extract `SchemaTree`, `HistoryPanel`, and `FavoritesPanel`.
2. Extract modal/dialog components for import/writeback/create-table/structure editor.
3. Move Advanced state transitions into a reducer or workspace hook once components are smaller.

## 2026-06-28 — Advanced.tsx Clean-Code Split Phase 2

Continued the same cleanup after the user asked to proceed.

Implemented:

- Extracted `VirtualResultGrid` into `apps/desktop/src/components/advanced/VirtualResultGrid.tsx`.
- Moved grid selection, keyboard navigation, clipboard copy/paste, context menu actions, column resize/reorder, edit-cell coercion, and FK navigation action type into the grid component boundary.
- `Advanced.tsx` now imports `VirtualResultGrid` and `GridForeignKeyAction` instead of owning the whole grid implementation.
- Reduced `Advanced.tsx` further from 2,304 lines to 1,976 lines.

Verification:

```bash
cd apps/desktop
./node_modules/.bin/eslint --config eslint.config.js src/pages/Advanced.tsx src/pages/Advanced.test.tsx src/lib/advanced-workspace-helpers.ts src/components/advanced/AdvancedResultViews.tsx src/components/advanced/VirtualResultGrid.tsx src/components/data-intake/DataIntakeDrawer.tsx
./node_modules/.bin/vitest run src/pages/Advanced.test.tsx src/lib/advanced-api.test.ts --reporter=dot --pool=forks
```

Both passed. Advanced tests: 2 files, 19 tests passed.

Filtered TypeScript check for touched Advanced/DataIntake files produced no matching errors. Repo-wide type drift remains unrelated.

Next clean-code slices:

1. Extract `SchemaTree`, `HistoryPanel`, and `FavoritesPanel`.
2. Extract modal/dialog components for import/writeback/create-table/structure editor.
3. Move Advanced state transitions into a reducer or workspace hook once components are smaller.

---

## 2026-06-26 — Advanced TablePro Parity Recheck + Row Delete UI

### TablePro Recheck

- Re-read targeted TablePro reference files instead of broad source dumps:
  - `MainContentCoordinator+TableRowsMutation.swift`
  - `MainContentCoordinator+RowOperations.swift`
  - `DataGridView+CellPaste.swift`
  - `RowEditingCoordinator+SaveChanges.swift`
- Relevant TablePro pattern: result-row mutation is centralized, grid operations produce a pending row/cell delta, and save assembles parameterized statements behind an explicit review/authorization/transaction flow.
- LightBI parity already covered in this branch: grid selection/keyboard/copy/paste/resize/reorder, advanced filters, schema metadata, TLS/SSH profile connection, backend update/insert/delete mutation contract, result export options, Mongo query builder basics.
- Remaining gaps toward 1:1: no blocking parity gaps in the planned TablePro-inspired slice. Future hardening: create-table import, larger server-side streaming import workers, and real LLM-backed assistant actions.

### Implementation

- Added per-tab `deletedRowIndexes` state in Advanced mode.
- Added per-tab duplicate-as-insert pending state.
- Added blank/form insert UI for writable DB table tabs.
- Grid edit mode context menu now supports `Duplicate as insert`, `Mark row delete`, and `Restore row`.
- The toolbar `Insert new row` action opens a modal for non-primary-key columns and adds a pending insert row after basic type coercion.
- Duplicate-as-insert builds an insert mutation from the selected result row while omitting primary-key columns to avoid immediate key collisions on serial/auto-increment tables.
- Added full-result paged exports for CSV, XLSX, JSON, and SQL. The export path pages through the active query/source with a larger page size instead of only exporting the current bounded result page.
- Mongo toolbar now includes a projection field selector with Include/Exclude actions that update the JSON document query projection.
- Added dirty-tab lifecycle protection: tab titles show an amber dirty dot, closing a dirty tab opens an unsaved-changes confirmation dialog, and browser/tab reload gets a `beforeunload` guard while any tab has pending edits/inserts/deletes.
- PostgreSQL Explain now renders a visual plan tree with operation, relation/index, cost, estimated rows, actual time, planning time, execution time, and collapsible raw JSON fallback.
- Added SQL assistant helper from the Advanced toolbar. It performs static SQL inspection, summarizes query intent/risk, flags common performance/safety issues such as `SELECT *`, missing `LIMIT`, unbounded `ORDER BY`, large `OFFSET`, write queries without `WHERE`, leading-wildcard `LIKE`, and shows an optimized sketch when possible.
- Added import from a Simple-understood source into an existing writable relational DB table. The flow opens a modal from Advanced toolbar, selects source/table/target, supports custom target-to-source column mapping with same-name defaults, loads source rows through the existing DuckDB file session, and inserts in 100-row mutation batches through the existing transaction endpoint.
- Deleted rows remain visible with red styling/line-through so the pending operation is inspectable before commit.
- Pending insert/delete rows block rerun/sort/filter/paging/table switching through the same guard as cell edits.
- Review transaction now merges blank inserts, duplicate inserts, cell updates, and row deletes. If a row is both edited and marked delete, update mutations for that row are suppressed and only the delete mutation is sent.
- Discard and successful commit clear cell edits, pending inserts, and pending row deletes.

### Verification

- `npm test -- --run src/pages/Advanced.test.tsx src/lib/advanced-api.test.ts` passed: 2 files, 18 tests after query-parameter, row-copy, command-switcher, FK-navigation, create-table SQL, structure-editor, create-table import-script, and SQL-script transaction coverage.
- `cargo test -p lightbi-server validates_write_script_statements` passed.
- Focused ESLint passed for touched Advanced frontend/API files.

### Push Status

- Not pushed. User requested pushing only after all planned parity steps are complete.

### 2026-06-27 Re-Audit Against Full TablePro Surface

- User clarified the target is strict Advanced-mode parity with TablePro, excluding real LLM for now, not only the previously scoped parity slice.
- Re-read additional TablePro modules:
  - `Views/Structure/CreateTableView.swift`
  - `Views/Main/Extensions/MainContentCoordinator+FKNavigation.swift`
  - `Views/Editor/QueryParameterPanelView.swift`
  - `Views/Main/Extensions/MainContentCoordinator+QueryParameters.swift`
  - `Views/Results/DataGridView+RowActions.swift`
  - `Views/Main/Extensions/MainContentCoordinator+QuickSwitcher.swift`
  - `Views/Import/ImportDialog.swift`
  - `Core/Services/Export/ExportService.swift`
  - `Core/Plugins/StreamingQueryExportDataSource.swift`
- Updated assessment: LightBI Advanced covers the core data workspace, grid, writeback, filters, schema metadata, export/import, Mongo builder, dirty lifecycle, plan tree, and static assistant, but it is not yet full 1:1 with TablePro's broader pro surface.
- Implemented after this audit:
  - Query parameter panel detects `:name` placeholders, preserves values per tab/history/favorite, materializes values for run/explain/paging/export/run-all execution, and escapes SQL string literals.
  - Result-grid context menu now supports rich row copy actions for selected rows: JSON, CSV, Markdown, SQL `INSERT`, SQL `UPDATE`, selected-column `IN (...)`, and column-values-only copy; right-click inside an existing range preserves the range selection.
  - Command switcher opens from toolbar or `Ctrl/Cmd+K`, searches tables, tabs, history, favorites, Simple-understood sources, and workspace actions, with keyboard Enter/Escape navigation.
  - Foreign-key result navigation uses table metadata to add context-menu actions on FK columns and opens the referenced table filtered by referenced key values.
  - Create-table workflow opens a DDL builder for relational DB sessions with schema/table, columns, nullable/PK flags, index flags, FK references, live SQL preview, and "Open SQL in tab" review flow.
  - Structure editor opens for active relational tables and generates reviewable ALTER SQL for table rename, column rename, type changes, nullability changes, add column, and drop column.
  - Full-result export now shows paged progress and supports cancellation from the toolbar while the client-side export loop is running.
  - Import flow now supports "Create new table script": it reads Simple-understood source rows in batches and opens a reviewable SQL tab containing `CREATE TABLE` plus `INSERT` statements with inferred column types.
  - Direct SQL script review/commit flow added for relational DB sessions. The backend previews CREATE/ALTER/DROP/TRUNCATE/INSERT/UPDATE/DELETE scripts, commits them inside a transaction, rolls back on failure, and invalidates schema/count caches. Frontend has a toolbar review button and commit modal.
- Confirmed remaining strict-parity gaps:
  - Import plugin-style file preview/format selection/progress is partially represented; LightBI has source-to-existing-table import with custom mapping, create-table SQL script generation, and direct script commit, but not SQL-file import or deeper format-specific options.
  - Export has client-side paged progress/cancel, but not true backend/plugin streaming.
  - Multi-database/schema switcher and connection organization/tag/group/sync features are partial or absent.
  - Redis/server-dashboard/plugin ecosystem/MCP/integration surfaces exist in TablePro but are out-of-scope unless LightBI explicitly wants full product parity beyond SQL/Mongo/file BI Advanced mode.

---

## 2026-06-26 — Advanced Mode TablePro-Parity Push In Progress

### Implemented

- Grid Pro layer now has range selection, keyboard navigation, TSV copy, multi-cell paste, per-tab column resize/reorder, and a cell context menu.
- Advanced filters now share one operator contract across file DuckDB sessions and database sessions. Added broader operators, AND/OR filter groups, backward-compatible flat filters, and parameterized SQL compilation in the Rust backend.
- Schema explorer now carries deeper metadata: column defaults/comments, table comments/size, indexes, foreign keys, DDL where available, and routines. Explorer surfaces compact index/FK/routine hints.
- Writeback backend contract now supports update/insert/delete mutation actions. Existing preview/commit transaction path remains redacted and parameterized; bulk paste feeds the edit overlay.
- Connection profiles now apply TLS at connection time, and SSH profile fields open a real `ssh -N -L` tunnel held by the backend session and killed on disconnect.
- Result export now supports CSV, XLSX, JSON, and SQL insert scripts for the current bounded result page.
- Mongo advanced UX has a field/operator/sort builder that updates the JSON document query instead of forcing users to hand-write the whole query.

### Verification

- `npm test -- --run src/pages/Advanced.test.tsx` passed.
- `npm test -- --run src/pages/Advanced.test.tsx src/lib/advanced-api.test.ts` passed during filter/export work.
- `npm test -- --run src/lib/advanced-edit-session.test.ts src/lib/advanced-api.test.ts` passed.
- Focused ESLint passed for touched Advanced/frontend files.
- `cargo test -p lightbi-server deserializes_` passed.
- `cargo test -p lightbi-server compiles_` passed.

### Superseded Status

- Insert form, duplicate-as-insert, and delete are now exposed in the grid/writeback UI and commit through the existing transaction review path.
- Full-result paged exports and DB-table import were completed later in this same parity slice; see `Advanced TablePro Parity Recheck + Row Delete UI` above for the current status.
- Full workspace build/lint still has unrelated pre-existing failures outside Advanced/this slice.

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
- Corrected the scorer to follow the documented readiness contract: Data Quality, Understanding Confidence, Semantic Coverage, and Execution Reliability are weighted inputs; `>=90` is `decision_support`, `85-89` is `caution`, and `<85` is `exploratory_only`.
- Understanding Next now carries profiled column health into the briefing path, so the score is grounded in completeness/type consistency/key-like evidence. Missing health evidence caps the score below caution/decision support.
- Failed headers remain low/exploratory; strong clean datasets can reach `decision_support`; weak or dirty datasets drop below caution.

### Verification

- Added regression coverage proving a strong dataset scores above 70 and a weak/dirty dataset scores below 70.
- Focused test passed: `src/lib/ai-briefing-generator.test.ts` — 4 tests.
- Focused ESLint and TypeScript passed for the briefing generator.

---

## 2026-06-26 — Advanced Grid Pro v1 Toward TablePro Parity

### Implementation

- Added a tab-local grid selection model outside the immutable result buffer and outside the edit overlay.
- Result grid now supports active cell focus, click selection, shift-click range selection, arrow-key movement, shift-arrow range extension, and Ctrl/Cmd+C copy of the selected range as TSV.
- Selection rendering is virtual-grid aware: only visible selected cells render, while the selection state remains based on absolute row/column positions.
- Clipboard copying uses the shared fallback helper and does not mutate result rows or persisted tab state.

### Verification

- Added Advanced component coverage for 2x2 range selection and TSV copy.
- Focused test passed: `src/pages/Advanced.test.tsx` — 3 tests.
- Focused ESLint and TypeScript passed for `Advanced.tsx` and `Advanced.test.tsx`.

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
## 2026-06-27 — Simple Mode BA Decision Engine Phase BA-1

User direction: pause the DA-heavy/TablePro track and push Simple mode toward a real BA decision layer for SME workflows. Simple mode must answer:

1. What data am I looking at?
2. How much should I trust it?
3. What insights are worth noticing?
4. What should I decide or check next?

Architecture anchor added:

- `docs/architecture/ADR-115-ba-decision-engine-simple-mode.md`
- Defines the Simple mode path as `Data Understanding -> Data Trust Scoring -> Insight Mining -> Chart Recommendation -> Decision Briefing -> Action Suggestions`.
- Keeps the core deterministic first. LLM can later rewrite wording, but cannot invent facts or evidence.
- Establishes Advanced as DA/pro workspace and Simple as BA decision workspace, with a future Advanced -> Analyze in Simple loop.

Current baseline after reading code:

- Data Understanding: roughly 70-80%.
- Data Trust Scoring: roughly 55-65%.
- Insight Mining: now roughly 35-45% after this phase.
- Chart Recommendation: roughly 45-55%.
- Decision Briefing: now roughly 30-40% after this phase.
- Advanced -> Simple Loop: still 0-15%.

Implemented first BA slice:

- Added `apps/desktop/src/lib/ba-decision-engine.ts`.
  - Produces `BADecisionBrief`.
  - Separates `dataTrustScore` from `decisionReadinessScore`.
  - Mines deterministic insights from executed preview results:
    - top concentration
    - bottom group
    - trend direction
    - coverage/scope
    - data quality caveats
  - Produces recommended charts and decision suggestions.
- Added `apps/desktop/src/components/analysis/BADecisionBriefPanel.tsx`.
  - Renders Executive Summary, Data Trust Score, Decision Readiness Score, Key Insights, Recommended Charts, Decision Suggestions, and Data Caveats.
- Wired `apps/desktop/src/pages/Investigation.tsx`.
  - After preview execution, Simple mode now shows chart/table evidence plus BA Decision Brief from the same result.
  - Replaced conditional `useMemo` usage after the no-session return with direct computation to satisfy React hooks lint.
- Added `apps/desktop/src/lib/ba-decision-engine.test.ts`.

Verification:

```bash
cd apps/desktop
npx eslint src/lib/ba-decision-engine.ts src/lib/ba-decision-engine.test.ts src/components/analysis/BADecisionBriefPanel.tsx src/pages/Investigation.tsx
npx vitest run src/lib/ba-decision-engine.test.ts --reporter=dot --pool=forks
```

Both passed.

Additional check:

```bash
cd apps/desktop
npx vitest run src/pages/Investigation.test.tsx src/lib/ba-decision-engine.test.ts --reporter=dot --pool=forks
```

Result: `ba-decision-engine.test.ts` passed; `Investigation.test.tsx` still has 7 known legacy expectation failures around `Execution Boundary Failed` versus current UI text `Execution Failed`, plus duplicate error surfaces. This matches the pre-existing Investigation test debt already noted earlier and was not introduced by the BA engine slice.

Important remaining BA work:

1. Pre-execution BA brief from data profile, not only after `Run preview`.
2. More insight types: anomaly/outlier, Pareto on raw rows, period-over-period, missing value impact, duplicate/key risk, segment comparison.
3. Better chart recommendation ranking per insight, not only primary chart plus hints.
4. Stronger `Decision Readiness Score` formula using required business fields by domain.
5. Advanced -> Simple loop: after Advanced filtering/edit/querying, create a temporary Simple investigation session and run the same BA Decision Engine.

## 2026-06-27 — Simple Mode BA Pre-Execution Brief

User direction: continue BA before the full UI/UX redesign. Add a pre-execution BA brief from data profile/session rows so Simple mode starts answering decision questions before the user clicks `Run preview`.

Implemented:

- Extended `apps/desktop/src/lib/ba-decision-engine.ts`.
  - Added `createPreExecutionBADecisionBrief()`.
  - Builds an estimated result matrix from retained/profile rows and the current runtime intent.
  - Supports lightweight estimates for `group_by`, `distribution`, `trend`, `relationship`, and table-like fallbacks.
  - Reuses the same `createBADecisionBrief()` contract so pre/post execution stay aligned.
  - Adds explicit caveats: pre-execution estimate only, run preview to validate.
  - Caps decision readiness below data trust so the UI does not imply final decision quality before execution.
- Wired `apps/desktop/src/pages/Investigation.tsx`.
  - Before `Run preview`, the BA Decision Brief panel now shows a cautious pre-execution estimate.
  - After preview execution, the panel automatically switches to the executed-result brief.
- Updated `apps/desktop/src/lib/ba-decision-engine.test.ts`.
  - Added coverage proving retained rows can produce a pre-execution top-concentration insight and that the brief remains cautious.

Verification:

```bash
cd apps/desktop
npx eslint src/lib/ba-decision-engine.ts src/lib/ba-decision-engine.test.ts src/components/analysis/BADecisionBriefPanel.tsx src/pages/Investigation.tsx
npx vitest run src/lib/ba-decision-engine.test.ts --reporter=dot --pool=forks
```

Both passed.

Updated BA status estimate:

- Data Understanding: 70-80%.
- Data Trust Scoring: 55-65%.
- Insight Mining: 40-50%.
- Chart Recommendation: 45-55%.
- Decision Briefing: 40-50%.
- Advanced -> Simple Loop: 0-15%.

Next BA slice:

1. Add anomaly/outlier and duplicate/key-risk insight miners.
2. Improve Decision Readiness Score using domain-required fields.
3. Add richer chart recommendation ranking before UI redesign.

## 2026-06-27 — Simple Mode BA Risk Insight Miners

User direction: continue the BA track and read docs if needed. Re-read:

- `docs/architecture/ADR-115-ba-decision-engine-simple-mode.md`
- `docs/architecture/ADR-079-data-quality-vs-business-confidence.md`
- `docs/architecture/ADR-072-insight-contract.md`

Confirmed direction:

- Keep Data Quality, Business Confidence, and Decision Readiness conceptually separate.
- Insights must be deterministic, evidence-backed, and traceable.
- BA should warn users about data conditions that can make a business decision wrong, not only summarize top/bottom values.

Implemented:

- Extended `BAInsightType` with:
  - `outlier`
  - `key_risk`
- Added `mineOutlierInsight()`.
  - Uses IQR fences on the selected numeric field.
  - Reports most extreme value, expected range, and outlier ratio.
  - Marks severity as warning/critical depending on outlier density.
- Added `mineKeyRiskInsight()`.
  - Finds id/code/key-like fields or falls back to the active dimension.
  - Reports duplicate row ratio, empty ratio, and most repeated value.
  - Flags fields that are unsafe as decision keys for grouped totals, joins, or record counts.
- Updated Decision Readiness scoring.
  - Outlier and key-risk insights now add extra score penalties.
  - Suggestions now explicitly tell the user to inspect unusual values or duplicate/empty keys.
- Fixed pre-execution path.
  - Key-risk is checked against raw retained/profile rows before aggregation so duplicate keys are not hidden by the estimated group-by matrix.

Verification:

```bash
cd apps/desktop
npx eslint src/lib/ba-decision-engine.ts src/lib/ba-decision-engine.test.ts src/components/analysis/BADecisionBriefPanel.tsx src/pages/Investigation.tsx
npx vitest run src/lib/ba-decision-engine.test.ts --reporter=dot --pool=forks
```

Both passed. `ba-decision-engine.test.ts` now has 5 passing tests covering executed brief, blocked brief, pre-execution brief, outlier risk, and duplicate key risk.

Updated BA status estimate:

- Data Understanding: 70-80%.
- Data Trust Scoring: 60-70%.
- Insight Mining: 50-60%.
- Chart Recommendation: 45-55%.
- Decision Briefing: 45-55%.
- Advanced -> Simple Loop: 0-15%.

Next BA slice:

1. Domain-required-field readiness scoring: clean data can still be low decision readiness if required business fields are missing.
2. Period-over-period insight when a valid time dimension exists.
3. Insight-to-chart ranking so each important insight has the best chart/evidence view before the full UI/UX redesign.

## 2026-06-27 — Simple Mode BA Required Fields, Latest Period, Chart Ranking

User direction: keep going full BA according to docs before the full UI/UX rebuild.

Implemented:

- Added conservative domain-required-field readiness scoring in `apps/desktop/src/lib/ba-decision-engine.ts`.
  - Rule map covers finance, revenue, inventory, and operations decision contexts.
  - Produces `field_gap` insights when semantic briefing has an explicit domain but the required business field groups are missing.
  - Example: a finance/profitability decision with revenue but no cost/gross margin fields now lowers Decision Readiness even if Data Trust is high.
  - Important correction: field-gap no longer infers domain from vague column names alone, avoiding false positives for generic `amount` datasets.
- Added `minePeriodOverPeriodInsight()`.
  - For trend/line results, compares latest period with previous period.
  - Emits evidence for previous value, latest value, and percentage/absolute change.
- Improved insight-to-chart ranking.
  - Recommendations now rank insights by severity, type importance, and confidence.
  - Critical/warning field gaps, key risks, and outliers outrank generic coverage/data-quality hints.
- Decision suggestions now reflect missing business fields directly.

Verification:

```bash
cd apps/desktop
npx eslint src/lib/ba-decision-engine.ts src/lib/ba-decision-engine.test.ts src/components/analysis/BADecisionBriefPanel.tsx src/pages/Investigation.tsx
npx vitest run src/lib/ba-decision-engine.test.ts --reporter=dot --pool=forks
```

Both passed. `ba-decision-engine.test.ts` now has 7 passing tests:

- executed brief
- blocked brief
- pre-execution brief
- outlier risk
- duplicate key risk
- missing required business fields
- latest period movement

Updated BA status estimate:

- Data Understanding: 70-80%.
- Data Trust Scoring: 65-75%.
- Insight Mining: 60-70%.
- Chart Recommendation: 55-65%.
- Decision Briefing: 55-65%.
- Advanced -> Simple Loop: 0-15%.

Remaining BA before UI/UX rebuild:

1. Add richer distribution/segment-comparison insights.
2. Add raw-row evidence pointers for risk insights, not only text evidence.
3. Add Advanced -> Simple loop so edited/query result buffers can create a Simple BA brief.
4. Optional: compact BA score breakdown UI once engine coverage is stable.

## 2026-06-27 — Simple BA Completion Slice Before UI/UX Rebuild

User requested completing all remaining BA items before full UI/UX redesign:

1. Segment/distribution insight deeper.
2. Raw-row evidence pointers for risk insights.
3. Advanced -> Simple loop.
4. Compact score breakdown UI.

Implemented:

- Extended `apps/desktop/src/lib/ba-decision-engine.ts`.
  - Added `segment_spread` insight.
  - Detects large spread between highest, median, and lowest segments.
  - Added `BARowEvidence` and optional `evidenceRows` on insights.
  - Outlier and key-risk insights now attach row pointers with key field/value evidence.
  - Added `BAScoreBreakdownItem` and required `scoreBreakdown` on `BADecisionBrief`.
  - All brief paths now include score breakdown: blocked, no-row pre-execution, pre-execution estimate, and executed result.
- Updated `apps/desktop/src/components/analysis/BADecisionBriefPanel.tsx`.
  - Shows compact score breakdown below Data Trust / Decision Readiness.
  - Shows raw-row pointers inside risk insight cards when available.
- Added Advanced -> Simple loop in `apps/desktop/src/pages/Advanced.tsx`.
  - Result toolbar now has `BA Brief` when a result is visible.
  - It converts the current displayed Advanced result to retained rows, creates an Investigation session, and navigates to `/investigation`.
  - Uses table-preview intent for now; Simple BA pre-execution engine then builds the decision brief from those retained rows.
  - Uses `window.history.pushState` + `popstate` rather than `useNavigate` so existing tests can render Advanced outside a Router.
- Updated `apps/desktop/src/lib/ba-decision-engine.test.ts`.
  - Added coverage for segment spread, score breakdown, and raw-row evidence pointers.

Verification:

```bash
cd apps/desktop
npx eslint src/lib/ba-decision-engine.ts src/lib/ba-decision-engine.test.ts src/components/analysis/BADecisionBriefPanel.tsx src/pages/Investigation.tsx src/pages/Advanced.tsx
npx vitest run src/pages/Advanced.test.tsx src/lib/ba-decision-engine.test.ts --reporter=dot --pool=forks
```

Both passed. Advanced + BA focused tests: 2 files, 25 tests passed.

Updated BA status estimate:

- Data Understanding: 70-80%.
- Data Trust Scoring: 65-75%.
- Insight Mining: 70-80%.
- Chart Recommendation: 60-70%.
- Decision Briefing: 65-75%.
- Advanced -> Simple Loop: 45-55%.

BA engine is now ready enough to support the upcoming full UI/UX rebuild. Remaining work is mostly product polish and broader domain coverage rather than core BA architecture.

## 2026-06-27 — UI/UX Rebuild Phase 1: Desktop BA Workspace Shell

User approved starting UI/UX after pushing the prior BA/Advanced code. Direction clarified:

- Web UI is a fast validation shell for now.
- Desktop app is the main product direction.
- Future enterprise web should mirror/sync the desktop experience similar to ChatGPT web/desktop.
- UI should feel like a desktop productivity/agent workspace, not a SaaS landing page.

Implemented:

- Updated `apps/desktop/src/components/layout/AppLayout.tsx`.
  - Reworked the shell toward a Codex-like desktop layout.
  - Sidebar now uses a quiet grey desktop rail, softer active states, wider expanded width, and an account/project block.
  - Renamed navigation toward product semantics: `New brief`, `Decision briefs`, `Sources`, `Advanced`.
- Updated `apps/desktop/src/pages/Home.tsx`.
  - Reworked the empty-data start surface into a centered BA composer: “What should LightBI understand?”
  - Added three primary source/action tiles: local files, online sheet, Advanced.
  - Kept existing Simple Mode data-intake/understanding logic intact.
  - When a dataset is ready, the connected-data strip now emphasizes the trust score: `High trust`, `Review recommended`, or `Needs cleaning`.
- Updated `apps/desktop/src/pages/Investigation.tsx`.
  - Reframed the main surface as `Decision workspace`.
  - Kept chart preview, BA Decision Brief, raw evidence, and diagnostics together.
  - Tuned layout/colors/radius toward the desktop shell style without changing execution logic.

Verification:

```bash
cd apps/desktop
npx eslint src/components/layout/AppLayout.tsx src/pages/Investigation.tsx src/components/analysis/BADecisionBriefPanel.tsx
npx vitest run src/lib/ba-decision-engine.test.ts --reporter=dot --pool=forks
```

Both passed. BA engine test: 1 file, 9 tests passed.

Known verification caveat:

- `npm run build` currently fails on pre-existing repo-wide TypeScript/contract drift unrelated to this UI pass, including dataset-understanding contract fields, old test fixtures, and BA engine type cleanup items.
- `npx eslint src/pages/Home.tsx` also still reports existing Home technical debt (`any`, React compiler memoization/effect rules, etc.). The UI pass intentionally avoided deep Home refactor to keep current data-intake behavior stable.

Next UI/UX steps:

1. Do a focused Home technical-debt cleanup so `Home.tsx` can lint independently.
2. Add a real desktop top bar / command affordance once shell routes are stable.
3. Create a proper reusable `Composer` / `SourceActionTile` component instead of inline Home JSX.
4. Add screenshot QA for empty Home, dataset-ready Home, Investigation pre-execution, and Investigation executed states.

## 2026-06-27 — Charts Route Reframed As Chart Library

User noticed `/charts/:id` was still the old placeholder ChartBuilder with fake drag/drop fields and no real effect.

Decision:

- `Charts` should become a reusable chart library: saved chart cards + chart templates.
- Dashboard building should later consume these chart cards by drag/drop, Power BI style.
- The old standalone ChartBuilder placeholder should not be exposed until backed by real dataset binding and dashboard placement.

Implemented:

- Replaced `apps/desktop/src/pages/Charts.tsx`.
  - New `Chart Library` page with saved chart cards from runtime `charts`.
  - Shows chart templates: trend, compare groups, share of total, KPI scorecard, evidence table.
  - Adds search over saved charts.
  - Adds CTA to `Create from BA brief` and `Open dashboards`.
  - Clearly frames chart cards as reusable dashboard assets that refresh with datasets.
- Updated `apps/desktop/src/routes/index.tsx`.
  - `/charts/new` and `/charts/:id` now redirect to `/charts`.
  - This avoids sending users to the obsolete placeholder builder.

Verification:

```bash
cd apps/desktop
npx eslint src/pages/Charts.tsx
```

Passed. `src/routes/index.tsx` still has the existing `react-refresh/only-export-components` lint issue because it exports `router` and defines `RouteError` in the same file; unrelated to the chart-library change.

## 2026-06-28 — Advanced Clean Code Phase 3: Side Panels Extracted

Continuation of the Advanced cleanup after helper extraction and result/grid extraction.

Implemented:

- Added `apps/desktop/src/components/advanced/AdvancedSidePanels.tsx`.
  - Moved `SchemaTree`, `HistoryPanel`, and `FavoritesPanel` out of `Advanced.tsx`.
  - Kept schema search, table expansion, exact-count loading, history apply/clear, and favorite apply/delete behavior unchanged.
- Updated `apps/desktop/src/pages/Advanced.tsx`.
  - Now imports the side-panel components instead of defining them inline.
  - Removed unused chevron imports from the page.
  - Reduced the page from about 1,971 lines to 1,851 lines in this pass.

Verification:

```bash
cd apps/desktop
./node_modules/.bin/eslint --config eslint.config.js src/pages/Advanced.tsx src/pages/Advanced.test.tsx src/lib/advanced-workspace-helpers.ts src/components/advanced/AdvancedResultViews.tsx src/components/advanced/VirtualResultGrid.tsx src/components/advanced/AdvancedSidePanels.tsx src/components/data-intake/DataIntakeDrawer.tsx
./node_modules/.bin/vitest run src/pages/Advanced.test.tsx src/lib/advanced-api.test.ts --reporter=dot --pool=forks
./node_modules/.bin/tsc --noEmit --pretty false --project tsconfig.app.json 2>&1 | rg "src/pages/Advanced|src/lib/advanced-workspace-helpers|src/components/advanced/AdvancedResultViews|src/components/advanced/VirtualResultGrid|src/components/advanced/AdvancedSidePanels|src/components/data-intake/DataIntakeDrawer"
```

Results:

- ESLint passed for the touched Advanced/DataIntake files.
- Vitest passed: 2 files, 19 tests.
- Filtered typecheck returned no matching errors for touched files; `rg` exited `1` only because no matching TypeScript errors were found.

## 2026-06-28 — Advanced Clean Code Phase 4: Connection Gate Extracted

Continuation of Advanced cleanup focused on separating the "no active source" entry UI from the main workspace.

Implemented:

- Added `apps/desktop/src/components/advanced/AdvancedConnectionGate.tsx`.
  - Owns the "datasets understood in Simple" launcher.
  - Owns the database connection form UI, saved profile selector, TLS/safe-mode/profile fields, and SSH metadata inputs.
  - Keeps connect/open-source behavior in `Advanced.tsx` via callbacks, so runtime session logic remains centralized.
- Updated `apps/desktop/src/pages/Advanced.tsx`.
  - Replaced the inline connection/source gate JSX with `AdvancedConnectionGate`.
  - Added small `handleProviderChange` and `handleProfileChange` callbacks to remove long inline event handlers.
  - Removed the now-unused `Plug` icon import.

Verification:

```bash
cd apps/desktop
./node_modules/.bin/eslint --config eslint.config.js src/pages/Advanced.tsx src/components/advanced/AdvancedConnectionGate.tsx src/components/advanced/AdvancedSidePanels.tsx src/pages/Advanced.test.tsx src/lib/advanced-workspace-helpers.ts src/components/advanced/AdvancedResultViews.tsx src/components/advanced/VirtualResultGrid.tsx src/components/data-intake/DataIntakeDrawer.tsx
./node_modules/.bin/vitest run src/pages/Advanced.test.tsx src/lib/advanced-api.test.ts --reporter=dot --pool=forks
./node_modules/.bin/tsc --noEmit --pretty false --project tsconfig.app.json 2>&1 | rg "src/pages/Advanced|src/lib/advanced-workspace-helpers|src/components/advanced/AdvancedResultViews|src/components/advanced/VirtualResultGrid|src/components/advanced/AdvancedSidePanels|src/components/advanced/AdvancedConnectionGate|src/components/data-intake/DataIntakeDrawer"
```

Results:

- ESLint passed for the touched Advanced/DataIntake files.
- Vitest passed: 2 files, 19 tests.
- Filtered typecheck returned no matching errors for touched files; `rg` exited `1` only because no matching TypeScript errors were found.

## 2026-06-28 — Home Pending File Card Polish

User flagged that the post-import local-file pending card looked awkward, especially the "1 files detected" copy and the large displaced block under the hero.

Implemented:

- Updated `apps/desktop/src/pages/Home.tsx`.
  - Hero empty state now uses a shorter height when `pendingLocalBatch` exists, so the pending dataset card stays closer to the composer/action tiles.
  - Fixed singular/plural wording: `1 file ready`, `N files ready`, and `1 dataset group found`.
  - Restyled the pending card from a large blue bordered block into a quieter desktop card.
  - Tightened file/group rows, truncation, metadata, and CTA spacing.

Verification caveat:

- `tsc --noEmit --project tsconfig.app.json | rg "src/pages/Home.tsx"` still reports existing unrelated Home type debt around mapping overlay and implicit-any handlers. No new parser/type error was introduced in the edited pending-card JSX.

Follow-up visual alignment:

- The pending local-file card was still visually shifted left because it lived inside the main `lg:col-span-2` column while the hero composer/action tiles were centered across the page.
- Updated the Home grid so, when `pendingLocalBatch` exists and no dataset is active yet, the main column spans all three grid columns and centers itself with `max-w-3xl`.
- Reduced the grid gap for this pending state so the card reads as part of the import flow instead of a lower-left secondary panel.

## 2026-06-28 — BA Understanding Card Reframed

User asked whether the `What do you want to understand?` section was enough to show real data understanding. Decision: the prior UI exposed lenses/actions, but did not first tell the user what LightBI believes the dataset is.

Implemented:

- Updated `apps/desktop/src/components/analysis/UnderstandingNextCard.tsx`.
  - Added a BA summary block: `LightBI understands this as ...`.
  - Translates document type/grain/domain ids into user-facing labels.
  - Shows source row/column interpretation, ready runtime action count, review-needed count, business domains, and key signals mapped to physical columns.
  - Renamed the lens section to `Choose the decision angle to explore`.
  - Splits READY lenses from PARTIAL/BLOCKED lenses.
  - PARTIAL lenses are now tucked into a details panel explaining what needs more signals instead of competing equally with runnable choices.

Verification:

```bash
cd apps/desktop
./node_modules/.bin/eslint --config eslint.config.js src/components/analysis/UnderstandingNextCard.tsx
./node_modules/.bin/tsc --noEmit --pretty false --project tsconfig.app.json 2>&1 | rg "src/components/analysis/UnderstandingNextCard"
```

Results:

- ESLint passed.
- Filtered typecheck returned no matching errors; `rg` exited `1` only because no matching TypeScript errors were found.

## 2026-06-28 — BA Decision Trust Report

User clarified the target BA pipeline: data source -> structure understanding -> cleaning/standardization -> trust percentage -> business semantics -> insight -> suitable chart. The trust percentage must be a user-facing answer, e.g. "63% trust; 15% inbound data missing; 2 sheets wrong format; 5 duplicate rows; do not decide yet."

Implemented:

- Added `apps/desktop/src/lib/decision-trust-report.ts`.
  - Produces a `DecisionTrustReport` separate from the technical `DatasetHealthResult`.
  - Scores concrete decision risks from existing profile/metadata:
    - Missing-data percentages per column.
    - Workbook sheets with different structure or empty sheets.
    - Duplicate-key row estimates from best key cardinality.
    - Weak/no key detection.
    - Sample-only profiling caveat.
  - Classifies the result as `safe_to_decide`, `review_before_deciding`, or `exploratory_only`.
  - Returns headline, explanation, recommendation, and evidence snippets for UI.
- Added `apps/desktop/src/components/analysis/DecisionTrustReportCard.tsx`.
  - Shows the trust score and recommendation directly below Data Quality.
  - Lists evidence-backed issues so users know why a conclusion is or is not decision-safe.
- Updated `apps/desktop/src/pages/Home.tsx`.
  - Builds a `DatasetFamily` from local/online `SourceInspectionResult` so the same trust engine works for files and online sheets.
  - Stores the report when a local dataset family is accepted or an online/local source drawer inspection completes.
  - Clears the report for virtual business views until a separate multi-dataset/relationship trust model is implemented.

Verification:

```bash
cd apps/desktop
./node_modules/.bin/eslint src/lib/decision-trust-report.ts src/lib/decision-trust-report.test.ts src/components/analysis/DecisionTrustReportCard.tsx
npx vitest run src/lib/decision-trust-report.test.ts --reporter=dot --pool=forks
./node_modules/.bin/tsc --noEmit --pretty false --project tsconfig.app.json
```

Results:

- ESLint passed for the new engine/card/test files.
- Vitest passed: 1 file, 4 tests.
- Full app typecheck still fails on existing unrelated type debt in Understanding/BA tests and `Home.tsx` mapping-overlay/implicit-any handlers; no new type error was reported for the trust report engine/card or the newly wired Home line.

## 2026-06-28 — Chart Drill-Through Export Phase 1

User asked for a practical BA/operations workflow: when a chart shows a segment such as `ton>24h = 67`, the user should click that segment, inspect the matching source rows, select the rows they want, and export them to Excel instead of manually filtering in Excel.

Implemented:

- Added `apps/desktop/src/lib/drill-through-export.ts`.
  - Defines `DrillThroughPoint` and `DrillThroughResult`.
  - Builds safe DuckDB drill-through SQL:
    - `SELECT * FROM __LIGHTBI_PREVIEW_TABLE__ WHERE <clicked dimension> = <clicked value> LIMIT 50000`.
  - Executes against the same local DuckDB runtime used by Simple preview.
  - Works with full local file runtime when `runtimeDatasetSource` exists; falls back to retained rows otherwise.
  - Provides CSV/XLSX export helpers with spreadsheet-formula protection for CSV.
- Added `apps/desktop/src/lib/drill-through-export.test.ts`.
  - Verifies `ton>24h` style segment SQL.
  - Verifies CSV escaping/formula protection.
- Updated `apps/desktop/src/components/analysis/ChartPreviewRenderer.tsx`.
  - Emits raw clicked chart point metadata via `onDrillThrough`.
  - Keeps formatted display labels separate from raw filter values.
  - Removed existing `any` lint debt in this component while touching it.
- Updated `apps/desktop/src/pages/Investigation.tsx`.
  - Clicking a chart segment now opens a `Filtered rows from chart` panel.
  - Panel shows matched row count, source filter, table preview, row checkboxes, select all / clear selection.
  - Exports selected rows to CSV or Excel.
  - Uses a separate execution coordinator for drill-through so clicking a segment does not abort the preview execution coordinator.

Current scope:

- Phase 1 targets local file / online sheet materialized into the local DuckDB runtime.
- DB/Mongo provider-specific drill-through can reuse the same `DrillThroughPoint` contract later.
- The exported columns currently come from the DuckDB materialized source, so local file headers may be lowercased by the runtime materializer. Future polish can preserve original header labels in the materialized runtime metadata.

Verification:

```bash
cd apps/desktop
./node_modules/.bin/eslint src/lib/drill-through-export.ts src/lib/drill-through-export.test.ts src/components/analysis/ChartPreviewRenderer.tsx src/pages/Investigation.tsx
npx vitest run src/lib/drill-through-export.test.ts --reporter=dot --pool=forks
./node_modules/.bin/tsc --noEmit --pretty false --project tsconfig.app.json 2>&1 | rg "src/lib/drill-through-export|src/components/analysis/ChartPreviewRenderer|src/pages/Investigation"
```

Results:

- ESLint passed for touched drill-through files.
- Vitest passed: 1 file, 2 tests.
- Filtered typecheck returned no matching errors; `rg` exited `1` only because no matching TypeScript errors were found.

## 2026-06-28 — Drill-Through Date Display Fix

User noticed drill-through rows displayed `ORDERDATE` as large grouped numbers such as `1.714.953.600.000`.

Implemented:

- Updated `apps/desktop/src/lib/display-formatter.ts`.
  - Numeric values in date-like columns are now inferred as dates/datetimes when they look like:
    - Excel serial dates.
    - Unix seconds.
    - Unix milliseconds.
  - `formatValue` now converts Excel serial and Unix seconds/milliseconds before date formatting.
  - Cleaned existing `any`/`let` lint debt in the formatter while touching it.
- Updated `apps/desktop/src/lib/display-formatter.test.ts`.
  - Added coverage for `ORDERDATE = 1714953600000`.
  - Added coverage for Excel serial date formatting.

Verification:

```bash
cd apps/desktop
./node_modules/.bin/eslint src/lib/display-formatter.ts src/lib/display-formatter.test.ts src/pages/Investigation.tsx
npx vitest run src/lib/display-formatter.test.ts src/lib/drill-through-export.test.ts --reporter=dot --pool=forks
./node_modules/.bin/tsc --noEmit --pretty false --project tsconfig.app.json 2>&1 | rg "src/lib/display-formatter|src/pages/Investigation|src/components/analysis/ChartPreviewRenderer|src/lib/drill-through-export"
```

Results:

- ESLint passed.
- Vitest passed: 2 files, 18 tests.
- Filtered typecheck returned no matching errors; `rg` exited `1` only because no matching TypeScript errors were found.

## 2026-06-28 — Google Sheets UTF-8 CSV Runtime Fix

User reported a public Google Sheet failed in Investigation/Advanced with:

- `DUCKDB_BINDER_ERROR: Referenced column "mã nhân viên xuất" not found`
- Candidate bindings showed mojibake headers such as `"mã£ nháº­n viãªn xuáº¥t"`.

Root cause:

- `online-source-inspector` fetched and inspected Google Sheets CSV as UTF-8 text correctly.
- The runtime/Advanced file workspace later materialized the saved `.csv` through `XLSX.read(array)` as if it were an Excel workbook.
- SheetJS guessed CSV encoding incorrectly for Vietnamese text, producing mojibake headers inside DuckDB.

Implemented:

- Updated `apps/desktop/src/lib/full-file-runtime-parser.ts`.
  - CSV/TSV/TXT payloads now use explicit `TextDecoder("utf-8")` and a text delimiter parser.
  - Excel files still use `XLSX.read`.
  - The fix applies to both Simple Investigation runtime and Advanced inherited file workspace because both use `materializeRuntimeDatasetSource`.
- Updated `apps/desktop/src/lib/full-file-runtime-parser.test.ts`.
  - Added a regression test for UTF-8 Vietnamese Google Sheets CSV headers:
    - `Mã nhân viên xuất`
    - `Ngày xuất`
    - `Tên kho xuất`

Verification:

```bash
cd apps/desktop
./node_modules/.bin/eslint src/lib/full-file-runtime-parser.ts src/lib/full-file-runtime-parser.test.ts
npx vitest run src/lib/full-file-runtime-parser.test.ts src/lib/local-duckdb-executor.test.ts --reporter=dot --pool=forks
./node_modules/.bin/tsc --noEmit --pretty false --project tsconfig.app.json 2>&1 | rg "src/lib/full-file-runtime-parser|src/lib/local-duckdb-executor|src/lib/advanced-file-session"
```

Results:

- ESLint passed.
- Vitest passed: 2 files, 18 tests.
- Filtered typecheck returned no matching errors; `rg` exited `1` only because no matching TypeScript errors were found.
- Manual network probe of the provided Google CSV export returned clean UTF-8 headers, confirming the bug was local runtime parsing, not Google.

## 2026-06-28 — Identifier Display Formatting Fix

User noticed LightBI was adding thousands separators to identifier/code columns, e.g. `Mã kho xuất = 6968` displayed as `6.968`.

Implemented:

- Updated `apps/desktop/src/lib/display-formatter.ts`.
  - Numeric values in identifier-like columns now infer as `string`, not `number`.
  - Covered common code/id patterns:
    - `Mã ...`
    - `code`
    - `id`, `...id`, `_id`
    - `ORDERID`, `CUSTOMERID`, `PRODUCTID`
  - Date-like numeric columns still take precedence, so `ORDERDATE` keeps formatting as date.
- Updated `apps/desktop/src/lib/display-formatter.test.ts`.
  - Added regression tests for `Mã kho xuất`, `Mã phiếu xuất`, `ORDERID`, `CUSTOMERID`.
  - Added a display test ensuring `6968` stays `6968`, not `6.968`.

Verification:

```bash
cd apps/desktop
./node_modules/.bin/eslint src/lib/display-formatter.ts src/lib/display-formatter.test.ts src/pages/Investigation.tsx src/components/analysis/ChartPreviewRenderer.tsx
npx vitest run src/lib/display-formatter.test.ts --reporter=dot --pool=forks
./node_modules/.bin/tsc --noEmit --pretty false --project tsconfig.app.json 2>&1 | rg "src/lib/display-formatter|src/pages/Investigation|src/components/analysis/ChartPreviewRenderer"
```

Results:

- ESLint passed.
- Vitest passed: 1 file, 18 tests.
- Filtered typecheck returned no matching errors; `rg` exited `1` only because no matching TypeScript errors were found.

## 2026-06-28 — Advanced Workspace Header Preservation

User reported Advanced Data Workspace still showed lowercased headers after the Google Sheets UTF-8 fix, e.g. `mã phiếu xuất`, `ngày xuất`, while the source sheet headers are `Mã phiếu xuất`, `Ngày xuất`.

Root cause:

- `full-file-runtime-parser` intentionally normalizes runtime JSON keys to lowercase for safer SQL binding.
- `AdvancedFileSession` previously exposed `read_json_auto(...)` directly as the user-facing table, so the lowercased runtime keys leaked into Advanced grid/query results.

Implemented:

- Updated `apps/desktop/src/lib/advanced-file-session.ts`.
  - Advanced now creates an internal raw DuckDB view per source file.
  - The public Advanced table view aliases lowercase runtime keys back to the original file headers from `AdvancedWorkspaceSource.tables[].columns`.
  - Example: `"mã phiếu xuất" AS "Mã phiếu xuất"`.
  - This keeps runtime SQL stable while preserving source header display in Advanced.
- Added `apps/desktop/src/lib/advanced-file-session.test.ts`.
  - Regression test ensures Vietnamese Google Sheet headers are exposed with original casing in the Advanced table view.

Verification:

```bash
apps/desktop/node_modules/.bin/vitest run apps/desktop/src/lib/advanced-file-session.test.ts
apps/desktop/node_modules/.bin/eslint apps/desktop/src/lib/advanced-file-session.ts apps/desktop/src/lib/advanced-file-session.test.ts
```

Results:

- Vitest passed: 1 file, 1 test.
- ESLint passed.

## 2026-06-28 — Advanced Result Column Alias Rename

User asked how to rename a column such as `CustomerName` to `Name` inside Advanced.

Decision:

- For file/online-sheet inherited workspaces, renaming should be a result alias, not a destructive source-file edit.
- For real database schema renames, the existing/future Structure Editor should continue to generate physical `ALTER TABLE ... RENAME COLUMN ...` SQL.

Implemented:

- Added `buildRenamedResultSql` in `apps/desktop/src/lib/advanced-workspace-helpers.ts`.
  - Wraps the current query and projects every column with explicit aliases.
  - Example: `CustomerName` can become `Name` while all other columns keep their names.
  - Rejects empty names, missing result columns, and duplicate output names.
- Updated `apps/desktop/src/components/advanced/VirtualResultGrid.tsx`.
  - Right-clicking a grid header or cell now exposes `Rename column alias`.
- Updated `apps/desktop/src/pages/Advanced.tsx`.
  - The rename prompt builds the alias SQL, resets sort/filter, runs the query again, and updates grid/export/BA Brief output with the new alias.

Verification:

```bash
apps/desktop/node_modules/.bin/vitest run apps/desktop/src/lib/advanced-workspace.test.ts apps/desktop/src/lib/advanced-file-session.test.ts
apps/desktop/node_modules/.bin/eslint apps/desktop/src/pages/Advanced.tsx apps/desktop/src/components/advanced/VirtualResultGrid.tsx apps/desktop/src/lib/advanced-workspace-helpers.ts apps/desktop/src/lib/advanced-workspace.test.ts
apps/desktop/node_modules/.bin/tsc --noEmit --pretty false --project apps/desktop/tsconfig.app.json 2>&1 | rg "src/pages/Advanced|src/components/advanced/VirtualResultGrid|src/lib/advanced-workspace-helpers|src/lib/advanced-workspace.test"
```

Results:

- Vitest passed: 2 files, 7 tests.
- ESLint passed.
- Filtered typecheck returned no matching errors; `rg` exited `1` only because no matching TypeScript errors were found.

## 2026-06-28 — Advanced Export Toolbar Compact Menu

User flagged that the Advanced toolbar exposed too many export actions directly (`All CSV`, `All XLSX`, `All JSON`, `All SQL`, `Export XLSX`, etc.).

Implemented:

- Updated `apps/desktop/src/pages/Advanced.tsx`.
  - Replaced the long row of export buttons with one `Download` button.
  - Dropdown groups actions into:
    - `Current page`: CSV, XLSX, JSON, SQL.
    - `Full result`: All CSV, All XLSX, All JSON, All SQL.
  - Keeps full-export progress and cancel affordance inside the dropdown/button state.
  - Removed toolbar horizontal overflow pressure from the export controls.

Verification:

```bash
apps/desktop/node_modules/.bin/eslint apps/desktop/src/pages/Advanced.tsx
apps/desktop/node_modules/.bin/tsc --noEmit --pretty false --project apps/desktop/tsconfig.app.json 2>&1 | rg "src/pages/Advanced"
```

Results:

- ESLint passed.
- Filtered typecheck returned no matching errors; `rg` exited `1` only because no matching TypeScript errors were found.

## 2026-06-28 — Chart Library To Dashboard Flow

User asked to continue the `/charts` page, which was still mostly a static chart-library placeholder.

Implemented:

- Updated `packages/runtime/src/types.ts` and `packages/runtime/src/store.ts`.
  - Added runtime actions:
    - `createDashboard`
    - `createChart`
    - `addChartToDashboard`
  - Dashboard widgets now store chart placements in runtime state.
- Rebuilt `apps/desktop/src/pages/Charts.tsx`.
  - Saved chart cards now have visual mini-previews.
  - Users can choose a dashboard target, create a new dashboard, add saved charts to that dashboard, and see placed chart cards in a target preview panel.
  - Chart templates can create reusable chart cards against a selected dataset and immediately add them to the chosen dashboard.
- Rebuilt `apps/desktop/src/pages/DashboardBuilder.tsx`.
  - Uses the route dashboard id and renders actual dashboard widgets from runtime state.
  - Chart widgets render preview visuals through existing dashboard widget components.
  - Empty dashboards guide users back to Chart Library.
- Rebuilt `apps/desktop/src/pages/Dashboards.tsx`.
  - Replaced the old table with dashboard cards.
  - `New dashboard` now creates a real runtime dashboard and opens it.

Verification:

```bash
apps/desktop/node_modules/.bin/eslint apps/desktop/src/pages/Charts.tsx apps/desktop/src/pages/Dashboards.tsx apps/desktop/src/pages/DashboardBuilder.tsx
apps/desktop/node_modules/.bin/tsc --noEmit --pretty false --project apps/desktop/tsconfig.app.json 2>&1 | rg "src/pages/Charts|src/pages/Dashboards|src/pages/DashboardBuilder|packages/runtime|runtime/src"
packages/runtime/node_modules/.bin/tsc --noEmit --pretty false --moduleResolution bundler --module ESNext --target ES2020 --jsx react-jsx packages/runtime/src/store.ts packages/runtime/src/types.ts
```

Results:

- ESLint passed.
- Runtime typecheck passed.
- App filtered typecheck returned no matching errors; `rg` exited `1` only because no matching TypeScript errors were found.

## 2026-06-28 — Product Direction Boundary: Business Understanding Engine

User provided a product/pricing direction clarifying that LightBI is not merely a BI tool and not an AI dashboard. The accepted product identity is:

```text
Raw Data
-> Import
-> Understand
-> Clean / Standardize as non-destructive overlay
-> Trust Score
-> Dashboard / KPI / Insight
-> AI Report, optional
```

Decision:

- LightBI is a **Business Understanding Engine**.
- Simple Mode is the BA / decision workspace and the key differentiator.
- Advanced Mode remains strategically important and should compete with TablePro-level data workspace capability.
- The intended competitive position is: TablePro-level Advanced workspace + Simple Mode Business Understanding Engine.
- AI is optional and must read LightBI-generated artifacts, not raw data.
- Clean/standardize means mapping overlays, aliases, inferred types, normalized runtime views, and reviewable artifacts. It must not silently mutate original files, sheets, or databases.
- Provider/system expansion remains plugin-first.

Docs added:

- `docs/architecture/ADR-117-business-understanding-engine-product-boundary.md`
- `docs/product/product-direction-and-pricing-v1.md`

Important invariant for future work:

Advanced can remain powerful, but its result buffers must be able to flow back into Simple Mode for trust scoring, insights, charts, dashboard cards, and BA decision briefs.

## 2026-06-28 — Plugin SDK Contract Manual Phase 1

User asked to continue the unfinished SDK work, log progress, and add manual docs for SDK implementation.

Implemented:

- Expanded `packages/plugin-sdk/src/index.ts` from a minimal provider interface into a fuller provider contract:
  - versioned `lightbi.plugin.v1` API marker;
  - manifest metadata, connection fields, TLS/safe-mode/SSH input, lifecycle context, logger, and secret store types;
  - SQL dialect details for quoting, parameters, limits, transactions, explain, savepoints, and reserved words;
  - deep schema metadata for schemas, tables, columns, indexes, foreign keys, triggers, routines, comments, defaults, sizes, and estimated rows;
  - query params, bounded query options, stream query chunks, and typed result buffers;
  - backend-style streaming export/import contracts for CSV, XLSX, JSON, and SQL;
  - import preview/mapping/error-mode contracts;
  - writeback/DDL preview and commit contracts with transaction policy;
  - normalized diagnostics and provider error shape;
  - `defineLightBIProviderPlugin()` helper for plugin authors.
- Added `packages/plugin-sdk/README.md` with product boundary, minimum provider contract, and starter SQL Server-style example.
- Added `docs/plugin-sdk/provider-plugin-manual.md` with lifecycle, UI exposure gate, manifest rules, SQL dialect guidance, schema metadata expectations, query/import/export/writeback/DDL/diagnostics rules, Simple Mode handoff, SQL Server first-plugin notes, deployment checklist, and release readiness criteria.
- Updated `docs/architecture/ADR-116-plugin-first-system-expansion.md` to point to the SDK manual.

Current status:

- SDK is still interface/manual phase, not a dynamic third-party marketplace runtime.
- Future provider expansion should go through this contract first, then a backend plugin host/registry.
- SQL Server remains the recommended first real provider plugin once the host boundary exists.

## 2026-06-29 — Plugin SDK Built-In Registry Phase

User asked to continue the unfinished SDK work.

Implemented:

- Added `LightBIPluginRegistry` to `packages/plugin-sdk/src/index.ts`.
  - Registers trusted plugin objects.
  - Rejects duplicate provider IDs.
  - Lists all entries, manifests, and exposable entries.
  - Initializes and disposes registered plugins in host order.
- Added `evaluateProviderExposureGate()`.
  - Checks minimum provider exposure requirements before Simple/Advanced UI can list a provider.
  - Blocks missing provider ID, display name, connect, schema discovery, or read-only query capability.
  - Warns when `normalizeError` or relational `sqlDialect` is missing.
- Added `packages/plugin-sdk/examples/sqlserver-provider.ts`.
  - Provides the first SQL Server-style provider manifest skeleton.
  - Uses bracket quoting, `@p1` parameter style, SQL Server default port, `dbo` default schema, TLS/encryption fields, and TablePro-inspired provider capability boundaries.
  - It is example-only and not wired to a driver.
- Updated `packages/plugin-sdk/README.md` and `docs/plugin-sdk/provider-plugin-manual.md` with registry usage and SQL Server skeleton notes.

Important invariant:

- `LightBIPluginRegistry` is a trusted built-in/first-party registry, not a dynamic marketplace loader.
- Future backend work should create a host adapter that imports trusted plugins, registers them, and exposes only `registry.listExposable()` to user-facing provider lists.

## 2026-06-29 — Backend Plugin Host Bridge Phase

User asked to continue SDK work.

Implemented:

- Added `apps/server/src/plugin_host.rs`.
  - Mirrors the TypeScript SDK manifest and exposure-gate shape in Rust because the current backend is Axum/Rust.
  - Registers current built-in providers as `core_builtin`: PostgreSQL, MySQL, MariaDB, SQLite, MongoDB.
  - Registers SQL Server as `planned_plugin` with connect/schema/query capabilities disabled so it remains hidden from public provider lists.
  - Defines provider capabilities, connection fields, SQL dialect metadata, registry entries, and exposure-gate evaluation.
- Updated `apps/server/src/main.rs`.
  - Added `plugin_registry` to `AppState`.
  - Initialized it with `PluginRegistry::built_in()`.
  - Added API routes:
    - `GET /api/plugins/providers`
    - `GET /api/plugins/providers/diagnostics`
- Updated SDK manual and ADR-116 with backend bridge details.

Design note:

- This bridge does not execute plugin code yet. It is the provider availability/manifest boundary so UI and future backend host code stop relying on hardcoded provider dropdowns.
- Public UI should consume `/api/plugins/providers`. Developer diagnostics can use `/api/plugins/providers/diagnostics`.

## 2026-06-29 — Advanced Provider Dropdown Uses Plugin Registry

User asked to continue SDK work after the backend plugin host bridge.

Implemented:

- Updated `apps/desktop/src/lib/advanced-api.ts`.
  - Added provider manifest/capability/exposure-gate client types.
  - Added `loadAdvancedProviderPlugins()` for `GET /api/plugins/providers`.
  - Filters public providers to currently supported Advanced providers: PostgreSQL, MySQL, MariaDB, SQLite, MongoDB.
- Updated `apps/desktop/src/components/advanced/AdvancedConnectionGate.tsx`.
  - Provider dropdown now renders backend plugin manifests instead of hardcoded options.
- Updated `apps/desktop/src/pages/Advanced.tsx`.
  - Loads provider plugins on mount.
  - Falls back to the existing five built-in providers if the backend registry is unavailable.
  - Uses provider display name from manifest when switching provider.
- Updated `apps/desktop/src/lib/advanced-api.test.ts`.
  - Added coverage that planned/hidden providers such as SQL Server do not appear in the Advanced dropdown loader.

Verification:

```bash
apps/desktop/node_modules/.bin/vitest run apps/desktop/src/lib/advanced-api.test.ts
apps/desktop/node_modules/.bin/eslint apps/desktop/src/lib/advanced-api.ts apps/desktop/src/lib/advanced-api.test.ts apps/desktop/src/components/advanced/AdvancedConnectionGate.tsx apps/desktop/src/pages/Advanced.tsx
```

Results:

- Vitest passed: 4 tests.
- Targeted ESLint passed.
- Full app typecheck still reports pre-existing unrelated errors in BA/understanding/dashboard tests and old contracts; no new error was reported for the files touched in this SDK provider dropdown phase.

## 2026-06-29 — Advanced Result Buffer to Simple BA Handoff

User approved the next phase after SDK/typecheck cleanup: connect Advanced results back into Simple Mode so LightBI's TablePro-like workspace feeds the BA decision engine.

Implemented:

- Added `apps/desktop/src/lib/advanced-result-handoff.ts`.
  - Converts an `AdvancedQueryResult` into a Simple `InvestigationSession` payload.
  - Preserves source lineage: dataset ID, Advanced title, provider, and materialized SQL.
  - Converts result-buffer rows into retained row objects for the BA pipeline.
  - Infers a Simple action from result columns:
    - date + numeric measure -> `trend`
    - categorical + measure -> `group_by`
    - categorical only -> `distribution`
    - otherwise -> `table_preview`
  - Creates runtime intent, runtime plan preview, and a safe AI briefing with bounded-buffer caveats.
- Updated `apps/desktop/src/pages/Advanced.tsx`.
  - Existing `BA Brief` action now uses the handoff helper instead of creating a generic empty action.
  - Simple Mode receives meaningful dimensions/measures and readiness caveats from the Advanced result buffer.
- Updated `apps/desktop/src/pages/Investigation.tsx`.
  - Renamed secondary duplicate preview buttons to reduce accessible-name collisions:
    - placeholder button: `Preview chart`
    - lower execution button: `Execute preview`
    - primary header action remains `Run preview`.
- Added `apps/desktop/src/lib/advanced-result-handoff.test.ts`.

Verification:

```bash
apps/desktop/node_modules/.bin/vitest run apps/desktop/src/lib/advanced-result-handoff.test.ts apps/desktop/src/lib/investigation-session.test.ts
apps/desktop/node_modules/.bin/tsc --noEmit --pretty false --project apps/desktop/tsconfig.app.json
```

Results:

- New handoff/session tests passed: 8 tests.
- Full desktop typecheck passed.
- Broader `Investigation.test.tsx` still has older brittle assertions around repeated UI text such as readiness caveats and boundary labels; this is separate from the handoff contract and should be cleaned in a UI test maintenance pass.

## 2026-06-29 — Investigation Boundary Test Maintenance

User asked to continue after the Advanced -> Simple BA handoff.

Implemented:

- Updated `apps/desktop/src/pages/Investigation.test.tsx`.
  - Replaced brittle single-text queries for repeated caveat/failure text with `getAllByText(...)[0]`.
  - Updated old expected boundary heading from `Execution Boundary Failed` to current UI wording `Execution Failed`.
  - Kept the behavioral assertions intact: no fallback for SQL/semantic/runtime boundary failures, fallback only for allowed simple/infra cases, and no success chart placeholder when validation rejects the result.

Verification:

```bash
apps/desktop/node_modules/.bin/vitest run apps/desktop/src/lib/advanced-result-handoff.test.ts apps/desktop/src/lib/investigation-session.test.ts apps/desktop/src/pages/Investigation.test.tsx
apps/desktop/node_modules/.bin/vitest run apps/desktop/src/lib/advanced-workspace.test.ts apps/desktop/src/pages/Advanced.test.tsx apps/desktop/src/lib/advanced-result-handoff.test.ts
apps/desktop/node_modules/.bin/tsc --noEmit --pretty false --project apps/desktop/tsconfig.app.json
```

Results:

- Investigation + handoff/session tests passed: 18 tests.
- Advanced workspace/page + handoff tests passed: 25 tests.
- Full desktop typecheck passed.

## 2026-06-29 — Windows Desktop Packaging Smoke Build

User asked for a Windows 10 64-bit desktop build to download and test.

Implemented:

- Added a minimal Tauri v2 desktop shell under `crates/lightbi-tauri`.
  - `tauri.conf.json` bundles the existing `apps/desktop` Vite build into a Windows NSIS installer.
  - `build.rs` wires `tauri-build`.
  - `src/main.rs` now boots a Tauri app window instead of the placeholder Rust hello-world.
- Added Windows packaging icons in `crates/lightbi-tauri/icons/`.
- Fixed `apps/desktop/vite.config.ts` to use `vitest/config`, allowing production build config to keep its `test` block without TypeScript rejecting it.

Verification:

```bash
pnpm --dir apps/desktop build
cargo check -p lightbi-tauri
cargo tauri build --target x86_64-pc-windows-gnu
```

Results:

- Windows x64 app binary built:
  - `target/x86_64-pc-windows-gnu/release/lightbi-tauri.exe`
- Windows x64 NSIS installer built:
  - `target/x86_64-pc-windows-gnu/release/bundle/nsis/LightBI_0.1.0_x64-setup.exe`
- Installer size: about 18 MB.
- Cross-build warning is expected because this was built from Linux ARM64 to Windows x64. Installer signing is skipped until a Windows signing workflow/certificate is added.
- This is a desktop-shell smoke build. Backend embedding/offline API packaging is not yet complete, so flows requiring the backend server may still need the web/server stack running.

## 2026-06-29 — ADR/Handoff Technical Debt Audit

User asked to review ADRs and handoff for outstanding technical debt after the Windows desktop smoke build and native-app discussion.

Verified:

```bash
pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json
cargo check -p lightbi-tauri
cargo check -p lightbi-server
```

Results:

- Desktop TypeScript check passed.
- Tauri shell check passed after regenerating `crates/lightbi-tauri/icons/icon.png` as RGBA. The first full workspace check exposed this as a real packaging issue: `icon.png is not RGBA`.
- Server/plugin-host check passed.
- Rust warnings remain but are not blocking:
  - unused registry fields in export/runtime/materializer scaffolds;
  - unused `plan` in runtime coordinator placeholder;
  - unused imports in perspective/project crates;
  - unused preview DTO fields in `apps/server/src/main.rs`.

Current important technical debt:

1. Desktop shell is still WebView/Tauri, not native WinUI/SwiftUI/AppKit. Native shells are deferred by product decision.
2. Backend/core runtime is not embedded as a desktop sidecar yet. Desktop smoke build relies on frontend/local runtime; server-backed flows still need backend separately.
3. Windows installer is unsigned; macOS signing/notarization and OS-specific build workflows are not set up.
4. Plugin SDK has contracts, registry, backend manifest bridge, and UI provider dropdown integration, but no dynamic trusted plugin loader/driver execution yet.
5. SQL Server remains intentionally hidden/planned until implemented as the first real provider plugin.
6. Full-file materialization still builds large JSON payloads before DuckDB registration; streaming/Arrow ingestion remains a performance phase.
7. Advanced chart/dashboard cards now exist, but saved dashboard cards still need deeper real-data binding/refresh semantics before they are Power BI-like.
8. File/online-sheet header aliases are non-destructive result overlays. Physical source mutation is intentionally not implemented.

Strategic non-debt / intentionally deferred:

- Real LLM reporting remains paused. AI must read LightBI artifacts later, not raw data.
- Native Windows/macOS shells are not current scope; current desktop package is a testable shell.
- Cloud sync/marketplace/plugin signing are future product layers, not MVP blockers.

## 2026-06-29 — Beta Gate Direction: Domain BA First

User clarified the near-term product target after ADR-118:

- The immediate goal is to complete the domain-specific BA layer in Simple Mode and polish UI/UX enough for Beta.
- LightBI's market differentiation is not only Advanced/TablePro-style data workspace parity, but Simple Mode's ability to answer business questions like a real BA for each covered domain.
- Existing covered domains such as Revenue/Sales, Finance/Profitability, Inventory, Logistics/Operations, Customer, and Performance should go deeper before adding many new domains.
- For Beta, prioritize:
  1. Domain BA Playbooks (`docs/architecture/ADR-118-domain-ba-playbooks.md`).
  2. Multi-period comparison for business reports.
  3. Revenue/profit/cost/driver explanations with caveats when evidence is missing.
  4. Exportable evidence rows behind each answer.
  5. UI/UX polish for Simple Mode decision flow.
  6. A standalone LightBI web presence for Beta onboarding.
- Defer until after Beta/community feedback:
  - broad new domain expansion;
  - additional database drivers;
  - real third-party plugin execution/marketplace;
  - SQL Server or other enterprise connectors beyond planned SDK scaffolding.

Implementation reminder:

- Do not let Advanced Mode or provider/plugin work pull focus away from the Beta Gate unless needed to support Simple BA answers.
- Keep new domain logic in deterministic, testable playbooks rather than UI copy or connector-specific code.
- Use the existing SDK as the future expansion boundary, but avoid expanding it before the BA differentiator is Beta-ready.

## 2026-06-30 — Domain BA Playbook Core Phase 1

User resumed work and asked to implement BA Playbooks.

Implemented:

- Added `apps/desktop/src/lib/domain-ba-playbooks.ts`.
  - Defines deterministic `DomainBAPlaybook` contracts.
  - Covers Beta domain set:
    - Revenue / Sales;
    - Finance / Profitability;
    - Inventory / Stock;
    - Operations / Logistics;
    - Customer;
    - Performance / KPI.
  - Each playbook includes supported business questions, metric formulas, driver models, caveat rules, chart rules, and exportable evidence rules.
- Added `apps/desktop/src/lib/ba-comparison-engine.ts`.
  - Builds `DomainComparisonBrief` artifacts from two or more period inputs.
  - Detects revenue/cost/profit/category/product/branch/customer-like fields through existing taxonomy plus local BA comparison aliases.
  - Computes revenue delta, estimated profit delta when cost/profit evidence exists, top growth drivers, top decline drivers, top profit drivers, reason codes, caveats, recommended charts, and exportable evidence rows.
  - Refuses profitability claims when cost/profit/cost-like evidence is missing.
  - Keeps profit ranking independent from revenue ranking.
- Added tests:
  - `apps/desktop/src/lib/domain-ba-playbooks.test.ts`
  - `apps/desktop/src/lib/ba-comparison-engine.test.ts`

Verification:

```bash
pnpm --dir apps/desktop exec vitest run src/lib/domain-ba-playbooks.test.ts src/lib/ba-comparison-engine.test.ts
pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json
```

Results:

- Domain BA Playbook tests passed: 7 tests.
- Desktop TypeScript check passed.

Important behavior now locked:

- Two monthly business reports can be compared without hardcoding a sample file.
- English and Vietnamese headers are both covered for the initial revenue/profit path.
- Revenue increase does not imply profit increase.
- If cost-like fields are missing, LightBI produces revenue comparison but blocks/downranks profit conclusions.

Next recommended step:

- Wire `createDomainComparisonBrief()` into the Simple Mode multi-file dataset family flow and render a `Business Comparison Brief` UI block before deeper UI polish.

## 2026-06-30 — Domain BA Playbook Simple Integration

User asked to continue until BA Playbook is done.

Implemented:

- Added `apps/desktop/src/components/analysis/BusinessComparisonBriefCard.tsx`.
  - Renders the deterministic `DomainComparisonBrief` artifact for Simple Mode.
  - Shows period comparison, decision/trust scores, metric deltas, growth drivers, decline drivers, profit drivers, reason codes, caveats, and exportable evidence groups.
  - Evidence groups have CSV and XLSX export actions so users can take the filtered rows behind a BA answer without manually filtering Excel.
- Wired `createDomainComparisonBriefFromFamily()` into `apps/desktop/src/pages/Home.tsx`.
  - When a local multi-file dataset family is selected, Simple Mode now attempts to generate a business comparison brief automatically.
  - Single-file, online-source refresh, virtual dataset, and source replacement paths clear stale comparison state.
- Extended `apps/desktop/src/lib/ba-comparison-engine.test.ts`.
  - Covers generation from `DatasetFamily`, not only direct period arrays.

Verification:

```bash
pnpm --dir apps/desktop exec vitest run src/lib/domain-ba-playbooks.test.ts src/lib/ba-comparison-engine.test.ts
pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json
```

Results:

- Domain BA Playbook + comparison tests passed: 8 tests.
- Desktop TypeScript check passed.

Current behavior:

- Simple Mode can compare two or more compatible business report files and answer:
  - revenue increased/decreased;
  - where growth and decline came from;
  - whether profit can be discussed safely;
  - which products/categories/locations/customers drive growth, decline, or profit;
  - which caveats make the conclusion unsafe;
  - which raw rows support each exportable evidence group.
- Profitability is intentionally blocked/downranked when the file has no cost/profit/margin evidence.

Known Beta polish left:

- Add a small period-label control if filename/date inference is ambiguous.
- Add deeper N-period trend explanation after the two-period path is stable in user testing.

## 2026-06-30 — BA Playbook 5-Phase Smoothing

User asked whether the older target question is fully satisfied, then approved the five proposed phases, with an extra warning: do not hardcode a sales sample; research and support basic/standard/advanced data maturity across covered domains.

Implemented:

- Extended `apps/desktop/src/lib/domain-ba-playbooks.ts`.
  - Added `DomainSignalTier`.
  - Each Beta domain now has `basic`, `standard`, and `advanced` signal tiers:
    - Revenue / Sales;
    - Finance / Profitability;
    - Inventory / Stock;
    - Operations / Logistics;
    - Customer;
    - Performance / KPI.
  - This gives LightBI a maturity ladder: what can be answered with a basic file, what becomes possible with standard signals, and what advanced evidence is required for stronger BA conclusions.
- Extended `apps/desktop/src/lib/ba-comparison-engine.ts`.
  - Added `business_period_review` preset metadata.
  - Added deterministic period mapping with confidence and chronological sorting from month/date/year-month file names.
  - Added editable Simple Mode period labels: users can correct ambiguous labels and recompute the comparison brief.
  - Added signal coverage summary for revenue, cost, profit, dimension, quantity, and discount.
  - Added profit evidence states:
    - direct profit/margin available;
    - estimated from cost-like fields;
    - missing.
  - Added structured BA narrative sections:
    - executive answer;
    - where it changed;
    - why it changed;
    - profitability answer;
    - decision safety.
  - Upgraded evidence export groups so exported rows include both previous and current period rows with `__lightbi_period`.
  - Preserved the guardrail that revenue leaders are not automatically profit leaders.
- Updated `apps/desktop/src/components/analysis/BusinessComparisonBriefCard.tsx`.
  - Renders period mapping status.
  - Renders profit evidence status.
  - Renders structured narrative sections.
  - Shows TOP 10 drivers instead of truncating at 5.
  - Keeps CSV/XLSX export on evidence groups.
- Updated `apps/desktop/src/lib/domain-ba-playbooks.test.ts` and `apps/desktop/src/lib/ba-comparison-engine.test.ts`.
  - Tests now cover signal tiers, top 10 drivers, period inference from filenames, narrative sections, profit guardrails, and evidence row period tagging.
- Updated `docs/architecture/ADR-118-domain-ba-playbooks.md` with the five-phase implementation status.

Verification:

```bash
pnpm --dir apps/desktop exec vitest run src/lib/domain-ba-playbooks.test.ts src/lib/ba-comparison-engine.test.ts
pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json
```

Results:

- BA Playbook tests passed: 11 tests.
- Desktop TypeScript check passed.

Current status against the old user question:

- Simple Mode can now answer the two-report business comparison target at Beta-core level:
  - revenue increased/decreased;
  - growth drivers;
  - decline drivers;
  - likely reasons from quantity/cost/discount/driver mix when signals exist;
  - TOP 10 contributors;
  - profit ranking when profit/cost evidence exists;
  - explicit refusal/caveat when profit evidence is missing;
  - exportable evidence rows for follow-up.

Remaining polish:

- Improve period-label UX for many files with drag-to-order or month presets if Beta users need it.
- Add more domain-specific runtime assertions for real inventory/logistics/customer/performance Beta files.

## 2026-07-01 — BA Playbook Real ERP Regression + TOP 10 Fix

User added more real paired ERP files and noticed the TOP 10 requirement was still being lost in the answer layer.

Sample files now covered by regression:

- `sample data/Sales_ERP_May_2026.xlsx`
- `sample data/Sales_ERP_June_2026.xlsx`
- `sample data/Accounting_ERP_May_2026.csv`
- `sample data/Accounting_ERP_June_2026.csv`
- `sample data/Logistics_ERP_May_2026.csv`
- `sample data/Logistics_ERP_June_2026.csv`

Implemented:

- Fixed `apps/desktop/src/lib/ba-comparison-engine.ts`.
  - `where_changed` narrative now keeps TOP 10 growth and TOP 10 decline drivers instead of only 3 each.
  - `profitability_answer` narrative now keeps TOP 10 profit drivers instead of only 5.
  - Added ERP aliases for compact accounting/logistics headers such as `NetRevenue`, `InvoiceTotal`, `Revenue_Credit`, `TotalCost`, `UnitCost`, `COGS_Debit`, `GrossProfit`, `MarginPct`, and `DeliveryFee`.
  - Tightened revenue detection so cost-like fields such as `TotalCost` are not misclassified as revenue just because they contain `total`.
- Fixed `apps/desktop/src/components/analysis/BusinessComparisonBriefCard.tsx`.
  - Narrative cards can now render the full TOP 10 growth + TOP 10 decline list.
- Extended `apps/desktop/src/lib/ba-comparison-engine.test.ts`.
  - Added BOM-safe tabular file reader for CSV/XLSX real files.
  - Added Accounting ERP May/June regression proving direct profit evidence, cost fields, and TOP 10 profit ranking are detected.
  - Added Logistics ERP May/June regression proving LightBI does not pretend revenue exists when only cost/fee/quantity signals are present.

Verification:

```bash
pnpm exec vitest run src/lib/ba-comparison-engine.test.ts
pnpm exec tsc -b
```

Results:

- BA comparison engine tests passed: 9 tests.
- Desktop TypeScript build passed.

## 2026-07-01 — Cross-Domain BA Fusion Overview Phase 1

User requirement:

- Simple Mode must combine multiple dataset categories that describe the same business object, e.g. Sales + Accounting + Logistics/Inventory, into one overview rather than forcing only one same-schema group.
- The overview must answer at BA level: revenue movement, where it changed, TOP 10 growth/decline, TOP 10 profit, why revenue leaders may not be profit leaders, and caveats when supporting data is missing.

Implemented:

- Added `apps/desktop/src/lib/business-fusion-overview.ts`.
  - Infers dataset role from columns: `sales`, `accounting`, `logistics`, `inventory`, or `unknown`.
  - Detects shared business object keys across different schemas: order, SKU, product, category, store, brand.
  - Infers periods from file names such as May/June 2026.
  - Builds cross-domain metrics from the strongest source available:
    - revenue from accounting when available, otherwise sales;
    - gross profit from accounting/profit-capable source;
    - quantity and delivery fee from logistics/inventory source.
  - Produces TOP 10 revenue growth, TOP 10 revenue decline, and TOP 10 current profit drivers.
  - Adds cross-checks such as Sales-vs-Accounting revenue gap and revenue-vs-profit leader mismatch.
  - Adds caveats when Sales, Accounting, Logistics/Inventory, shared keys, or profit evidence are missing.
- Added `apps/desktop/src/components/analysis/BusinessFusionOverviewCard.tsx`.
  - Renders executive summary, readiness score, metric deltas, shared keys, detected source roles, TOP 10 growth/decline/profit, cross-checks, and caveats.
- Wired the overview into `apps/desktop/src/pages/Home.tsx` for multi-file local inspection batches.
  - When several dataset families are detected, LightBI now attempts a fusion overview before the user picks one same-schema family.

Verification:

```bash
pnpm exec vitest run src/lib/business-fusion-overview.test.ts
pnpm exec tsc --noEmit
```

Results:

- Cross-domain fusion overview test passed against real sample files:
  - `sample data/Sales_ERP_May_2026.xlsx`
  - `sample data/Sales_ERP_June_2026.xlsx`
  - `sample data/Accounting_ERP_May_2026.csv`
  - `sample data/Accounting_ERP_June_2026.csv`
  - `sample data/Logistics_ERP_May_2026.csv`
  - `sample data/Logistics_ERP_June_2026.csv`
- Desktop TypeScript check passed.

Current limitation / next phase:

- Phase 1 is an overview card during multi-file inspection. It does not yet create a persistent fused semantic model or drill-through across all joined domains.
- Next phase should turn detected shared keys into a real virtual fused dataset so chart, BA analysis panel, and export evidence can operate across Sales + Accounting + Logistics together.

## 2026-07-01 — Cross-Domain BA Fusion Dataset Phase 2

Implemented:

- Extended `apps/desktop/src/lib/business-fusion-overview.ts`.
  - Added `createBusinessFusionVirtualDataset`.
  - Creates one local-first virtual table from multiple dataset families using the strongest shared business key.
  - Output grain is `period + object_key_type + object_key`.
  - Output columns include:
    - `sales_revenue`
    - `accounting_revenue`
    - `revenue_gap`
    - `gross_profit`
    - `profit_margin`
    - `logistics_quantity`
    - `delivery_fee`
    - per-domain row counts
    - `source_roles`
  - Profiles the fused rows with the existing column profiler so downstream Simple Mode understanding can treat it like a normal dataset.
- Updated `apps/desktop/src/components/analysis/BusinessFusionOverviewCard.tsx`.
  - Added a `Use fused dataset` CTA.
  - Keeps the overview informational, but now lets users enter a real analysis surface.
- Updated `apps/desktop/src/pages/Home.tsx`.
  - Added `handleUseBusinessFusionDataset`.
  - When the user clicks the CTA, Simple Mode switches to a `business_fusion_view` dataset with retained rows, semantic sample, profiles, and preview rows.
  - Existing same-schema family selection remains available, so the user can still inspect a single domain group when needed.
- Extended `apps/desktop/src/lib/business-fusion-overview.test.ts`.
  - Verifies the virtual fusion dataset exists for the real Sales + Accounting + Logistics May/June ERP sample set.
  - Verifies fused columns, periods, profit evidence, and logistics quantity evidence.

Verification:

```bash
pnpm exec vitest run src/lib/business-fusion-overview.test.ts
pnpm exec tsc --noEmit
```

Results:

- Cross-domain fusion test passed.
- Desktop TypeScript check passed.

Current limitation / next phase:

- The fused dataset is an aggregated analytical surface, not a row-level physical join yet.
- Next phase can add drill-through from a fused object row back to all contributing Sales/Accounting/Logistics raw rows, then export that evidence bundle.

## 2026-07-01 — Cross-Domain BA Fusion Dataset Phase 3

Implemented:

- Extended `apps/desktop/src/lib/business-fusion-overview.ts`.
  - Added structured BA narrative sections:
    - Executive answer
    - Where it changed
    - Profitability answer
    - Operational explanation
    - Decision caveat
  - Added structured reconciliation checks for Sales vs Accounting revenue gaps.
  - Added decision risk signals for reconciliation gaps, revenue/profit leader mismatch, and missing evidence.
  - Keeps the engine generic: output is based on detected fields, shared keys, periods, metrics, and domain roles rather than sample-file-specific rules.
- Updated `apps/desktop/src/components/analysis/BusinessFusionOverviewCard.tsx`.
  - Added an `Executive BA readout` section so multi-domain batches explain the business movement directly, not only show metrics.
  - Added `Decision risk signals` so the user can see whether the overview is decision-grade or still exploratory.
- Extended `apps/desktop/src/lib/business-fusion-overview.test.ts`.
  - Verifies narrative coverage for executive answer, where changed, profitability, operations, and caveats.
  - Verifies TOP growth/decline/profit evidence and reconciliation checks exist on the real Sales + Accounting + Logistics ERP sample set.

Verification:

```bash
pnpm exec vitest run src/lib/business-fusion-overview.test.ts
pnpm exec tsc --noEmit
```

Results:

- Cross-domain BA fusion overview test passed.
- Desktop TypeScript check passed.

Current limitation / next phase:

- The overview now gives a stronger BA readout, but evidence export is still centered on downstream chart drill-through.
- Next phase should add fused-row drill-through evidence bundles: click one product/order/store/category in the fused view and export all contributing Sales + Accounting + Logistics raw rows together.

## 2026-07-01 — Cross-Domain BA Fusion Dataset Phase 4

Implemented:

- Extended `createBusinessFusionVirtualDataset` in `apps/desktop/src/lib/business-fusion-overview.ts`.
  - Every fused analytical row now has a stable `fusion_row_id`.
  - Added `evidenceBundles` keyed by `fusion_row_id`.
  - Each evidence bundle preserves contributing raw rows with:
    - source role (`sales`, `accounting`, `logistics`, `inventory`)
    - family name
    - period
    - source row index
    - original row payload
  - This turns the fused model from a summary-only surface into an auditable BA surface: LightBI can explain a cross-domain conclusion and later export the rows behind it.
- Extended `apps/desktop/src/lib/business-fusion-overview.test.ts`.
  - Verifies fused rows include `fusion_row_id`.
  - Verifies at least one fused object has multi-domain evidence from Sales, Accounting, and Logistics.
  - Verifies evidence rows stay period-aligned with the fused row.

Verification:

```bash
pnpm exec vitest run src/lib/business-fusion-overview.test.ts
pnpm exec tsc --noEmit
```

Results:

- Cross-domain BA fusion evidence test passed.
- Desktop TypeScript check passed.

Current limitation / next phase:

- Evidence bundles exist in the model, but the UI does not yet expose a dedicated fused drill-through/export action.
- Next phase can wire `evidenceBundles` into Simple/Advanced chart drill-through so a user can export "all rows behind this cross-domain business object" as Excel/CSV.

Follow-up applied in this same phase:

- Updated `apps/desktop/src/pages/Home.tsx`.
  - `business_fusion_view` is now treated as a business view in the loaded dataset status card.
  - The fused dataset keeps `evidenceBundles` in `currentDataset`.
  - The cross-domain overview card now remains visible after the user clicks `Use fused dataset`, so the executive BA readout is not lost when moving from batch selection into the analysis workspace.

Verification:

```bash
pnpm exec vitest run src/lib/business-fusion-overview.test.ts
pnpm exec tsc --noEmit
```

Results:

- Cross-domain BA fusion test passed.
- Desktop TypeScript check passed.

## 2026-07-01 — Cross-Domain BA Fusion Flow Placement Fix

User clarified that the full `Cross-domain BA overview` was appearing too early at the import/understanding step.

Decision:

- Step 1/2 after import should only prove that LightBI understands the uploaded files and can map related datasets together.
- The full BA answer, including executive readout, revenue increase/decrease, Top 10 growth/decline/profit, caveats, and cross-domain risk signals, belongs after the user chooses to create/use the fused dataset or enters the decision/chart workspace.

Implemented:

- Added `apps/desktop/src/components/analysis/BusinessFusionOpportunityCard.tsx`.
  - Lightweight import-step card: detected source roles, shared business keys, available decision angles, caveats, and CTA.
  - Does not show full BA conclusions at the import step.
- Updated `apps/desktop/src/pages/Home.tsx`.
  - Pending multi-file batches now render `BusinessFusionOpportunityCard`.
  - Loaded `business_fusion_view` datasets still render the full `BusinessFusionOverviewCard`.
  - Engine/model output is unchanged; only display placement changed.

Verification:

```bash
cd apps/desktop
pnpm exec tsc --noEmit
pnpm exec vitest run src/lib/business-fusion-overview.test.ts
```

Results:

- Desktop TypeScript check passed.
- Cross-domain BA fusion test passed.

## 2026-07-01 — Business View Question Sandbox Guard

User found that clicking suggested questions in the Business View review flow opened the old virtual dataset sandbox pipeline and produced a blocking validation modal.

Decision:

- Business View review questions are guidance/intent suggestions, not execution controls.
- Execution and deep BA answers should happen after the user selects the view and enters the analysis/chart workspace.

Implemented:

- Updated `apps/desktop/src/pages/Home.tsx`.
  - Virtual business view question clicks now open a lightweight selected-question note.
  - The old `VirtualDatasetPlanPreview` -> runtime preview -> sandbox policy chain is no longer triggered from this review surface.
  - Any stale sandbox/query preview state is cleared when selecting a virtual business view question.

Verification:

```bash
pnpm --dir apps/desktop exec tsc --noEmit
```

Result: Desktop TypeScript check passed.

## 2026-07-10 — Semantic Dictionary Expansion + Affinity Vector Safepoint

User resumed the dictionary expansion work and clarified that LightBI must cover not only ERP systems, but also external/manual and cross-department data exports.

Implemented:

- Expanded the central semantic registry with many partial/runtime-safe signals for CRM, SAP-like material/billing, POS, bank statements, marketing analytics, procurement, HR/payroll, maintenance/assets/IoT, survey, education, and healthcare-like exports.
- Improved context semantic inference:
  - compact header matching for enterprise headers such as `SalesOrderNo`, `TripID`, `AccountId`, `FulfillmentStatus`;
  - identifier string shape support;
  - neighbor and cross-file support for the new data families.
- Added a lightweight `semantic-domain-affinity` layer under `understanding-next`.
  - It scores domain affinity from detected signal clusters instead of single-column matches only.
  - Hybrid ERP-style files can now surface revenue + finance + operations + inventory + performance context when evidence co-occurs.
- Wired domain affinity into the understanding orchestrator and the Understanding Next UI domain ordering.
- Added regression tests for Salesforce-style, SAP-style, ecommerce/fulfillment, POS, bank, marketing, HR, maintenance/IoT, survey, education, healthcare, and hybrid ERP exports.

Verification:

```bash
pnpm --dir apps/desktop exec vitest run src/lib/context-semantic-dictionary.test.ts src/lib/semantic-registry.test.ts src/lib/understanding-next/understanding-next.test.ts src/lib/semantic-coverage.test.ts src/lib/business-signal-detector.test.ts src/lib/semantic-sampler.test.ts src/lib/ai-briefing-generator.test.ts --reporter=dot
pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json
```

Results:

- 7 test files passed.
- 134 tests passed.
- Desktop TypeScript check passed.

Remaining:

- Continue broadening dictionary by industry/file family.
- Keep newly recognized signals as `partial` until BA playbooks/actions can execute them safely.

Follow-up implemented in the same phase:

- Added broader partial recognition for external/manual file families:
  - access audit/permission/MFA logs;
  - app/API operational logs;
  - SaaS subscription and recurring revenue exports;
  - contract/legal, property/lease, construction/project progress;
  - agriculture/field, utility/meter, compliance/risk, nonprofit funding, and QC inspection exports.
- Added neighbor and cross-file evidence support for the new families to avoid trusting generic headers without contextual backing.
- Extended semantic domain affinity cluster rules for reliability, access-control, subscription revenue, contract lifecycle, property operations, construction progress, agri/utility operations, risk controls, nonprofit funding, and quality inspection.
- Tightened `error_code` value matching after a regression showed `External` could be over-read as an error code.

Verification:

```bash
pnpm --dir apps/desktop exec vitest run src/lib/context-semantic-dictionary.test.ts src/lib/semantic-registry.test.ts src/lib/understanding-next/understanding-next.test.ts src/lib/semantic-coverage.test.ts src/lib/business-signal-detector.test.ts src/lib/semantic-sampler.test.ts src/lib/ai-briefing-generator.test.ts --reporter=dot
pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json
```

Results:

- 7 test files passed.
- 137 tests passed.
- Desktop TypeScript check passed.

Follow-up implemented in the same phase: semantic layer merge guardrail.

- `understanding-core/ontology.ts` is now a registry-backed adapter instead of an independent semantic rule owner.
  - Core universal rules are generated from `SEMANTIC_SIGNAL_REGISTRY_V1`.
  - Legacy core patterns are merged into matching registry-owned IDs for compatibility.
  - Remaining core-only supplemental IDs are explicit and allowlisted.
- `understanding-next/signal-detector.ts` is now registry-backed as well.
  - Registry rules are generated first.
  - Next compatibility rules only supplement unmapped IDs.
  - Payment/logistics/document/status signals no longer live only in the chart detector.
- Expanded `semantic-registry.ts` with missing central signals needed to remove detector drift:
  - payment cash/card/bank/voucher, change amount, rounding amount, payment status;
  - on-time status, waiting time, current/origin/destination location, freight fee, service group, item type, load status, row type;
  - debt, balance, fiscal month/year, manager, person, coach, role, doctor, medicine;
  - goods receipt, return document, related document, document type;
  - ordered/received/sold quantity, campaign attempts, previous contacts/outcome, country.
- Tightened alias behavior:
  - short aliases such as `cod` now use token-boundary regexes in registry-backed detectors;
  - `row_type` no longer uses generic `type/cash/credit/debit` aliases that can steal payment or generic columns.
- Added source-of-truth tests proving:
  - detector taxonomy and context dictionary come from the registry;
  - understanding-core and understanding-next are registry-backed adapters;
  - supplemental rules cannot silently grow outside explicit allowlists.

Verification:

```bash
pnpm --dir apps/desktop exec vitest run src/lib/semantic-registry.test.ts src/lib/context-semantic-dictionary.test.ts src/lib/business-signal-detector.test.ts src/lib/understanding-core/understanding-core.test.ts src/lib/understanding-core/next-adapter.test.ts src/lib/understanding-next/understanding-next.test.ts src/lib/semantic-coverage.test.ts src/lib/semantic-sampler.test.ts src/lib/ai-briefing-generator.test.ts --reporter=dot
pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json
```

Results:

- 9 test files passed.
- 158 tests passed.
- Desktop TypeScript check passed.

## 2026-07-01 — Final Cross-Domain BA Overview Placement

User clarified the full `Cross-domain BA overview` should not live on the Home/import/review screen.

Final UX rule:

- Home/import/review is for understanding, evidence, business-view selection, and suggested questions only.
- Full cross-domain BA conclusions belong inside the Investigation context:
  - the chart/BA answer workspace, or
  - the `Analyze deeper` side panel.

Implemented:

- Removed `BusinessFusionOverviewCard` from `apps/desktop/src/pages/Home.tsx`.
- Kept lightweight `BusinessFusionOpportunityCard` on Home so users can still see why LightBI suggests a business view.
- Added optional `businessFusionOverview` to `InvestigationSession`.
- Passed `currentDataset.businessFusionOverview` into the Investigation session.
- Rendered `BusinessFusionOverviewCard` inside the `Deep BA Analysis` drawer in `apps/desktop/src/pages/Investigation.tsx`.

Verification:

```bash
pnpm --dir apps/desktop exec tsc --noEmit
```

Result: Desktop TypeScript check passed.
