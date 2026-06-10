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

## Minimal Fix Recommendation
Do not query `column_names()` or `column_count()` prior to execution.
The fix requires modifying `crates/lightbi-duckdb/src/backend.rs`:
1. Execute the query first: `let mut rows_result = stmt.query([])?;`
2. **After** `stmt.query` has run (which forces DuckDB to sniff the CSV and bind the schema), you can safely call `stmt.column_names()` and `stmt.column_count()` (while abiding by the Rust borrow checker), or extract the column names directly from the `rows_result.as_ref()` if supported by the driver.

**Risk Level:** P1 (Execution Blocking)
While the frontend `js_sandbox_fallback` gracefully catches this and hides it from the user, the backend execution is completely blocked on all CSV files until this ordering bug is fixed.
