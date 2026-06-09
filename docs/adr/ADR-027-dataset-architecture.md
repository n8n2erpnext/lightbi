# ADR-027 Dataset Architecture

Status:
Accepted

Context:
LightBI needs a unifying abstraction for analytics. Planners, Charts, and Insights should not care whether the data came from Postgres, a CSV file, or an ERPNext API. If charts bind directly to "Postgres tables", we lose the ability to join a database table with an uploaded CSV file. 

Decision:
The `Dataset` is the foundational bridge between the `Source Registry` and the `Recipe Runtime`.
- **Identity:** Datasets have their own unique IDs and lifecycles independent of their sources.
- **Ownership:** Datasets belong strictly to a Project.
- **Boundaries:** Future execution engines must operate exclusively on Datasets, never directly on Sources.

Consequences:
- The UI builds recipes against Datasets.
- It is entirely possible to delete a source connector without deleting the Dataset (it simply becomes broken/invalid until the source is re-linked), preserving lineage.
- This creates massive architectural flexibility.
