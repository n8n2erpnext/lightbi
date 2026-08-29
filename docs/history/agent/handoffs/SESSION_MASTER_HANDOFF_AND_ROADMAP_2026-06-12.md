# LightBI Session Master Handoff and Roadmap

Created: 2026-06-12  
Purpose: give any future model/agent enough context to continue this project safely without replaying the entire chat.

## 1. How To Use This File

Read this file first, then read `memory.md`, then read the latest checkpoint for the active stream.

This project uses a multi-agent workflow:

```text
User / Codex product direction
-> Gemini or another coding agent implements narrow phases
-> Codex reviews truthfulness, scope, architecture, and next command
-> each phase writes handoff / verification / checkpoint markdown
```

Core rule: never overclaim. Runtime success must be supported by tests, logs, screenshots, probes, or explicit verification.

## 2. Product Identity

LightBI is a Business Understanding Layer, not just a dashboard builder.

The intended flow is:

```text
Raw Data
-> LightBI Understands
-> Analysis Opportunity
-> Investigation
-> Answer / Decision Readiness
```

Important principles:

- Raw data is never mutated.
- Mapping, projection, cleansing, and formatting must be reversible or presentation-only unless explicitly scoped otherwise.
- The system should guide non-technical users from messy data to useful investigation.
- The system should expose caveats and readiness, not hide uncertainty behind pretty charts.
- Local-first execution is preferred when feasible.
- AI agents should consume deterministic dataset-understanding outputs before acting on user data.

## 3. Major Streams Completed In This Session

### 3.1 Dataset Understanding, Readiness, and Trust Mapping

Completed work:

- Built and hardened Dataset Understanding behavior.
- Added decision readiness concepts and user-facing trust feedback.
- Added Trust Mapping overlay behavior so users can manually map unrecognized columns to canonical signals.
- Proved that manual mapping changes local recompute output, readiness score, opportunities, and UI feedback.
- Added feedback toast behavior for improved readiness or unlocked opportunities.
- Created handoff and checkpoint docs for Trust Mapping Phase 2.

Key files touched during this stream:

- `apps/desktop/src/components/analysis/DatasetUnderstandingCard.tsx`
- `apps/desktop/src/components/analysis/DatasetUnderstandingCard.test.tsx`
- `apps/desktop/src/lib/mapping-overlay-flow.test.ts`
- `AGENT_HANDOFF_TRUST_MAPPING_PHASE2.md`
- `TRUST_MAPPING_CHECKPOINT.md`

Residual limits:

- Runtime execution was not yet proven at that time.
- Some domain aliases were still missing, especially for finance and operations.

### 3.2 Alias Batch 2 and Taxonomy Expansion

Completed work:

- Added conservative affix handling for identifiers, time markers, and measure modifiers.
- Added type-aware guardrails so suffix/prefix stripping cannot map a date-like column to a measure, or a quantity-like column to a dimension.
- Expanded taxonomy with exact phrase aliases for finance and operations.
- Added `time_period` as a generic core time signal to unblock finance datasets with `period`.
- Removed unsafe bare `date` behavior where needed to prevent domain bleed.
- Verified improved audit results for `good_finance.csv` and `good_operations.csv`.

Key outcomes:

- `good_finance.csv` improved from measure-only / exploratory to recognizing `period` as `time_period`.
- Finance could generate an opportunity such as `Revenue over Time Period`.
- Broken datasets without real dimensions/time stayed true negatives.

Key files/docs:

- `apps/desktop/src/lib/business-signal-detector.ts`
- `apps/desktop/src/lib/business-signal-detector.test.ts`
- `AGENT_HANDOFF_ALIAS_BATCH2.md`
- `ALIAS_BATCH2_CHECKPOINT.md`
- `AGENT_HANDOFF_TAXONOMY_EXPANSION_PHASE1.md`
- `AGENT_HANDOFF_TAXONOMY_EXPANSION_PHASE2.md`
- `TAXONOMY_EXPANSION_PHASE2_VERIFICATION.md`

### 3.3 Backend Runtime Hardening and Execution Path Truthfulness

Completed work:

- Audited the real execution path.
- Discovered that the old path called a non-existent `/api/preview/execute` endpoint, then silently fell back to JS sandbox.
- Hardened execution so complex analytical intents do not pretend to succeed through weak fallback.
- Limited JS sandbox to simple safe cases.
- Improved SQL generation for DuckDB preview.
- Added transparent failure behavior for unavailable backend/runtime.

Key behavior:

