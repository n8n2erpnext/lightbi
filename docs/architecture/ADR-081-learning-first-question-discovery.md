# ADR 081: Learning First Question Discovery

## Status
Accepted

## Context
LightBI's core value is generating Business Understanding. Previously, the primary exploratory interface was labeled "Explore Dataset," which displayed a flat list of auto-generated questions alongside technical dataset metadata (e.g., unique counts, column names). 

This interface implicitly trained users to think like data analysts ("I am exploring a table") rather than business stakeholders ("What can I learn about my business from this data?"). Furthermore, showing raw confidence percentages (`conf: 100%`) without context eroded the established trust architecture, as users didn't know what "100%" referred to.

## Decision
We establish the **Learning First Question Discovery** principle:

1. **Users care about questions, not columns**: We hide technical dataset vocabulary (`unique`, `field`, `dataset`) from the discovery interface. Instead of showing data profiles, we simply state `Detected from: [Field Names]`.
2. **Business Perspectives over Flat Lists**: Auto-generated questions must be grouped by business perspective (e.g., *Operations & Logistics*, *Revenue & Sales*, *Inventory*, *General Patterns*) rather than presented as a random flat list. This guides the user's mental model toward business processes.
3. **Qualitative Confidence**: Raw percentage scores for question suggestions are replaced with qualitative signals (`Question Match: Strong Signal`, `Moderate Signal`, `Weak Signal`). This prevents confusion with the overarching *Business Confidence* score.

## Consequences
- **Positive**: Forces the UI to act as a Business Understanding Engine rather than a BI tool.
- **Positive**: Reduces cognitive load for SME users by hiding technical database statistics.
- **Negative**: N/A.
