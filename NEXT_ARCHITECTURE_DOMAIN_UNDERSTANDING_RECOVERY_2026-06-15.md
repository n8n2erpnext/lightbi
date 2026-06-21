# NEXT ARCHITECTURE — Domain Understanding Recovery

Date: 2026-06-15
Owner: Gemini implements; Codex QA reviews independently
Priority: CRITICAL

## Goal

Move LightBI past the current confused stage quickly without breaking the original architecture.

LightBI is local-first and understanding-first. The product must not jump from raw columns directly to random charts. It must:

1. Read local files safely.
2. Build a truthful dataset profile.
3. Detect business signals across all declared domains.
4. Ask the user the right business question/perspective.
5. Execute only actions that are meaningful and supported by the current local runtime.
6. Show source row count, sample row count, and result row count separately.

## Current Failure Pattern

The app currently over-promotes shallow field matches:

- `BHX_PHIEUXUAT.xlsx`: sees `Khách hàng`, promotes `Customer distribution`, but real data is 14,862 rows where `Khách lẻ` dominates 14,840 rows. That is not a useful business question.
- `bcctnhapTTKT_*.xlsx`: counts shipment by route/driver, but the real operational questions are on-time intake, vehicle punctuality, waiting time, route/trip/user responsibility, and multi-day degradation.
- `motodetail.xlsx`: parses rows, but does not model dirty PowerApps-style operational exports: Excel serial dates, `#REF!`, mixed `MOTO/PAY/PAY+` row types, money embedded in `NOTE`, technical ids, and abbreviated headers.

Runtime PASS is not semantic PASS.

## Non-Negotiable Architecture Rules

0. **Absolutely no sample-file hardcoding.**
   - Do not branch on file name, sheet name, sample folder path, exact row count, or exact sample-only values.
   - Sample files are regression/acceptance examples only.
   - LightBI must infer document type, domain, signals, dirty-data status, and useful questions from data shape, headers, value distributions, and field relationships.
   - Any implementation that passes because it recognizes `BHX_PHIEUXUAT.xlsx`, `bcctnhapTTKT_*.xlsx`, `DATA_XUAT.xlsx`, `motodetail.xlsx`, `PLU`, or `QUAN_LY` by name is a QA FAIL.

1. **Local-first remains the base.**
   - No cloud dependency for file understanding.
   - Local files must be parsed, profiled, and previewed locally.

2. **Understanding before questions.**
   - Flow is `Dataset -> Profile -> Signals -> Understanding -> Perspective -> Questions -> Runtime`.
   - Questions are derived output, not the first source of truth.

3. **No raw-column-to-chart shortcut.**
   - Do not promote a column to an analysis merely because it exists.
   - Every action must have business usefulness scoring.

4. **Backend and frontend must share one contract.**
   - Frontend must not invent labels/statuses that backend/lib contracts cannot prove.
   - Backend/lib must emit enough metadata for frontend to explain source rows, sample rows, result rows, confidence, caveats, and unsupported actions.

5. **Domain coverage must include all domains already declared in code.**
   - `operations`
   - `revenue`
   - `inventory`
   - `customer`
   - `performance`
   - `finance`

6. **No more logistics-only fixes.**
   - Logistics samples are only one domain.
   - ERP/retail/management/PLU/dirty operational exports must be first-class test cases.

## New Pipeline Contract

Create or refactor toward this pure contract:

```ts
type DatasetUnderstandingResult = {
  source: {
    fileNames: string[];
    sheetNames: string[];
    sourceRowCount: number;
    sourceColumnCount: number;
    parsedRowCount: number;
    sampleRowCount: number;
  };
  quality: {
    headerStatus: "clean" | "recovered" | "ambiguous" | "failed";
    dirtySignals: DirtySignal[];
    blockedReasons: string[];
  };
  profile: {
    grain: "transaction" | "event" | "snapshot" | "master_data" | "summary" | "unknown";
    documentType:
      | "retail_sales_document"
      | "logistics_intake_report"
      | "logistics_export_report"
      | "inventory_snapshot"
      | "product_master"
      | "management_ranking"
      | "dirty_operational_export"
      | "generic_table";
    detectedDomains: DomainId[];
  };
  signals: BusinessSignal[];
  perspectives: BusinessPerspective[];
  recommendedQuestions: BusinessQuestion[];
  availableActions: AnalysisAction[];
  unavailableActions: UnavailableAction[];
};
```

This contract must be produced by pure TypeScript/lib logic and consumed by Home/Investigation UI. If backend execution exists, it must consume the same action/runtime contract.

