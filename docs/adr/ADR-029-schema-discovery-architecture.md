# ADR-029 Schema Discovery Architecture

Status:
Accepted

Context:
LightBI needs to understand the structure of the data it queries. However, running a `SELECT *` against a raw source just to guess the columns is incredibly slow and expensive. We must abstract structural knowledge into a dedicated, governable layer.

Decision:
The **Schema Layer** becomes the authoritative source of truth detailing:
- Columns
- Data Types
- Primary/Foreign Keys
- Relationships between Datasets

**Schema Ownership:** A Schema strictly belongs to a `Dataset`, NOT a `Source`. Because Virtual Datasets can combine sources or filter columns, the schema represents the final structural output of the Dataset.

**Discovery Lifecycle:** The Connector Contract exposes discovery methods, but the Planner will only consume the persisted output governed by the `SchemaRegistry`.

Consequences:
- Extremely fast query planning since the structural shape is known ahead of time.
- Ensures LightBI can operate without aggressively probing external data sources on every user interaction.
