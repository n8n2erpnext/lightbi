# AUDIT: Home Information Hierarchy (UX-6)

## Overview
This audit classifies every visible section on the `Home.tsx` page to establish a strict, linear progression: `Connected Data -> Data Quality -> What LightBI Found -> Analysis Opportunities`.

## Hierarchy Classification

### 1. Connected Data
- **Component:** Dataset Upload / Import Box
- **Classification:** **KEEP**. Essential entry point.

### 2. Data Quality
- **Component:** Data Inspector Summary (e.g., Row count, column parsing success).
- **Classification:** **KEEP**. Vital for trust before analysis.

### 3. What LightBI Found (formerly Dataset Understanding)
- **Component:** `DatasetUnderstandingCard` (Narrative, Detected Signals, Confidence)
- **Classification:** **KEEP (Modified)**. Rename to "What LightBI Found". Hide the numeric AI confidence percentage. Hide all negative "Missing Signals" UI. Make it a brief, positive summary of what *was* found.

### 4. Analysis Opportunities
- **Component:** `AnalysisOpportunityGrid`
- **Classification:** **KEEP**. This must become the primary interactive focal point of the screen.

### 5. Perspective Selector & Advanced Views
- **Component:** Perspective Dropdown & Business View Inspector
- **Classification:** **REMOVE**. Belongs to the legacy BVQ flow. Distracts from getting to a chart.

### 6. Explore / Investigate / Ask Tabs
- **Component:** AnalysisMode toggles
- **Classification:** **REMOVE**. Forces the user to pick a paradigm instead of just clicking an Analysis Opportunity.

### 7. Ask Tab (Chat / Natural Language Query)
- **Component:** Chat textarea and Question Suggestions
- **Classification:** **MOVE TO INVESTIGATION**. Natural language querying over the dataset is a great feature, but it belongs inside an active Investigation Session, not on the Home landing page.

### 8. Developer Diagnostics (Intents, Planner, SQL)
- **Component:** JSON/Execution traces
- **Classification:** **MOVE TO DEVELOPER MODE**. (Already moved to Investigation page under UX-4).

## Conclusion
By purging sections 5, 6, and 7 from the Home screen, the hierarchy becomes a pure, un-branched funnel leading directly to Investigation execution. This guarantees users reach a visualization faster.