- Complex intents such as `trend`, `group_by`, and `relationship` fail fast unless a real execution path succeeds.
- Simple `table_preview` and `distribution` may use constrained fallback under specific policy.

Key files/docs:

- `apps/desktop/src/pages/Investigation.tsx`
- `apps/desktop/src/lib/backend-preview-executor.ts`
- `apps/desktop/src/lib/safe-sql-preview.ts`
- `apps/desktop/src/lib/safe-sql-preview.test.ts`
- `BACKEND_RUNTIME_HARDENING_VERIFICATION.md`
- `EXECUTION_PATH_UNIFICATION_CHECKPOINT.md`

### 3.4 Local DuckDB WASM Executor

Completed work:

- Verified repo initially lacked DuckDB WASM dependency and Vite config.
- Installed `@duckdb/duckdb-wasm`.
- Added DuckDB WASM loader seam.
- Added local executor path.
- Progressed from seam-only to actual WASM execution of SQL over in-memory rows.
- Registered rows as JSON in DuckDB virtual filesystem.
- Created canonical table name `__LIGHTBI_PREVIEW_TABLE__`.
- Executed `safeSqlPreview.sql` through local DuckDB instead of probe-only SQL.

Key files/docs:

- `apps/desktop/vite.config.ts`
- `apps/desktop/src/lib/duckdb-wasm-loader.ts`
- `apps/desktop/src/lib/duckdb-wasm-loader.test.ts`
- `apps/desktop/src/lib/local-duckdb-executor.ts`
- `apps/desktop/src/lib/local-duckdb-executor.test.ts`
- `LOCAL_DUCKDB_EXECUTOR_CHECKPOINT.md`
- `LOCAL_DUCKDB_EXECUTOR_PHASE2A_VERIFICATION.md`
- `LOCAL_DUCKDB_EXECUTOR_PHASE2B_VERIFICATION.md`

Important caveat:

- Browser-level visual/probe verification exists in limited form, but broad visual regression coverage is still not done.

### 3.5 Canonical Schema Projection

Completed work:

- Added canonical row projection so raw headers can be mapped into canonical SQL fields before DuckDB execution.
- Verified non-destructive projection: original row data is not mutated.
- Kept projection errors distinguishable from DuckDB runtime errors.
- Verified coverage for fields like `route`, `shipment`, `report_date`, `driver`, and `satisfaction`.
- Confirmed production projection already covered wider cases without additional production code in Phase 2.

Key behavior:

- Projection failures stay recognizable:
  - `CANONICAL_PROJECTION_MISSING`
  - `CANONICAL_PROJECTION_CONFLICT`
- These must not be wrapped as generic DuckDB runtime failures.

Key files/docs:

- `apps/desktop/src/lib/canonical-row-projection.ts`
- `apps/desktop/src/lib/canonical-row-projection.test.ts`
- `CANONICAL_SCHEMA_PROJECTION_CHECKPOINT.md`
- `CANONICAL_SCHEMA_PROJECTION_PHASE2_CHECKPOINT.md`

### 3.6 Fallback Policy Alignment

Completed work:

- Made fallback policy explicit.
- Simple intents may fallback only under infrastructure/runtime availability failures.
- Schema/projection failures always fail fast.
- Complex analytical intents always fail fast rather than using JS sandbox.

Policy summary:

```text
distribution/table_preview + infra error -> JS sandbox fallback allowed
distribution/table_preview + schema/query error -> fail fast
trend/group_by/relationship + any execution error -> fail fast
```

Key files/docs:

- `apps/desktop/src/pages/Investigation.tsx`
- `apps/desktop/src/pages/Investigation.test.tsx`
- `FALLBACK_POLICY_ALIGNMENT_PHASE1_CHECKPOINT.md`

### 3.7 DuckDB Runtime Error Classification

Completed work:

- Split generic DuckDB runtime errors into normalized families.
- UI fallback policy now distinguishes infrastructure errors from SQL/query-generation errors.

Normalized error codes:

- `DUCKDB_PARSER_ERROR`
- `DUCKDB_BINDER_ERROR`
- `DUCKDB_CATALOG_ERROR`
- `DUCKDB_BOOTSTRAP_ERROR`
- `DUCKDB_WORKER_ERROR`
- `DUCKDB_MEMORY_ERROR`
- `DUCKDB_UNKNOWN_RUNTIME_ERROR`

Policy:

- Parser/binder/catalog/unknown: fail fast.
- Bootstrap/worker/memory: may fallback only for simple intents.

