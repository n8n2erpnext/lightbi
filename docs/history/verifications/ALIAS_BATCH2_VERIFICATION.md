# Alias Batch 2 Verification Report

## Overview
This report verifies the effectiveness of Alias Batch 2 affix expansion and the Type-Aware Guardrails across the 4 sample audit files.

## 1. sample-data-audit/revenue/good_revenue.csv
- **Before**: Signals: 6 (order, product, revenue, sales, salesperson, customer) | Tier: exploratory_only | Score: 83 | Opportunities: 2
- **After**: Signals: 6 (order, product, revenue, sales, salesperson, customer) | Tier: exploratory_only | Score: 83 | Opportunities: 2
- **Analysis**: No change. The file already had clean structural aliases for these core dimensions/measures that matched Batch 1 exact mapping.

## 2. sample-data-audit/operations/good_operations.csv
- **Before**: Signals: 3 (driver, delivery_status, warehouse) | Tier: exploratory_only | Score: 78 | Opportunities: 1
- **After**: Signals: 4 (driver, route, delivery_status, warehouse) | Tier: exploratory_only | Score: 84 | Opportunities: 1
- **Analysis**: Batch 2 successfully salvaged `route_code` by stripping `code` (allowed for dimensions) to map to `route`. Interestingly, `shipment_no` was correctly BLOCKED from mapping to `shipment` because `no` is a dimension affix but `shipment` is a measure in our taxonomy. Type-Aware Guardrails work perfectly!

## 3. sample-data-audit/inventory/good_inventory.csv
- **Before**: Signals: 3 (stock_qty, warehouse, supplier) | Tier: exploratory_only | Score: 78 | Opportunities: 2
- **After**: Signals: 7 (sku, stock_qty, warehouse, stock_movement, inbound, outbound, supplier) | Tier: exploratory_only | Score: 84 | Opportunities: 2
- **Analysis**: Huge improvement! Batch 2 salvaged `sku_code` -> `sku` (dimension code affix), `inbound_qty` -> `inbound` (measure qty affix), and `outbound_qty` -> `outbound`. This file went from barely recognized to highly contextual.

## 4. sample-data-audit/finance/good_finance.csv
- **Before**: Signals: 0 | Tier: exploratory_only | Score: 30 | Opportunities: 0
- **After**: Signals: 2 (revenue, cost) | Tier: exploratory_only | Score: 51 | Opportunities: 0
- **Analysis**: `revenue_total` and `cost_total` were salvaged because `total` is now a safe measure affix. `profit_net` and `margin_pct` remain unmapped due to missing taxonomy dictionary terms (net, pct).

## Detailed Questions Addressed
1. **`order_date` map thật ra canonical signal nào?**
   It maps to **NOTHING**. Type-Aware Guardrails blocked `order_date` from mapping to `order` because `date` is a `time` affix, while `order` is a `measure`. We don't have an `order` time signal, so it safely falls back to unrecognized.
2. **`product_code` map thật ra canonical signal nào?**
   It maps to **`sku`**. It turns out `product code` is an exact match for `sku` in our taxonomy. Even if it weren't, `code` is a dimension affix so it would correctly strip and map to `product`.
3. **`good_finance.csv` cứu được chính xác signal nào?**
   `revenue` (from `revenue_total`) and `cost` (from `cost_total`).
4. **`good_finance.csv` vẫn chưa cứu được signal nào do taxonomy gap?**
   `profit` (from `profit_net`), `margin` (from `margin_pct`), `expense` (from `expense_misc`), `discount` (from `discount_amt` - `amt` was not in Batch 2).

## Corrections & Overclaims
- **Overclaim**: Previously implied that `good_finance.csv` would be entirely saved by Batch 2.
- **Correction**: Batch 2 only fixes *structural affixes*. It does not expand the vocabulary. Finance specific modifiers like `net`, `pct`, `misc` are semantic gaps that require a Taxonomy dictionary expansion, not just affix stripping.