## Layer 1 — Data Profiling and Dirty Data Gate

Purpose: understand the shape before pretending to understand business.

Must handle:

- Header row detection beyond row 1.
- Duplicate/blank headers.
- Excel serial dates.
- Formula/export errors such as `#REF!`.
- Technical columns like `__PowerAppsId__`.
- Mixed text/number columns.
- Money embedded in text notes.
- Sample-limited vs full-row metadata.

Output examples:

- `BHX_PHIEUXUAT.xlsx`: clean retail sales document, 14,862 source rows, 19 columns.
- `bcctnhapTTKT_*.xlsx`: clean logistics intake report, multi-day comparable schema.
- `motodetail.xlsx`: dirty operational export, 1,461 rows, 16 columns, Excel serial dates, `#REF!`, mixed row types.

Do not navigate to Investigation if header/schema is empty. Show recoverable data-quality review first.

## Layer 2 — Signal Detection With Evidence

Signals must include evidence and value distribution, not just aliases.

For every signal, include:

```ts
{
  canonicalId: string;
  physicalColumn: string;
  domain: DomainId;
  confidence: number;
  evidence: string[];
  cardinality: number;
  dominanceRatio?: number;
  numericHealth?: NumericHealth;
  timeHealth?: TimeHealth;
}
```

Important gating rules:

- A dimension with one dominant value above 90 percent is low-value for default distribution.
- Identifier-like fields with high cardinality should not become default bar charts.
- Technical columns must be hidden from business questions.
- Mixed dirty fields can be suggested for cleansing, not used for aggregate execution until typed.
- Detection must be rule-general and evidence-based. It may use semantic aliases, column profiles, value distributions, type health, and co-occurrence patterns, but never sample filenames.

## Layer 3 — Domain-Specific Question Fit

Replace shallow opportunity generation with a question-fit engine.

Question fit score must consider:

- Domain match.
- Required signals present.
- Measure quality.
- Dimension usefulness.
- Cardinality.
- Dominance ratio.
- Whether action can execute locally.
- Whether the result would answer a realistic user question.

### Revenue / Retail Example: BHX_PHIEUXUAT

Do NOT default to customer distribution.

Default questions should be:

- Revenue / receivable over `Ngày xuất`.
- Revenue / receivable by `Tên kho xuất`.
- Top stores by number of export vouchers.
- Payment mix: cash, card, voucher, bank.
- Employee output by `Nhân viên xuất`.
- Documents missing or containing `Chứng từ liên quan`.
- Exceptions: rounding, delivery fee, change amount, mismatch between `Tổng tiền` and `Tiền phải thu`.

Customer analysis should be downgraded because `Khách lẻ` dominates almost all rows.

### Operations Example: bcctnhapTTKT

Default questions should be:

- On-time intake ratio by day.
- Vehicle punctuality by route/trip/license plate.
- Waiting time by route/trip/user.
- Weight and capacity by route/trip.
- User handover/receive workload.
- Multi-day degradation across 19/12, 23/12, 24/12.

### Dirty Operational Example: motodetail

Do not jump to aggregate chart until dirty signals are acknowledged.

Default questions should be:

- What row types exist: `MOTO`, `PAY`, `PAY+`?
- Which employees handle most rows?
- Which areas/customers generate most activity?
- Which notes contain money values?
- Which columns are dirty or broken, such as `AREA CLASS = #REF!`?
- Do you want to split delivery rows from payment rows before analysis?

## Layer 4 — User Question / Perspective UX

Home must ask a business-oriented question before sending the user into Investigation.

Required UI structure after upload:

1. **Dataset identity**
   - File name.
   - Source rows.
   - Parsed rows.
   - Columns.
   - Sample size.
   - Domain/document type.

2. **What LightBI understands**
   - Detected document type.
   - Key business entities/measures/time fields.
   - Dirty data caveats.

3. **Choose what you want to inspect**
   - Revenue / money.
   - Time trend.
   - Branch/store/warehouse.
   - Employee/user.
   - Status/SLA/on-time.
   - Payment/charge.
   - Data quality/exceptions.

4. **Recommended questions**
   - Ranked by fit score.
   - Show evidence columns.
   - Hide or demote low-value questions.

5. **Unavailable but possible**
   - Explain missing/dirty fields without red-failing the user.

## Layer 5 — Runtime Alignment

Runtime must execute only after a selected question/action passes:

