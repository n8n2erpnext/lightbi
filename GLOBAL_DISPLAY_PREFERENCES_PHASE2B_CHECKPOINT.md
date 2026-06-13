# Global Display Preferences Phase 2B Checkpoint

## Milestone Reached
The Investigation view is now a complete, cohesive proof-of-concept for the Global Display Preferences engine, handling both tabular data and complex data visualizations.

## Architectural Locks
1. **Chart Layer Penetration**: The formatting engine is successfully hooked into Echarts rendering callbacks (`axisLabel.formatter` and `tooltip.valueFormatter`).
2. **Detail Tiering**: The architecture supports dynamic detail levels—axes enforce `{ compact: true }` to prevent UI overflow, while tooltips present the full-fidelity string.
3. **Immutability of Data Models**: Chart `series.data` arrays remain strictly typed as `number` or `number[]`. The raw data scale is preserved, and string parsing issues inside Echarts are structurally prevented.
4. **Investigation Completeness**: Table, Chart, and Settings UI are now perfectly synchronized to one global React Zustand state.
5. **Rollout Boundary**: The Home screen (summaries) and full Dashboards continue to display raw unformatted strings. They are the target of the next phase.
