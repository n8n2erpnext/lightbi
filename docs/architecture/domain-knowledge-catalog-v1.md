# Domain Knowledge Catalog V1

This document categorizes all business knowledge, concepts, and analytical intents discovered across the entire LightBI codebase (including UI, docs, and capabilities).

## 1. Operations & Logistics
*Status:* **Supported Today**
- **Concepts & Entities:** Driver, Route, Delivery Status, Shipment, SLA, Branch, Warehouse, Dispatch.
- **Analytical Intents:** Identify bottlenecks, track execution quality, monitor SLA compliance.
- **Common Questions:** "Which drivers miss SLA?", "What is the delivery failure rate by route?"
- **Views:** Logistics Journey, Route Performance, Driver Performance, Delivery SLA.

## 2. Revenue & Sales
*Status:* **Supported Today**
- **Concepts & Entities:** Revenue, Order, Customer, Discount, Salesperson, Pipeline, Quotation.
- **Analytical Intents:** Track growth, find top performers, identify declining products, optimize pricing.
- **Common Questions:** "How is revenue growing over time?", "Who are the top customers?"
- **Views:** Revenue Performance, Revenue Trend, Branch Performance, Salesperson Performance.

## 3. Inventory & Warehouse
*Status:* **Supported Today**
- **Concepts & Entities:** Inventory, Stock, SKU, Warehouse, Stock Movement, Item, Reorder.
- **Analytical Intents:** Discover stock movement, identify slow-moving items, manage warehouse capacity.
- **Common Questions:** "Which SKUs are out of stock?", "What is the inventory aging by warehouse?"
- **Views:** Inventory Health, Inventory Aging, Stock Movement.

## 4. Customer
*Status:* **Supported Today**
- **Concepts & Entities:** Customer, Segment, Retention, Churn, Lifetime Value.
- **Analytical Intents:** Segment audiences, track retention, calculate contribution.
- **Common Questions:** "Who are the most valuable customers?", "What is the retention rate?"
- **Views:** Customer Segmentation, Customer Contribution, Customer Retention.

## 5. Performance & KPIs
*Status:* **Supported Today**
- **Concepts & Entities:** Target, Achievement, KPI, Utilization, Productivity, Efficiency.
- **Analytical Intents:** Compare actuals vs goals, analyze operational efficiency.
- **Common Questions:** "Are we meeting our operational targets?"
- **Views:** Target Achievement, Efficiency Analysis, Operational Performance.

## 6. Finance & Accounting
*Status:* **Partially Supported** (Detected in capabilities, Hero prompts, but lacks Question Templates)
- **Concepts & Entities:** Expense, Invoice, Receivable, Payable, Cash Flow, Tax, Journal.
- **Analytical Intents:** Review cash flow, find abnormal expenses, track aging receivables.
- **Common Questions:** "What is the cash flow summary?", "Are there unusual expenses?"
- **Future Views:** Cash Flow Summary, Expense Anomaly Detection, Receivables Aging.

## 7. Supply Chain & Procurement
*Status:* **Only mentioned in docs**
- **Concepts & Entities:** Supplier, Material, Purchase Order, Lead Time.
- **Analytical Intents:** Analyze supplier reliability, track procurement costs.
- **Common Questions:** "Which suppliers have the longest lead times?"
- **Future Views:** Supplier Performance, Procurement Cost Analysis.

## 8. Profitability
*Status:* **Only mentioned in docs**
- **Concepts & Entities:** Margin, Profit, Cost, Revenue.
- **Analytical Intents:** Understand margin compression, identify unprofitable products.
- **Common Questions:** "What is the profit margin by product?"
- **Future Views:** Profitability Analysis, Margin Trend.

## 9. Human Resources (HR)
*Status:* **Partially Supported** (Capabilities / Hero Prompts)
- **Concepts & Entities:** Employee, Attendance, Leave, Payroll, Turnover, Department.
- **Analytical Intents:** Review attendance, track overtime, compare headcount.
- **Future Views:** Attendance Tracking, Headcount Analysis.

## 10. IT & Support Services
*Status:* **Partially Supported** (Capabilities / Hero Prompts)
- **Concepts & Entities:** Ticket, Incident, Service, Resolution, SLA.
- **Analytical Intents:** Review resolution times, identify overdue tickets.
- **Future Views:** Service Desk Performance, Ticket Resolution Tracking.
