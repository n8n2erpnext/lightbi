# Global Display Preferences Phase 2A Checkpoint

## Milestone Reached
The interactive configuration layer (Settings UI) has been successfully implemented and integrated into the Investigation surface.

## Architectural Locks
1. **Settings UI Availability**: The `DisplayPreferencesModal` is now live and user-openable via a direct Settings button located cleanly in the `Investigation.tsx` header.
2. **Complete Presentation Flow**: The `display-preferences-store` (state), `display-formatter` (helper), and the interactive UI component have formed a complete, side-effect-free presentation loop. Changes in the modal instantly re-render the Investigation table without triggering any DuckDB backend execution.
3. **Chart Rollout Pending**: This phase has not yet extended the formatter into chart labels, tooltips, or axes.
4. **Dashboard Rollout Pending**: Home summaries, dashboards, and global app areas outside of the Investigation view remain untouched by the preferences engine.
5. **i18n Layout Boundary**: International formatting values (like Arabic numerals or localized dates) function perfectly for data, but full RTL/i18n structural layout translation across the app is explicitly deferred.
