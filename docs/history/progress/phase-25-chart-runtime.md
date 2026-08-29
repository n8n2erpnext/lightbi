# LightBI Phase 25 - Chart Runtime & Visualization Engine Foundation

**Date:** 2026-06-01

## New Architectural Decisions
- **ADR-049 (Chart Architecture)**: Mandated that Charts are purely declarative definitions. A Chart never executes a database query, nor does it contain frontend UI code. It is simply a blueprint.
- **ADR-050 (Visualization Engine Model)**: Established the `ChartValidator` which strictly enforces that a specific `ChartType` (e.g., `PieChart`) is only allowed to consume compatible `DataViews` (e.g., `CategoryView`), ensuring mathematical safety before rendering.

## Rust Implementation (`lightbi-chart`)
- Created `crates/lightbi-chart` to govern visualization definitions.
- Modeled `ChartDefinition`, `ChartType` (`Line`, `Bar`, `Area`, `Pie`, `Table`, `KPI`), and `ChartMapping`.
- Authored the `ChartValidator` which acts as the strict enforcer, cross-referencing the Chart type against the Data View type from the `lightbi-view` crate.
- Authored the `ChartRegistry` to cache generated chart blueprints.

## Extensibility & Persistence
- Authored `migrations/20260601140000_chart_foundation.sql` establishing SQLite tables: `charts`, `chart_mappings`, and `chart_versions`.
- Injected the `ChartRegistry` and `ChartValidator` into the `ProjectContext`.
