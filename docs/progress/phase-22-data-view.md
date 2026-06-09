# LightBI Phase 22 - Data View & Visualization Contract Foundation

**Date:** 2026-06-01

## New Architectural Decisions
- **ADR-043 (Data View Architecture)**: Established the boundary between data structures and visualization. Charts do not interact with `RuntimeDatasets` directly. They interact with `DataViews` which assign explicit roles (X-Axis, Y-Axis) to dataset columns.
- **ADR-044 (Visualization Contract Model)**: Instituted strict UI type-safety. A `DataView` must declare its shape (e.g., `TimeSeries`, `Category`). The frontend is only allowed to render Chart Types explicitly supported by that shape, preventing user-generated UI crashes.

## Rust Implementation (`lightbi-view`)
- Created `crates/lightbi-view` to house the presentation logic abstractions.
- Modeled `DataView`, `ViewType`, and `DataViewField`.
- Authored the `VisualizationContract` mapping logical shapes to allowable frontend UI components.
- Authored the `ViewValidator` which verifies that a `DataView` actually fulfills the structural requirements of its asserted `ViewType`.
- Authored the `DataViewRegistry` to cache and share views.

## Extensibility & Persistence
- Authored `migrations/20260601110000_data_view_foundation.sql` establishing SQLite tracking for `data_views`, `data_view_fields`, and `view_versions`.
- Securely merged the `DataViewRegistry` and `ViewValidator` into the `ProjectContext`.
