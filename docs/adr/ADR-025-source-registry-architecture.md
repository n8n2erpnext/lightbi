# ADR-025 Source Registry Architecture

Status:
Accepted

Context:
LightBI needs to support a wide variety of data sources (CSV, Postgres, REST APIs, etc.). Without a governed registry, components like the UI, the AI planner, and the DuckDB engine would all contain hardcoded, fragmented logic for fetching schema or executing queries against specific sources. 

Decision:
All external systems must be registered and accessed exclusively through a unified **Source Registry**. 
- **Source Identity:** Every data source becomes an entity with an ID and a Type (e.g., `Postgres`, `ERPNext`).
- **Lifecycle:** Sources are created, updated, validated, and deleted through the Registry.
- **Ownership:** Sources belong firmly to a specific `Project`. No global workspace sources exist.
- **Connector Abstraction Boundary:** The rest of the LightBI application cannot directly instantiate a "PostgresClient". They must ask the Registry for the connector contract.

Consequences:
- The core runtime engine never communicates directly with external systems.
- Ensures absolute modularity, allowing community-developed third-party connectors.
