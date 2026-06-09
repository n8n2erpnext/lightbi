# ADR-018 Connector Contract

Status:
Accepted

Context:
As LightBI grows, the ecosystem of data sources will expand. If connectors are tightly coupled to the core logic, maintaining the application becomes a nightmare. 

Decision:
All future connectors must implement a strict, uniform common contract.

Connectors expose only:
* `metadata`: Identification and configuration parameters.
* `schema`: Table/Collection structures and data types.
* `capabilities`: Declared feature flags (from ADR-017).
* `health`: Connection validation status.

Rule:
* No business logic in the connector.
* No chart logic in the connector.
* No planner logic in the connector.

Consequences:
* A uniform ecosystem that protects the LightBI core.
* Easier implementation of third-party connectors by simply fulfilling the defined interface.
