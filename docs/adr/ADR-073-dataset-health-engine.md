# ADR-073: Dataset Health Engine

## Status
Accepted

## Context
As part of the Business Confidence Architecture (Milestone 8), we need an executable foundation to evaluate datasets. Before we can assess if an answer is trustworthy, we must assess if the data source itself is healthy. 

## Decision
Implement the **Dataset Health Engine MVP** (Phase T.1).

This engine runs statically (Frontend TypeScript) and generates health scores based purely on the `DatasetFamily` and its `ColumnProfile` metadata. 

### Metrics Evaluated
1. **Completeness (30%)**: Evaluates the null ratio across columns.
2. **Consistency (20%)**: Evaluates the ratio of columns with unknown/inconsistent data types.
3. **Uniqueness (25%)**: Evaluates the distinct ratio of values, flagging potential duplicate rows.
4. **Key Quality (25%)**: Reuses the `BusinessKeyDetector` to assess candidate keys based on distinct ratio, null ratio, and semantic generic penalties.

### Diagnostic Only
Dataset Health is strictly diagnostic.
- It never modifies data.
- It never cleans data.
- It never infers missing values.

## Integration
The Dataset Health Engine is the first executable component of Business Confidence.
It contributes its scores to:
- Relationship Confidence
- Business Confidence
- Result Validator
- Future Insight Confidence

The results are displayed seamlessly in the UI (`DatasetHealthCard`) without blocking the user, acting as an informational trust layer.
