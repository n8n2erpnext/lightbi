# Checkpoint: Global Display Preferences Phase 3

## Status Lock
This checkpoint confirms the successful rollout of Global Display Preferences into the Home summaries presentation layer.

## Key Boundaries Locked
- **Universal Engine**: The `formatValue` formatter has officially traversed outside of Investigation, proving it acts as a universal presentation formatting engine.
- **Home Integration**: Home layer metrics (Dataset row/column counts, Data Quality overall/sub-scores, and Business Coverage indicators) are synchronized to the global store.
- **Compaction Applied**: Tight UI constraints natively rely on `{ compact: true }` to gracefully compress massive numeric outputs (e.g., `1,500,000` -> `1.5M`), preventing layout distortions.
- **Null Safety**: The Home summarization tier behaves predictably when variables are `null`/`undefined` due to data races, replacing invalid floats with consistent placeholders.
- **Dashboards Omitted**: The complex Dashboard components (`DashboardBuilder.tsx`, `Dashboards.tsx`) remain out of scope for this phase.

This foundation prepares the system for the final presentation stage: dynamic Dashboard widgets.
