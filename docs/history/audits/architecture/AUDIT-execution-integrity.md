# AUDIT: Execution Integrity (DU-7D)

## 1. Active Dataset Source Isolation

**Audit Question:** Can dataset A accidentally execute dataset B?
**Finding:** **YES.**

**Analysis:**
In `apps/server/src/main.rs`, the `AppState` defines the source state as:
```rust
struct AppState {
    // ...
    current_source: tokio::sync::Mutex<Option<CurrentSourceSession>>,
}
```
This is a globally shared Mutex across the entire server instance. It is not scoped by project ID, user session ID, or browser tab.
If User 1 uploads "Dataset A", `current_source` stores the path to Dataset A. If User 2 concurrently uploads "Dataset B", it overwrites `current_source`. When User 1 clicks "Run preview", their analysis will execute against Dataset B. 
**Risk Level:** P1 (Multi-User Risk)

---

## 2. Backend vs JS Fallback Parity

**Audit Question:** Does the JS fallback generate identical rows/aggregations to the Backend DuckDB compiler?
**Finding:** **MISMATCH DETECTED.**

**Analysis:**
- **Aggregation Logic:** Both correctly count non-null instances (JS uses `!== null && !== undefined`, SQL uses `COUNT(meas)`). Parity matches.
- **Output Columns:** Both accurately output `dimension` and `measure_count` columns. Parity matches.
- **Execution Order Mismatch (The Bug):**
  - The JS Sandbox (`duckdb-preview-sandbox.ts`) processes operations sequentially. If the `limit` operation is declared before `group_by`, it will slice the `currentRows` array *before* grouping. This means aggregations only process the first 100 raw rows.
  - The Backend SQL Compiler (`main.rs`) processes operations declaratively. It accumulates clauses (`GROUP BY`, `ORDER BY`) and appends the `LIMIT n` at the very end of the SQL string. This means DuckDB aggregates the entire CSV dataset and *then* limits the output rows.
**Resulting Mismatch:** The JS fallback will drastically undercount aggregations compared to the backend for any dataset larger than 100 rows.
**Risk Level:** P0 (Execution Correctness Risk)

---

## 3. RuntimePlan Purity Audit

**Audit Question:** Are any business labels hardcoded in the execution compiler?
**Finding:** **100% PURE.**

**Analysis:**
A deep search of `apps/server/src/main.rs` and the `compile_preview_sql` function confirms that there are absolutely no hardcoded domain heuristics (`shipment`, `route`, `driver`, `inventory`, etc.) in the runtime execution layer.
The execution compiler depends strictly on structural metadata provided by the `RuntimePlanPreview` JSON, mapping `dimensions` and `measures` into safely quoted identifiers:
```rust
let dims = dimensions.iter().map(|d| quote_ident(d)).collect::<Vec<_>>().join(", ");
```
**Conclusion:** The boundary between the semantic business layer (Frontend DU) and the execution layer (Backend DuckDB) is completely clean.

---

## 4. Architecture Risk Ranking

### P0 (Execution Correctness Risk)
**Limit vs Group By Operation Parity**
The JS sandbox evaluates limits imperatively (pre-aggregation) while the backend evaluates limits declaratively (post-aggregation). 

### P1 (Multi-User Risk)
**Global State Contamination**
`current_source` is a global Mutex. It must be refactored to be scoped per session, or the `execute` endpoint must explicitly validate the `sourceId` from the frontend against a source registry.

**Mitigation Plan:**
- Current DU-7 preview phase is single-user/dev-safe only.
- Before multi-user or project persistence, `current_source` must become project/session scoped.
- Future execution endpoints should receive `datasetId`/`sourceId` and validate ownership.
- Global `current_source` is strictly forbidden for production.

### P2 (Scalability Risk)
**On-the-fly CSV Parsing**
Using `read_csv_auto` for every single chart query is functional for previews, but highly inefficient for scale. In the future, the CSV should be materialized into a persistent DuckDB table on upload, and the execution endpoint should query the materialized table.

---
**Verdict:** DU-8 is safe to start, provided the P1 state isolation risk is addressed before any multi-tenant deployment.
