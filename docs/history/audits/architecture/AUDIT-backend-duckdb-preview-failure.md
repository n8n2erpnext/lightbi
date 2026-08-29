# AUDIT: Backend DuckDB Preview Failure (DU-7F)

## Goal
Investigate the `The statement was not executed yet` panic that occurs in the Rust Axum backend during `POST /api/preview/execute` when running preview operations on uploaded datasets.

## Trace Analysis

### 1. Exact Failing Function
The panic occurs inside the `lightbi-duckdb` crate at:
```rust
// crates/lightbi-duckdb/src/backend.rs (lines 45-46)
let column_count = stmt.column_count();
let column_names: Vec<String> = stmt.column_names().into_iter().map(|s| s.to_string()).collect();
```

### 2. Did SQL Compilation Succeed?
**Yes.** The `compile_preview_sql` function correctly generated valid safe DuckDB SQL. For example:
```sql
SELECT * FROM read_csv_auto('/tmp/lightbi-project-1/files/sample_data.csv') LIMIT 100
```
This query is syntactically sound and perfectly valid for DuckDB.

### 3. Did DuckDB Query Execution Succeed?
**No.** The query was never actually sent to the DuckDB execution engine. The Rust process panicked and crashed the worker thread before `stmt.query([])` could be invoked.

### 4. Stage of Failure
- **Prepare:** Succeeded (`conn.prepare(&sql)` passed).
- **Execution:** FAILED BEFORE EXECUTION.
- **Root Cause Logic:** The failure occurred during **Statement Inspection**. The code attempts to extract `column_names()` and `column_count()` from the prepared statement *before* executing the query. 
Because the SQL uses `read_csv_auto(...)`, DuckDB defers schema sniffing (determining what columns exist in the CSV) until the query is actually executed. Requesting the column names at the pure "Prepared" stage triggers an explicit panic (`The statement was not executed yet`) inside the `duckdb-rs` wrapper.

### 5. Exact Stack Location
```
thread 'tokio-rt-worker' panicked at:
/duckdb-1.10503.1/src/raw_statement.rs:91:21: The statement was not executed yet
Called from: crates/lightbi-duckdb/src/backend.rs:45
```

## Manual Verification
The generated SQL:
```sql
SELECT * FROM read_csv_auto('/absolute/path/to/delivery_performance_reports.csv') LIMIT 100
```
Can completely run manually inside the DuckDB CLI. It returns the expected schema (all CSV columns) and 100 rows. The issue is purely the order of Rust API calls.

## Fix Applied
The ordering bug was successfully fixed.
**Before:**
1. `conn.prepare(&sql)`
2. `stmt.column_count()` and `stmt.column_names()` -> **PANIC!**
3. `stmt.query([])`

**After:**
1. `conn.prepare(&sql)`
2. `stmt.query([])` -> Forces DuckDB to execute and sniff the schema for `read_csv_auto`.
3. Extract `column_names()` via `rows_result.as_ref().unwrap()`.

**Result:**
The backend source now successfully executes queries on CSV files natively via DuckDB. Playwright E2E tests have confirmed that `backend_duckdb_preview` is now the primary execution source, rather than falling back to `js_sandbox_fallback`.

**Risk Level:** RESOLVED (Previously P1)