Key files/docs:

- `apps/desktop/src/lib/local-duckdb-executor.ts`
- `apps/desktop/src/pages/Investigation.tsx`
- `DUCKDB_RUNTIME_ERROR_CLASSIFICATION_PHASE1_CHECKPOINT.md`

### 3.8 Safe SQL Query Hardening

Completed work:

- Hardened `trend` SQL with time casting.
- Cast `COUNT(...)` to integer to avoid BigInt serialization issues.
- Added lowercase identifier bottleneck:
  - projection emits lowercase keys for DuckDB schema
  - SQL lookup identifiers use lowercase
  - output aliases preserve exact UI casing
- Avoided data mutation; this is SQL/projection schema alignment.

Key files/docs:

- `apps/desktop/src/lib/safe-sql-preview.ts`
- `apps/desktop/src/lib/safe-sql-preview.test.ts`
- `apps/desktop/src/lib/canonical-row-projection.ts`
- `SAFE_SQL_QUERY_FAILURE_FIX_PHASE1_CHECKPOINT.md`
- `SAFE_SQL_QUERY_FAILURE_FIX_PHASE2_CHECKPOINT.md`

### 3.9 Numeric Health Gate and Guarded SUM

Completed work:

- Added `numeric-health-gate.ts`.
- Added parse-success threshold for deciding if a measure can use `SUM`.
- Added guarded SUM bridge:
  - `enhancePlanWithGuardedSum`
  - injects optional `measureAggregations`
  - defaults to `COUNT` unless a measure passes health gate.
- Added guarded SQL generation:
  - SUM uses defensive cleansing and `TRY_CAST`
  - COUNT remains fallback for unsafe fields.
- Added warning propagation for guarded SUM cleansing so user is not silently misled.

Key files/docs:

- `apps/desktop/src/lib/numeric-health-gate.ts`
- `apps/desktop/src/lib/numeric-health-gate.test.ts`
- `apps/desktop/src/lib/guarded-sum-bridge.ts`
- `apps/desktop/src/lib/guarded-sum-bridge.test.ts`
- `apps/desktop/src/lib/safe-sql-preview.ts`
- `AGENT_HANDOFF_GUARDED_SUM_WIRING_PHASE1.md`
- `WARNING_PROPAGATION_GUARDED_SUM_PHASE1B_CHECKPOINT.md`

Current critical finding:

- Guarded SUM is not fully safe for ambiguous decimal separators.
- Stress test showed that naive removal of `.` and `,` can convert values like `1000.50` into `100050`.
- This is a severe false-trust risk.

Latest active direction:

- Hard block decimal ambiguity before allowing SUM.
- Do not block all separators blindly, because legitimate thousands/currency values like `$1,000` and `1.000.000đ` should still be allowed when unambiguous.
- Block decimal-looking and mixed-locale patterns until a locale-aware numeric parser exists.

### 3.10 Global Display Preferences MVP Stream

Completed and closed for MVP.

Completed work:

- Added global display preferences store.
- Added formatter engine for:
  - locale
  - timezone
  - plain/accounting number style
  - currency display
  - decimal places
  - thousands separator
  - negative style
  - date/time/datetime formats
- Added Settings UI in Investigation.
- Rolled out formatting to:
  - Home summaries
  - Investigation table
  - Investigation chart
  - Dashboard KPI cards
  - Dashboard charts
- Added compact axis/card behavior where layout is narrow.
- Kept formatting presentation-only: no raw data, SQL, or semantic values are changed.

Key files/docs:

- `apps/desktop/src/stores/display-preferences-store.ts`
- `apps/desktop/src/lib/display-formatter.ts`
- `apps/desktop/src/components/settings/DisplayPreferencesModal.tsx`
- `apps/desktop/src/components/analysis/ChartPreviewRenderer.tsx`
- `apps/desktop/src/components/dashboards/DashboardKPIWidget.tsx`
- `apps/desktop/src/components/dashboards/DashboardChartWidget.tsx`
- `apps/desktop/src/pages/Home.tsx`
- `apps/desktop/src/pages/Investigation.tsx`
- `apps/desktop/src/pages/DashboardBuilder.tsx`
- `GLOBAL_DISPLAY_PREFERENCES_STREAM_CLOSURE.md`

Non-goals deferred:

- Full app i18n.
- Full RTL layout.
- Visual regression screenshots.
- Moving Settings UX outside Investigation.

## 4. Current Active Problem

The active stream is Numeric Trust / Guarded SUM hardening.

