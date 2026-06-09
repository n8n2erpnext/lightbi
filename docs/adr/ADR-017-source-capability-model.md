# ADR-017 Source Capability Model

Status:
Accepted

Context:
LightBI supports a broad array of data sources including CSV, Excel, Google Sheets, Postgres, MongoDB, ERPNext, and REST APIs. These sources are fundamentally different. For instance, Postgres supports pushdown aggregation, whereas a local CSV does not. A local CSV supports file watching, whereas a REST API does not.

Decision:
Every datasource must declare its capabilities explicitly using a standardized `SourceCapabilities` model. 

Capabilities are consumed by:
* **Planner**: To optimize execution (e.g., relying on Postgres for `GROUP BY` rather than pulling all rows into DuckDB).
* **Runtime**: To manage execution methods.
* **AI Assistant**: To understand what operations can be natively recommended.
* **Visual Data Canvas**: To restrict UI options based on what a source actually supports.

Consequences:
* Cleaner architecture by stripping implicit assumptions out of the Planner.
* True connector independence: The core never hardcodes logic for "Postgres"; it only reads capability flags.
* Better optimization by offloading expensive queries to sources that support pushdown filtering/aggregation.
