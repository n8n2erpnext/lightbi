# ADR 101: Home and Investigation Workspace Separation

## Status
Accepted

## Context
Following `UX-AUDIT-1`, we identified that the Home page had become too dense, displaying pipeline diagnostics (Runtime Intents, Plans) next to user-facing action cards. It blurred the line between "choosing an analysis" and "executing an analysis."

## Decision
We separate the application into distinct routing contexts:

1. **Home (`/`)**: The Understanding and Action Launcher.
   - Shows Dataset Understanding.
   - Shows Analysis Opportunity Cards.
   - **Does not show** Runtime Intents, Plans, or executions.
   - Clicking a card navigates the user away from Home.

2. **Investigation (`/investigation`)**: The Execution Workspace.
   - Dedicated page for executing a specific `AnalysisAction`.
   - Displays the selected action, intent, and plan.
   - (Future) Will house the actual DuckDB chart execution.

3. **InvestigationSession (In-Memory)**:
   - State transfer mechanism between Home and Investigation pages.
   - Holds the selected `AnalysisAction`, validated `RuntimeIntent`, and computed `RuntimePlanPreview` before navigation.
   - Avoids passing complex objects via URL parameters.

## Consequences
- **Cleaner UX**: Home is purely for browsing opportunities.
- **Dedicated Focus**: Investigation is purely for analyzing one specific action.
- **Developer Mode Foundation**: By isolating the "execution" into its own page/session, we can easily toggle visibility of the pipeline diagnostics (Intents/Plans) exclusively on the Investigation page without cluttering Home.
