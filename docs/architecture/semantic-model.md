# Semantic Model Architecture

While the Schema Model handles literal structure (`VARCHAR`, `INT`), the Semantic Model classifies business meaning (`Customer`, `Revenue`).

## Architectural Flow

```mermaid
graph TD
    subgraph Meaning Layer
        SM[Schema Metadata] --> SF[Semantic Fields]
        SM --> SM_M[Semantic Measures]
        
        SF -->|Tags: 'Customer', 'Date'| AI[AI Assistant]
        SM_M -->|Tags: 'SUM', 'AVG'| Planner[Query Planner]
    end
```

## Enforcement
- Future execution engines will never infer business meaning directly from raw source column names (e.g., guessing `cust_nm` means Customer).
- The Semantic Registry explicitly provides this overlay, enabling Natural Language querying in Phase 6 (Question First Analytics).
