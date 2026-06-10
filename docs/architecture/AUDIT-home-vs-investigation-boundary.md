# AUDIT: Home vs Investigation Boundary

## Overview
This audit defines where the "Home" context should end and the "Investigation" context should begin, based on the findings from the Information Density Review.

## Current State
Currently, clicking an Analysis Opportunity Card on the Home page opens an "Investigation Preview" panel *directly on the Home page*. This panel contains Runtime Intents and Logical Plans. 

**Problem:** The Home page is acting as a staging ground for query execution, bleeding the boundaries between "Choosing what to do" and "Doing it."

## The Minimum Screen for Success (Delivery Performance)
For a warehouse manager uploading `delivery_performance.csv`, the minimum required flow for success is:

**Screen 1: Home**
- "Your Delivery Performance data is ready."
- "Here is what you can analyze: [Shipment activity by route] [Satisfaction by driver] [Activity over time]"

**Screen 2: Investigation (Triggered by clicking a card)**
- *Instantly renders a Bar Chart showing Shipment activity by route.*
- Allows the user to tweak the chart.

## Recommended Hierarchy & Boundary

### 1. Home Layer (Intent Generation)
**Goal:** Answer "What data do I have?" and "What can I do with it?"
- **Contents:** Connection, Quality, Narrative, Analysis Opportunity Cards.
- **Boundary:** Ends the moment a user clicks an Analysis Opportunity card.

### 2. Investigation Layer (Execution & Consumption)
**Goal:** Answer the business question via visualization.
- **Contents:** The actual Charts (DuckDB results), filtering, pivoting, and exporting.
- **Boundary:** This is a dedicated workspace. It consumes the `AnalysisAction` passed from Home, internally computes the `RuntimeIntent` and `RuntimePlanPreview`, and executes it. The user only sees the chart.

### 3. Advanced Layer (Guided Discovery)
**Goal:** Deeper, multi-step business journeys.
- **Contents:** Business Views, Questions, Perspectives.
- **Boundary:** Kept distinct from the immediate "Analysis Opportunities".

### 4. Developer Layer (Mechanics)
**Goal:** Debugging the LightBI engine.
- **Contents:** Runtime Intent, Logical Plan, DuckDB SQL, Sandbox Policies, Signal Confidence.
- **Boundary:** Hidden entirely behind a global "Developer Mode" toggle or specific debugger overlays.

## Actionable Next Steps
1. Remove the "Investigation Preview", "Runtime Intent", and "Runtime Plan Preview" panels from the default user-facing Home view.
2. Route clicks on Analysis Opportunity cards directly to a dedicated Investigation Board (or execute them immediately and show the result).
3. Move all compiler diagnostics (DU-5A, DU-5B) into a Developer Overlay or Debugger component.
