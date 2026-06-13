# Implementation Plan: Measure Typing Feasibility Audit Phase 1

## 1. Audit Context
To evolve `group_by` and `trend` analytical capabilities beyond the MVP limit of `COUNT(...)`, we must prepare the Safe SQL Generator to emit `SUM(...)` and `AVG(...)`. This audit assesses the typing limitations within the current system boundaries (Understanding, Projection, and Execution) and evaluates real-world numeric field hygiene.

## 2. Core Architectural Questions
- **Where is measure typing metadata missing?**
  Currently missing in both `dataset-understanding-contract.ts` (Capabilities & Opportunities lack a `type` or `aggregationPreference` enum for measures) and `runtime-planner-preview.ts` (`LogicalRuntimeOperation` lacks definitions for specific aggregation methods).
- **Where should typing metadata live?**
  Typing must originate at the **Dataset Understanding** layer (via profile sampling/health) and flow down through the **Runtime Plan**. `safe-sql-preview.ts` should only blindly execute the specified typing instructions (e.g., if plan dictates `aggregation: 'SUM'`, then cast to numeric). The Executor should NOT infer types on the fly.
- **What is the minimum data cleansing required?**
  In DuckDB, numeric casts fail on currency symbols (`$`, `đ`) and commas (`1,000`). Cleansing requires:
  1. Stripping commas and symbols: `REPLACE(REPLACE(col, ',', ''), 'đ', '')`
  2. Safe coercion: Using DuckDB's `TRY_CAST(... AS DOUBLE)` instead of `CAST`.
- **Where is the safe fail-fast point?**
  Using `TRY_CAST` is the safest executor-level fallback (unparseable values become `NULL` instead of causing `DUCKDB_CONVERSION_ERROR` crashes). However, the true fail-fast point should be in Dataset Understanding: if a numeric column contains too much garbage text, it should not be promoted for `SUM/AVG` capabilities in the first place.

## 3. Feasibility Audit Matrix

| Candidate Measure Field | Raw Examples | Looks Numeric? | Requires Cleansing? | Safe for `SUM`? | Safe for `AVG`? | Best Layer to Decide Typing |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Sales / Revenue** | `"1,500,000"`, `"500000đ"` | Yes (Business logic) | **Yes** (Remove commas and `đ` / `$`) | **Yes** (With `TRY_CAST` & cleanse) | **Yes** (Excluding NULLs) | Dataset Understanding (via profiling) |
| **Quantity / Volume** | `"12"`, `45`, `"N/A"` | Yes | **Yes** (Handle empty / `"N/A"`) | **Yes** (With `TRY_CAST`) | **Yes** | Dataset Understanding |
| **Shipment (ID)** | `"SHP-001"`, `"S002"` | No | N/A | **No** (String) | **No** | Taxonomy/Detector |
| **Satisfaction** | `5`, `4`, `1` | Yes | **No** (Already pristine int) | **No** (Doesn't make business sense) | **Yes** | Taxonomy/Understanding |

## 4. Key Findings & Feasibility
- DuckDB's `read_json_auto` defaults to reading quoted numeric arrays as `VARCHAR` when loading virtual rows. This means ANY numeric aggregation will require `TRY_CAST`.
- Because user data comes from unvalidated CSVs, we CANNOT blindly `CAST` without cleansing functions, or we risk introducing an avalanche of `DUCKDB_UNKNOWN_RUNTIME_ERROR` (Conversion panics).

## 5. Proposed Code Scope for Next Phase
- **Priority**: Narrowly extend `safe-sql-preview.ts` to support safe `SUM` generation without touching the UI.
- **Implementation mechanism**: Instead of guessing types, the fix should modify `safe-sql-preview.ts` to emit safe syntax: `SUM(TRY_CAST(REPLACE(REPLACE(col, ',', ''), 'đ', '') AS DOUBLE))`.
- **Testing**: Extend `safe-sql-preview.test.ts` to mock intents requiring `SUM`.
- **Avoid**: Do NOT implement full-scale Dataset Understanding typing inference yet. Prove the SQL engine can survive dirty numeric fields first.