The latest stress test discovered:

1. Decimal separator ambiguity is a blocker.
2. Naive cleansing can inflate numeric values catastrophically.
3. Sample-size-based health checks can miss dirty tail rows.
4. The immediate next fix should narrow SUM eligibility before adding any new feature.

Current active phase to implement or verify:

```text
Guarded SUM Hard Block Decimal Ambiguity Phase 1
```

Expected scope:

- `apps/desktop/src/lib/numeric-health-gate.ts`
- `apps/desktop/src/lib/numeric-health-gate.test.ts`
- maybe `apps/desktop/src/lib/safe-sql-preview.test.ts`
- no UI changes
- no executor changes
- no fallback-policy changes
- no display-preferences changes

Required behavior:

- Allow clean integer values.
- Allow unambiguous currency/integer-thousands values such as:
  - `1000`
  - `$1,000`
  - `VNĐ 250000`
  - `1.000.000đ`
- Block ambiguous decimal-looking values such as:
  - `1000.50`
  - `1000,50`
  - `1.000,50`
  - `1,000.50`
- On block: `isSafeForSum = false`, so bridge falls back to `COUNT`.
- Do not implement locale-aware parsing in this phase.
- Do not claim SUM is globally safe after this phase.

Expected docs:

- `AGENT_HANDOFF_GUARDED_SUM_DECIMAL_AMBIGUITY_PHASE1.md`
- `GUARDED_SUM_DECIMAL_AMBIGUITY_PHASE1_VERIFICATION.md`
- then checkpoint:
  - `GUARDED_SUM_DECIMAL_AMBIGUITY_PHASE1_CHECKPOINT.md`

## 5. Roadmap From Here

### Phase A: Guarded SUM Decimal Ambiguity Block

Goal:

- Prevent false-trust SUM on ambiguous decimal separators.

Acceptance:

- Unit tests prove clean integer/currency-thousands pass.
- Unit tests prove decimal-looking and mixed-locale separators fail.
- No broad product surface changes.

### Phase B: Guarded SUM Sampling Robustness

Problem:

- Current health gate may inspect a sample and miss dirty values after the sample window.

Possible directions to audit:

- Scan all rows for candidate SUM columns when dataset size is manageable.
- If sampling is required, add explicit confidence/warning metadata.
- Track parse-success count used by SQL-side `TRY_CAST`, not only JS-side health gate.
- Consider SQL-side diagnostic query:

```sql
COUNT(*) AS total_rows,
COUNT(TRY_CAST(cleaned_col AS DOUBLE)) AS parsed_rows
```

Goal:

- User must know if runtime SUM skipped values due to unparseable rows.

### Phase C: Locale-Aware Numeric Parser Design

Problem:

- `1,000.50` and `1.000,50` are both valid in different locales.
- MVP cannot guess safely.

Possible design:

- Use display preferences or dataset locale as parser hint only when explicit.
- Add parser modes:
  - `integer_only`
  - `en_number`
  - `vi_eu_number`
  - `currency_integer`
  - `unknown_ambiguous`
- Only enable SUM for decimal values when parser mode is explicit and confidence is high.

### Phase D: Runtime Numeric Cleansing Diagnostics

Goal:

- Surface actual runtime cleansing/parse losses in Investigation UI.

Potential metadata:

```ts
{
  field: string;
  aggregation: "SUM";
  parseSuccessRate: number;
  parsedRows: number;
  totalRows: number;
  skippedRows: number;
  cleansingApplied: boolean;
  warning: string;
}
```

Important:

- This warning must be presentation/trust metadata, not a mutation of raw data.

### Phase E: SUM Rollout Expansion

Only after the above:

- Expand SUM beyond the safest `group_by` / `trend` cases.
- Consider additional aggregations such as `AVG`, but only after strong typing and diagnostics.

Current stance:

- `AVG` remains blocked because `TRY_CAST` + NULL skipping can create misleading averages.

### Phase F: Visual Regression QA Stream

Deferred from display preferences stream.

Goal:

- Add Playwright or equivalent screenshot tests for:
  - `en-US`
  - `vi-VN`
  - `ar-SA`
  - accounting negatives
  - long currency strings
  - compact axes/cards

This should be a separate QA/automation stream, not mixed into numeric trust.

## 6. Guardrails For Future Agents

Do:

