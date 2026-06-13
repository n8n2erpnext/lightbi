# Domain Runtime & UI Audit Report

## 1. Overview
Evaluated 4 representative files across Discovery, Runtime, and UI layers:
- `revenue/good_revenue.csv`
- `revenue/broken_revenue.csv`
- `operations/good_operations.csv`
- `finance/broken_finance.csv`

Screenshots have been captured and stored under `sample-data-audit/screenshots-runtime-ui/`.

## 2. Layer Comparisons

### File: `good_operations.csv` (Operations)
- **Discovery Truth**: Modest (reference_only, Score: 86). Only 1 basic signal (`delivery_status`) matched due to alias brittleness.
- **UI Messaging**: Honest. The UI correctly identifies the dataset limitations.
- **Runtime Reality**: **Stronger than expected**. Clicking "Investigate" and running the preview successfully generated a chart using the `js_sandbox_fallback` engine.
- **Mismatch**: Discovery is weak, but runtime still renders something persuasive.

### File: `broken_revenue.csv` (Revenue)
- **Discovery Truth**: Stronger (reference_only, Score: 89). Matching Vietnamese aliases triggered Revenue, Operations, Customer, and Inventory domains.
- **UI Messaging**: High confidence. Displays multiple business views.
- **Runtime Reality**: **Succeeds with Fallback**. It successfully runs the preview, but it relies entirely on the `js_sandbox_fallback` rather than the primary DuckDB backend.

### File: `good_revenue.csv` (Revenue)
- **Discovery Truth**: Very Weak (exploratory_only, Score: 40). Zero signals detected.
- **UI Messaging**: Honest. Shows minimal capabilities.
- **Runtime Reality**: **Fails (No Runnable Analysis)**. The investigation view provides no pre-configured analysis, and no "Run preview" button exists. The pipeline gracefully stops since there are zero valid dimensions/measures.

### File: `broken_finance.csv` (Finance)
- **Discovery Truth**: Mixed (reference_only, Score: 88). Claims 5 business views (profitability_analysis, etc.) but 0 actionable opportunities were generated.
- **UI Messaging**: Cautious. The UI correctly drops to `Exploratory use only` and warns of low confidence with 0 reliable analysis opportunities.
- **Runtime Reality**: **Fails (No Runnable Analysis)**. Despite the discovery engine generating 5 Business Views internally, zero opportunities are provided to the UI. The investigation view has no pre-configured analysis, and no "Run preview" button exists. The user cannot run the promised views.
- **Mismatch**: UI is cautious, but runtime still fails.

## 3. Findings

### Confirmed Product Strengths
1. **Fallback Resilience**: The `js_sandbox_fallback` is highly effective, successfully rescuing basic aggregations (`good_operations`, `broken_revenue`) when the primary backend is unavailable or unsuited.
2. **Honest Degradation in UI**: For files with zero opportunities (`broken_finance`) or zero signals (`good_revenue`), the UI messaging appropriately scales down its claims to "Exploratory use only", avoiding hallucinated promises despite high discovery scores.

### Trust Risks
1. **Silent/Empty Failures**: When discovery generates business views but fails to populate actionable opportunities (as in `broken_finance`), the UI does not explicitly explain the gap. The user clicks "Investigate" hoping to see the promised views, but arrives at an empty screen with no "Run preview" option. This is a severe trust risk as the user is left stranded without an explanation of *why* the views aren't runnable.
2. **Backend Instability**: ZERO of the 4 tested scenarios successfully utilized the primary backend preview (DuckDB). They either failed entirely or fell back to the JS sandbox. The backend runtime is completely decoupled from the discovery confidence.

### Architecture Follow-up Candidates
- **Pre-flight Runtime Checks**: The discovery engine must perform a lightweight "pre-flight" check on the generated SQL/Plans *before* promising a Business View on the Home screen.
- **DuckDB Integration Audit**: Investigate why DuckDB is failing to handle these generated datasets and why the system relies so heavily on `js_sandbox_fallback`.
- **Graceful Error States**: Implement visible error boundaries in the Investigation UI so users know *why* a promised view failed to render, rather than infinitely waiting.
