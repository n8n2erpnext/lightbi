# ADR 078: Result Validator Integration

## Status
Accepted

## Context
In LightBI, a successful query execution does not necessarily mean the analytical question has been answered correctly. A query might run and return rows, but those rows could lack the requested dimensions, aggregate the wrong measures, or return a shape totally unsuited for the expected visualization (e.g., returning single values when a trend over time was expected).

To fulfill the trust engine architecture (ADR-070, ADR-074), LightBI must algorithmically evaluate the preview data against the stated intent. We need a `result_validation` signal.

## Decision
We introduce the `Result Validator` as the downstream consumer of the `PreviewRuntimeResult`. 

1. **Validation Target**: The validator evaluates the `PreviewRuntimeResult` columns and structure against the `ExpectedResultContract`.
2. **Evidence Categories**: 
   - `dimension_match` (30%): Are the requested categorical splits present?
   - `measure_match` (30%): Are the expected metrics computed?
   - `shape_match` (20%): Does the row output shape (e.g., ranking vs. trend) align with intent?
   - `output_type_match` (10%): Does the structure match chart/table needs?
   - `business_context_match` (10%): Is the result derived from a confirmed business view?
3. **Signal Generation**: The validator produces a `ResultValidationResult` with a 0-100 score and a HIGH/MEDIUM/LOW confidence. This is mapped via a signal adapter into the `ConfidenceSignalRegistry`.
4. **Provisional State**: The `BusinessConfidenceEngine` consumes this new signal, but confidence remains "provisional" because the `Coverage` signal is not yet available. Final mode cannot be entered until data completeness is verified.

## Consequences
- **Positive**: We now programmatically know if the runtime data answers the user's question, significantly preventing "silent failures" where a query succeeds but delivers the wrong chart.
- **Positive**: The Trust Engine receives its second-largest weighted signal (25%).
- **Negative**: Adds overhead to the preview cycle.
- **Constraint**: Must strictly enforce that the engine does not claim "Final Confidence" yet.