- Keep phases narrow.
- Write handoff, verification, and checkpoint docs after each meaningful phase.
- Prove behavior with targeted tests.
- Keep raw data immutable.
- Keep presentation formatting separate from semantic/execution values.
- Preserve error distinguishability.
- Prefer fail-fast over false success for data-integrity risks.
- Treat "pretty but wrong" as worse than "honestly unavailable".

Do not:

- Do not silently fallback complex analytics to JS sandbox.
- Do not wrap projection errors as DuckDB runtime errors.
- Do not claim DuckDB success without executing through the real path or a verified test.
- Do not enable SUM/AVG just because a column looks numeric.
- Do not hide cleansing losses.
- Do not implement broad locale parsing without explicit parser policy and tests.
- Do not let display preferences mutate raw values or SQL values.

## 7. Quick File Map

Runtime and execution:

- `apps/desktop/src/lib/backend-preview-executor.ts`
- `apps/desktop/src/lib/local-duckdb-executor.ts`
- `apps/desktop/src/lib/duckdb-wasm-loader.ts`
- `apps/desktop/src/lib/duckdb-preview-sandbox.ts`

Planning and SQL:

- `apps/desktop/src/lib/runtime-planner-preview.ts`
- `apps/desktop/src/lib/safe-sql-preview.ts`
- `apps/desktop/src/lib/guarded-sum-bridge.ts`
- `apps/desktop/src/lib/numeric-health-gate.ts`
- `apps/desktop/src/lib/canonical-row-projection.ts`

Understanding:

- `apps/desktop/src/lib/business-signal-detector.ts`
- `apps/desktop/src/lib/dataset-understanding-contract.ts`
- `apps/desktop/src/lib/domain-knowledge-catalog.ts`

Main UI:

- `apps/desktop/src/pages/Home.tsx`
- `apps/desktop/src/pages/Investigation.tsx`
- `apps/desktop/src/pages/DashboardBuilder.tsx`
- `apps/desktop/src/pages/Dashboards.tsx`

Display preferences:

- `apps/desktop/src/stores/display-preferences-store.ts`
- `apps/desktop/src/lib/display-formatter.ts`
- `apps/desktop/src/components/settings/DisplayPreferencesModal.tsx`
- `apps/desktop/src/components/analysis/ChartPreviewRenderer.tsx`
- `apps/desktop/src/components/dashboards/DashboardKPIWidget.tsx`
- `apps/desktop/src/components/dashboards/DashboardChartWidget.tsx`

## 8. Recommended Next Prompt For Another Model

Use this prompt to continue:

```text
Read `SESSION_MASTER_HANDOFF_AND_ROADMAP_2026-06-12.md`, `memory.md`, and `GUARDED_SUM_STRESS_TEST_PHASE1.md`.

Start `Guarded SUM Hard Block Decimal Ambiguity Phase 1`.

Scope:
- `apps/desktop/src/lib/numeric-health-gate.ts`
- `apps/desktop/src/lib/numeric-health-gate.test.ts`
- optionally `apps/desktop/src/lib/safe-sql-preview.test.ts` if needed for regression only

Do not touch:
- UI
- DuckDB executor
- fallback policy
- display preferences
- taxonomy/detector

Goal:
- hard block decimal ambiguity for Guarded SUM
- do not blindly block all `.` or `,`
- allow clean integers and unambiguous integer/currency-thousands examples:
  - `1000`
  - `$1,000`
  - `VNĐ 250000`
  - `1.000.000đ`
- block decimal-looking and mixed-locale examples:
  - `1000.50`
  - `1000,50`
  - `1.000,50`
  - `1,000.50`
- blocked fields must return `isSafeForSum = false` so guarded-sum bridge falls back to COUNT
- no locale-aware parser in this phase

Run:
- `npx vitest run src/lib/numeric-health-gate.test.ts src/lib/guarded-sum-bridge.test.ts src/lib/safe-sql-preview.test.ts`

Write:
- `AGENT_HANDOFF_GUARDED_SUM_DECIMAL_AMBIGUITY_PHASE1.md`
- `GUARDED_SUM_DECIMAL_AMBIGUITY_PHASE1_VERIFICATION.md`

Report:
- files changed
- exact allowed patterns
- exact blocked patterns
- tests run and pass/fail
- confirmation that no UI/executor/fallback/display code was touched
```

## 9. Current Status

Display Preferences MVP: closed.  
Local DuckDB execution: active and integrated.  
Canonical projection: active and integrated.  
Fallback policy: hardened.  
Guarded SUM: implemented but temporarily under trust hardening.  
Highest priority: prevent false-trust numeric aggregation before expanding analytics features.

