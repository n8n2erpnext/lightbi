# Implementation Plan: Safe SQL Query Failure Audit Phase 1

## 1. Audit Context & Scope
This audit reviews `safe-sql-preview.ts` and `local-duckdb-executor.ts` to categorize the root causes of `PARSER`, `BINDER`, and `CATALOG` errors that force the system into a fail-fast state. The goal is to determine whether these errors are true SQL dialect issues or upstream projection/schema issues disguised as SQL errors.

## 2. Failure Matrix

| Intent | Example Query Shape | Failure Family | Concrete Example Message | Root Cause Hypothesis | Fix Belongs To |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`trend`** | `SELECT "Date", COUNT("revenue")...` | `DUCKDB_BINDER_ERROR` | `Binder Error: Referenced column "Date" not found in FROM clause` | DuckDB quoted identifiers are strictly case-sensitive. If the intent specifies `"Date"` but Canonical Projection outputs `"date"`, DuckDB rejects it. | **Projection** |
| **`trend`** | `SELECT "date", COUNT("revenue")...` | `DUCKDB_UNKNOWN_RUNTIME_ERROR` | `TypeError: Do not know how to serialize a BigInt` | DuckDB's `COUNT()` returns a `BigInt` by default. When Arrow tables are converted to JS JSON objects, `BigInt` serialization fails. | **SQL Generator / Executor** |
| **`trend`** | (Future) `SELECT DATE_TRUNC('month', "date")...` | `DUCKDB_CATALOG_ERROR` | `Catalog Error: No function matches the given name and argument types` | If the date column is parsed from JSON as `VARCHAR`, DuckDB date functions will fail without an explicit `CAST("date" AS TIMESTAMP)`. | **SQL Generator** |
| **`group_by`**| `SELECT "Category", COUNT("Sales")...` | `DUCKDB_BINDER_ERROR` | `Binder Error: Referenced column "Sales" not found` | Intent requested a measure that wasn't correctly mapped by canonical projection, or case-mismatch. | **Projection** |
| **`group_by`**| (Future) `SELECT "cat", SUM("Sales")...` | `DUCKDB_BINDER_ERROR` | `Binder Error: No function matches SUM(VARCHAR)` | When `group_by` is upgraded from just `COUNT` to `SUM`, DuckDB will fail if JSON numeric fields were imported as strings. | **SQL Generator** |

## 3. Key Findings & Conclusions

- **Projection/Schema Issues Disguised as SQL Errors:** The vast majority of current `BINDER_ERROR`s are actually **Projection Mismatches**. `safe-sql-preview.ts` strictly quotes all identifiers (`quoteIdent` -> `"..."`). DuckDB treats double-quoted identifiers as strictly case-sensitive. If the runtime intent asks for `"Category"` but the virtual JSON table has `"category"`, DuckDB throws a Binder error. This is technically a projection mapping failure, not a bad SQL dialect.
- **SQL Generation/Dialect Issues:** True SQL dialect issues are currently masked because `safe-sql-preview.ts` is extremely simplistic (it only ever uses `COUNT()`, never `SUM()`, `AVG()`, or `DATE_TRUNC()`). However, `COUNT()` itself returns `BigInt` in DuckDB, which causes hidden serialization crashes (Unknown Runtime Errors) when converting back to JS. Furthermore, once we add `DATE_TRUNC` for trends or `SUM` for group_by, we will instantly hit `CATALOG_ERROR`s because data loaded from JSON (`read_json_auto`) often types dates and numbers as `VARCHAR` unless explicitly cast.
- **Analytical Pattern Limitations:** The MVP `safeSqlPreview` forces `COUNT()` for every measure, regardless of what the user actually wants to aggregate. This is a severe analytical limitation that makes the query safe from type errors but analytically incorrect.

## 4. Proposed Scope for Next Code Phase
- **Priority Target:** `safe-sql-preview.ts`
- **Actions:**
  1. Fix the `BigInt` crash by safely casting `COUNT` results: `CAST(COUNT(...) AS INTEGER)` or `DOUBLE`.
  2. Implement safe type casting for future aggregations (`SUM(CAST("m" AS DOUBLE))`).
  3. Ensure identifiers are matched case-insensitively or force a normalization rule in the SQL generator to match the projection's case.
- **Avoid:** Do not touch `Investigation.tsx`, fallback matrix, or UI. Keep the fix strictly within the SQL generation layer to make the queries DuckDB-bulletproof.
