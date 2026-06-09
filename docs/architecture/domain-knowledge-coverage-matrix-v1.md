# Domain Knowledge Coverage Matrix V1

| Domain | Current Support Level | Concepts Covered | Intent Families | Business Views | Question Templates | Source of Knowledge | Notes |
|---|---|---|---|---|---|---|---|
| Operations | Supported | driver, route, delivery_status, sla | Delay Analysis, SLA Analysis, Route Performance | Logistics Journey, Route Performance, Delivery SLA | Which drivers miss SLA? | Legacy code, docs | Highly tested domain |
| Revenue | Supported | revenue, order, discount, branch | Revenue Trend, Salesperson Performance | Revenue Performance, Branch Performance | How has revenue changed? | Legacy code, docs | Primary BI domain |
| Inventory | Supported | sku, inventory, stock_movement | Inventory Health, Aging | Inventory Health, Stock Movement | Which SKUs are out of stock? | Legacy code, docs | Core functionality |
| Customer | Supported | customer, segment, retention | Segmentation, Retention | Customer Segmentation, Retention | Which customers churn? | Legacy code, docs | Core functionality |
| Performance | Supported | target, achievement, kpi | Target Achievement, Efficiency | Target Achievement, KPI Monitoring | Which teams exceed targets? | Legacy code, docs | Core functionality |
| Finance | Partially Supported | expense, profit, margin | Profitability Analysis, Expense Review | Profitability Analysis | Which expenses need attention? | ADRs, Hero Prompts | Lacks explicit runtime views |
| Medical | Future | patient, treatment | Patient Flow | (Future) | (Future) | Future Pack Template | V1.1 Expansion candidate |
| Education | Future | student, class | Student Performance | (Future) | (Future) | Early Profiler | V1.1 Expansion candidate |
| Manufacturing | Future | production, defect | Production Delays | (Future) | (Future) | Hero Prompts | V1.1 Expansion candidate |
| HR | Future | employee, attendance | Turnover Trends | (Future) | (Future) | Hero Prompts | V1.1 Expansion candidate |
| Hospitality | Future | booking, occupancy | Occupancy Rate | (Future) | (Future) | Theoretical | V1.1 Expansion candidate |
