# ADR-030 Semantic Model Foundation

Status:
Accepted

Context:
Raw data schemas tell you that a column is a `VARCHAR`. It does not tell you if it represents a `Customer Name`, an `Email`, or a `Product Category`. To build intelligent templates, question-first analytics, and AI experiences, the system must understand the *meaning* of the data.

Decision:
We establish the **Semantic Model Foundation**.
- Semantic meaning is attached to Schema fields, classifying them as `Dimensions` or `Measures`.
- `SemanticFields` define entities like `Customer`, `Date`, `Region`.
- `SemanticMeasures` define aggregations like `SUM`, `AVG`.

Consequences:
- Future execution engines will never infer business meaning directly from raw source column names (e.g., guessing `cust_nm` means Customer).
- The Planner consumes Semantic Metadata, enabling abstract recipe operations like "Group By Region and Sum Revenue" rather than "Group by `r_id` and Sum `rev_amt`".
