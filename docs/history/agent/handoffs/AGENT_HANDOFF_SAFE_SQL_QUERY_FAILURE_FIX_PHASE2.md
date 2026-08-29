# Safe SQL Query Failure Fix Phase 2 Handoff

## Summary
The Safe SQL Generator and Canonical Row Projection have been synchronized using a "Lowercase Bottleneck". This completely eliminates the `DUCKDB_BINDER_ERROR` caused by case-sensitivity mismatches between Runtime Intent inputs (e.g. `"Category"`) and Canonical Schema outputs (e.g. `"category"`).

## Modifications
1. **Canonical Row Projection**: The projection now strictly forces all exported keys to lowercase `projectedRow[requiredField.toLowerCase()] = ...`. This guarantees the virtual JSON table ingested by DuckDB has a predictable, lowercase schema regardless of upstream intent casing.
2. **Safe SQL Generator**: 
   - Uses `quoteLowercaseIdent` for `WHERE`, `GROUP BY`, and `ORDER BY` to securely query against the lowercased JSON schema.
   - Uses `quoteExactIdent` to alias the `SELECT` output (`... AS "Original Case"`), seamlessly preserving the exact casing that downstream UI charting components expect.
3. **Taxonomy Resiliency**: The lookup in `canonical-row-projection.ts` was made case-insensitive `TAXONOMY[requiredField.toLowerCase()]` to avoid unmapped errors if the LLM hallucinated title-case identifiers.

## Status
- **Case-Sensitivity Mismatch**: Resolved. Mixed-case and Vietnamese intents no longer trigger DuckDB BINDER errors.
- **Output Schema**: Preserved 100%. The system still outputs exact capitalization for final rendering.
- **Measure Semantics**: Kept strictly to `COUNT`-only as planned to avoid blast radius. `SUM` and `AVG` remain unimplemented.
