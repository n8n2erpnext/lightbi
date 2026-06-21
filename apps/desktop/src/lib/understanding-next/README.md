# Understanding Next

This folder is the recovery path for LightBI's domain understanding layer.

It must remain pure TypeScript. Do not import React, browser APIs, DuckDB, Playwright, or UI components here.

## Product Rule

LightBI is local-first and understanding-first:

```text
Dataset -> Profile -> Signals -> Understanding -> Perspective -> Questions -> Runtime
```

Do not jump from raw columns directly to charts.

## Hard Rule: No Sample Hardcoding

Do not branch on sample file names, sheet names, sample folder paths, exact row counts, or fixture-only values.

Sample data is acceptance data only. The engine must infer domain, document type, dirty-data state, and useful questions from:

- headers
- column profiles
- value distributions
- type health
- dirty-data signals
- field relationships

## Implementation Order

1. `contracts.ts`
   - Keep the shared frontend/backend contract stable.
2. `dataset-profiler.ts`
   - Build truthful source/sample/schema/dirty-data profile.
3. `signal-detector.ts`
   - Detect canonical business signals with evidence and quality.
4. `question-fit-engine.ts`
   - Rank useful questions by business fit.
5. `runtime-action-guard.ts`
   - Convert only supported questions into executable actions.
6. `orchestrator.ts`
   - Single entry point used by Home/backend later.

## Definition Of Done

- BHX-like retail sales documents default to revenue/store/payment/employee/exception questions, not customer distribution.
- TTKT-like intake reports default to on-time/waiting/route/trip/user/vehicle questions.
- Dirty PowerApps-style exports default to data cleaning and row-type separation questions before aggregates.
- Source rows, sample rows, and result rows are never conflated.
- All declared domains are represented: operations, revenue, inventory, customer, performance, finance.

