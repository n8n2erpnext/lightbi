# AUDIT: BVQ Remnants on Home Screen (UX-5)

## Goal
Identify legacy BVQ (Business Views, Questions) architecture remnants that conflict with the new Understanding-First product direction.

## Product Direction Mismatch
The Understanding-First direction follows a strict path:
`Raw Data -> Understand Data -> Investigation -> Answer`

However, the Home screen currently retains UI components designed for the deprecated BVQ workflow:
`Raw Data -> Configure Views -> Configure Questions -> Configure Dashboards`

## Audit 3: Advanced Guided Views

### Findings
The UI currently displays blocks for "Advanced guided views" and attempts to map the dataset to predefined Business Views (e.g., "Delivery Performance", "Inventory Aging"). 

When a dataset doesn't perfectly match a predefined BVQ schema, the UI throws errors:
- *"Advanced guided views unavailable"*
- *"Missing required signals"*

### UX Risks
- **Business Value:** It provides zero business value to a user who just wants to explore their data. It instead forces the user to think about system schema requirements.
- **Emotional Feedback:** It communicates failure. The system blames the user's data for missing columns rather than praising the data for what it *does* contain.

### Recommended Changes
- **P0**: Hide or remove the "Advanced guided views" section from the Home screen entirely. 
- **P1**: If Business Views are to be kept as a conceptual feature, they should be triggered silently in the background and only presented as highly-tailored "Analysis Opportunities" in the Investigation flow, never as a schema checklist on the Home screen.

## Additional BVQ Remnants Identified

### The "Ask" Tab (Question First)
- **Finding:** The UI includes an `Ask` tab with a textarea: *"Ask anything about this dataset... AI will generate an analysis plan based on the chosen perspective."*
- **Risk:** This skips the Investigation phase entirely and attempts to jump straight from Data to Answer via chat, which bypasses the core value proposition of guided UI investigation.
- **Recommendation (P0):** Remove the Ask tab from the Home screen. Free-text querying belongs inside the Investigation workspace, if anywhere.

### The "Investigate" Tab (Business View First)
- **Finding:** There is an `Investigate` tab that requires a "Selected Business View" to inspect relationships. If none is selected, it shows "Workspace Locked".
- **Risk:** This contradicts the new `/investigation` route architecture, which handles Investigation globally. Having an Investigate tab *inside* the Home screen creates routing and conceptual duplication.
- **Recommendation (P0):** Remove the Investigate tab from the Home screen. The only way to investigate should be clicking an Analysis Opportunity, which routes the user to the dedicated Investigation page.

## Conclusion
The Home screen is currently a hybrid of two conflicting paradigms. To finalize the Understanding-First architecture, we must violently prune all BVQ configuration UI (Perspectives, Business View Checklists, Question Chat boxes) from the Home screen. 

The Home screen must be purely conversational and positive:
1. "Here is what we found in your data."
2. "Here are the analyses you can run right now."
