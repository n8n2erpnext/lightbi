# GUARDED SUM PHASE B CORRECTIVE VERIFICATION

## JS Integer vs JS Decimal
The logic in `numeric-health-gate.ts` was verified to block pure JS Decimals (e.g. `1000.5`, `0.25`) passing `isSafeForSum` logic.
We implemented `Number.isInteger(rawVal)` to ensure that only absolute integer formats flow to the DuckDB query without encountering potential coercion issues with DuckDB `TRY_CAST`. `numeric-health-gate.test.ts` has specific cases validating this path.

## Explicit SQL Cast for String Cleansing
To guarantee trust and prevent DuckDB from implicitly casting or failing on native numeric columns when string functions are applied, the `safe-sql-preview.ts` generator now wraps the source measure in an explicit cast:
`REPLACE(..., CAST("measure" AS VARCHAR), ...)`
This ensures the `REPLACE` pipeline operates consistently regardless of whether `read_json_auto` infers the column as DOUBLE, BIGINT, or VARCHAR.

## Stress-Test Cases
- The ambiguous case `US Format (Comma as thousands)` has been correctly renamed to `US Mixed Decimal`.
- A newly introduced safe case `US Integer Thousands` has been tested and proved to cleanly resolve to `SUM` without numeric drop logic interfering.

## Hidden Alias Quoting
Instead of unsafely embedding `__malformed_${m}` as a string directly, `safe-sql-preview.ts` executes `quoteExactIdent('__malformed_' + m)`. This ensures that if the source dataset carries a field with deep punctuation (e.g., `Giá "Gốc"`), the resulting identifier is perfectly escaped, conforming to DuckDBs `""` requirement.

## Updated Warnings
The system explicitly prints:
> Guarded SUM detected N malformed values skipped during SUM aggregation.
Removing any false ambiguity implying the system is operating "silently" post-detection.

## System Impact
- Only `src/lib/` logic dealing with Numeric Execution and DuckDB was adjusted.
- `apps/desktop/src/pages/*`, `components/*`, and `taxonomy` boundaries remain untouched.
- Pre-QA checks succeeded cleanly with 447 tests green.
