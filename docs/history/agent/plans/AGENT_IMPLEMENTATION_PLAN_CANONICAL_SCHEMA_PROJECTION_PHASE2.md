# Implementation Plan: Canonical Schema Projection Phase 2

## Feasibility Assessment
1. **Current Architecture Validation**: The `projectToCanonicalRows` function maps raw headers to canonical fields using `TAXONOMY.aliases`. Because `TAXONOMY` already contains comprehensive coverage (e.g., `report_date` => "ngày báo cáo", `driver` => "tên lái xe", `customer`, `revenue`, etc.), the projection logic is already universally capable of handling new domains.
2. **Time-Series Parsing (DuckDB)**: For `trend` intents, the `safeSqlPreview` utilizes a direct `GROUP BY "time_field"` approach. `DuckDB WASM`'s `read_json_auto` is natively capable of inferring `"2023-10-01"` as a DATE type or executing group aggregations on the raw string, thus avoiding the need for complex pre-CAST transformations in the frontend.
3. **New Coverage Cases**:
   - **Trend**: `report_date` paired with `shipment`.
   - **Group By**: `driver` paired with `shipment`.

## Conclusion
No new architectural blockers or structural redesigns are necessary. Phase 2 can proceed immediately by verifying the coverage via tests and E2E probes.

## Execution Steps
1. **Unit Testing**: Expand `canonical-row-projection.test.ts` to explicitly assert the successful mapping of `report_date`, `driver`, `satisfaction`, and other common fields.
2. **Probe Update**: Modify `probe-e2e.mjs` to accept a target analysis string (e.g., `"Shipment over Report Date"`) so we can dynamically verify specific `trend` and `group_by` capabilities.
3. **E2E Validation**: Execute the probe for both new cases to obtain visual proof of successful DuckDB WASM execution.
