# Domain Sample Matrix

This document outlines the core domains covered by the LightBI understanding engine, their canonical signals, business views, intent families, and an assessment of their support status based on the current architecture.

## 1. Operations Domain
- **Purpose**: Analyze operational performance, logistics, and supply chain execution.
- **Canonical Signals**: `driver`, `route`, `shipment`, `delivery_status`, `sla`, `warehouse`, `delay`, `vehicle`
- **Business Views**: `logistics_journey`, `driver_performance`, `delivery_sla`, `route_performance`, `warehouse_flow`
- **Intent Families**: `intent_delay_analysis`, `intent_sla_analysis`, `intent_route_performance`, `intent_driver_performance`, `intent_warehouse_flow`, `intent_logistics_journey`
- **Support Status**: **Strong**. The logistics entity relations (driver, route, shipment) are extremely well-defined and straightforward to infer from tabular tracking data. The business views naturally cover standard operational pipelines.

## 2. Revenue Domain
- **Purpose**: Analyze sales, revenue generation, and product performance.
- **Canonical Signals**: `revenue`, `sales`, `order`, `branch`, `salesperson`, `discount`, `product`, `customer`
- **Business Views**: `revenue_performance`, `revenue_trend`, `branch_performance`, `salesperson_performance`, `discount_impact`, `order_performance`
- **Intent Families**: `intent_revenue_trend`, `intent_revenue_ranking`, `intent_branch_performance`, `intent_salesperson_performance`, `intent_discount_impact`, `intent_order_performance`
- **Support Status**: **Strong**. Revenue is the most classic BI domain. The signals (order, revenue, product) are universally present in sales data and map reliably to these exact performance views.

## 3. Inventory Domain
- **Purpose**: Analyze stock levels, movement, and warehouse health.
- **Canonical Signals**: `sku`, `product`, `inventory`, `stock_qty`, `warehouse`, `stock_movement`, `inbound`, `outbound`, `supplier`, `replenishment`, `stock_age`
- **Business Views**: `inventory_health`, `inventory_aging`, `stock_movement`, `replenishment_risk`, `supplier_inventory_analysis`, `product_performance`
- **Intent Families**: `intent_inventory_health`, `intent_inventory_aging`, `intent_stock_movement`, `intent_replenishment_risk`, `intent_supplier_inventory`, `intent_product_performance`
- **Support Status**: **Strong**. Inventory states are explicit. The engine can easily isolate snapshot data (stock_qty) from transactional data (inbound, outbound, movement) based on these signals.

## 4. Customer Domain
- **Purpose**: Analyze customer behavior, segmentation, and retention.
- **Canonical Signals**: `customer`, `segment`, `order_count`, `revenue`, `retention`, `last_purchase`, `contribution`, `purchase_behavior`
- **Business Views**: `customer_segmentation`, `customer_contribution`, `customer_retention`, `purchase_behavior`
- **Intent Families**: `intent_customer_segmentation`, `intent_customer_contribution`, `intent_customer_retention`, `intent_purchase_behavior`
- **Support Status**: **Strong**. Covers structural RFM-style signals (customer, revenue, order_count). However, advanced cohort intelligence requires further audit proof as deep behavioral inference may be limited by structural matching.

## 5. Performance Domain
- **Purpose**: Analyze KPIs, target achievements, and operational efficiency.
- **Canonical Signals**: `kpi`, `target`, `actual`, `achievement`, `productivity`, `utilization`, `department`, `efficiency`, `performance_gap`
- **Business Views**: `target_achievement`, `kpi_monitoring`, `efficiency_analysis`, `operational_performance`, `department_performance`
- **Intent Families**: `intent_target_achievement`, `intent_kpi_monitoring`, `intent_efficiency_analysis`, `intent_operational_performance`, `intent_department_performance`
- **Support Status**: **Partial**. While "target vs actual" schemas are correctly identified, performance metrics are highly context-dependent. A raw "efficiency" or "kpi" column often lacks the underlying formula context needed to truly automate advanced decision support, so the engine relies heavily on surface structure.

## 6. Finance Domain
- **Purpose**: Analyze profitability, margins, and expenses.
- **Canonical Signals**: `revenue`, `cost`, `profit`, `margin`, `expense`, `discount`, `purchase_cost`, `operational_cost`, `supplier_cost`
- **Business Views**: `profitability_analysis`, `margin_analysis`, `cost_impact`, `expense_review`, `supplier_cost_analysis`
- **Intent Families**: `intent_profitability_analysis`, `intent_margin_analysis`, `intent_cost_impact`, `intent_expense_review`, `intent_supplier_cost_analysis`
- **Support Status**: **Strong (Pending Audit)**. While explicit metrics like "profit" and "cost" map easily to profitability views, there is a known overlap risk where generic measures easily bleed into the Revenue domain. This separation requires strict audit proof.
