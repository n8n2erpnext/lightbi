# Analytical Workspace Model

The Analytical Workspace Model represents how a Dashboard is serialized and validated before being shipped to the frontend UI.

## Composition
A `DashboardDefinition` contains an array of `DashboardWidget` objects. 
A `DashboardWidget` is a generic container holding:
1. `widget_type`: E.g., `Chart`, `Insight`, `Export`, `Action`.
2. `asset_id`: The ID of the actual item in the respective registry.
3. `position_metadata`: JSON defining where the widget lives on the grid (x, y, w, h).

## Perspective Awareness
A Dashboard is strictly bound to a `Perspective`.
The `DashboardValidator` enforces this constraint. If a user attempts to place an HR-scoped Insight onto a Sales-scoped Dashboard, the backend rejects the layout change. This enforces data governance at the presentation layer.
