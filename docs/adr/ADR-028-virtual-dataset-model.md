# ADR-028 Virtual Dataset Model

Status:
Accepted

Context:
Creating a "Dataset" historically implies duplicating data into a data warehouse. For SME tools like LightBI, enforcing the duplication of hundreds of gigabytes of data just to create a chart is completely unacceptable and breaks the local-first promise.

Decision:
LightBI heavily embraces the **Virtual Dataset Model**.
- Virtual datasets represent a logical construct combining multiple sources or transformations (via Recipes).
- Materialization (caching/saving the data physically) is strictly an optional future optimization.
- Datasets are fundamentally defined by their references to underlying sources and their operational composition.

Consequences:
- Creating a dataset is an instantaneous metadata operation, not an expensive ETL job.
- The Runtime Engine (DuckDB) dynamically executes against the virtual blueprint.
- LightBI stays fast, lightweight, and completely portable.
