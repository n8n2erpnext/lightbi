# ADR-051 Dashboard Architecture

Status:
Accepted

Context:
Dashboards often become dumping grounds for visual components, leading to confusing layouts where charts from different departments or timeframes are mixed without a unified theme. We need to formalize what a Dashboard is in LightBI.

Decision:
We establish the **Dashboard Architecture**.
- A Dashboard is a structural layout blueprint.
- A Dashboard does NOT execute queries. It merely points to existing analytical assets (`Charts`, `Insights`, `Export Widgets`).
- A Dashboard is bound to a `Perspective`. A Sales Dashboard and a Marketing Dashboard are fundamentally distinct workspaces, even if they draw from the same `RuntimeDatasets`.

Consequences:
- Rule: Dashboards consume assets; they do not create them.
- Because a Dashboard is just a configuration array of asset pointers, loading a dashboard requires zero database queries until the underlying `RuntimeDatasets` actually need a refresh.
