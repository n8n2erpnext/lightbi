# ADR-033 Recipe Architecture

Status:
Accepted

Context:
LightBI needs a way to formalize analytical operations. Historically, BI tools translate operations directly into SQL or engine-specific languages immediately. This locks the application to a single backend and makes cross-source queries nearly impossible to abstract cleanly.

Decision:
The system will use **Recipes** as the canonical representation of analytical intent.
- **Recipe Identity:** A recipe is an abstract object independent of the executing backend.
- **Recipe Composition:** A Recipe contains arrays of `Intents` (e.g., Aggregation, Filtering), Semantic Scopes, and Dataset boundaries.
- **Strict Boundary:** A Recipe must NOT describe execution details. It does not contain SQL strings or DuckDB function calls. It purely describes "What", not "How".

Consequences:
- The `Planner` can read a Recipe and translate it into a valid DuckDB execution DAG, but if we later swap to a distributed Spark engine, the Recipe remains 100% valid.
- Recipes become a portable standard for AI interactions.
