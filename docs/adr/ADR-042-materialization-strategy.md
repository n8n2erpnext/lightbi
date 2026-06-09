# ADR-042 Materialization Strategy

Status:
Accepted

Context:
Every time a user opens a dashboard, forcing a live query execution against the source database is highly inefficient and creates terrible UI latency. However, blindly materializing everything into memory destroys the local-first ethos of LightBI.

Decision:
We establish a granular **Materialization Strategy**.
- By default, Datasets remain purely Virtual (metadata wrappers pointing to a Recipe).
- When explicitly requested, or when heuristics suggest it, the system can upgrade a Virtual Dataset to a:
  - **Materialized Dataset**: Flattened entirely to a local disk format.
  - **Incremental Dataset**: Flattened locally, but only fetching deltas on refresh.
  - **Cached Dataset**: Ephemeral memory caching.

Consequences:
- Materialization remains strictly optional.
- The UI experiences extreme performance gains on static dashboards without requiring a massive data-warehouse footprint.
