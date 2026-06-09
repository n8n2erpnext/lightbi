# ADR-001 Core Domain Model

Status:
Accepted

Context:
LightBI is a local-first BI platform targeting SME users. Frappe Insights uses a query-centric model, which requires users to think in terms of SQL and queries. LightBI intentionally adopts a dataset-centric model to simplify the mental model for non-technical users and better align with data sources like CSV, Excel, ERPNext, and other business workflows.

Decision:
Primary domain objects are structured hierarchically:
Project → Datasource → Dataset → Chart → Dashboard

Query is NOT a top-level business object. Instead, Query exists as an implementation detail of Dataset generation and transformation.

Consequences:
* Easier mental model for non-technical users.
* Better alignment with CSV, Excel, ERPNext, and business workflows.
* Reduced SQL dependency.
* Better compatibility with future AI-assisted analytics.
