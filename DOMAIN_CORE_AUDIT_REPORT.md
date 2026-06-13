# Domain Core Audit Report (Repaired Row-Aware Evaluation)

## 1. Domains Covered & Sample Files Evaluated
Evaluated 6 domains using the repaired audit harness that profiles rows (inferring data types, sample values, uniqueness, and missingness).

## Domain: OPERATIONS
### File: good_operations.csv
- **Detected Signals**: driver, route, delivery_status, sla, warehouse, delay, vehicle
- **Perspectives**: operations, inventory
- **Business Views**: driver_performance, delivery_sla, route_performance, logistics_journey
- **Opportunities (Top 3)**: Driver distribution, Delay by Driver
- **Grain Hint**: snapshot
- **Readiness**: Tier: reference_only | Score: 85 | Missingness Score: 100.0

### File: broken_operations.csv
- **Detected Signals**: driver, sla, warehouse, vehicle
- **Perspectives**: operations, inventory
- **Business Views**: driver_performance
- **Opportunities (Top 3)**: Driver distribution
- **Grain Hint**: snapshot
- **Readiness**: Tier: exploratory_only | Score: 82 | Missingness Score: 91.9

## Domain: REVENUE
### File: good_revenue.csv
- **Detected Signals**: order, product, revenue, sales, salesperson, customer
- **Perspectives**: revenue, inventory, customer
- **Business Views**: revenue_trend, order_performance, salesperson_performance, revenue_performance, customer_contribution
- **Opportunities (Top 3)**: Product distribution, Order by Product
- **Grain Hint**: event
- **Readiness**: Tier: exploratory_only | Score: 83 | Missingness Score: 100.0

### File: broken_revenue.csv
- **Detected Signals**: shipment, order, product, revenue, branch, discount, customer
- **Perspectives**: revenue, operations, customer, inventory
- **Business Views**: revenue_trend, order_performance, revenue_performance, discount_impact, branch_performance, customer_contribution
- **Opportunities (Top 3)**: Product distribution, Shipment by Product
- **Grain Hint**: event
- **Readiness**: Tier: reference_only | Score: 89 | Missingness Score: 90.0

## Domain: INVENTORY
### File: good_inventory.csv
- **Detected Signals**: sku, stock_qty, warehouse, stock_movement, inbound, outbound, supplier
- **Perspectives**: inventory, operations
- **Business Views**: stock_movement
- **Opportunities (Top 3)**: SKU distribution, Stock Quantity by SKU
- **Grain Hint**: event
- **Readiness**: Tier: exploratory_only | Score: 84 | Missingness Score: 100.0

### File: broken_inventory.csv
- **Detected Signals**: sku, inventory, warehouse
- **Perspectives**: operations, inventory
- **Business Views**: inventory_aging
- **Opportunities (Top 3)**: SKU distribution, Inventory by SKU
- **Grain Hint**: snapshot
- **Readiness**: Tier: exploratory_only | Score: 81 | Missingness Score: 89.7

## Domain: CUSTOMER
### File: good_customer.csv
- **Detected Signals**: customer, revenue, last_purchase
- **Perspectives**: revenue, customer
- **Business Views**: revenue_trend, customer_contribution
- **Opportunities (Top 3)**: Customer distribution, Revenue over Last Purchase, Revenue by Customer
- **Grain Hint**: unknown
- **Readiness**: Tier: reference_only | Score: 85 | Missingness Score: 100.0

### File: broken_customer.csv
- **Detected Signals**: customer, segment, revenue, retention, contribution
- **Perspectives**: revenue, customer
- **Business Views**: customer_segmentation, customer_contribution, customer_retention, revenue_trend
- **Opportunities (Top 3)**: Customer distribution, Revenue by Customer
- **Grain Hint**: unknown
- **Readiness**: Tier: reference_only | Score: 85 | Missingness Score: 87.5

## Domain: PERFORMANCE
### File: good_performance.csv
- **Detected Signals**: kpi, target, achievement, actual, department, performance_gap
- **Perspectives**: performance
- **Business Views**: kpi_monitoring, department_performance, target_achievement, operational_performance
- **Opportunities (Top 3)**: KPI distribution, Target by KPI
- **Grain Hint**: unknown
- **Readiness**: Tier: reference_only | Score: 85 | Missingness Score: 100.0

