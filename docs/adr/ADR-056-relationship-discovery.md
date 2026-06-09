# ADR 056: Relationship Discovery Engine

## Status
**ACCEPTED**

## Context
Traditional BI tools require users to manually construct data models, define relationships, and join tables. LightBI flips this paradigm for non-data users by automatically discovering how different operational files relate to one another (e.g., joining Sales Reports with Operational Cost Reports to find Profitability).

## Decision
We will introduce the **Relationship Discovery Engine**.

Its responsibilities are to take the output from the **Business Key Detector** (ADR-055) and build a virtual graph of data relationships:
1. **Find Joins**: Identify valid paths connecting datasets based on shared business keys.
2. **Estimate Confidence**: Assign a probability score to each discovered relationship (e.g., 82% confidence that `Shipment Number` matches `Mã tải kiện`).
3. **Suggest Relationships**: Present these high-confidence joins to the user transparently or use them directly in virtual datasets.
4. **Create Virtual Graph**: Maintain a graph structure in memory representing the overall business model.

### Output Structure
The engine will produce relationship definitions internally:
```typescript
type DatasetRelationship = {
  leftDataset: string;
  rightDataset: string;
  leftField: string;
  rightField: string;
  confidence: number;
};
```

## Consequences
- The system will be able to answer questions spanning multiple files automatically.
- Requires building an internal graph evaluation logic.
- LightBI shifts from being a simple data viewer to a "Business Relationship Discovery Engine."
