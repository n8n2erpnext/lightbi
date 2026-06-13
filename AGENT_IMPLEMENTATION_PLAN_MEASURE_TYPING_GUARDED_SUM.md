# Implementation Plan: Measure Typing Guarded SUM

## 1. Context & Narrow Scope
This plan designs a highly conservative, gated approach to introducing `SUM` into the analytical engine. `AVG` is strictly prohibited. The focus is exclusively on establishing a "Trust Gate" that permits `SUM` only when the numeric integrity of the data has been verified.

## 2. Core Architectural Decisions

### 2.1 The Trust Gate
The trust gate is a **Profiling Quality Check**. Before an intent can be marked as eligible for `SUM`, the underlying dataset must have been sampled, and the target column must demonstrate a high parsing success rate. If this rate is not met, the gate remains closed.

### 2.2 Parse Success Threshold
**Proposed Threshold: 95%**
*Reasoning*: In Business Intelligence, aggregates must be highly trustworthy. A 5% loss (via `NULL`s after `TRY_CAST`) is generally the maximum tolerable limit for directional analytics (e.g., total sales trends). Beyond 5% silent data loss, the chart becomes fundamentally deceptive.

### 2.3 Metadata Requirements
To facilitate this, a minimal metadata flag must be introduced:
- **Layer**: `RuntimeIntent` (contract layer).
- **Format**: `measureAggregations?: Record<string, "COUNT" | "SUM">`
- *Usage*: The SQL Generator (`safe-sql-preview.ts`) will inspect this map. If a measure is mapped to `"SUM"`, it generates `SUM(TRY_CAST(...))`. If mapped to `"COUNT"` or missing, it safely falls back to `CAST(COUNT(...) AS INTEGER)`.

### 2.4 Warning & Caveat Propagation
If `SUM` is permitted and executed, the system MUST push a warning to the `RuntimePlanPreview` (and thus downstream UI):
> *"Caveat: 'Doanh Thu' calculations exclude X% of unparseable textual data."*
This ensures complete transparency that cleansing + `TRY_CAST` was applied.

### 2.5 Fail-Safe Behavior
If the 95% parse threshold is NOT met during profiling/understanding:
- **Fallback**: The AI/Planner refuses to map the measure to `"SUM"`.
- **Behavior**: The intent falls back to `COUNT` (or blocks if the intent explicitly required a sum). A warning is propagated: *"SUM disabled for 'Doanh Thu' due to excessive unparseable text format."*

## 3. Scope for Next Code Phase
- **Contracts (`analysis-runtime-contract.ts` / `runtime-planner-preview.ts`)**: Add the lightweight `measureAggregations` mapping and warning fields.
- **SQL Generator (`safe-sql-preview.ts`)**: Read the mapping. If `"SUM"`, output `SUM(TRY_CAST(REPLACE(REPLACE(col, ',', ''), 'đ', '') AS DOUBLE))`.
- **Avoid**: Do NOT touch the `Investigation.tsx` UI, the core `canonical-row-projection.ts`, or complex fallback orchestrations. Keep the patch isolated to intent-to-SQL logic.

## 4. Conclusion
**Should MVP open `SUM` immediately?**
**No, not immediately.** 
While the `TRY_CAST` logic is ready, the system currently lacks the active **Dataset Health Profiling Engine** needed to calculate the 95% threshold reliably. Without the Health Engine feeding real `parse_rate` metadata into the Understanding layer, opening `SUM` now would mean operating blindly without the Trust Gate. 
**The smallest remaining blocker** is hooking up a basic regex/parse validation step in the dataset profiling flow before we flip the `SUM` switch.
