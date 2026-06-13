# Guarded SUM Decimal Ambiguity Phase 1 Handoff

## Summary
The "Critical False Trust" vulnerability identified during the Stress Test has been completely patched. Any numeric string containing decimal ambiguity (e.g., fractional numbers like `1000.50`, `1.000,50` or improperly spaced thousands) is now securely intercepted and hard-blocked at the Health Gate layer.

## Core Rule Adjustments
1. **Decimal Ambiguity Hard Block (`numeric-health-gate.ts`)**:
   - The engine splits the string by its separator (`.` or `,`) and strictly asserts that every part after the first part is exactly 3 digits long.
   - If any chunk breaks this 3-digit constraint (e.g., `50` in `1000.50`), the system concludes it is either a decimal fraction or a malformed string.
   - **Action taken**: The value immediately fails validation (`isSafeForSum = false`), automatically downgrading the aggregation intent back to a safe `COUNT`.

2. **Mixed Separator Block**:
   - If a single value string contains **both** a comma `,` and a dot `.` (e.g., `1,000.50`), it is instantly rejected as a mixed-separator decimal, falling back to `COUNT`.

## Unaffected Features
- **Pure Integers**: Still seamlessly aggregate via `SUM`.
- **Pure Currencies (Clean)**: Strings like `$1,000` or `1.000.000 VNĐ` safely evaluate as `isSafeForSum = true` and compute correctly.
- **UX Consistency**: No false-positive warning strings are triggered when the fallback to `COUNT` happens. Users will simply experience the metric plotting as a `COUNT` as if it were a categorical dimension.
