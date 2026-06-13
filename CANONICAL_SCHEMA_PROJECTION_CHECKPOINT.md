# Checkpoint: Canonical Schema Projection Phase 1

## Locked Achievements
- **E2E Probe Success**: The local DuckDB E2E case dealing with the `"route"` canonical field vs the `"Tuyến xe"` raw header has run to completion successfully. The `group_by` analysis query evaluated perfectly using DuckDB WASM.
- **Non-destructive Operation**: The schema projection layer operates purely non-destructively, taking raw rows as input and generating new virtual canonical rows exclusively for DuckDB ingestion, leaving the canonical dataset structure untouched.
- **Distinguishable Failures**: Projection errors (such as `CANONICAL_PROJECTION_CONFLICT` and `CANONICAL_PROJECTION_MISSING`) are cleanly preserved in the boundary contract. They are now fundamentally distinguishable from generic DuckDB load/runtime failures (`DUCKDB_WASM_RUNTIME_FAILED`), enabling accurate fallback routing.
- **Next Blocker**: The core blocker preventing local-first preview enablement is no longer fundamental schema mismatch mechanics, but rather widening the projection coverage for a broader set of canonical fields and analytical intents.

## Next Phase Proposal: Canonical Schema Projection Phase 2

**Scope**: Broaden projection coverage to support additional canonical fields within real analytical SQL scenarios. Prioritize `trend` queries (time-series logic) and at least one other `group_by` variation. Do not touch detector, UI, or taxonomy unless strictly required.

**Answers to Next-Phase Framing**:
1. **Canonical fields currently covered well**: `route`, `shipment` (verified end-to-end via the successful probe).
2. **Canonical fields with mismatch risk**: Time-dimension fields (e.g., `report_date` needing specific formatting or typing logic), measures with numeric formatting (e.g., `revenue`, `quantity`), and secondary dimension variations (e.g., `driver`, `customer`, `product`).
3. **Dataset/Probe cases for verification**: The existing `delivery_performance_reports.csv` remains ideal. The probe should be updated to execute a `trend` analysis (e.g., "Revenue trend over time") and a multi-dimensional `group_by` (e.g., "Quantity by Driver").
4. **Phase objective**: This is strictly a widening coverage phase to handle additional intents safely, not an architectural refactor.
