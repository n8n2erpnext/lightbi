# ADR 079: Data Quality vs Business Confidence

## Status
Accepted

## Context
LightBI uses a trust engine (Business Confidence Engine) to determine if a runtime query result correctly answers a business question. Additionally, it analyzes the raw ingested datasets for completeness, uniqueness, and consistency.

Previously, the dataset evaluation was named "Dataset Health". In the user interface, a high Dataset Health score could lead users to mistakenly believe that their business question was answered accurately, conflating "Data Quality" with "Business Confidence".

## Decision
1. **Terminology**: "Dataset Health" is officially renamed to "Data Quality".
2. **Visual Hierarchy**: Data Quality and Business Confidence must be kept visually and conceptually distinct in the UI. 
3. **Definitions**:
   - **Data Quality**: Evaluates the technical quality of the imported data (completeness, uniqueness, consistency). It does NOT measure whether a business conclusion is trustworthy.
   - **Business Confidence**: Evaluates the trustworthiness of the specific analytical conclusion drawn from the data (does the query answer the question?).
4. **Provisional State**: When an expected result contract exists but runtime execution has not finalized, the Business Confidence section must be rendered explicitly as "Provisional - Awaiting runtime validation and coverage analysis."

## Consequences
- **Positive**: Eliminates user confusion between technical data integrity and analytical trust.
- **Positive**: Establishes a clearer mental model: Data First, Trust Second, Analysis Third.
- **Negative**: N/A.
