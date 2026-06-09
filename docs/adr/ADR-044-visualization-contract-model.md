# ADR-044 Visualization Contract Model

Status:
Accepted

Context:
Users often try to map incompatible data to visualizations (e.g., mapping a categorical string to the Y-axis of a Line chart, resulting in a crash or meaningless output).

Decision:
We establish the **Visualization Contract**.
- Every Data View type (e.g., `TimeSeriesView`, `CategoryView`) exposes a strict contract.
- The contract defines exactly which Front-End visualizations are supported by this shape.
- `TimeSeriesView` explicitly supports `Line Chart` and `Area Chart`.
- `CategoryView` explicitly supports `Bar Chart` and `Pie Chart`.

Consequences:
- Front-end clients (React/Vue/etc.) can interrogate the backend asking "What charts can I render with this view?" eliminating rendering errors before they occur.
