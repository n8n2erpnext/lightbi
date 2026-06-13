# Guarded SUM Wiring Phase 1 Handoff

## Summary
The `Guarded SUM` logic has been successfully wired into the analytical execution flow. The SQL Generator now emits safe `SUM(...)` calculations for pristine numeric fields, while retaining `COUNT(...)` as a fallback for mixed or dirty text fields. Crucially, the SQL-side cleansing logic has been completely aligned with the Health Gate's assumptions to prevent over-promising.

## Structural Changes
1. **Gate Criteria Tightened**: Updated `numeric-health-gate.ts` to universally strip `.` as part of its heuristic, ensuring alignment with the SQL parser.
2. **Contract Update**: Extended `LogicalRuntimeOperation` in `runtime-planner-preview.ts` to include an optional `measureAggregations?: Record<string, "SUM" | "COUNT">` metadata dictionary.
3. **Helper Bridge**: Created `guarded-sum-bridge.ts` (`enhancePlanWithGuardedSum`). This helper evaluates measures using the `Numeric Health Gate`. If the 95% trust threshold is met, it assigns `"SUM"`; otherwise, it assigns `"COUNT"`.
4. **SQL Generator Alignment**: Modified `safe-sql-preview.ts` to respect the `measureAggregations` metadata. 
   - If `"SUM"` is requested, it emits a robust DuckDB expression matching the gate's exact capability: `SUM(TRY_CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE("col", ',', ''), '.', ''), 'đ', ''), 'VNĐ', ''), '$', ''), ' ', '') AS DOUBLE))`
   - Otherwise, it emits: `CAST(COUNT("col") AS INTEGER)`
5. **Call Site Adjustment**: Updated `Investigation.tsx` purely to inject the `enhancePlanWithGuardedSum` step right before building the SQL preview memo. 

## Security & Architecture Constraints Maintained
- **No `AVG` Operations**: `AVG` logic has not been unlocked. 
- **Fail-Safe Integrity**: The executor (`local-duckdb-executor.ts`) logic was isolated and unaltered.
- **Silent Degradation**: If dirty strings appear, the intent smoothly degrades to `COUNT`.
