# Business View Registry V1 Design

This document formalizes the canonical catalog of all supported analytical domains in LightBI V1.

## Type Definition

```typescript
type BusinessViewDefinition = {
  id: string;
  label: string;
  perspective: PerspectiveId;
  description: string;
  requiredSignals: string[]; // Minimum viable evidence required to instantiate
  optionalSignals: string[]; // Enrichment signals
  minimumRequiredMatches: number;
  questionIntents: string[];
  examples: string[];
};
```

## V1 Catalog

### 1. Operations / Logistics
- **Logistics Journey**
  - Required: `driver, route, delivery_status` (Min: 3)
  - Optional: `warehouse, shipment`
- **Driver Performance**
  - Required: `driver, sla` (Min: 2)
  - Optional: `delivery_status`
- **Delivery SLA**
  - Required: `sla, route` (Min: 2)
  - Optional: `driver`
- **Route Performance**
  - Required: `route, delivery_status` (Min: 2)
  - Optional: `driver, warehouse`
- **Warehouse Flow**
  - Required: `warehouse, shipment` (Min: 2)
  - Optional: `delivery_status`

### 2. Revenue / Sales
- **Revenue Performance**
  - Required: `revenue, order` (Min: 2)
  - Optional: `discount`
- **Revenue Trend**
  - Required: `revenue` (Min: 1)
  - Optional: `order`
- **Branch Performance**
  - Required: `revenue, branch` (Min: 2)
  - Optional: `order`
- **Salesperson Performance**
  - Required: `revenue, salesperson` (Min: 2)
  - Optional: `order, discount`
- **Discount Impact**
  - Required: `revenue, discount` (Min: 2)
  - Optional: `order`

### 3. Inventory / Stock
- **Inventory Health**
  - Required: `inventory, stock_movement` (Min: 2)
  - Optional: `sku`
- **Inventory Aging**
  - Required: `sku, inventory` (Min: 2)
  - Optional: `warehouse`
- **Stock Movement**
  - Required: `sku, stock_movement` (Min: 2)
  - Optional: `warehouse`
- **Supplier Inventory Analysis**
  - Required: `inventory, supplier` (Min: 2)
  - Optional: `sku`

### 4. Customer
- **Customer Segmentation**
  - Required: `customer, segment` (Min: 2)
  - Optional: `revenue`
- **Customer Contribution**
  - Required: `customer, revenue` (Min: 2)
  - Optional: `segment`
- **Customer Retention**
  - Required: `customer, retention` (Min: 2)
  - Optional: `segment`

### 5. Performance / KPI
- **Target Achievement**
  - Required: `target, achievement` (Min: 2)
  - Optional: `productivity`
- **Efficiency Analysis**
  - Required: `productivity, utilization` (Min: 2)
  - Optional: `target`
- **Operational Performance**
  - Required: `target, achievement` (Min: 2)
  - Optional: `utilization`

## Rules
1. Do not instantiate a view with zero supporting evidence.
2. Perspective alone cannot instantiate a view.
3. Use `requiredSignals` for minimum viability; use `optionalSignals` for context enrichment.
