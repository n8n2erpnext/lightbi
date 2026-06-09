# ADR-045 Insight Architecture

Status:
Accepted

Context:
Charts tell users "What happened" (e.g., a line going down). They do not tell users "What it means" (e.g., "Revenue dropped 15% due to a decrease in Western Region sales"). If we rely purely on visualization, users are forced to perform their own mental analysis.

Decision:
We establish the **Insight Layer**.
- An `Insight` is a first-class analytical asset, just like a `DataView`.
- It consumes a `RuntimeDataset` or a `DataView` and extracts deterministic meaning.
- Insights can be rendered on Dashboards alongside or instead of Charts.

Consequences:
- Rule: `RuntimeDataset -> DataView -> Insight`.
- Insights remain completely decoupled from visualization layers. A "Trend Insight" does not know if it will be rendered as a text paragraph or a bullet point.