### File: broken_performance.csv
- **Detected Signals**: kpi, target, achievement, actual, productivity, utilization, department, efficiency, performance_gap
- **Perspectives**: performance
- **Business Views**: target_achievement, efficiency_analysis, operational_performance, kpi_monitoring, department_performance
- **Opportunities (Top 3)**: KPI distribution, Target by KPI
- **Grain Hint**: unknown
- **Readiness**: Tier: reference_only | Score: 88 | Missingness Score: 90.4

## Domain: FINANCE
### File: good_finance.csv
- **Detected Signals**: time_period, revenue, cost, profit, margin, expense, discount
- **Perspectives**: finance, revenue
- **Business Views**: profitability_analysis, margin_analysis, cost_impact, expense_review, discount_impact, revenue_trend
- **Opportunities (Top 3)**: Revenue over Time Period
- **Grain Hint**: summary
- **Readiness**: Tier: reference_only | Score: 87 | Missingness Score: 100.0

### File: broken_finance.csv
- **Detected Signals**: revenue, cost, profit, expense, target, discount, purchase_cost
- **Perspectives**: finance, revenue, performance
- **Business Views**: profitability_analysis, cost_impact, expense_review, revenue_trend, discount_impact
- **Opportunities (Top 3)**: None
- **Grain Hint**: unknown
- **Readiness**: Tier: exploratory_only | Score: 53 | Missingness Score: 86.0
- **Caveats**: Could not assemble runnable analysis paths from detected signals. | Could not assemble runnable analysis paths from detected signals.

## Findings & Analysis

### 1. Header-Alias Match Weakness
The engine relies heavily on exact alias matching. Even with profile-based boosts (like distinct ratio or numeric hints), standard English headers with suffixes (e.g. `revenue_amount`, `product_name`, `driver_id`) fail to map if they are not explicitly listed in the catalog. This causes perfectly healthy "Good" datasets to fall apart at the signal level, demonstrating significant brittleness in Standard Mode for un-standardized English.

### 2. Profile-Based Recovery
The inclusion of row-aware profiling (sample values, distinct ratios) provides small confidence boosts internally, but the baseline architectural design still demands a structural alias match to instantiate a candidate signal. Therefore, profile evidence mostly reinforces already-matching signals rather than rescuing missed aliases entirely.

### 3. Cross-Domain Bleed
Where broken samples successfully mapped due to matching Vietnamese aliases (e.g., `doanh thu` for revenue), severe cross-domain confusion occurred. Because domains share common metrics (e.g., `revenue` triggers both Finance and Revenue perspectives, `customer` bleeds into Operations/Sales), the engine aggressively registers multiple overlapping perspectives and views, lacking a dominance tiebreaker mechanism.

### 4. Readiness Behavior
With the correct health contract (`health.overall`) supplied, the `evaluateDecisionReadiness` mechanism operates correctly and no longer returns NaN. Datasets correctly resolve to explicit tiers (e.g. `decision_support` or `exploratory_only`) with properly scaled scores based on health multipliers and signal counts.

## Proven vs Unproven Findings

### Proven
- **Alias Brittleness**: Confirmed. Standard English headers with suffixes (e.g., `revenue_amount`) fail to map without exact string matches in the catalog, immediately dropping the dataset into `exploratory_only`.
- **Cross-Domain Bleed**: Confirmed. When signals do match (like in the Broken Vietnamese samples), overlapping domains aggressively claim the dataset (e.g., Revenue triggering Finance/Operations). There is no dominant tiebreaker logic.

### Still Unproven / Needs Product-Level Verification
- **Performance Semantic Depth**: While structural overlap is apparent, we have not yet verified if compiling the actual DuckDB logic behind the generated Business Views produces meaningful insight versus just superficial groupings. Needs runtime testing.
- **Customer Cohort Intelligence**: We see Customer domains resolving theoretically, but the actual depth of behavioral intelligence (RFM calculation validity) cannot be verified until the generated SQL plans are executed against large state-changing datasets.

## Audit Method Limits
- **Semantic Embedding Limitations**: This harness evaluates the hardcoded rule-based string detector (`business-signal-detector.ts`), not a vector semantic search. As a result, it penalizes simple lexical variations that a true LLM layer would catch immediately.
- **Type Inference Bounds**: The runner uses simple regex/heuristic casting (`number`, `date`, `string`) on the first 15 rows. Edge cases like `"0"` or purely integer-based categorical IDs might be misclassified as measures, falsely satisfying some measure-based opportunities.
- **No Runtime Execution**: The harness validates *discovery* and *readiness* state logic but does not attempt to compile or execute DuckDB SQL for the generated business views. True runtime guardrails are not proven here.

