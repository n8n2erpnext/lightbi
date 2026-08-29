# Checkpoint: Global Display Preferences Phase 4

## Status Lock
This checkpoint confirms the successful rollout of Global Display Preferences into the Dashboard KPI/cards presentation layer.

## Key Boundaries Locked
- **Universal Engine Expansion**: The `formatValue` formatter natively governs dashboard static cards alongside Investigation and Home summaries.
- **Dynamic Compaction Applied**: Dashboard widgets successfully implement a `compact-by-size` rule (e.g., `colSpan <= 5` -> `compact: true`), safely squishing massive numerics to protect variable-width grid layouts.
- **Null Safety**: Standardized fallback handling (`-`) is secured.
- **Charts Omitted**: ECharts integrations within the dashboard layer are strictly untouched in this phase.

## Formatter Engine Coverage
The `Global Display Preferences` engine currently blankets:
- ✅ Investigation Tables
- ✅ Investigation Charts
- ✅ Home Summaries
- ✅ Dashboard KPI Cards
- ❌ Dashboard Charts (Pending)
