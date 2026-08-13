# understanding-core

`understanding-core` is the signal-first replacement track for LightBI's dataset understanding layer.

It intentionally does **not** start from file names, sample names, or industry labels. It starts from universal business signals:

- `money.*`
- `time.*`
- `entity.*`
- `item.*`
- `location.*`
- `document.*`
- `status.*`
- `quantity.*`
- `inventory.*`
- `quality.*`

Industry/domain labels are overlays, not roots. For example, a healthcare billing export can inherit:

- `money.receivable`
- `time.transaction_date`
- `item.medicine`
- `entity.patient`
- `entity.doctor`
- `document.prescription`

That means it can use the same money/time/item/entity questions as retail, B2B, or ERP exports before any healthcare-specific logic exists.

## Core Philosophy

Question is not a UI accessory. Question is the algorithm that narrows interpretation.

LightBI should say:

> I found these signals. Which business lens do you want to use?

It should not say:

> I know this file is X, so here is the one analysis you need.

## Pipeline

```text
source descriptor + columns + rows
  -> source-neutral UnderstandingCoreInput
  -> column health
  -> universal signals
  -> optional industry overlays
  -> question candidates
  -> gated runtime actions
```

## Hard Rules

- No filename, sheet-name, or sample-path logic in runtime code.
- Source kind (`local_file`, `online_file`, `database_table`, `api_response`) is metadata only. It must not change signal/question/action semantics for the same columns and rows.
- A question may be shown as a lens, but an action may only be enabled if its required fields are present.
- High-cardinality identifiers and dominant placeholder fields must not become default dimensions.
- Dirty/manual exports should produce data-quality questions before aggregate questions.
- Domain/industry-specific support should extend the signal catalog, not replace the universal business layer.

## Current Status

This package is a pure TypeScript core. It is wired into local-file UI through an adapter, and the same input boundary is intended for online files and database samples.

The current migration path is:

```text
understanding-core result
  -> adapter to UnderstandingNextCard props
  -> adapter to legacy Investigation action
  -> runtime
```

Keep this package small and test-driven. Do not import React, DuckDB, Playwright, or UI code here.
