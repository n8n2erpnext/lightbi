# Knowledge vs Execution Gap

**Purpose:** Visualizing the discrepancy between what the LightBI Domain Catalog "knows" and what the Execution Pipeline "detects".

## Summary Gap Analysis (Phase BVQ-8C)

| Domain | Knowledge Layer | Execution Layer | Gap (Missing Detection) |
| :--- | :--- | :--- | :--- |
| **Operations** | 100% (8 Concepts) | 100% (8 Concepts) | **0%** |
| **Finance** | 100% (9 Concepts) | 100% (9 Concepts) | **0%** |
| **Revenue** | 100% (8 Concepts) | 100% (8 Concepts) | **0%** |
| **Inventory** | 100% (11 Concepts) | 100% (11 Concepts) | **0%** |
| **Customer** | 100% (8 Concepts) | 100% (8 Concepts) | **0%** |
| **Performance** | 100% (9 Concepts) | 100% (9 Concepts) | **0%** |

## Impact
The Execution Gap has been successfully eradicated. The Guided Investigation architecture's true "worldview" now aligns perfectly with its underlying theoretical Knowledge Layer.

A user uploading a dataset with HR metrics like "efficiency" or Customer data like "last_purchase" will now successfully trigger the corresponding perspectives, business views, and semantic questions that were previously dormant.

## Resolution
The gap was *purely lexical*. We expanded the `TAXONOMY` aliases in `business-signal-detector.ts` to cover the 22 missing RED concepts identified in the previous BVQ-8B Signal Coverage Report, bringing the gap definitively to 0%.
