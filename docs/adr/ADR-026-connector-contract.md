# ADR-026 Connector Contract

Status:
Accepted

Context:
With the Source Registry managing instances of sources, the core application needs a standard interface to actually talk to those sources (to fetch schemas, test credentials, or discover capabilities). 

Decision:
Every connector must implement a unified Rust trait called `ConnectorContract`.
This contract standardizes:
- **Connector Capabilities:** Declaring what the source supports (e.g., `SupportsSchemaDiscovery`, `SupportsSqlExecution`).
- **Metadata Discovery:** Listing the available entities (tables, views, endpoints).
- **Schema Inspection:** Extracting column types and definitions.
- **Connectivity Validation:** The `test_connection()` method ensuring credentials work.
- **Authentication Ownership:** The connector parses the `source_settings` to handle its own connection pools or tokens.

Consequences:
- The Runtime Layer depends solely on the Connector Contract interface.
- Connector implementations do NOT depend on the Runtime layer (strict one-way dependency).
- It is impossible for a connector to bypass the planner and execute arbitrary dataset operations.
