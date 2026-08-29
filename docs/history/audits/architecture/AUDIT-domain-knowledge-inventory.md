# AUDIT: Domain Knowledge Inventory

## Goal
Inventory every business domain, capability, question family, business workflow, and analytical intent currently existing inside LightBI before proceeding with the BVQ pipeline refactoring. This ensures zero capability degradation.

## Findings by Source

### 1. `apps/desktop/src/content/home-guidance.ts` (Hero Suggestions & Action Previews)
The most extensive source of domain knowledge. It defines `heroSuggestionPools` which map specific signals to workflows:
- **Retail:** sales, branch, product, inventory, customer, store
- **Operations:** branch, performance, daily, operation
- **Management:** executive, revenue, team, risk
- **Finance:** revenue, expense, payment, cash flow, profit
- **Accounting:** invoice, receivable, payable, journal, tax
- **Education:** student, attendance, class, tuition, teacher, course
- **IT / Service:** incident, ticket, uptime, device, service, system, resolution, complaint, sla
- **HR:** employee, leave, attendance, payroll, turnover, headcount
- **Sales:** pipeline, opportunity, conversion, quotation, sales rep
- **Manufacturing:** production, material, defect, machine, work order
- **Logistics:** delivery, shipment, route, carrier, dispatch

*Implementation Status:* **Partially Supported**. These exist as "hero prompts" and signals, but only the top 5 (Logistics, Revenue, Inventory, Customer, Operations) map cleanly to `Home.tsx` views.

### 2. `apps/desktop/src/lib/dataset-capabilities.ts`
Defines core dataset domains and suggested actions:
- `logistics_delivery`: Late delivery analysis, Route performance, Driver SLA
- `sales_revenue`: Find revenue opportunities, Analyze revenue breakdown
- `inventory`: Stock movement, Find slow moving items
- `hr_attendance`: Overtime patterns, Leave trends
- `finance_accounting`: Abnormal expenses, Cash flow
- `education`: Student performance, Attendance trends
- `support`: Resolution time, Overdue tickets

*Implementation Status:* **Partially Supported**. This engine detects capabilities, but not all of them map to executed queries in the Question Engine.

### 3. `apps/desktop/src/pages/Home.tsx` (Legacy UI Maps)
Defines the `PerspectiveBusinessViewMap`:
- `logistics_journey`, `driver_performance`, `delivery_sla`
- `revenue_trend`
- `inventory_aging`
- `customer_retention`
- `operational_performance`

*Implementation Status:* **Supported Today**. These represent the actual views users can currently generate.

### 4. `apps/desktop/src/lib/question-suggestions.ts` (Templates)
Provides regex/variable-interpolated string templates:
- **Logistics:** Route failure rate, Driver SLA misses, Delivery status trends
- **Revenue:** Revenue growth, Top customers
- **Inventory:** Inventory aging by warehouse, SKU stockouts
- **Operations:** Generic comparison and trend breakdowns

*Implementation Status:* **Supported Today**. These are the functional questions executing in the engine.

### 5. Architectural Docs (e.g., `ADR-087-signal-taxonomy.md`)
Mentions signals and domains such as:
- `sla`, `margin`, `profitability`, `discount`
- `stock_movement`, `replenishment`
- `supply chain`, `procurement`

*Implementation Status:* **Only mentioned in docs**. These have canonical signals but lack concrete query templates or business views.

## Summary
LightBI currently *advertises* over 15 deep analytical domains via `home-guidance.ts`, but its *runtime* (`Home.tsx` and `question-suggestions.ts`) natively executes only 5 core domains: Operations, Revenue, Inventory, Customer, and Performance.

We must catalog all of these intents to ensure our refactored architecture can not only handle the 5 supported today but seamlessly scale to the remaining 10+ identified domains.
