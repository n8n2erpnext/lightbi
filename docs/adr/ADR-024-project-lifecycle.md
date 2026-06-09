# ADR-024 Project Lifecycle & Workspace Runtime

Status:
Accepted

Context:
LightBI requires a strict boundary defining what a project is and how the application interacts with it. Global singleton state is dangerous and leads to race conditions when users eventually attempt to open multiple windows or export projects in the background.

Decision:
The **Project Directory** is the aggregate root of the application. The Runtime Layer must never operate without an active project.

Project Lifecycle States:
* **Draft**: Project folder created. No metadata initialized yet.
* **Active**: Project is opened. SQLite metadata available. Runtime initialized. User can work normally.
* **Closed**: Project exists but is not loaded into memory. No runtime resources allocated.
* **Archived**: Project becomes read-only. No modifications allowed. Can still be opened for review.
* **Deleted**: Project removed from disk. No recovery guarantee.

Import/Export Semantics:
* Export creates a `.projectbundle` archive containing the manifest, `metadata.db`, `cache/`, `exports/`, and `logs/`.
* Import extracts this bundle and reconstructs the isolated project boundary on disk.

Consequences:
* Future services securely receive a `ProjectContext` scoped explicitly to the active workspace.
* Prevents data corruption across concurrent operations.
* Cloud-sync capabilities become trivial to implement since projects are perfectly encapsulated.
