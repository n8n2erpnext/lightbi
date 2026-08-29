# Global Display Preferences Phase 4 Handoff

## Summary
The Global Display Preferences architecture has now successfully penetrated the final major structural boundary: **Dashboards**. Specifically, the static KPI numeric widgets have been refactored into dynamic rendering components capable of adapting to the user's universal localization and formatting schemas.

## Structural Enhancements
1. **New Presentational Component**: 
   A dedicated `DashboardKPIWidget.tsx` was extracted to govern dashboard metrics safely, allowing isolation of the presentation layer from the grid layout logic.
2. **Dashboard Integration**: 
   `apps/desktop/src/pages/DashboardBuilder.tsx` now orchestrates the rendering of KPIs through the new widget, passing down sizing arguments.
3. **Dynamic Compaction (`compact` vs `full`)**:
   Unlike Investigation tables or Home summaries, Dashboards are physically resizable. The formatting engine now derives its compaction rule contextually:
   - Narrow grid allocations (e.g., `colSpan <= 5`) trigger `{ compact: true }`, aggressively scaling large values (e.g., `1.5M`).
   - Wide grid allocations grant standard accounting notation rendering (e.g., `1,500,000`).

## Maintained Boundaries
- **Null Safety**: All empty, pending, or `null` values gracefully resolve to the standard `-` fallback.
- **Charts Omitted**: ECharts integrations within the dashboard layer are strictly untouched in this phase.
- **State Segregation**: No analytical structures or base data fetching processes were mutated.
