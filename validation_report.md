# Perspective Isolation Validation Report

## Dataset A (Operations)

| Perspective | Business View | Generated Questions | Pass/Fail |
|---|---|---|---|
| operations | Logistics Journey | - What is the Delayed rate by Delivery Route?<br>- Which Driver has the highest Delayed rate? | **PASS** |
| revenue | Revenue Trend | - What is the Delayed rate by Delivery Route?<br>- Which Driver has the highest Delayed rate?<br>- How does delivery performance change over time? | **FAIL** (Cross-domain Contamination) |
| inventory | Inventory Aging | - What is the Delayed rate by Delivery Route?<br>- Which Driver has the highest Delayed rate?<br>- How does delivery performance change over time? | **FAIL** (Cross-domain Contamination) |
| customer | Customer Retention | - What is the Delayed rate by Delivery Route?<br>- Which Driver has the highest Delayed rate?<br>- How does delivery performance change over time? | **FAIL** (Cross-domain Contamination) |
| performance | Operational Performance | - How does delivery performance change over time? | **PASS** |

## Dataset B (Revenue)

| Perspective | Business View | Generated Questions | Pass/Fail |
|---|---|---|---|
| operations | Logistics Journey | - Which Customers generate the most Revenue?<br>- What are the top selling Products by Revenue?<br>- How has Revenue changed over time? | **FAIL** (Cross-domain Contamination) |
| revenue | Revenue Trend | - Which Customers generate the most Revenue?<br>- What are the top selling Products by Revenue?<br>- How has Revenue changed over time? | **PASS** |
| inventory | Inventory Aging | - Which Customers generate the most Revenue?<br>- What are the top selling Products by Revenue?<br>- How has Revenue changed over time? | **FAIL** (Cross-domain Contamination) |
| customer | Customer Retention | - Which Customers generate the most Revenue? | **PASS** |
| performance | Operational Performance | - Which Customers generate the most Revenue?<br>- What are the top selling Products by Revenue?<br>- How has Revenue changed over time? | **FAIL** (Cross-domain Contamination) |

## Dataset C (Inventory)

| Perspective | Business View | Generated Questions | Pass/Fail |
|---|---|---|---|
| operations | Logistics Journey | - What is the Stock Qty distribution across Warehouses?<br>- How does Stock Qty change over time? | **FAIL** (Cross-domain Contamination) |
| revenue | Revenue Trend | - What is the Stock Qty distribution across Warehouses?<br>- How does Stock Qty change over time? | **FAIL** (Cross-domain Contamination) |
| inventory | Inventory Aging | - What is the Stock Qty distribution across Warehouses? | **PASS** |
| customer | Customer Retention | - What is the Stock Qty distribution across Warehouses?<br>- How does Stock Qty change over time? | **FAIL** (Cross-domain Contamination) |
| performance | Operational Performance | - What is the Stock Qty distribution across Warehouses?<br>- How does Stock Qty change over time? | **FAIL** (Cross-domain Contamination) |

## Dataset D (Customer)

| Perspective | Business View | Generated Questions | Pass/Fail |
|---|---|---|---|
| operations | Logistics Journey | - What is the breakdown of Order Count by Segment?<br>- How does Order Count change over time? | **FAIL** (Cross-domain Contamination) |
| revenue | Revenue Trend | - What is the breakdown of Order Count by Segment?<br>- How does Order Count change over time? | **FAIL** (Cross-domain Contamination) |
| inventory | Inventory Aging | - What is the breakdown of Order Count by Segment?<br>- How does Order Count change over time? | **FAIL** (Cross-domain Contamination) |
| customer | Customer Retention | - What is the breakdown of Order Count by Segment?<br>- How does Order Count change over time? | **PASS** |
| performance | Operational Performance | - What is the breakdown of Order Count by Segment?<br>- How does Order Count change over time? | **FAIL** (Cross-domain Contamination) |

## Dataset E (Performance)

| Perspective | Business View | Generated Questions | Pass/Fail |
|---|---|---|---|
| operations | Logistics Journey | - What is the breakdown of Achievement Rate by Department?<br>- How does Achievement Rate change over time? | **FAIL** (Cross-domain Contamination) |
| revenue | Revenue Trend | - What is the breakdown of Achievement Rate by Department?<br>- How does Achievement Rate change over time? | **FAIL** (Cross-domain Contamination) |
| inventory | Inventory Aging | - What is the breakdown of Achievement Rate by Department?<br>- How does Achievement Rate change over time? | **FAIL** (Cross-domain Contamination) |
| customer | Customer Retention | - What is the breakdown of Achievement Rate by Department?<br>- How does Achievement Rate change over time? | **FAIL** (Cross-domain Contamination) |
| performance | Operational Performance | - What is the breakdown of Achievement Rate by Department?<br>- How does Achievement Rate change over time? | **PASS** |

