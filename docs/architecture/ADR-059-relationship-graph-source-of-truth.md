# ADR-059: Relationship Graph as the Source of Truth

## Status
Accepted

## Context
As LightBI evolved to automatically discover relationships between multiple datasets, we needed a scalable way to store, manage, and evaluate these connections. Early iterations generated `DatasetCollectionCandidate` directly from pairwise detection. This approach failed to represent complex, multi-dataset topologies, making it difficult to detect transitive relationships and business domains.

## Decision
We establish `RelationshipGraph` as the absolute source of truth for cross-dataset data architecture. 

All other multi-dataset abstractions must be derived from the graph:
- `DatasetCollectionCandidate` is derived from graph connected components.
- `BusinessViewCandidate` is a layer applied on top of connected components.
- `VirtualDatasetPlan` is formulated by walking the graph's validated edges.

User feedback (e.g., confirming, rejecting, or ignoring a relationship) updates the `RelationshipGraph` edge status, not the raw dataset configurations or the derived views.

## Rationale
1. **Prevents Premature Joins**: We only store metadata (confidence, risk, column links). No data is physically joined.
2. **Supports Multiple Business Views**: A single graph can yield multiple specialized business views (e.g., an Order subgraph vs an Inventory subgraph).
3. **Auditability**: Evidence, confidence scores, and cardinality risks are centrally tracked on the graph edges.
4. **Separation of Concerns**: Business understanding and UI interaction remain decoupled from execution logic.
