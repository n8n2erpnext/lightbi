# Phase 2: Alias Resolution Verification

This document summarizes the post-implementation verification of the Phase 2 Alias Resolution (Batch 1) rollout, strictly comparing the system's baseline audit behavior (`before.json`) against the updated logic (`after.json`).

## 1. Before vs After Signal Improvements
The application of safe suffix-stripping (`_id`, `_name`, `_amount`, `_value`) resulted in measurable signal detection increases for several datasets:

- **`good_revenue.csv`**
  - **Signals**: 0 -> 6 (`revenue`, `order`, `customer`, `sales`, `product`, `salesperson`)
  - **Readiness**: `exploratory_only` (30) -> `exploratory_only` (83)
  - **Opportunities**: 0 -> 2

- **`good_performance.csv`**
  - **Signals**: 0 -> 6 (`kpi`, `target`, `achievement`, `actual`, `department`, `performance_gap`)
  - **Readiness**: `exploratory_only` (30) -> `reference_only` (85)
  - **Opportunities**: 0 -> 2

- **`good_inventory.csv`**
  - **Signals**: 1 -> 3 (Added `warehouse`, `supplier`)
  - **Readiness**: `exploratory_only` (47) -> `exploratory_only` (78)
  - **Opportunities**: 0 -> 2

- **`good_operations.csv`**
  - **Signals**: 1 -> 3 (Added `driver`, `warehouse`)
  - **Readiness**: `exploratory_only` (75) -> `exploratory_only` (78)
  - **Opportunities**: 1 -> 1

- **`good_customer.csv`**
  - **Signals**: 0 -> 1 (`customer`)
  - **Readiness**: `exploratory_only` (30) -> `exploratory_only` (77)
  - **Opportunities**: 0 -> 1

## 2. Biggest Improvement Observed
The most significant material impact was observed on `good_performance.csv` and `good_revenue.csv`. Both started with 0 detected signals and successfully recovered 6 signals each. Notably, `good_performance.csv` crossed the threshold into the `reference_only` tier, validating that handling basic structural suffixes unlocks previously inaccessible business views.

## 3. Regression Assessment
Based on the unit test suite and the dataset execution matrix:
- **No Vietnamese Regression**: `business-signal-detector.real-vietnamese.test.ts` passed cleanly without interference from English affix stripping.
- **No False Positive Explosions**: The `broken_` datasets maintained their baseline behavior without accumulating unexpected or irrelevant signals, confirming that the distinct boundary rules prevented generic overmatching.

## 4. Remaining Gaps After Batch 1
1. **`good_finance.csv` vẫn 0 signals**: Despite the fix, the finance domain completely failed to detect any signals.
2. **`good_operations.csv` cải thiện nhẹ**: Only 2 additional signals were recovered, and the dataset remained firmly stuck in the `exploratory_only` tier with no new opportunities unlocked.
3. **Phạm vi xử lý còn hạn chế**: Batch này mới chỉ xử lý được các hậu tố cơ bản (`id`, `name`, `amount`, `value`), hoàn toàn chưa xử lý các trường hợp phổ biến khác như `date`, `time`, `code`, `num`, `no`.
