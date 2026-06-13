# Global Display Preferences Phase 3 Handoff

## Summary
The "Global Display Preferences" presentation engine has been successfully expanded to the Home screen's summaries. Users viewing high-level metrics (Data Quality scores, Business Coverage counts, and Raw Row counts) will now see those numbers beautifully formatted according to their unified localization and scaling preferences. 

## Structural Changes
1. **Home Layer Penetration**: 
   - `apps/desktop/src/pages/Home.tsx`
   - `apps/desktop/src/components/data-intake/DataQualityCard.tsx`
   - `apps/desktop/src/components/analysis/BusinessViewSummaryCard.tsx`
   These components now subscribe to `useDisplayPreferences` and inject `formatValue()` specifically for summary metrics.

2. **Compaction Strategy (`compact: true`)**:
   Because the Home layout frequently utilizes dense Grid/Card configurations (e.g., the 4-column Data Quality breakdown), large dataset metrics (like `1,500,000` rows) are safely compressed into localized shorthand (`1.5M`). This completely mitigates CSS overflow risks while retaining precise intent.

3. **Null/Empty Safety**:
   The presentation formatting layer has been robustly proven to degrade gracefully. If underlying values are `null` while waiting for asynchronous fetches, the formatter seamlessly outputs a clean placeholder (e.g., `-`) rather than emitting `NaN` or crashing the React tree.

## Boundaries Respected
- **No Data Mutability**: Execution flows and raw metadata payloads remain 100% unaffected. The engine acts entirely as a pure rendering pipeline.
- **Investigation Intact**: The Investigation (Tables/Charts) view operates flawlessly alongside these Home updates.
- **Dashboards Deferred**: The full Dashboard surfaces remain untouched. They are reserved for the future rollout.
