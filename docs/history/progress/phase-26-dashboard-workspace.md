# LightBI Phase 26 - Dashboard Workspace Foundation

**Date:** 2026-06-01

## New Architectural Decisions
- **ADR-051 (Dashboard Architecture)**: Defined Dashboards as structural workspace blueprints. A Dashboard does not execute queries, nor does it create charts. It acts purely as a consumer of existing analytical assets (Charts, Insights, Exports).
- **ADR-052 (Analytical Workspace Model)**: Established that Dashboards are strictly Perspective-aware. A Dashboard belongs to a specific perspective (e.g., Sales), and the backend validator enforces that only assets compatible with that perspective can be embedded.

## Rust Implementation (`lightbi-dashboard`)
- Created `crates/lightbi-dashboard` to govern user-facing analytical workspaces.
- Modeled `DashboardDefinition` and `DashboardWidget`.
- Established `WidgetType` (`Chart`, `Insight`, `Export`, `Action`).
- Authored the `DashboardValidator` which acts as the layout and governance enforcer, ensuring asset IDs are valid and perspective boundaries are respected.
- Authored the `DashboardRegistry` to cache and serve workspace layouts to the frontend.

## Extensibility & Persistence
- Authored `migrations/20260601150000_dashboard_foundation.sql` establishing SQLite tables: `dashboards`, `dashboard_widgets`, and `dashboard_versions`.
- Injected the `DashboardRegistry` and `DashboardValidator` into the `ProjectContext`.
