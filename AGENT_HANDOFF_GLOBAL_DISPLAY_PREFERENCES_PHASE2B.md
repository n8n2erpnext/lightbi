# Global Display Preferences Phase 2B Handoff

## Summary
The Global Display Preferences system has been successfully extended into the Investigation chart layer. Both tables and charts now universally respect user preferences for locales, currencies, numbers, dates, and times, completing the unified Investigation view.

## Structural Changes
1. **Formatter Upgrade**: `display-formatter.ts` was updated to support an optional `{ compact: true }` parameter, leveraging `Intl.NumberFormat`'s native `notation: 'compact'` feature.
2. **Chart Injection**: Modified `ChartPreviewRenderer.tsx` to dynamically consume the `useDisplayPreferences` store. The component re-renders when preferences change.
3. **Axis Formatting**: The chart X-Axis categories are cleanly pre-formatted. The primary Y-Axis uses the newly introduced `compact: true` mode inside `axisLabel.formatter` to prevent visual overflow (e.g., `1,500,000` becomes `1.5M`).
4. **Tooltip Formatting**: Echarts tooltips are enriched using the `tooltip.valueFormatter` at the series level, ensuring that hovering over a bar or line displays the exact formatted value (e.g., `$1,500,000.00`) matched to the user's settings, without the `compact` mode shortening it.

## Boundaries Respected
- **No Data Mutability**: `series.data` arrays are strictly populated with pure numbers, ensuring Echarts calculates its min/max grids perfectly. The formatting is strictly deferred to presentation-time callbacks (`formatter` and `valueFormatter`).
- **Scoped Rollout**: This update applies entirely to `ChartPreviewRenderer.tsx`. Dashboards and Home summaries are untouched.
