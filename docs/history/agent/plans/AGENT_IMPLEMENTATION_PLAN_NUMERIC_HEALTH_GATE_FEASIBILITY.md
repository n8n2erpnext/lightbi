# Implementation Plan: Numeric Health Gate Feasibility

## 1. Context & Scope
To safely unlock `SUM` aggregation without risking "Silent Data Loss" from unparseable strings, we need a lightweight "Health Gate". This gate will profile columns before query generation to decide if they are trustworthy enough for `SUM(TRY_CAST(...))`.

**Strict Scope:**
- Design the gate logic only.
- Do NOT implement `SUM` yet.
- Do NOT refactor the core `dataset-understanding` or UI.

## 2. Architectural Design

### 2.1 Where should the Health Gate live?
**Decision**: A standalone helper (`apps/desktop/src/lib/numeric-health-gate.ts`).
*Reasoning*: Embedding it deeply into the existing `dataset-health-engine` or `batch-inspection` is too invasive for this phase. A standalone helper allows us to inject it precisely between raw JSON ingestion and the Runtime Planner, keeping the blast radius zero.

### 2.2 Minimum Input for Evaluation
To evaluate a column, the gate only needs:
1. `columnName: string`
2. `sampleValues: any[]` (An array of raw values from the JSON, ideally 100-500 rows).

### 2.3 Minimum Regex/Heuristic for MVP
Before testing if a string is a valid number, we apply a lightweight cleansing heuristic:
1. **Remove Whitespace**: `trim()`
2. **Remove Currency/Units**: Strip common symbols: `$` `€` `£` `đ` `VNĐ`
3. **Remove Thousands Separators**: Strip commas `,`. (Note: Vietnamese format `1.000.000` uses periods. We can strip `.` if there are multiple, or if there is no comma. For MVP, we strip commas).
4. **Regex Match**: `/^-?\d+(\.\d+)?$/`. If it matches, it's a success. If it's empty or "N/A", it's a failure.

### 2.4 Minimum Output Contract
To bridge this to the SQL generator later, the gate must output:
```typescript
export interface NumericHealthResult {
  columnName: string;
  isSafeForSum: boolean;   // true if parseSuccessRate >= 0.95
  parseSuccessRate: number; // e.g., 0.98
  needsCleansing: boolean;  // true if symbols/commas were detected
}
```

## 3. Evaluation Matrix

| Raw Value Pattern | Parseable? (After cleanse) | Needs Cleansing? | Counts Against 95% Threshold? | Should Trigger Warning? |
| :--- | :--- | :--- | :--- | :--- |
| `1000` | **Yes** | No | **No** (Success) | No |
| `1,000,000` | **Yes** | Yes (Remove `,`) | **No** (Success) | Yes (Cleansing applied) |
| `500000đ` | **Yes** | Yes (Remove `đ`) | **No** (Success) | Yes (Cleansing applied) |
| `N/A` | **No** | N/A | **Yes** (Failure) | Yes (If SUM is used, data is lost) |
| `""` (Empty) | **No** | N/A | **Yes** (Failure) | Yes |

## 4. Conclusion & Next Steps
**Smallest Blocker to Open Guarded SUM:**
The final remaining blocker is the absence of this standalone `Numeric Health Gate`. 
**Next Phase Recommendation:**
The upcoming code phase should ONLY implement `numeric-health-gate.ts` and its unit tests. It should NOT touch `safe-sql-preview.ts` or enable `SUM` yet. Once the gate is proven to correctly calculate `parseSuccessRate` and flag `isSafeForSum` on real dirty arrays, we will finally be cleared to wire it into the SQL generator and unlock `SUM`.
