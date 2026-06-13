# AGENT_IMPLEMENTATION_PLAN_RUNTIME_TRUTH

## 1. Top 2 Runtime-Truth Failures to Fix First
1. **DuckDB Backend Instability (Total Failure Rate)**: The primary DuckDB backend failed to execute in 100% of the tested scenarios, forcing an unplanned reliance on the `js_sandbox_fallback`. The core engine must be able to run basic aggregations without crashing.
2. **Discovery vs. Runtime Disconnect (Invalid SQL Generation)**: The query generation pipeline (`safe-sql-compiler`) is producing un-executable SQL or plans that the runtime cannot resolve, leading to silent/empty failure states where promised views are completely un-runnable.

## 2. Target Files for Next Phase
As strictly outlined in the MVP Stabilization Memo (Phase 3: Runtime Execution Rescue), we will exclusively touch the query generation and execution boundary:
- `apps/desktop/src/lib/duckdb-preview-runtime.ts`
- `apps/desktop/src/lib/safe-sql-compiler.ts`

## 3. Specific, Measurable Acceptance Criteria
- **Execution Success**: Running the preview for `broken_finance.csv` (or the newly unlocked `good_performance.csv`) successfully renders a chart in the Investigation view backed entirely by DuckDB.
- **No Silent UI Crashes**: The generated SQL for standard operations (group_by, trend, distribution) must compile and execute cleanly in DuckDB without silently falling over to a blank screen.
- **Strict Scope**: Zero new UI components created, zero new connectors added, zero AI/LLM logic touched.

## 4. Why This Must Precede Alias Batch 2
Implementing Alias Batch 2 right now would drastically increase the number of detected signals across all datasets. More signals mean more hallucinated Business Views and Opportunities. If the DuckDB runtime cannot actually execute the views we currently promise, widening the alias funnel will simply expose the user to exponentially more crashes and empty investigation screens. We must ensure the engine can **truthfully deliver** on its promises before we allow it to make *more* promises.
