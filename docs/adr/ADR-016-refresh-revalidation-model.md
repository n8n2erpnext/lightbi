# ADR-016 Refresh & Revalidation Model

Status:
Accepted

Context:
Dashboards are only as useful as their data is accurate. When dealing with multiple disparate sources, it's critical to know when to re-evaluate a recipe. If a user connects a live ERPNext database, they expect near-live data. If they use a static CSV, they only need a re-evaluation if the file changes.

Decision:
Datasets support explicit refresh strategies managed by the Planner.

Possible strategies:
* `manual`: User explicitly clicks refresh.
* `periodic`: Every X minutes/hours.
* `live`: Constant streaming/polling.
* `sourceTriggered`: File system events or webhook invalidations.

Examples:
* Google Sheet update → Recipe re-evaluation
* CSV file modified → Dataset invalidated locally
* ERPNext data changed → Refresh scheduled

Consequences:
* Supports near-live dashboards without completely thrashing the local CPU.
* Better multi-source support by compartmentalizing invalidation.
* Preserves local-first principles by watching local files for changes.
