# AUDIT: Home Simplification (UX-5)

## Audit 1: Home Information Hierarchy

### Findings
The current Home screen attempts to serve multiple masters: the new Understanding-First flow (Data -> Understand -> Investigate) and the legacy BVQ flow (Perspectives, Business Views, Questions).
- **Attention & Dominance:** The UI is dominated by technical/AI scoring ("Confidence: 50%", "Partial Understanding") and complex tabbed navigation ("Explore", "Investigate", "Ask").
- **Primary Action:** The primary action—clicking an Analysis Opportunity to start an Investigation—competes heavily with selecting Perspectives and reviewing "Unavailable Advanced Views". 

### UX Risks
- Users suffer from cognitive overload before they even see a chart.
- The path from "Upload Data" to "See Chart" is interrupted by meta-decisions (e.g., choosing a "Perspective").

### Recommended Changes
- **P0**: Remove the "Explore/Investigate/Ask" tab system on the Home page. The Home page should solely be: "Here is what we found in your data" -> "Here are the analyses you can run".
- **P0**: Elevate the Analysis Opportunities to be the primary, most visually dominant interactive elements on the screen.

---

## Audit 2: Perspective Layer

### Findings
The UI asks: *"Optional: Choose a deeper business perspective"*.

### UX Risks
- **First-time users:** This introduces abstract vocabulary ("Perspective") before the user has seen any value. It acts as a roadblock.
- **Delay:** It delays the core Investigation loop.

### Recommended Changes
- **P0**: Remove the Perspective layer from the Home screen entirely.
- **P1**: If Perspectives provide filtering value for massive datasets, move them into the Investigation workspace as an optional "Lens" or "Filter" dropdown, not as a gatekeeper on the Home screen.

---

## Audit 3: Confidence UX

### Findings
The UI currently displays:
- `Partial Understanding` (with a warning icon)
- `Confidence: 50%`

### UX Risks
- **SME Perception:** A warehouse manager seeing "Confidence: 50%" will assume the tool is unreliable, inaccurate, or guessing at a coin-toss probability. "Partial Understanding" sounds like an error state.
- **Technical Accuracy:** The 50% score actually represents domain signal coverage (e.g., found 2 out of 4 expected columns for a specific business process), NOT the AI's confidence in its own parsing.

### Recommended Changes
- **P0**: Remove percentage-based "Confidence" scores from the user-facing UI.
- **P0**: Replace "Partial Understanding" with positive, action-oriented language.
- **Preferred Wording**: "Basic understanding available", "Detected 2 of 4 expected signals", or "Ready for basic analysis".

---

## Audit 4: Dataset Understanding Language

### Findings
The UI uses the header: `Dataset Understanding`.

### UX Risks
- "Dataset Understanding" is an internal engineering/AI term (akin to Natural Language Understanding). It is alien to business users and SMEs.

### Recommended Changes
- **P0**: Change "Dataset Understanding" to **"What LightBI Found"** or **"Data Summary"**.
- **P1**: Use conversational UI headers like **"What's inside this data?"**

---

## Audit 5: Empty State Philosophy

### Findings
The UI is heavily populated with negative, blocker-oriented language:
- *"Advanced guided views unavailable"*
- *"Missing required signals"*
- *"Workspace Locked"*
- *"No reliable questions found"*

### UX Risks
- This language focuses on failure and limitations, punishing the user for uploading a simple dataset rather than rewarding them for the data they *did* provide.
- It creates negative emotional feedback loops.

### Recommended Changes
- **P0**: Adopt a positive-first empty state philosophy. Never show a red "Missing required signals" box to a user just because their CSV didn't contain every possible column.
- **P0**: Instead of "Advanced guided views unavailable", simply hide the section entirely. If we must show it, use: *"Add delivery dates to unlock logistics analysis."*
- **P1**: Replace "Workspace Locked" with proactive prompts: *"Select an analysis to start investigating."*

---

## Priority Summary
- **P0**: Remove legacy Explore/Investigate/Ask tabs.
- **P0**: Remove Perspective Layer from Home.
- **P0**: Remove "Confidence: 50%" and "Partial Understanding".
- **P0**: Rename "Dataset Understanding" to "What LightBI Found".
- **P0**: Remove negative "Unavailable" and "Missing" UI blocks.

### Conclusion
**Is Home ready to be frozen as the Understanding-First entry point?**
No. It still contains significant UX friction and legacy BVQ remnants that violate the Understanding-First product direction. P0 recommendations must be implemented before DU-7.
