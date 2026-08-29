# Implementation Plan: Safe SQL Query Failure Fix Phase 2 (Case-Sensitivity Normalization)

## 1. Context & Scope
DuckDB strictly distinguishes between `"Category"` and `"category"` when double-quoted. Currently, if the `RuntimeIntent` requests `"Category"` but `Canonical Projection` or the JSON schema outputs `"category"`, DuckDB throws a `DUCKDB_BINDER_ERROR` (Column not found).
This phase entirely eliminates this class of error by enforcing a "lowercase bottleneck" between the projection output and the SQL Engine, without altering the final output casing expected by the UI.

**Strict Scope Constraints:**
- **NO** changes to measure semantics (No `SUM`, `AVG`). We remain `COUNT`-only.
- **NO** typing inference logic.
- Target only `safe-sql-preview.ts` and `canonical-row-projection.ts`.

## 2. Technical Approach: The "Lowercase Bottleneck"

We must normalize identifiers in two coordinated places:

### A. Canonical Row Projection
In `apps/desktop/src/lib/canonical-row-projection.ts`, when constructing the virtual `projectedRow`, we will force the key to be lowercase:
```typescript
projectedRow[requiredField.toLowerCase()] = rawRow[rawHeader];
```
*Why?* The JSON file sent to DuckDB will now exclusively contain lowercase column names, acting as our standardized baseline. It guarantees that regardless of what the user intent asks for, the table schema is predictable.

### B. Safe SQL Preview
In `apps/desktop/src/lib/safe-sql-preview.ts`, we will split the identifier quoting strategy into two functions:
1. `quoteLowercaseIdent(ident)`: Used for `WHERE`, `GROUP BY`, and `ORDER BY` clauses to match the lowercase JSON schema.
2. `quoteExactIdent(ident)`: Used strictly for `AS ...` aliases in the `SELECT` clause to restore the original casing expected by the charting components.

**Example output for `group_by`:**
If Intent specifies dimension `"Tuyến Xe"` and measure `"Doanh Thu"`:
`SELECT "tuyến xe" AS "Tuyến Xe", CAST(COUNT("doanh thu") AS INTEGER) AS "Doanh Thu" FROM __LIGHTBI_PREVIEW_TABLE__ WHERE "tuyến xe" IS NOT NULL GROUP BY "tuyến xe"`

*Why?* This queries the safe lowercase JSON schema but outputs the exact mixed-case column names the UI components expect.

## 3. Preservation of Vietnamese and Raw Keys
JavaScript's `.toLowerCase()` safely handles Vietnamese characters (e.g., `"Tuyến Xe".toLowerCase() === "tuyến xe"`). DuckDB fully supports UTF-8 lowercase quoted identifiers (`"tuyến xe"`). This approach poses zero risk to existing Vietnamese keys and prevents regressions.

## 4. Test Strategy
We will add/modify tests in `safe-sql-preview.test.ts` to assert:
- `mixed-case intent`: e.g. `['Tên Lái Xe', 'Đánh Giá']`
- **Assertion**: The generator produces `SELECT "tên lái xe" AS "Tên Lái Xe"... WHERE "tên lái xe" IS NOT NULL`.
We will also test `canonical-row-projection.test.ts` (if it exists) to ensure `requiredFields` are output as lowercase keys.

## 5. Acceptance Criteria Check
- [x] Mixed-case intent logic no longer causes `BINDER_ERROR`.
- [x] Exact original casing is preserved in the final Arrow table columns via `AS "OriginalCase"`.
- [x] Measure semantics remain `COUNT`-only.
- [x] No `Investigation.tsx` or Fallback Policy touches.
