# ADR 057: Dataset Collection Framework

## Status
**ACCEPTED**

## Context
Currently, LightBI categorizes files into "Dataset Groups" based on identical schemas and appends their rows. However, when users upload files with different schemas that share a business domain (e.g., Logistics: Goods On Truck, Warehouse Receiving, Late Outbound), we cannot append them. They must be grouped logically to allow cross-dataset querying.

## Decision
We define three distinct states for multi-file intake:

### State 1: Same Schema
- **Action**: Append Rows
- **Result**: Dataset Group
- **Example**: `Sales_Jan.xlsx` + `Sales_Feb.xlsx`

### State 2: Different Schema + Shared Business Keys
- **Action**: Relationship Discovery (via ADR-056)
- **Result**: Dataset Collection
- **Definition**: Multiple datasets with different schemas but shared business meaning.
- **Example**: `Logistics: Receiving` + `Logistics: Outbound` sharing `Shipment ID`.

### State 3: Different Schema + No Shared Keys
- **Action**: Keep Separate
- **Result**: Independent Datasets
- **Example**: `HR Records` and `Marketing Campaign Spend` without any joinable keys.

## Consequences
- The intake UI and architecture must represent a **Dataset Collection** as a first-class citizen, distinct from a single Dataset Group.
- Semantic suggestions and question generation will operate on Dataset Collections rather than isolated datasets.
