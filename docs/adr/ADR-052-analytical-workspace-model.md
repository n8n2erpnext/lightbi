# ADR-052 Analytical Workspace Model

Status:
Accepted

Context:
Users interact with a Dashboard as a unified screen. The backend needs a way to serialize this layout so that the frontend can accurately recreate the user's intended experience (grid positions, tabs, hidden filters).

Decision:
We establish the **Analytical Workspace Model**.
- A Dashboard contains an array of `DashboardWidget` objects.
- Each Widget specifies its `WidgetType` (e.g. `Chart`, `Insight`, `Export`).
- Each Widget contains a reference `asset_id` pointing to the actual definition (like the `ChartDefinition` from `lightbi-chart`).
- The Dashboard holds `layout_metadata` (e.g. grid coordinates, widths, heights) independent from the assets themselves.

Consequences:
- A single Chart can be embedded into 15 different Dashboards, and modifying the Chart's color will instantly update all 15 Dashboards, because the Dashboards only hold pointers, not copies of the Chart.
