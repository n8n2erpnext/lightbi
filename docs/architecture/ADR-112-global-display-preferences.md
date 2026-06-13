# ADR-112: Global Display Preferences

## Status
Proposed

## Context
LightBI processes data from a variety of global sources. To provide an enterprise-grade experience, numerical and temporal data must be presented according to the user's regional and business expectations (e.g., Accounting formats, Vietnamese vs US thousands separators, Timezones). However, mutating SQL queries or canonical data to achieve presentation formatting introduces extreme fragility, corrupts aggregations, and breaks downstream processing.

## Decision
We will introduce a strict separation between **Execution Values** and **Presentation Formatting**.

1. **Settings State Location**: We will introduce a global Zustand store (`display-preferences-store.ts`) to hold user preferences (Locale, Timezone, Number Style, Currency, Date/Time formats).
2. **Formatter Engine**: A pure utility layer (`display-formatter.ts`) will leverage standard JavaScript `Intl` APIs to transform raw values into formatted strings based on the Zustand store state.
3. **Semantic Typing**: To determine which formatting rule applies (e.g., treating `1000` as $1,000.00 vs just 1,000), the dataset understanding metadata must explicitly tag columns with semantic types (`currency`, `plain_number`, `date`, `time`, `datetime`).
4. **Integration Strategy**: The formatter will be hooked directly into React components immediately prior to rendering. The initial rollout will target the **Investigation Table**, followed by Chart Labels, and finally Dashboard Summaries.

## Strict Boundaries
- **No SQL Interference**: `safe-sql-preview.ts` will strictly output untyped numbers and ISO dates. SQL will never contain `to_char` or currency formatting strings.
- **Data Integrity**: Values passed between React props, hooks, and charts will remain pure primitives. The `.toLocaleString()` operations happen only at the DOM leaf nodes.
- **i18n vs Formatting**: This ADR only governs the rendering of *data values*. Full application localization (translating "Submit" buttons, or RTL layout for `ar-SA`) is out of scope for this architecture and belongs to a future app-wide i18n initiative.

## Consequences
- **Positive**: Complete data safety. Zero risk of SQL parsing failures due to commas or currency symbols. Instant UI updates when preferences change.
- **Negative**: Requires diligent discipline from UI engineers to ensure all new data displays are wrapped in the `formatValue` helper. Unwrapped values will look raw and unstyled.
