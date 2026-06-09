# ADR 058: Virtual Dataset Layer

## Status
**ACCEPTED**

## Context
When answering questions that require data from multiple files within a Dataset Collection (e.g., "Which products generate the highest gross profit?" using Sales, Stock, and Supplier reports), LightBI must not physically mutate or permanently merge the underlying raw files. Physical merges are brittle and scale poorly.

## Decision
We will implement a **Virtual Dataset Layer**.

1. **Virtual Dataset Concept**: A "Business View" constructed dynamically from the Relationship Discovery Engine's graph.
2. **No Physical Mutation**: Source files remain intact. Queries are generated dynamically via SQL/DuckDB using the discovered relationships.
3. **Question Generation Evolution**:
   - *Current*: Dataset → Semantic Tags → Questions
   - *Future*: Dataset Collection → Relationships → Business Context (Virtual Dataset) → Questions
   - Questions become much richer: "Which warehouse receiving activities create journey delays?" (Combining Receiving Data + Journey Data).

## Consequences
- The Recipe Planner and Execution Engine must be upgraded to support multi-table virtual queries.
- Question generation must evaluate the Virtual Dataset Layer to propose cross-functional business questions.
- Enforces LightBI's identity: We do not force users to build models; we discover relationships and create virtual views for them.
