# AUDIT: Existing Business Domain Coverage

## Goal
Identify all existing code paths containing business/domain logic to ensure that Business View Registry V1 preserves all capabilities currently supported by LightBI before the BVQ refactor.

## Trace Results

### 1. Hardcoded UI Views (The Legacy Maps)
- **File:** `apps/desktop/src/pages/Home.tsx`
- **Current Domains/Views:**
  - `logistics_journey` (Logistics Journey)
  - `driver_performance` (Driver Performance)
  - `delivery_sla` (Delivery SLA)
  - `revenue_trend` (Revenue Trend)
  - `inventory_aging` (Inventory Aging)
  - `customer_retention` (Customer Retention)
  - `operational_performance` (Operational Performance)
- **Included in V1:** YES. All 7 of these must be migrated into the formal Business View Registry.

### 2. Question Templates
- **File:** `apps/desktop/src/lib/question-suggestions.ts`
- **Current Templates:**
  - `logistics_route_performance_specific` (Route, Delivery Status)
  - `logistics_driver_sla_specific` (Driver, Delivery Status)
  - `logistics_trend_specific` (Report Date, Delivery Status)
  - `revenue_growth` (Date, Revenue)
  - `revenue_top_customers` (Customer, Revenue)
  - `inventory_aging` (Warehouse, Report Date)
  - `inventory_stockout` (SKU, Quantity)
- **Included in V1:** YES. The registry must define Business Views capable of containing these question intents.

### 3. Dataset Capabilities (Early Profiler)
- **File:** `apps/desktop/src/lib/dataset-capabilities.ts`
- **Current Domains & Actions:**
  - `logistics_delivery`: Late delivery analysis, Route performance, Driver SLA
  - `sales_revenue`: Revenue opportunities, Top performers, Revenue breakdown
  - `inventory`: Stock movement, Slow moving items, Warehouse performance
  - `hr_attendance`: Overtime patterns, Leave trends, Headcount
  - `finance_accounting`: Revenue trend, Abnormal expenses, Cash flow
  - `education`: Student performance, Attendance, Class results
  - `support`: Service requests, Resolution time, Overdue tickets
- **Included in V1:** PARTIAL.
  - Logistics, Revenue, and Inventory are fully covered.
  - HR, Finance, Education, and Support represent broader generalized capabilities. If they are to be fully supported in V1, they require dedicated signal families (e.g., `employee`, `student`, `ticket`) and formal Business View definitions. For this immediate BVQ-4A phase, we will ensure all explicitly modeled domains (Operations, Revenue, Inventory, Customer, Performance) are 100% covered.

## Gaps Discovered
1. **Missing Perspectives for Niche Domains:** The early capabilities profiler understood "Education" and "HR", but the UI (`Home.tsx`) never actually offered Perspectives or Business Views for them. They were phantom capabilities.
2. **Finance/Accounting vs Revenue:** Revenue is strongly represented in the UI, but broader "Finance" (expenses, cash flow) is only represented in the capabilities profiler.

## Conclusion
The Business View Registry V1 must primarily encapsulate the 5 major domains: Operations, Revenue, Inventory, Customer, and Performance. This covers 100% of the UI, 100% of the Question Templates, and the majority of the Dataset Capabilities profiler.
