# Sample Data Pack Notes

This document summarizes the intent and characteristics of the generated CSV samples located in `sample-data-audit/`.

## 1. Operations Domain
- **good_operations.csv**
  - *Domain*: `operations`
  - *Status*: Good
  - *Expected Signals*: `driver`, `route`, `shipment`, `delivery_status`, `sla`, `warehouse`, `delay`, `vehicle`
  - *Intent*: Provides a clean, well-structured dataset representing standard delivery and logistics tracking with clear canonical mappings.
- **broken_operations.csv**
  - *Domain*: `operations`
  - *Status*: Broken
  - *Expected Signals*: Partial `driver`, `route`, `shipment` with noise.
  - *Degradation Simulated*: Missing headers, Vietnamese alias variations (`tên tài xế`, `tình_trạng`), boolean values converted to integers, empty cells, and duplicated concepts (`tuyến` and `tuyến_2`).

## 2. Revenue Domain
- **good_revenue.csv**
  - *Domain*: `revenue`
  - *Status*: Good
  - *Expected Signals*: `order`, `product`, `revenue`, `sales`, `branch`, `salesperson`, `discount`, `customer`
  - *Intent*: Clean e-commerce/retail sales data simulating a strong mapping to classic BI revenue concepts.
- **broken_revenue.csv**
  - *Domain*: `revenue`
  - *Status*: Broken
  - *Expected Signals*: Partial `revenue`, `product`
  - *Degradation Simulated*: Vietnamese aliases with spacing issues (`nv bh` instead of `salesperson`), completely missing primary keys (`đơn_hàng` empty), missing metrics, and duplicate column meanings (`doanh thu` and `doanh thu 2`).

## 3. Inventory Domain
- **good_inventory.csv**
  - *Domain*: `inventory`
  - *Status*: Good
  - *Expected Signals*: `sku`, `product`, `inventory`, `stock_qty`, `warehouse`, `stock_movement`, `inbound`, `outbound`, `supplier`, `replenishment`, `stock_age`
  - *Intent*: Clean warehouse snapshot merged with movement data to test inventory risk detection.
- **broken_inventory.csv**
  - *Domain*: `inventory`
  - *Status*: Broken
  - *Expected Signals*: `sku`, `inventory`, partial `stock_movement`
  - *Degradation Simulated*: Vietnamese shorthands (`sp`, `nhà cc`), missing categorical values (warehouse empty), numeric columns with blanks, missing headers for important movement metrics.

## 4. Customer Domain
- **good_customer.csv**
  - *Domain*: `customer`
  - *Status*: Good
  - *Expected Signals*: `customer`, `segment`, `order_count`, `revenue`, `retention`, `last_purchase`, `contribution`, `purchase_behavior`
  - *Intent*: Clean CRM export showing standard RFM and behavioral segments for cohort analysis.
- **broken_customer.csv**
  - *Domain*: `customer`
  - *Status*: Broken
  - *Expected Signals*: Partial `customer`, `segment`
  - *Degradation Simulated*: Misaligned date strings, blank primary keys, unmapped aliases (`giữ chân`, `đóng góp`), missing metrics leading to incomplete cohort structures.

## 5. Performance Domain
- **good_performance.csv**
  - *Domain*: `performance`
  - *Status*: Good
  - *Expected Signals*: `kpi`, `target`, `actual`, `achievement`, `productivity`, `utilization`, `department`, `efficiency`, `performance_gap`
  - *Intent*: A cleanly structured cross-departmental KPI scorecard testing target-achievement inference.
- **broken_performance.csv**
  - *Domain*: `performance`
  - *Status*: Broken
  - *Expected Signals*: Partial `target`, `actual`
  - *Degradation Simulated*: Empty KPI labels, missing targets, unmapped Vietnamese columns (`chỉ số`, `hiệu quả`), empty cells in calculated fields like efficiency index.

## 6. Finance Domain
- **good_finance.csv**
  - *Domain*: `finance`
  - *Status*: Good
  - *Expected Signals*: `revenue`, `cost`, `profit`, `margin`, `expense`, `discount`, `purchase_cost`, `operational_cost`, `supplier_cost`
  - *Intent*: Standard P&L report data with clean columns enabling instant profitability detection.
- **broken_finance.csv**
  - *Domain*: `finance`
  - *Status*: Broken
  - *Expected Signals*: Partial `revenue`, `cost`, `profit`
  - *Degradation Simulated*: Truncated strings, missing metric calculations (margin empty), missing quarters, aliases with unstandardized characters (`cp hoạt động`, `cp ncc`).
