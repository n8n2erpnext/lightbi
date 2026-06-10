# ADR 103: Investigation Workspace Layout Cleanup

## Status
Accepted

## Context
Following the implementation of `SafeSqlPreview` in Phase DU-5C, the Investigation Workspace (`/investigation`) became dominated by developer diagnostics: Runtime Intents, Runtime Plans, and SQL code blocks. To a non-technical SME, the page felt like a compiler console rather than a Business Intelligence analysis workspace.

## Decision
We enforce a strict visual hierarchy on the Investigation page:
1. **User-Facing Analysis First**: The primary focus is the expected chart, the chosen dimensions, and the selected measures.
2. **Diagnostics Second**: All internal compiler artifacts (`RuntimeIntent`, `RuntimePlanPreview`, `SafeSqlPreview`) must be hidden by default inside a collapsed "Developer Diagnostics" panel.
3. **No Terminal Jargon**: Terms like `scan`, `group_by`, and `Safe SQL Preview` are forbidden from default visibility.

## Consequences
- **Improved UX**: SMEs immediately see an intuitive representation of what their analysis will look like without being intimidated by technical jargon.
- **Retained Debuggability**: Developers can still easily toggle the diagnostics panel to inspect the safe SQL query before execution.
- **Preparation for Execution**: This layout cleanly partitions the screen space, reserving the main central area for the upcoming DuckDB Chart execution in Phase DU-5D.
