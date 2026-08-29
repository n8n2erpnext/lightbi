# Global Display Preferences Phase 1 Handoff

## Summary
The initial Global Display Preferences infrastructure has been successfully implemented. This introduces a robust, global, and side-effect-free presentation formatting layer that strictly respects the separation of concerns between SQL execution and UI rendering. A corrective pass has been applied to guarantee stable time-only parsing and active `datetimeFormat` propagation.

## Structural Changes
1. **Preferences Store**: Created a Zustand-based store (`display-preferences-store.ts`) holding the user's preferred locale, timezone, number style, currency formatting, decimal places, separators, and date/time formats. This allows reactive global updates without prop drilling.
2. **Formatter Engine**: Created `display-formatter.ts`, a pure utility module wrapping native `Intl.NumberFormat` and `Intl.DateTimeFormat`. It includes a lightweight `inferSemanticType` heuristic to dynamically identify raw DuckDB numbers and dates without deep metadata dependency.
3. **Investigation Table Integration**: Modified `Investigation.tsx` to wrap table cell outputs with `formatValue(...)`. The table now reactively reflects the global preferences store for all numeric and temporal fields.

## Formatting Coverage
The MVP engine handles:
- **Numbers**: Plain or Accounting style, dynamic thousands separators (comma, dot, space), and custom decimal constraints.
- **Currency**: Symbol injection (e.g., USD, VND, SAR), dynamically matching the active locale.
- **Nulls/Zeroes**: Null/Empty values safely fall back to `-`.
- **Date/Time**: 
  - `datetimeFormat` explicitly drives `compact` and `detailed` outputs.
  - `timeFormat` correctly switches between 12h/24h views.
  - Time-only strings (`14:30:00`) are safely parsed using an internal UTC dummy-date trick to prevent wall-clock shifts, regardless of local environment timezone.

## Safety Guarantees Maintained
- **Zero Raw Data Changes**: The JSON `rows` fetched from DuckDB are completely unaltered.
- **Zero SQL Changes**: `safe-sql-preview.ts` continues to emit pure logic.
- **Isolated i18n Scope**: Only explicit data values are formatted. The general application UI and Right-to-Left (RTL) structure remain unaffected.
