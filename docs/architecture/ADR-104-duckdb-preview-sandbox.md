# ADR-104: DuckDB Preview Sandbox

## Context
In Phase DU-5D, we introduce a bounded preview execution environment (`DuckDBPreviewSandbox`) for guided investigations.
This layer sits between the `RuntimePlan` and the user interface.

## Decision
1. **RuntimePlan is the ONLY execution contract.**
   - Execution logic solely interprets `RuntimePlanPreview.logicalOperations` (`group_by`, `trend`, `distribution`, `relationship`, `limit`).
   - Execution logic translates these structured operations into execution.

2. **SafeSqlPreview is a Diagnostic Artifact ONLY.**
   - The executor must **never** consume, parse, tokenise, or evaluate the `sql` text string found in `SafeSqlPreview`.
   - The `sql` string is preserved strictly for developer visibility and diagnostic explainability in the UI.

3. **Bounded Mock Executor Strategy.**
   - Since a complete DuckDB WASM integration is pending, a lightweight deterministic JavaScript executor serves as the current sandbox MVP.
   - It performs actual data aggregations and filtering based on the structured plan, providing a realistic preview up to a strict limit of 100 rows.
   - If no rows are available in the investigation session, it securely short-circuits to an "executed" state with a warning (`No dataset rows available for preview`), without fabricating data.

## Rationale
Parsing generated SQL strings back into executable operations creates a double-translation loop, resulting in architecture drift, parser duplication, and treating text as the source of truth rather than the structured `RuntimePlan`. Bounding execution ensures that client-side resources are never unbounded and prevents remote DB or network calls.

## Consequences
- The frontend execution remains safe, pure, and easy to test.
- `SafeSqlPreview` remains safely sidelined from affecting actual runtime data.
- The UI must honestly report when the mock preview executor is being used and when dataset rows are unavailable.
