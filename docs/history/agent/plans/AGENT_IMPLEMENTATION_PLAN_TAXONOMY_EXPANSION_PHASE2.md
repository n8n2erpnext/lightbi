# Implementation Plan: Taxonomy Expansion Phase 2

## Goal
Expand the core business signal taxonomy dictionary to address a single, critically proven vocabulary gap: the absence of a generic time dimension. This phase strictly targets the `period` column found in `good_finance.csv` to unlock runnable analysis paths, maintaining extremely conservative guardrails by intentionally excluding broad category or dimension expansions.

## Why This Phase Follows Taxonomy Expansion Phase 1
Phase 1 populated all missing domain-specific `measures`. However, `good_finance.csv` remains stuck at `exploratory_only` because its grouping column (`period`) has no canonical mapping. Without a recognized `time` signal, the engine cannot assemble any trends or business views.

## 1. Top Taxonomy Gap to Address
**Generic Time Gap (Core)**: The engine has no universal time canonical signal. The only existing time signals are domain-locked (e.g., `report_date` in Operations, `last_purchase` in Customer).
- *Why not map to `report_date`?*: Mapping a financial grouping concept like `period` to `report_date` would cause severe cross-domain bleeding, falsely triggering Operations perspectives and views (like Logistics Journey) on a purely Financial dataset. A neutral, core-domain temporal signal is required.

## 2. Canonical Signal to Expand
We will add exactly one new canonical target to the `core` domain:
**`time_period`** (Domain: `core`, Type: `time`)
- *Allowed Exact Aliases*: 
  - `"period"`, `"reporting period"`, `"fiscal period"`, `"kỳ báo cáo"`, `"kỳ"`
  - `"month"`, `"year"`, `"tháng"`, `"năm"` *(Note: These are inherently temporal grouping buckets rather than discrete points in time. Including them under `time_period` allows trend groupings without domain bleeding).*

## 3. Forbidden Aliases in Phase 2
Ambiguous tokens and generic dimensions that risk severe cross-domain bleeding are strictly prohibited:
- **Generic Dimensions**: `"category"`, `"type"`, `"group"`, `"loại"`, `"nhóm"`, `"phân loại"` (Too high risk of false-positives without domain prefixes).
- **Ambiguous Temporal Tokens**: `"date"`, `"time"`, `"d"`, `"m"`, `"y"` (Too discrete or short, leading to extreme false-positive mapping).

## 4. False-Positive Guardrails
- **Exact Match Only**: New generic aliases will only be mapped if they match the column name exactly (after standard normalization).
- **Negative Testing**: Must mathematically prove that strings like `customer_group` or `product_type` remain safely unrecognized and do not trigger generic mappings.

## 5. Files to Modify
- `apps/desktop/src/lib/business-signal-detector.ts` (Add `time_period` to `core` in the `TAXONOMY` object).
- `apps/desktop/src/lib/business-signal-detector.test.ts` (Add specific positive and negative tests).

## 6. Acceptance Criteria
1. `time_period` maps correctly for inputs like `period`, `fiscal period`, and `month`.
2. `good_finance.csv` successfully maps its `period` column to the new `time_period` core time signal.
3. Due to the presence of both `time` and `measures`, `good_finance.csv` successfully generates a runnable opportunity (e.g., Revenue Trend), escalating its readiness tier.
4. Forbidden ambiguous tokens (`group`, `category`, `date`, `time`) and combinations (`customer_group`, `product_type`) do NOT create signals.
5. Domain Audit Harness (`audit-runner.ts`) shows verifiable before/after metrics for `good_finance.csv`.
6. No regression of existing English/Vietnamese tests.
