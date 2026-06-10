# AUDIT: Home Information Density Review

## Overview
As of Phase DU-5B, the Home page has successfully become robust in handling partially understood datasets. However, from a UX perspective, it has rapidly accumulated high information density.

We evaluated this from the perspective of a Subject Matter Expert (SME), such as a warehouse supervisor uploading an Excel file, asking: **"Can a non-technical warehouse manager understand what to do next within 10 seconds?"**

## The "10-Second" SME Test
If a warehouse supervisor uploads `delivery_performance.csv`, they currently see:
- Connected Data
- Data Quality
- Dataset Understanding (Entities, Workflow hints, Missing Analysis reasons)
- Analysis Opportunities (Action cards)
- Investigation Preview
- Runtime Intent (Status, Dimensions, Measures)
- Runtime Plan Preview (scan, group_by, limit)
- Optional Perspectives
- Optional Advanced Views

**Verdict:** The user will be overwhelmed. 
While "Analysis Opportunities" (e.g., "Shipment activity by route") makes perfect sense, terms like "Runtime Intent," "Logical Operations," "scan," and "group_by" are compiler concepts. To a warehouse manager, Home looks like a pipeline debugger rather than a Business Intelligence product.

## Categorization of Value

### A. True User-Facing Value
These sections directly help the SME achieve their goal.
- **Connected Data**: Confirms what they uploaded.
- **Data Quality**: Confirms the data is safe to use.
- **Analysis Opportunities**: Gives them immediate, one-click paths to value (e.g., "Show me Shipment activity by route").

### B. Developer-Facing Diagnostics (Currently exposed to user)
These sections prove the system is working, but provide no business value to the SME.
- **Runtime Intent State**: Knowing the shape is `bar_chart` or the status is `ready`.
- **Runtime Plan Preview**: The terminal-like block showing `scan`, `limit 100`.
- **Confidence Scores**: "Confidence: 90%" means nothing to the user; they just want the chart.
- **Detailed Missing Signals**: Explaining *why* a customer retention view is blocked because the `customer` signal is missing.

## Recommendations for Density Reduction

1. **Visible (Default):**
   - Data Source & Health Summary.
   - High-level Narrative ("This looks like logistics data").
   - Actionable Analysis Opportunity Cards.
2. **Collapsed (Optional):**
   - Optional Perspectives / Advanced Views (Only show if the user actively wants to browse).
   - "Why are some views missing?" (Hide behind an info tooltip or "Details" accordion).
3. **Developer-Only (Hidden from default UI):**
   - Runtime Intent.
   - Runtime Plan Preview.
   - Confidence Scores.
   - Internal ID mappings.

## Conclusion
Home is currently functioning as a highly effective **pipeline debugger** for the LightBI engineering team. To succeed as a **BI product**, we must ruthlessly hide the compiler mechanics (DU-5A, DU-5B) behind a "Developer Mode" toggle and elevate only the Analysis Opportunity cards (DU-4) to the primary SME view.
