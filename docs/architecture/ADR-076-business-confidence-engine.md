# ADR-076: Business Confidence Engine

## Status
Accepted

## Context
Following ADR-074 (Business Confidence Formula) and ADR-075 (Confidence Signal Registry), we need to implement the actual `BusinessConfidenceEngine`. 
The engine serves as the mathematical heart of the Trust Layer, aggregating various confidence signals into a single trustworthy score and explanatory model.

## Decision
We establish the **Business Confidence Engine** as a strict Aggregator.

### Key Rules
1. **Engine is an Aggregator**: The engine does not own trust signals. It purely consumes a `ConfidenceSignalRegistry`.
2. **Signal Adapters**: Systems like the `DatasetHealthEngine` or `RelationshipGraph` are mapped into the registry using adapters (e.g. `createDatasetHealthSignal()`). The engine must never read `DatasetHealthResult` directly.
3. **Provisional Mode**: For MVP (Phase T.2), the engine operates exclusively in "provisional" mode because DuckDB runtime and result validation do not exist yet. It clearly outputs the caveat *"Runtime result has not been validated yet."*
4. **Confidence Caps**:
   - If multi-dataset analysis lacks a relationship signal, confidence is capped at `MEDIUM`.
   - If the dataset health score is under 50, confidence is capped at `MEDIUM`.

## Consequences
- The Trust Layer is now fully separated from the query generation and execution layers.
- We can easily inject new signals (like `Coverage`) in the future without altering the engine logic.
- LightBI safely avoids behaving like a black-box query tool by displaying calculated confidence *before* attempting runtime execution.
