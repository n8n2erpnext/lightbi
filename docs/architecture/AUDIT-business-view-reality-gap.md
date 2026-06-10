# Business View Reality Audit

**Phase:** BVQ-9C
**Target:** Evaluate the real-world practicality of the current Business Views in `DOMAIN_KNOWLEDGE_CATALOG_V1`.
**Status:** Audit Complete. No code modifications.

---

## 1. Perspectives and Views Analysis

### 1.1 Operations Perspective
- **`logistics_journey`** 
  - Required: `driver`, `route`, `delivery_status` | Optional: `warehouse`, `shipment` | Min: 3
  - **Reality:** Over-constrained. Most SME delivery dispatch sheets have `route` and `shipment`, or `driver` and `shipment`, but rarely all three including `delivery_status` (often tracked in a separate system).
- **`driver_performance`** 
  - Required: `driver`, `sla` | Optional: `delivery_status` | Min: 2
  - **Reality:** Over-constrained. `sla` is an advanced derived metric, rarely a raw column.
- **`delivery_sla`** 
  - Required: `sla`, `route` | Optional: `driver` | Min: 2
  - **Reality:** Over-constrained. `sla` is rare.
- **`route_performance`** 
  - Required: `route`, `delivery_status` | Optional: `driver`, `warehouse` | Min: 2
  - **Reality:** Somewhat over-constrained. Often `route` and `shipment` are present without explicit `delivery_status`.
- **`warehouse_flow`** 
  - Required: `warehouse`, `shipment` | Optional: `delivery_status` | Min: 2
  - **Reality:** Realistic for WMS exports.

### 1.2 Revenue Perspective
- **`revenue_performance`** (Required: `revenue`, `order` | Min: 2) -> Realistic.
- **`revenue_trend`** (Required: `revenue` | Min: 1) -> Highly realistic (Always triggers).
- **`branch_performance`** (Required: `revenue`, `branch` | Min: 2) -> Realistic.
- **`salesperson_performance`** (Required: `revenue`, `salesperson` | Min: 2) -> Realistic.
- **`discount_impact`** (Required: `revenue`, `discount` | Min: 2) -> Realistic.
- **`order_performance`** (Required: `revenue`, `order` | Min: 2) -> Realistic.

### 1.3 Inventory Perspective
- **`inventory_health`** (Required: `inventory`, `stock_movement` | Min: 2) -> Over-constrained. Simple stock sheets only have `sku` and `inventory`.
- **`inventory_aging`** (Required: `sku`, `inventory` | Min: 2) -> Realistic.
- **`stock_movement`** (Required: `sku`, `stock_movement` | Min: 2) -> Realistic.
- **`replenishment_risk`** (Required: `inventory`, `replenishment` | Min: 2) -> Over-constrained. `replenishment` is often missing.
- **`supplier_inventory_analysis`** (Required: `inventory`, `supplier` | Min: 2) -> Realistic.
- **`product_performance`** (Required: `product`, `stock_movement` | Min: 2) -> Realistic.

### 1.4 Customer Perspective
- **`customer_segmentation`** (Required: `customer`, `segment` | Min: 2) -> Over-constrained. `segment` is a derived CRM metric, rarely in raw transaction data.
- **`customer_contribution`** (Required: `customer`, `revenue` | Min: 2) -> Realistic.
- **`customer_retention`** (Required: `customer`, `retention` | Min: 2) -> Over-constrained. `retention` is a derived metric.
- **`purchase_behavior`** (Required: `customer`, `purchase_behavior` | Min: 2) -> Over-constrained.

### 1.5 Performance & Finance Perspectives
- Generally realistic. Metrics like `revenue`, `cost`, `profit`, `kpi`, `actual`, `target` are heavily present in standard accounting/ERP exports. `efficiency_analysis` (productivity, utilization) might be slightly over-constrained for basic datasets.

---

## 2. Global Evaluation

### 1. Can this view realistically appear from common SME datasets?
- **Revenue & Finance:** Yes. Highly realistic. Standard ERP exports natively support these.
- **Operations & Customer:** No. Many are too strictly gated by "derived" or "advanced" signals (`sla`, `segment`, `retention`, `delivery_status`), which SMEs don't usually export in raw flat CSVs.

### 2. Which real datasets currently satisfy it?
- *Sales Reports*: Satisfies `revenue_trend`, `revenue_performance`, `customer_contribution`.
- *Delivery Performance Reports*: Currently satisfies **ZERO** views because it lacks `delivery_status` and `sla`.
- *Inventory Aging Reports*: Satisfies `inventory_aging`.

### 3. Which views have NEVER been triggered by any real dataset?
Based on current test environments and traces:
- `logistics_journey`
- `driver_performance`
- `delivery_sla`
- `route_performance`
- `customer_segmentation`
- `customer_retention`
- `purchase_behavior`
- `inventory_health` (due to lacking `stock_movement` concurrently with `inventory`).

### 4. Which required signals are over-constrained?
- **`delivery_status`**: Often implied or missing in simple dispatch manifests.
- **`sla`**: An advanced calculated metric, almost never raw data.
- **`segment` / `retention`**: CRM derived states, not raw columns.
- **`stock_movement`**: A transactional metric that is rarely alongside static `inventory` balances in simple exports.

### 5. Which views should be split into Basic and Advanced?

To maintain the Engine's strictness while accommodating real SME data reality, the following splits are recommended for the next refactor:

**1. Logistics Journey**
- `logistics_journey_basic`: required: `route` + `shipment` (Min: 2)
- `logistics_journey_advanced`: required: `route` + `shipment` + `driver` + `delivery_status` (Min: 4)

**2. Driver Performance**
- `driver_performance_basic`: required: `driver` + `route` (Min: 2)
- `driver_performance_advanced`: required: `driver` + `sla` + `delivery_status` (Min: 3)

**3. Inventory Health**
- `inventory_health_basic`: required: `sku` + `inventory` (Min: 2)
- `inventory_health_advanced`: required: `sku` + `inventory` + `stock_movement` (Min: 3)

**4. Customer Analysis**
- `customer_behavior_basic`: required: `customer` + `order` (Min: 2)
- `customer_behavior_advanced`: required: `customer` + `segment` + `retention` (Min: 3)
