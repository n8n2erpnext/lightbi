# Taxonomy Expansion Phase 2 Verification Report

## Overview
This report verifies the effectiveness of Phase 2 (Time/Dimension Gap closure) and specifically addresses the regression risk of removing the ambiguous `date` alias from `report_date`.

## 1. Regression Risk Check: Removing `date` Alias
We ran a dedicated regression test against the core engine to observe how various date-related columns map after removing `date` from `report_date` aliases.

- **`report_date` column**: Maps correctly to `report_date` (via exact match).
- **`delivery date` column**: Maps correctly to `report_date` (via exact phrase alias).
- **`date` column**: Maps to **NOTHING** (Unrecognized). Successfully blocked.
- **`order_date` column**: Maps to **NOTHING** (Unrecognized). Successfully blocked by guardrails (measure vs time mismatch).

**Conclusion**: There is **ZERO** regression on fully-qualified date columns. Removing `date` successfully killed the generic bleed risk without harming explicitly defined semantic columns. No audit datasets lost signals because none relied on a plain `date` column to function.

## 2. Gain: `good_finance.csv` Before vs After
- **Before Phase 2**: 
  - Signals: 6 (revenue, cost, profit, margin, expense, discount)
  - Tier: `exploratory_only`
  - Score: 53
  - Opportunities: 0
- **After Phase 2**:
  - Signals: 7 (revenue, cost, profit, margin, expense, discount, **time_period**)
  - Tier: `reference_only`
  - Score: 87
  - Opportunities: 1 (`Revenue over Time Period`)
- **Analysis**: As designed, recognizing the `period` column as a generic `time_period` fulfilled the missing dimension/time requirement, allowing the engine to pair it with measures and successfully generate a runnable opportunity.

## 3. Status Check: `broken_finance.csv`
- **After Phase 2**: 
  - Signals: 7 (revenue, cost, profit, expense, target, discount, purchase_cost)
  - Tier: `exploratory_only`
  - Score: 53
  - Opportunities: 0
- **Analysis**: The file remains stuck. It was verified that `broken_finance.csv` completely lacks any time or dimension column (no `period`, no generic dimension). It is impossible to generate grouping queries on a dataset containing only measures. The engine correctly halts at `exploratory_only`. True Negative confirmed.
