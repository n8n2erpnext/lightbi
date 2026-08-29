# ADR 099: Analysis Action Runtime Contract

## Status
Accepted

## Context
In Phase DU-4, we introduced `AnalysisAction`, which represents a user's *intent* to perform a specific analysis (e.g., "Show me the trend of shipments over time"). This action contains human-readable labels, dimensions, and measures derived from the `DatasetUnderstanding`.

However, directly executing an `AnalysisAction` is unsafe. It lacks structural validation to guarantee that the requested dimensions and measures are compatible with the requested action type (e.g., trying to render a line chart trend without a time dimension).

We need a safe boundary between user intent and runtime execution.

## Decision
We introduce the **Analysis Action Runtime Contract** (`RuntimeIntent`).

1. **`AnalysisAction` is User Intent.** It is what the user clicked on.
2. **`RuntimeIntent` is Execution-Safe Intent.** It is structurally validated.
3. **`RuntimeIntent` is NOT SQL.** It remains agnostic of the underlying database engine (DuckDB).
4. **`RuntimeIntent` is NOT a Chart.** It outputs an `expectedShape` (e.g., `bar_chart`, `line_chart`), but does not contain UI configuration.
5. **Validation Rules**:
   - `group_by`: requires >0 dims, >0 measures -> `bar_chart`
   - `trend`: requires >0 time-like dims, >0 measures -> `line_chart`
   - `distribution`: requires >0 dims -> `bar_chart`
   - `relationship`: requires >1 measures -> `scatter_plot`

If rules fail, `status` is set to `blocked` with explicit `blockedReasons`.

## Consequences
- **Safety**: We never pass invalid requests to the DuckDB runtime planner.
- **Decoupling**: The runtime execution layer does not need to understand `DatasetUnderstanding` or `AnalysisOpportunityCard` logic; it only consumes `RuntimeIntent`.
- **Transparency**: The Investigation Preview panel can immediately tell the user *why* an action cannot be executed (e.g., "trend requires at least 1 time-like dimension") without throwing a database error.