- Required canonical fields map to raw columns.
- Measure can be safely aggregated.
- Time field can be parsed.
- Result is not sample-misrepresented.
- Local executor supports the operation.

Result UI must show:

- Source rows: full dataset rows.
- Rows used for preview: sample/local runtime rows.
- Result rows: rows returned after aggregation.
- Execution scope: `sample preview`, `full local file`, or `not supported`.

Never label `Row count: 2` as if it describes a 14,862-row source file.

## Layer 6 — Domain Coverage Tests

Use sample data as acceptance, not decoration.

The test suite must verify behavior, not filename recognition. Tests should assert inferred document type, signals, question ranking, row-count truth, and blocked/available actions. They must not reward code that hardcodes sample names.

Minimum test matrix:

| Dataset | Expected Understanding |
|---|---|
| `BHX_PHIEUXUAT.xlsx` | retail sales document; no default customer distribution |
| `PLU ALL FRESH 22.03.2021.xlsx` | product/master or inventory-product profile |
| `2017-06-22 DANH SACH XEP HANG QUAN LY TOAN QUOC.xlsx` | management/performance ranking or clean BLOCKED if header cannot be recovered |
| `bcctnhapTTKT_19122024.xlsx` | logistics intake report |
| `bcctnhapTTKT_23122024.xlsx` | logistics intake report |
| `bcctnhapTTKT_24122024.xlsx` | logistics intake report |
| `DATA_XUAT.xlsx` | logistics export / SLA report |
| `Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx` | inventory aging / stuck inventory |
| `TỒN DỰ KIẾN HUBLAN.xlsx` | expected inventory / pending connection |
| `motodetail.xlsx` | dirty operational export; show cleaning/perspective choices before aggregates |

E2E must fail if:

- Code or UI behavior depends on exact sample file names instead of inferred data evidence.
- UI says all data is understood while only a weak field match exists.
- A low-value dominated dimension is promoted as primary.
- A sample result is presented as full dataset result.
- Logistics summary appears on retail/product/management files.
- Generic SVG icons are counted as chart output.
- Runtime shows `FAILED`, `Execution Failed`, `Row count: 0`, or empty schema and report still says PASS.

## Fast Implementation Path

Do this in order. Do not jump ahead.

### Step 1 — Freeze Current Overclaim

Patch reports and UI copy:

- Replace semantic PASS with PARTIAL where question usefulness is not proven.
- Add source/sample/result row distinction.
- Explicitly mark `Customer distribution` on BHX as low-value if dominance ratio is high.

### Step 2 — Build Pure Dataset Profiler

Create/refactor:

- `dataset-profile.ts`
- `dirty-data-profile.ts`
- `semantic-signal-profiler.ts`

No React. No DuckDB. Unit tests only.

### Step 3 — Build Question Fit Engine

Create:

- `question-fit-engine.ts`
- `domain-question-catalog.ts`

Use all declared domains. Emit ranked recommended questions and demoted questions with reasons.

### Step 4 — Wire Home UX

Home consumes `DatasetUnderstandingResult`.

Show understanding and perspective choices before `Investigate`.

### Step 5 — Wire Runtime Guard

Investigation only receives actions that passed question-fit + runtime guard.

Table preview is allowed, but it must be labeled as raw/sample evidence, not the main business answer.

### Step 6 — Backend/Frontend Contract Sync

If `apps/server` participates in preview execution, expose the same fields:

- source row count
- sample row count
- result row count
- execution scope
- action status
- blocked reasons

Frontend must not invent these independently.

### Step 7 — Acceptance Tests

Run unit and E2E:

```bash
npm run test -- src/lib/dataset-profile.test.ts src/lib/dirty-data-profile.test.ts src/lib/question-fit-engine.test.ts
npx playwright test e2e/sample_data_domain_coverage.spec.ts
```

Required report states only:

- PASS
- PARTIAL
- FAIL
- BLOCKED
- NOT VERIFIED

Forbidden:

- 100 percent pass
- fully fixed
- production ready
- all domains pass
- understands everything

## Definition of Done

This phase is done only when:

0. No implementation branch hardcodes sample file names, sheet names, exact fixture row counts, or exact sample-only values.
1. BHX defaults to revenue/store/payment/employee/exceptions, not customer distribution.
2. TTKT defaults to on-time/waiting/route/trip/user/vehicle questions.
3. motodetail is identified as dirty operational export and asks for row-type/cleaning perspective before aggregate charts.
4. All declared domains have question-fit coverage.
5. Runtime and UI both distinguish source rows, sample rows, and result rows.
6. E2E reports no overclaiming.
