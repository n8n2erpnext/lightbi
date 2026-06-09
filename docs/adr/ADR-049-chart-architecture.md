# ADR-049 Chart Architecture

Status:
Accepted

Context:
In BI tools, a "Chart" often represents both the database query and the visual configuration. This violates the single responsibility principle. If a query fails, the chart shouldn't break; it should just render empty data.

Decision:
We establish the **Chart Architecture**.
- A Chart is entirely decoupled from query execution.
- A Chart never interacts with a `RuntimeDataset`. It exclusively consumes a `DataView`.
- A Chart represents a *Definition*, not an active rendering component. The backend saves the blueprint; the frontend (React/Vue) reads the blueprint and draws pixels.

Consequences:
- Rule: `DataView -> ChartDefinition -> Renderer`.
- This architecture enables us to swap out frontend charting libraries (e.g. from ECharts to Recharts) without changing a single line of backend logic.
