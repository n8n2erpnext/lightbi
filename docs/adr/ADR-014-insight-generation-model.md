# ADR-014 Insight Generation Model

Status:
Proposed

Context:
In most BI tools, charts are the final output. However, operators often want the "insight" or "takeaway" rather than just looking at a visualization. 

Decision:
Insights are generated from Questions, not directly from Charts.

Flow:
**Question → Recipe → Dataset → Chart → Insight**

Consequences:
* The Chart becomes merely a visual representation mechanism.
* The Insight becomes the actual product value delivered to the user.
* By deriving insights from the initial Question and resulting Dataset, the logic stays anchored to the user's original business intent rather than pure statistical plotting.
