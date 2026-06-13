# Global Display Preferences Phase 2A Handoff

## Summary
A dedicated Settings UI (`DisplayPreferencesModal`) has been successfully created and wired into the Investigation view. Users can now interactively toggle their display settings (locale, formatting rules, etc.) and see the raw data table update instantly without re-fetching or re-executing SQL queries.

## Structural Changes
1. **Settings Modal**: Created `apps/desktop/src/components/settings/DisplayPreferencesModal.tsx` as a clean overlay. It maps dropdown selections directly to the `useDisplayPreferences` Zustand store mutators.
2. **Investigation Wiring**: Inserted a clear `Settings` button (with gear icon and text) into the top-right corner of the `Investigation.tsx` header toolbar. This toggles the modal's visibility cleanly without disrupting the analysis layout.
3. **Reactive Re-Renders**: Because `Investigation.tsx` was already wired to consume the Zustand preferences in Phase 1, updating settings via the Modal triggers immediate React reactivity. The `formatValue` helper runs on the fly over the `previewResult.rows`.
4. **Store Verification**: Added `display-preferences-store.test.ts` to guarantee state transitions (updates and resets) mutate the global store precisely.

## Available Configurations in UI
- **Locale**: en-US, vi-VN, ar-SA
- **Timezone**: Auto, UTC, Asia/Ho_Chi_Minh
- **Number Style**: Plain, Accounting
- **Currency Display**: None, Symbol, Code
- **Decimal Places**: Auto, 0, 2, 4
- **Thousands Separator**: Locale Default, Comma, Dot, Space
- **Negative Style**: Minus Sign, Parentheses
- **Date/Time/Datetime Formats**: Short, Long, ISO, Compact, Detailed, 12h, 24h

## Boundaries Respected
- **Execution Unaffected**: The UI strictly alters the `Zustand` store. `local-duckdb-executor.ts` and `safe-sql-preview.ts` remain blissfully unaware of these preferences.
- **Rollout Constraint**: The modal is currently accessible only from `Investigation.tsx`. Charts and Dashboards are untouched in this phase.
