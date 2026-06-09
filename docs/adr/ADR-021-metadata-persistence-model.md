# ADR-021 Metadata Persistence Model

Status:
Accepted

Context:
LightBI introduces complex domain objects: Projects, Perspectives, Questions, Recipes, Datasets, Charts, and Dashboards. The UI currently relies on memory or local browser state. As we move to a persistent desktop architecture, these objects must be stored durably. While DuckDB is extremely powerful for executing analytics, using it to store hundreds of small JSON-like UI metadata rows is inefficient and complicates migrations.

Decision:
SQLite becomes the authoritative metadata store.
DuckDB is strictly reserved for analytical query execution and data manipulation.

SQLite will store:
* Projects
* Perspectives
* Questions
* Recipes
* Datasets (Schema/Metadata, not the rows)
* Charts
* Dashboards
* Settings

Consequences:
* Simple persistence logic for CRUD operations.
* Standardized, highly reliable database migrations using SQLite.
* Preserves the local-first philosophy perfectly without burdening the analytical engine.
