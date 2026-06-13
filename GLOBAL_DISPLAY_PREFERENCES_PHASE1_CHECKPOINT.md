# Global Display Preferences Phase 1 Checkpoint

## Milestone Reached
The foundation for global, localized data presentation has been established and wired into the primary raw data viewing layer.

## Architectural Locks
1. **Settings Schema Exists**: The `DisplayPreferences` schema (Locale, Timezone, Number/Currency styles, Date/Time formats) is fully codified in a Zustand store.
2. **Formatter Engine Live**: The pure helper `display-formatter.ts` reliably applies `Intl`-driven behaviors for numbers, currencies, dates, times, and datetimes, handling edge cases like UTC-time preservation and compact/detailed views.
3. **Investigation Table Rollout**: The Investigation table now consumes display preferences to format all raw rows on the fly.
4. **Presentation-Only Enforcement**: This entire system executes strictly post-query. SQL generation, dataset semantics, and runtime execution remain perfectly immutable and ignorant of visual formatting.
5. **No i18n/RTL Interference**: The application layout remains LTR, and static UI copy remains un-translated. The boundary of this feature is strictly limited to dynamic data value cells.
