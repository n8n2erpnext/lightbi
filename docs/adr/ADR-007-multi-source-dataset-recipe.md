# ADR-007 Multi-Source Dataset Recipe

Status:
Proposed

Context:
In many legacy BI setups, analyzing data across different platforms requires setting up a massive, centralized data warehouse or ETL pipeline. Small businesses often just need to combine an Excel file with their live database.

Decision:
Datasets may be created from multiple independent sources simultaneously.

Examples of multi-source combinations:
* CSV + CSV
* CSV + Excel
* ERPNext + Excel
* Postgres + Google Sheet

Users should not be forced to import everything into a central database before analysis.
Dataset Recipes become the abstraction layer.

Consequences:
* Easier ad-hoc reporting across disjointed systems.
* Easier side-by-side comparisons of disparate data.
* Significantly reduced ETL (Extract, Transform, Load) burden on the user.
