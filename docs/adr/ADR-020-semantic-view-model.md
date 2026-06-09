# ADR-020 Semantic View Model

Status:
Accepted

Context:
Traditional architectures tightly couple the semantic interpretation of data directly to the database views or the dashboard. This leads to rigid data structures that cannot easily answer ad-hoc questions from varying domains.

Decision:
Datasets remain strictly generic and mathematical. The newly introduced Perspective layer provides the semantic interpretation overlay.

Examples:
* Raw Sales Dataset → CEO Perspective (interprets as revenue/margin).
* Raw Sales Dataset → Inventory Perspective (interprets as units moved / stock velocity).
* Raw Log Dataset → Security Perspective (interprets as threats/breaches).

Consequences:
* Datasets are completely reusable across departments.
* Dashboards can be reused by simply swapping the Semantic Perspective lens.
* AI suggestions are significantly enhanced, as they can ingest the selected Perspective to constrain their analysis.
